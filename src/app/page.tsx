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
  const [isProcessing, setIsProcessing] = useState(true); // Start as true to handle redirect result

  // Effect to handle redirect result on page load
  useEffect(() => {
    if (!auth) return;

    // If user is already loaded from a previous session, just redirect.
    if (user) {
      router.push('/dashboard');
      return;
    }
    
    getRedirectResult(auth)
      .then(async (result) => {
        if (result) {
          // User has successfully signed in via redirect.
          toast({ title: "Signed In", description: "Successfully authenticated."});
          await createUserProfile(result.user);
          await result.user.getIdToken(true); // Refresh token to get custom claims
          router.push('/dashboard');
        } else {
          // No redirect result, user is not logged in.
          // Stop the loading indicator.
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
      
  // This effect should only run once on component mount with the auth instance.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth]);


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
      toast({
        variant: 'destructive',
        title: 'Authentication service not ready',
        description: 'Please try again in a moment.',
      });
      return;
    }
    setIsProcessing(true);
    const provider = new GoogleAuthProvider();
    // Use signInWithRedirect for a robust flow that works everywhere
    await signInWithRedirect(auth, provider);
  };


  // Show a loading indicator while checking auth state or processing sign-in.
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
          <Button onClick={handleSignIn} disabled={isProcessing}>
            Sign in with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
