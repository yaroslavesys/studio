'use client';

import { useContext, useMemo, type DependencyList } from 'react';
import type { FirebaseApp } from 'firebase/app';
import type { Auth, User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { FirebaseContext, type FirebaseContextState } from './provider';

// --- Hooks ---
export const useFirebase = (): FirebaseContextState => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }
  return context;
};

export const useAuth = (): Auth | null => useFirebase().auth;
export const useFirestore = (): Firestore | null => useFirebase().firestore;
export const useFirebaseApp = (): FirebaseApp | null => useFirebase().firebaseApp;
export const useUser = (): {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
} => {
  const { user, isUserLoading, userError } = useFirebase();
  return { user, isUserLoading, userError };
};

// Hook to memoize Firebase queries or other objects.
// Throws an error if the object is not memoized, preventing infinite loops.
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

  return memoized;
}

// --- Re-exports for convenience ---
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './errors';
export * from './error-emitter';
export { FirebaseProvider } from './provider';
export { FirebaseClientProvider } from './client-provider';
