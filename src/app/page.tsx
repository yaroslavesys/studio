'use client';

import { useEffect, useState } from 'react';
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
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    // If a user is already logged in, redirect them to the dashboard.
    if (!isUserLoading && user) {
      router.push('/dashboard');
      return;
    }

    // If there's no user and auth is ready, check for a redirect result.
    if (!isUserLoading && !user && auth) {
      getRedirectResult(auth)
        .then(async (result) => {
          if (result) {
            // This is the signed-in user
            const loggedInUser = result.user;
            // Create a user profile if it doesn't exist
            await createUserProfile(loggedInUser);
            // Force token refresh to get custom claims (if any are set immediately)
            await loggedInUser.getIdToken(true);
            // Redirect to the dashboard
            router.push('/dashboard');
          } else {
            // Not a redirect, so login process is finished for this page load.
            setIsProcessing(false);
          }
        })
        .catch((error) => {
          console.error("Authentication error: ", error);
          toast({
            variant: "destructive",
            title: "Sign-in Failed",
            description: error.message || "An unexpected error occurred during sign-in.",
          });
          setIsProcessing(false);
        });
    }
  }, [user, isUserLoading, auth, router, toast]);

  const handleSignIn = async () => {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    // Start the sign-in process, but don't wait here. The result is handled by getRedirectResult.
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

  // Show a loading indicator while checking auth state or processing a redirect.
  if (isUserLoading || isProcessing) {
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
