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
    // If user is already authenticated, redirect to dashboard.
    if (!isUserLoading && user) {
      router.push('/dashboard');
      return;
    }

    // Only process redirect result if we are sure there is no user.
    if (!isUserLoading && !user && auth) {
      getRedirectResult(auth)
        .then(async (result) => {
          if (result) {
            // User has successfully signed in via redirect.
            const loggedInUser = result.user;
            await createUserProfile(loggedInUser);
            // Force token refresh to get custom claims on the first login.
            await loggedInUser.getIdToken(true); 
            router.push('/dashboard'); // Redirect to dashboard.
          } else {
            // No redirect result, so it's a fresh visit. Stop processing.
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
    if (!auth) {
        toast({
            variant: "destructive",
            title: "Authentication service not ready",
            description: "Please try again in a moment.",
        });
        return;
    }
    const provider = new GoogleAuthProvider();
    // Start the sign-in process by redirecting the user.
    signInWithRedirect(auth, provider);
  };

  const createUserProfile = async (user: User) => {
    const firestore = getFirestore();
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
        console.error("Error creating or checking user profile:", error);
        // We don't re-throw here to not block the login flow.
        // Error will be logged to the console.
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
