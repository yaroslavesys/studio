
/**
 * This file is the entry point for all of your backend logic (Cloud Functions).
 *
 * It is deployed to a secure, managed server environment (Google Cloud) that has
 * privileged access to your Firebase services.
 *
 * Learn more about writing Cloud Functions here:
 * https://firebase.google.com/docs/functions
 */

import { HttpsError, onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { region } from "firebase-functions";

// This is the only place you should initialize the Admin SDK
admin.initializeApp();

/**
 * A callable function to set custom claims (roles) for a user.
 * This is the single source of truth for updating a user's roles and team assignment.
 * It updates both the Auth custom claims and the user's document in Firestore to ensure data consistency.
 *
 * This function can only be successfully called by a user who is already an
 * administrator (has the `isAdmin: true` custom claim).
 */
exports.setCustomClaims = region('europe-west1').https.onCall(async (request) => {
  logger.info("setCustomClaims function triggered.", { structuredData: true });

  // 1. Check if the user calling this function is an admin.
  if (request.auth?.token.isAdmin !== true) {
    logger.error(
      "setCustomClaims permission denied. Caller is not an admin.",
      { uid: request.auth?.uid }
    );
    throw new HttpsError(
      "permission-denied",
      "You must be an administrator to set user roles."
    );
  }
   logger.info("Admin check passed.", { uid: request.auth?.uid });


  // 2. Get the parameters from the client-side call and validate them.
  const { uid, isAdmin, isTechLead, teamId } = request.data;
  if (typeof uid !== "string") {
     logger.error("Invalid arguments received. 'uid' (string) is required.", { data: request.data });
     throw new HttpsError(
      "invalid-argument",
      "The function must be called with a 'uid' argument."
    );
  }
  logger.info(`Arguments valid. Target UID: ${uid}`, { data: request.data });


  // 3. Sanitize and validate the claims object.
  const finalClaims = {
    isAdmin: !!isAdmin,
    isTechLead: !!isTechLead,
    // A user can't be a tech lead without a teamId. If isTechLead is false, teamId MUST be null.
    teamId: !!isTechLead ? teamId || null : null,
  };

  if (finalClaims.isTechLead && !finalClaims.teamId) {
     logger.error("Validation failed: A user cannot be a Tech Lead without being assigned to a team.", { uid, finalClaims });
     throw new HttpsError(
      "failed-precondition",
      "A user cannot be a Tech Lead without being assigned to a team."
    );
  }
  
  logger.info(`Sanitized claims to be set for user ${uid}`, { finalClaims });

  try {
    // 4. Set the custom claims on the user's Auth record.
    logger.info(`Attempting to set custom user claims for ${uid}...`);
    await admin.auth().setCustomUserClaims(uid, {
        isAdmin: finalClaims.isAdmin,
        isTechLead: finalClaims.isTechLead,
        teamId: finalClaims.teamId
    });
    logger.info(`Successfully set custom claims for user ${uid}.`);

    // 5. CRITICAL: Update the user's document in Firestore to reflect the new state.
    // This ensures that the UI is always in sync with the user's actual roles.
    logger.info(`Attempting to update Firestore document for ${uid}...`);
    const userDocRef = admin.firestore().collection('users').doc(uid);
    // Use update to avoid overwriting other fields in the user document.
    await userDocRef.update({
        isAdmin: finalClaims.isAdmin,
        isTechLead: finalClaims.isTechLead,
        teamId: finalClaims.teamId
    });
    logger.info(`Successfully updated Firestore document for ${uid}.`);

    // 6. Return a success message to the client.
    logger.info(`Function finished successfully for UID ${uid}.`);
    return {
      status: 'success',
      message: `Success! User ${uid} has been updated with new roles.`,
    };
  } catch (error: any) {
    logger.error("CRITICAL ERROR during claims/Firestore update:", {
      targetUid: uid,
      error: error.message,
      stack: error.stack,
    });
    // Throw a generic internal error to avoid leaking implementation details.
    throw new HttpsError(
      "internal",
      "An unexpected error occurred while trying to set user claims. Check the function logs for details."
    );
  }
});
