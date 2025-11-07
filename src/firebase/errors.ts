'use client';
import { getAuth, type User } from 'firebase/auth';

type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  requestResourceData?: any;
};

interface FirebaseAuthToken {
  name: string | null;
  email: string | null;
  email_verified: boolean;
  phone_number: string | null;
  sub: string;
  role?: string; // Add role
  departmentId?: string; // Add departmentId
  firebase: {
    identities: Record<string, string[]>;
    sign_in_provider: string;
    tenant: string | null;
  };
}

interface FirebaseAuthObject {
  uid: string;
  token: FirebaseAuthToken;
}

interface SecurityRuleRequest {
  auth: FirebaseAuthObject | null;
  method: string;
  path: string;
  resource?: {
    data: any;
  };
}

/**
 * Builds a security-rule-compliant auth object from the Firebase User.
 * This version attempts to parse custom claims from the ID token.
 * @param idTokenResult The result from getIdTokenResult().
 * @returns An object that mirrors request.auth in security rules, or null.
 */
function buildAuthObject(currentUser: User, idTokenResult: import('firebase/auth').IdTokenResult | null): FirebaseAuthObject | null {
  if (!currentUser) {
    return null;
  }
  
  const claims = idTokenResult?.claims || {};

  const token: FirebaseAuthToken = {
    name: currentUser.displayName,
    email: currentUser.email,
    email_verified: currentUser.emailVerified,
    phone_number: currentUser.phoneNumber,
    sub: currentUser.uid,
    role: claims.role as string, // Extract role from claims
    departmentId: claims.departmentId as string, // Extract departmentId from claims
    firebase: {
      identities: currentUser.providerData.reduce((acc, p) => {
        if (p.providerId) {
          acc[p.providerId] = [p.uid];
        }
        return acc;
      }, {} as Record<string, string[]>),
      sign_in_provider: idTokenResult?.signInProvider || 'custom',
      tenant: idTokenResult?.tenantId || null,
    },
  };

  return {
    uid: currentUser.uid,
    token: token,
  };
}


/**
 * Asynchronously builds the complete, simulated request object for the error message.
 * It safely tries to get the current authenticated user and their ID token result.
 * @param context The context of the failed Firestore operation.
 * @returns A structured request object.
 */
async function buildRequestObject(context: SecurityRuleContext): Promise<SecurityRuleRequest> {
  let authObject: FirebaseAuthObject | null = null;
  try {
    const firebaseAuth = getAuth();
    const currentUser = firebaseAuth.currentUser;
    if (currentUser) {
      // Force refresh to get latest claims.
      const idTokenResult = await currentUser.getIdTokenResult(true); 
      authObject = buildAuthObject(currentUser, idTokenResult);
    }
  } catch(e) {
    console.warn("Could not build auth object for error reporting:", e)
  }

  return {
    auth: authObject,
    method: context.operation,
    path: `/databases/(default)/documents/${context.path}`,
    resource: context.requestResourceData ? { data: context.requestResourceData } : undefined,
  };
}


/**
 * Builds the final, formatted error message for the LLM.
 * @param requestObject The simulated request object.
 * @returns A string containing the error message and the JSON payload.
 */
function buildErrorMessage(requestObject: SecurityRuleRequest): string {
  return `Missing or insufficient permissions: The following request was denied by Firestore Security Rules:
${JSON.stringify(requestObject, null, 2)}`;
}

/**
 * A custom error class designed to be consumed by an LLM for debugging.
 * It structures the error information to mimic the request object
 * available in Firestore Security Rules.
 * The constructor is now private; use the static create method instead.
 */
export class FirestorePermissionError extends Error {
  public readonly request: SecurityRuleRequest;

  private constructor(requestObject: SecurityRuleRequest) {
    super(buildErrorMessage(requestObject));
    this.name = 'FirebaseError';
    this.request = requestObject;
  }
  
  /**
   * Asynchronously creates a new FirestorePermissionError.
   * This is now the required way to instantiate the class.
   * @param context The context of the failed Firestore operation.
   * @returns A Promise resolving to a FirestorePermissionError instance.
   */
  public static async create(context: SecurityRuleContext): Promise<FirestorePermissionError> {
      const requestObject = await buildRequestObject(context);
      return new FirestorePermissionError(requestObject);
  }
}
