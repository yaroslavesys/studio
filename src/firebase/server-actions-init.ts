import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { firebaseConfig } from './config';

// This file is specifically for server-side actions.
// It uses the Firebase Admin SDK.

let app: FirebaseApp;
let auth: Auth;
let firestore: Firestore;

if (!getApps().length) {
  app = initializeApp({
    projectId: firebaseConfig.projectId,
  });
  auth = getAuth(app);
  firestore = getFirestore(app);
} else {
  app = getApp();
  auth = getAuth(app);
  firestore = getFirestore(app);
}

export function initializeFirebase() {
    return { app, auth, firestore };
}
