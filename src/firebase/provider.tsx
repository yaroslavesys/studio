'use client';

import {
  createContext,
  useMemo,
  ReactNode,
  useState,
  useEffect,
} from 'react';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { Auth, getAuth, User, onAuthStateChanged } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

// --- Initialization ---
function initializeFirebaseServices(): {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
} {
  const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  return {
    firebaseApp: app,
    auth: getAuth(app),
    firestore: getFirestore(app),
  };
}

// --- Context and Provider ---
export interface FirebaseContextState {
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export const FirebaseContext = createContext<FirebaseContextState | undefined>(
  undefined
);

export interface FirebaseProviderProps {
  children: ReactNode;
}

export const FirebaseProvider = ({ children }: FirebaseProviderProps) => {
  const [userAuthState, setUserAuthState] = useState<{
    user: User | null;
    isUserLoading: boolean;
    userError: Error | null;
  }>({
    user: null,
    isUserLoading: true,
    userError: null,
  });

  // Memoize services to prevent re-initialization
  const { firebaseApp, auth, firestore } = useMemo(() => {
    if (typeof window === 'undefined') {
      return { firebaseApp: null, auth: null, firestore: null };
    }
    return initializeFirebaseServices();
  }, []);

  useEffect(() => {
    if (!auth) {
      setUserAuthState({
        user: null,
        isUserLoading: false,
        userError: new Error('Auth service not available.'),
      });
      return;
    }
    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        setUserAuthState({
          user: firebaseUser,
          isUserLoading: false,
          userError: null,
        });
      },
      (error) => {
        console.error('FirebaseProvider: onAuthStateChanged error:', error);
        setUserAuthState({ user: null, isUserLoading: false, userError: error });
      }
    );
    return () => unsubscribe();
  }, [auth]);

  const contextValue = useMemo(
    (): FirebaseContextState => ({
      firebaseApp,
      firestore,
      auth,
      ...userAuthState,
    }),
    [firebaseApp, firestore, auth, userAuthState]
  );

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};
