
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleAuthProvider, signInWithRedirect, getRedirectResult, User } from 'firebase/auth';
import { useAuth, useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Logo } from '@/components/logo';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc, setDoc, getFirestore } from 'firebase/firestore';

export default function HomePage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isLoading } = useUser();
  const { toast } = useToast();

  // Step 2: Check for redirect result on component mount
  useEffect(() => {
    if (!auth || isLoading) return;

    // If a user is already logged in, redirect to the dashboard.
    if (user) {
      router.push('/dashboard');
      return;
    }

    // This handles the redirect back from Google
    getRedirectResult(auth)
      .then(async (result) => {
        if (result) {
          // User successfully signed in.
          await createUserProfile(result.user);
          await result.user.getIdToken(true); // Refresh token for claims
          router.push('/dashboard');
        }
        // If result is null, it means the user just landed on the page
        // without coming from a redirect.
      })
      .catch((error) => {
        console.error('Error during redirect result processing: ', error);
        toast({
          variant: 'destructive',
          title: 'Uh oh! Something went wrong.',
          description: error.message || 'There was a problem with the sign-in process.',
        });
      });
  }, [auth, user, isLoading, router, toast]);


  // Step 1: Initiate the redirect when the user clicks the button
  const handleSignIn = async () => {
    if (!auth) {
      console.error('Firebase Auth is not initialized.');
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'Firebase is not ready. Please try again in a moment.',
      });
      return;
    }
    const provider = new GoogleAuthProvider();
    // This will redirect the user to the Google sign-in page
    await signInWithRedirect(auth, provider);
  };

  const createUserProfile = async (user: User) => {
    const firestore = getFirestore();
    const userDocRef = doc(firestore, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        isAdmin: false, 
        isTechLead: false, 
      });
    }
  };


  if (isLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen animate-fade-in items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-primary/20 shadow-lg shadow-primary/10">
        <CardHeader className="text-center">
          <div className="mx-auto mb-6">
            <Logo />
          </div>
          <CardTitle className="font-headline text-3xl tracking-tighter">
            Welcome to Devils access
          </CardTitle>
          <CardDescription className="pt-1">
            Sign in to access your dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button onClick={handleSignIn}>
            Sign in with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
