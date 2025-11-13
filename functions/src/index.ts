
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
  logger.info("--- setCustomClaims: Function triggered ---", { auth: request.auth, data: request.data });

  // 1. Check if the user calling this function is an admin.
  if (request.auth?.token.isAdmin !== true) {
    logger.error(
      "setCustomClaims: Permission denied. Caller is not an admin.",
      { uid: request.auth?.uid }
    );
    throw new HttpsError(
      "permission-denied",
      "You must be an administrator to set user roles."
    );
  }
   logger.info("setCustomClaims: Admin check passed.", { adminUid: request.auth?.uid });


  // 2. Get the parameters from the client-side call and validate them.
  const { uid, isAdmin, isTechLead, teamId } = request.data;
  if (typeof uid !== "string") {
     logger.error("setCustomClaims: Invalid arguments. 'uid' (string) is required.", { data: request.data });
     throw new HttpsError(
      "invalid-argument",
      "The function must be called with a 'uid' argument."
    );
  }
  logger.info(`setCustomClaims: Arguments valid. Target UID: ${uid}`, { data: request.data });


  // 3. Sanitize and validate the claims object.
  const finalClaims = {
    isAdmin: !!isAdmin,
    isTechLead: !!isTechLead,
    ...(teamId && { teamId }), // Conditionally add teamId if it's truthy
  };

  // If a user is a tech lead, they MUST have a team.
  // The 'teamId' is now only added if it exists, so we adjust the logic here.
  // If isTechLead is true, teamId must also have been passed in.
  if (finalClaims.isTechLead && !finalClaims.teamId) {
     logger.error("setCustomClaims: Validation failed: A Tech Lead must be assigned to a team.", { uid, finalClaims });
     throw new HttpsError(
      "failed-precondition",
      "A user cannot be a Tech Lead without being assigned to a team."
    );
  }
  // If a user is NOT a tech lead, ensure they don't have a teamId claim.
  if (!finalClaims.isTechLead && finalClaims.teamId) {
    // This case should be handled by client logic, but as a safeguard:
    logger.warn("setCustomClaims: User is not a Tech Lead, but a teamId was passed. Removing it from claims.", { uid, finalClaims });
    delete (finalClaims as any).teamId;
  }
  
  logger.info(`setCustomClaims: Sanitized claims to be set for user ${uid}`, { finalClaims });

  try {
    // 4. Set the custom claims on the user's Auth record.
    logger.info(`setCustomClaims: Attempting to set custom user claims for ${uid}...`);
    await admin.auth().setCustomUserClaims(uid, finalClaims);
    logger.info(`setCustomClaims: Successfully set custom claims for user ${uid}.`);

    // 5. CRITICAL: Update the user's document in Firestore to reflect the new state.
    logger.info(`setCustomClaims: Attempting to update Firestore document for ${uid}...`);
    const userDocRef = admin.firestore().collection('users').doc(uid);
    // Prepare the update object. Explicitly set teamId to null if it's not in finalClaims
    // to ensure it's removed from the document if the user is no longer a tech lead.
    const firestoreUpdateData = {
        isAdmin: finalClaims.isAdmin,
        isTechLead: finalClaims.isTechLead,
        teamId: finalClaims.teamId || null,
    };
    await userDocRef.update(firestoreUpdateData);
    logger.info(`setCustomClaims: Successfully updated Firestore document for ${uid}.`, { firestoreUpdateData });

    // 6. Return a success message to the client.
    logger.info(`--- setCustomClaims: Function finished successfully for UID ${uid}. ---`);
    return {
      status: 'success',
      message: `Success! User ${uid} has been updated.`,
    };
  } catch (error: any) {
    logger.error("--- CRITICAL ERROR in setCustomClaims during claims/Firestore update: ---", {
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

    