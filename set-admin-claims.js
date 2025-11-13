

// This script sets Custom User Claims (roles) for Firebase users.
// It is designed to be run from an environment that has administrative access
// to your Firebase project, such as Google Cloud Shell.

const admin = require('firebase-admin');

// --- Configuration ---
// 1. IMPORTANT: Replace the placeholder UID with the actual UID from your Firebase project.
// You can find the UID in the Firebase Console under Authentication -> Users.
const usersToUpdate = [
  {
    // This is the user who will become the first administrator.
    uid: '0A9LFbbNpuXGh09Hvden5NFoSvh1', 
    claims: { isAdmin: true, isTechLead: false, teamId: null }
  },
  // You can manage other users and tech leads from the admin panel in the app later.
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
    console.error('\x1b[31m%s\x1b[0m', 'Error: Please replace the placeholder UID in set-admin-claims.js with your real UID from your Firebase Authentication users.');
    return;
  }
  
  console.log('Starting to set custom claims...');
  
  let successCount = 0;
  let errorCount = 0;

  for (const user of usersToUpdate) {
    try {
      const userDocRef = admin.firestore().collection('users').doc(user.uid);
      
      // Update both Auth claims and Firestore document in one go.
      await admin.auth().setCustomUserClaims(user.uid, user.claims);
      console.log(`\x1b[32mSUCCESS (Auth):\x1b[0m Claims ${JSON.stringify(user.claims)} set for user UID: ${user.uid}`);
      
      await userDocRef.update({ 
        isAdmin: user.claims.isAdmin, 
        isTechLead: user.claims.isTechLead, 
        teamId: user.claims.teamId 
      });
      console.log(`\x1b[32mSUCCESS (Firestore):\x1b[0m User document updated for UID: ${user.uid}`);

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

