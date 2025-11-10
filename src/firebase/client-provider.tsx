'use client';

import React, { useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  // useMemo ensures that Firebase is initialized only once per client session.
  const firebaseServices = useMemo(() => {
    // We only want to initialize firebase on the client
    if (typeof window === 'undefined') {
      return { firebaseApp: null, auth: null, firestore: null };
    }
    return initializeFirebase();
  }, []);

  return (
    <FirebaseProvider {...firebaseServices}>
      {children}
    </FirebaseProvider>
  );
}
