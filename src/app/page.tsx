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
  // This state tracks the redirect processing specifically.
  const [isProcessingRedirect, setIsProcessingRedirect] = useState(true);

  // Effect 1: Handle redirection *after* auth state is confirmed.
  useEffect(() => {
    // If auth is not loading and we have a user, redirect.
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  // Effect 2: Handle the result from a redirect sign-in flow. This runs once.
  useEffect(() => {
    if (!auth) {
        setIsProcessingRedirect(false);
        return;
    }

    getRedirectResult(auth)
      .then(async (result) => {
        if (result) {
          // User has successfully signed in via redirect.
          toast({ title: "Signed In", description: "Successfully authenticated." });
          await createUserProfile(result.user);
          // The onAuthStateChanged listener will pick up the user,
          // and Effect 1 will handle the redirection. We don't need to do it here.
        }
        // Whether there was a result or not, we are done processing the redirect.
        setIsProcessingRedirect(false);
      })
      .catch((error) => {
        console.error("Redirect Result Error: ", error);
        toast({
          variant: "destructive",
          title: "Sign-in Failed",
          description: error.message || "An error occurred during sign-in.",
        });
        setIsProcessingRedirect(false);
      });
  // auth is the only dependency needed. We want this to run once when auth is ready.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth]);


  const createUserProfile = async (user: User) => {
    if (!auth) return;
    const firestore = getFirestore(auth.app);
    const userDocRef = doc(firestore, 'users', user.uid);
    try {
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          isAdmin: false, // Default role
          isTechLead: false, // Default role
        }, { merge: true });
      }
    } catch (error) {
      console.error("Error creating user profile:", error);
      toast({
        variant: "destructive",
        title: "Profile Error",
        description: "Could not create or verify your user profile.",
      });
    }
  };

  const handleSignIn = async () => {
    if (!auth) {
      toast({ variant: 'destructive', title: 'Authentication service not ready' });
      return;
    }
    const provider = new GoogleAuthProvider();
    await signInWithRedirect(auth, provider);
  };

  // Show a loading screen while Firebase is initializing OR processing the redirect result.
  if (isUserLoading || isProcessingRedirect) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p>Loading...</p>
      </div>
    );
  }
  
  // If after all loading, the user is present, show a redirecting message.
  // The useEffect above will handle the actual redirect.
  if (user) {
    return (
       <div className="flex min-h-screen items-center justify-center bg-background">
        <p>Redirecting to dashboard...</p>
      </div>
    )
  }

  // If no user and not loading, show the login page.
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
          <Button onClick={handleSignIn} disabled={isProcessingRedirect}>
              Sign in with Google
          </Button>
          </CardContent>
      </Card>
      </div>
  );
}
