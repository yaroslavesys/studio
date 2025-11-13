'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, User } from 'firebase/auth';
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
    if (!auth) {
      setIsProcessing(false);
      return;
    }
    // If a user is already logged in, redirect them.
    if (user) {
      router.push('/dashboard');
      return;
    }

    getRedirectResult(auth)
      .then(async (result) => {
        if (result) {
          toast({ title: "Signed In", description: "Successfully authenticated."});
          await createUserProfile(result.user);
          await result.user.getIdToken(true); 
          router.push('/dashboard');
        } else {
          setIsProcessing(false);
        }
      })
      .catch((error) => {
        console.error("Redirect Result Error: ", error);
        if (error.code !== 'auth/web-storage-unsupported') {
            toast({
              variant: "destructive",
              title: "Sign-in Failed",
              description: error.message || "An error occurred during sign-in.",
            });
        }
        setIsProcessing(false);
      });
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
      toast({ variant: 'destructive', title: 'Authentication service not ready' });
      return;
    }
    setIsProcessing(true);
    const provider = new GoogleAuthProvider();

    // The ONLY reliable way to sign in within restrictive iframes (like Studio/Previews)
    // is to trigger a full-page redirect. We use signInWithRedirect for this.
    await signInWithRedirect(auth, provider);
  };


  if (isUserLoading || isProcessing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p>Loading...</p>
      </div>
    );
  }

  // If not loading and no user, show the login page
  if (!user) {
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

  // Fallback for when user is loaded but redirect hasn't happened yet
  return (
     <div className="flex min-h-screen items-center justify-center bg-background">
        <p>Redirecting to dashboard...</p>
      </div>
  );
}
