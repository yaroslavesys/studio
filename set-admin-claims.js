// This script sets Custom User Claims (roles) for Firebase users.
// It is designed to be run from an environment that has administrative access
// to your Firebase project, such as Google Cloud Shell.

const admin = require('firebase-admin');

// --- Configuration ---
// 1. IMPORTANT: Replace these placeholder UIDs with the actual UIDs from your Firebase project.
// You can find the UID in the Firebase Console under Authentication -> Users.
const usersToUpdate = [
  {
    // The user who should be an administrator
    uid: 'REPLACE_WITH_ADMIN_UID', 
    claims: { isAdmin: true, isTechLead: false }
  },
  {
    // The user who should be a tech lead
    uid: 'REPLACE_WITH_TECH_LEAD_UID', 
    claims: { isAdmin: false, isTechLead: true }
  }
  // Add more users here if needed.
];

// --- Initialization ---
// When run in Google Cloud Shell or another Google Cloud environment, initialization
// works automatically without needing a service account key file.
try {
  admin.initializeApp();
  console.log("Initialized Firebase Admin SDK successfully (via Application Default Credentials).");
} catch (e) {
  // If running locally, this fallback attempts to use a service account key.
  try {
    const serviceAccount = require('./serviceAccountKey.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("Initialized Firebase Admin SDK successfully (via serviceAccountKey.json).");
  } catch (e2) {
      console.error('\x1b[31m%s\x1b[0m', 'CRITICAL ERROR: Failed to initialize Firebase Admin SDK.');
      console.error('This script is best run in Google Cloud Shell.');
      console.error('If running locally, ensure you have run "gcloud auth application-default login" or that a valid serviceAccountKey.json file exists in the root directory.');
      process.exit(1);
  }
}

// --- Main Function ---
async function setCustomClaims() {
  // Safety check to prevent running with placeholder UIDs.
  if (usersToUpdate.some(u => u.uid.startsWith('REPLACE_WITH'))) {
    console.error('\x1b[31m%s\x1b[0m', 'Error: Please replace the placeholder UIDs in set-admin-claims.js with real UIDs from your Firebase Authentication users.');
    return;
  }
  
  console.log('Starting to set custom claims...');
  
  let successCount = 0;
  let errorCount = 0;

  for (const user of usersToUpdate) {
    try {
      await admin.auth().setCustomUserClaims(user.uid, user.claims);
      console.log(`\x1b[32mSUCCESS:\x1b[0m Claims ${JSON.stringify(user.claims)} set for user UID: ${user.uid}`);
      successCount++;
    } catch (error) {
      console.error(`\x1b[31mERROR for UID ${user.uid}:\x1b[0m`, error.message);
      errorCount++;
    }
  }

  console.log(`\nFinished setting claims. Success: ${successCount}, Failures: ${errorCount}.`);
}

// Run the script
setCustomClaims();
