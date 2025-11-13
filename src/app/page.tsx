
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleAuthProvider, signInWithRedirect, getRedirectResult, User, setPersistence, browserLocalPersistence } from 'firebase/auth';
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
  const [isProcessingRedirect, setIsProcessingRedirect] = useState(true);

  // Effect 1: Redirect already logged-in users
  useEffect(() => {
    // If auth is still loading, do nothing.
    if (isUserLoading) return;
    
    // If loading is finished and we have a user, redirect.
    if (user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  // Effect 2: Handle the result of a sign-in redirect
  useEffect(() => {
    // If auth service isn't ready, we can't process the result.
    if (!auth) {
      setIsProcessingRedirect(false); // Stop processing if auth is not available
      return;
    }

    // This is the core logic to handle the result from Google Sign-In
    getRedirectResult(auth)
      .then(async (result) => {
        if (result) {
          // User has just signed in.
          toast({ title: "Signed In", description: "Successfully authenticated." });
          // Create a user profile in Firestore if it doesn't exist.
          await createUserProfile(result.user);
          // The user object will be picked up by the useUser() hook,
          // and Effect 1 will handle the redirect.
        }
        // Whether there was a result or not, we are done processing.
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
  // The 'auth' and 'toast' dependencies are stable. We only want this to run once on mount.
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
          isAdmin: false, 
          isTechLead: false, 
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
    try {
        // This is CRITICAL: It tells Firebase to remember the user across browser sessions.
        await setPersistence(auth, browserLocalPersistence);
        const provider = new GoogleAuthProvider();
        // Start the sign-in process. The user will be redirected to Google and then back.
        await signInWithRedirect(auth, provider);
    } catch(error: any) {
         toast({ variant: 'destructive', title: 'Sign in failed', description: error.message });
    }
  };
  
  // While we are checking auth state or processing the redirect, show a loading screen.
  if (isUserLoading || isProcessingRedirect) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p>Loading...</p>
      </div>
    );
  }
  
  // If user is already logged in, they will be redirected by Effect 1. 
  // This message is a fallback.
  if (user) {
    return (
       <div className="flex min-h-screen items-center justify-center bg-background">
        <p>Redirecting to dashboard...</p>
      </div>
    )
  }

  // If no user and not loading, show the sign-in page.
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
