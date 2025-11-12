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
      return; // Stop further execution
    }

    // This block handles the redirect result from Google Sign-In.
    if (!isUserLoading && !user && auth) {
      getRedirectResult(auth)
        .then(async (result) => {
          if (result) {
            // User has successfully signed in.
            const loggedInUser = result.user;
            await createUserProfile(loggedInUser); // Ensure profile exists
            await loggedInUser.getIdToken(true); // Force token refresh for custom claims
            router.push('/dashboard'); // Redirect to dashboard
          } else {
            // No redirect result, meaning the user is visiting the page normally.
            // It's safe to stop the processing indicator and show the login button.
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
          setIsProcessing(false); // Stop processing on error
        });
    }
  }, [user, isUserLoading, auth, router, toast]);

  const handleSignIn = () => {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    // Start the sign-in process by redirecting the user.
    signInWithRedirect(auth, provider);
  };

  const createUserProfile = async (user: User) => {
    const firestore = getFirestore();
    const userDocRef = doc(firestore, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      // Only create a new profile if one doesn't exist.
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

  // Show a loading indicator while checking auth state or processing the redirect.
  if (isUserLoading || isProcessing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p>Loading...</p>
      </div>
    );
  }


  // If not loading and no user, show the login page.
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
