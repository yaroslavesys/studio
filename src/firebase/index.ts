'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import { useMemo } from 'react';
import type { DependencyList } from 'react';

export function initializeFirebase(): {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
} {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return {
    firebaseApp: app,
    auth: getAuth(app),
    firestore: getFirestore(app),
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