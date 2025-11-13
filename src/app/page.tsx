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

  // This effect handles the result from a redirect sign-in flow
  useEffect(() => {
    // If a user is already logged in from a previous session, redirect them.
    if (user) {
      router.push('/dashboard');
      return;
    }
    
    // If there's no auth instance yet, we can't do anything.
    if (!auth) {
       // Set processing to false so the login button can be shown.
       if(isUserLoading === false) {
          setIsProcessing(false);
       }
      return;
    }

    // This is the core logic for the redirect flow.
    // getRedirectResult() returns a promise that resolves with the user credential
    // if the user has just signed in via redirect, or null otherwise.
    getRedirectResult(auth)
      .then(async (result) => {
        if (result) {
          // User has successfully signed in.
          toast({ title: "Signed In", description: "Successfully authenticated."});
          await createUserProfile(result.user);
          // Force token refresh to get custom claims if they exist
          await result.user.getIdToken(true); 
          // The navigation will be handled by the next run of this effect when `user` is set.
        } else {
          // No redirect result, so this is a fresh visit or the user is already logged in.
          // In either case, we can stop the processing indicator.
          setIsProcessing(false);
        }
      })
      .catch((error) => {
        console.error("Redirect Result Error: ", error);
        toast({
          variant: "destructive",
          title: "Sign-in Failed",
          description: error.message || "An error occurred during sign-in.",
        });
        setIsProcessing(false);
      });
  // The dependency array is critical. It should only run when auth is available.
  // We don't include `user` because that would re-trigger it after login, potentially causing loops.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth, isUserLoading]);


  const createUserProfile = async (user: User) => {
    // Ensure you get the firestore instance correctly.
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
    setIsProcessing(true);
    const provider = new GoogleAuthProvider();

    // Use signInWithRedirect. This is the most reliable method for all environments,
    // as it avoids popup blockers and iframe issues in production.
    await signInWithRedirect(auth, provider);
  };


  if (isUserLoading || isProcessing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p>Loading...</p>
      </div>
    );
  }

  // If not loading and no user, show the login page.
  // The useEffect has already determined there's no redirect result to process.
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
          <Button onClick={handleSignIn} disabled={isProcessing}>
              Sign in with Google
          </Button>
          </CardContent>
      </Card>
      </div>
  );
}
