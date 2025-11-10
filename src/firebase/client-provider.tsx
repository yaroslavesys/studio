'use client';

import React from 'react';
import { FirebaseProvider } from '@/firebase/provider';

// This component simply wraps the main FirebaseProvider.
// Its sole purpose is to ensure that the initialization logic inside FirebaseProvider
// is only ever executed on the client-side, because this component is marked with 'use client'.
export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  return <FirebaseProvider>{children}</FirebaseProvider>;
}
