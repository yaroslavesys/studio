'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import { useMemo } from 'react';
import type { DependencyList } from 'react';

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase(): {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
} {
  if (!getApps().length) {
    let firebaseApp;
    try {
      // This will throw if not in a Firebase hosting environment
      firebaseApp = initializeApp();
    } catch (e) {
      if (process.env.NODE_ENV === 'production') {
        console.warn('Automatic initialization failed. Falling back to firebase config object.', e);
      }
      firebaseApp = initializeApp(firebaseConfig);
    }
    return getSdks(firebaseApp);
  }
  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
  };
}

// Hook to memoize Firebase queries or other objects.
// Throws an error if the object is not memoized, preventing infinite loops.
type MemoFirebase<T> = T & { __memo?: boolean };

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T {
    const memoized = useMemo(factory, deps);
    if (typeof memoized !== 'object' || memoized === null) return memoized;

    // This property is used as a runtime check to ensure developers memoize their queries.
    // It helps prevent common bugs like infinite re-renders.
    Object.defineProperty(memoized, '__memo', {
        value: true,
        writable: false,
        enumerable: false,
    });

    return memoized as MemoFirebase<T>;
}


export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './errors';
export * from './error-emitter';

// Re-exporting the hooks from the provider
export { useFirebase, useAuth, useFirestore, useFirebaseApp, useUser } from './provider';
