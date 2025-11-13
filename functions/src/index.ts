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
 *
 * This function can only be successfully called by a user who is already an
 * administrator (has the `isAdmin: true` custom claim).
 */
exports.setCustomClaims = region('europe-west1').https.onCall(async (request) => {
  logger.info("setCustomClaims function triggered.", { structuredData: true });

  // 1. Log the caller's context and incoming data.
  logger.info("Request auth context:", request.auth);
  logger.info("Request data payload:", request.data);


  // 2. Check if the user calling this function is an admin.
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


  // 3. Get the parameters from the client-side call.
  const { uid, claims } = request.data;
  
  if (typeof uid !== "string" || !claims || typeof claims !== 'object') {
     logger.error("Invalid arguments received.", { uid, claims });
     throw new HttpsError(
      "invalid-argument",
      "The function must be called with 'uid' and 'claims' arguments."
    );
  }
  logger.info(`Arguments valid. Target UID: ${uid}`, { claims });


  // **CRITICAL VALIDATION LOGIC**
  if (claims.isTechLead === true && !claims.teamId) {
     logger.error("Validation failed: Tech Lead must have a teamId.", { uid, claims });
     throw new HttpsError(
      "failed-precondition",
      "A user cannot be a Tech Lead without being assigned to a team."
    );
  }
  
  // Sanitize claims: ensure teamId is null if user is not a tech lead.
  const finalClaims = {
    isAdmin: !!claims.isAdmin,
    isTechLead: !!claims.isTechLead,
    teamId: claims.isTechLead ? claims.teamId : null,
  };

  logger.info(`Preparing to set final claims for user ${uid}`, { finalClaims });

  try {
    // 4. Use the Admin SDK to set the custom claims on the target user.
    logger.info(`Attempting to set custom user claims for ${uid}...`);
    await admin.auth().setCustomUserClaims(uid, finalClaims);
    logger.info(`Successfully set custom claims for user ${uid}.`);

    // 5. Also update the user's document in Firestore to reflect the new state
    logger.info(`Attempting to update Firestore document for ${uid}...`);
    const userDocRef = admin.firestore().collection('users').doc(uid);
    await userDocRef.update({
        isAdmin: finalClaims.isAdmin,
        isTechLead: finalClaims.isTechLead,
        teamId: finalClaims.teamId
    });
    logger.info(`Successfully updated Firestore document for ${uid}.`);

    // 6. Return a success message to the client.
    logger.info(`Function finished successfully for UID ${uid}.`);
    return {
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
      "An error occurred while trying to set user claims."
    );
  }
});
