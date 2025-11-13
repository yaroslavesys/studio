/**
 * This file is the entry point for all of your backend logic (Cloud Functions).
 *
 * It is deployed to a secure, managed server environment (Google Cloud) that has
 * privileged access to your Firebase services.
 *
 * Learn more about writing Cloud Functions here:
 * https://firebase.google.com/docs/functions
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";


// This is the only place you should initialize the Admin SDK
admin.initializeApp();

/**
 * A callable function to set custom claims (roles) for a user.
 *
 * This function can only be successfully called by a user who is already an
 * administrator (has the `isAdmin: true` custom claim).
 */
export const setCustomClaims = onCall(async (request) => {
  // 1. Check if the user calling this function is an admin.
  // The `auth` object in the request contains the decoded ID token of the user.
  if (request.auth?.token.isAdmin !== true) {
    logger.error(
      "setCustomClaims denied. Caller is not an admin.",
      { uid: request.auth?.uid }
    );
    throw new HttpsError(
      "permission-denied",
      "You must be an administrator to set user roles."
    );
  }

  // 2. Get the parameters from the client-side call.
  const { uid, claims } = request.data;
  
  // Basic validation.
  if (typeof uid !== "string" || !claims || typeof claims !== 'object') {
     throw new HttpsError(
      "invalid-argument",
      "The function must be called with 'uid' and 'claims' arguments."
    );
  }

  // **CRITICAL VALIDATION LOGIC**
  // A tech lead MUST be assigned to a team.
  if (claims.isTechLead === true && !claims.teamId) {
     throw new HttpsError(
      "failed-precondition",
      "A user cannot be a Tech Lead without being assigned to a team."
    );
  }
  
  // Sanitize claims: ensure teamId is null if user is not a tech lead.
  const finalClaims = {
    ...claims,
    teamId: claims.isTechLead ? claims.teamId : null,
  };


  try {
    // 3. Use the Admin SDK to set the custom claims on the target user.
    // This action is privileged and can only be done on the server.
    await admin.auth().setCustomUserClaims(uid, finalClaims);

    logger.info(`Successfully set claims for user ${uid}`, { claims: finalClaims });

    // 4. Return a success message to the client.
    return {
      message: `Success! User ${uid} has been updated with new roles.`,
    };
  } catch (error: any) {
    logger.error("Error setting custom claims:", {
      uid: uid,
      error: error.message,
    });
    throw new HttpsError(
      "internal",
      "An error occurred while trying to set user claims."
    );
  }
});
