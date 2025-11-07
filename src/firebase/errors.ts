'use client';
import { getAuth, type User } from 'firebase/auth';

export type SecurityRuleContext = {
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
  role?: string;
  departmentId?: string;
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
    role: claims.role as string,
    departmentId: claims.departmentId as string,
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


async function buildRequestObject(context: SecurityRuleContext): Promise<SecurityRuleRequest> {
  let authObject: FirebaseAuthObject | null = null;
  try {
    const firebaseAuth = getAuth();
    const currentUser = firebaseAuth.currentUser;
    if (currentUser) {
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

function buildErrorMessage(requestObject: SecurityRuleRequest): string {
  return `FirebaseError: Missing or insufficient permissions: The following request was denied by Firestore Security Rules:
${JSON.stringify(requestObject, null, 2)}`;
}

export class FirestorePermissionError extends Error {
  public readonly request: SecurityRuleRequest;

  private constructor(requestObject: SecurityRuleRequest) {
    super(buildErrorMessage(requestObject));
    this.name = 'FirestorePermissionError'; // Changed to this to distinguish from generic FirebaseError
    this.request = requestObject;

    // This is important for Next.js error overlays
    if (typeof (this as any).digest === 'undefined') {
        (this as any).digest = `CUSTOM_ERROR_FIRESTORE_${requestObject.method}_${requestObject.path.replace(/\//g, '_')}`;
    }
  }
  
  public static async create(context: SecurityRuleContext): Promise<FirestorePermissionError> {
      const requestObject = await buildRequestObject(context);
      return new FirestorePermissionError(requestObject);
  }
}
