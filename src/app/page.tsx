
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
  const { user, isUserLoading: isLoading } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    if (!auth || isLoading) {
        return;
    }
    
    // If a user is already logged in, no need to check for redirect, just go to dashboard.
    if(user) {
        router.push('/dashboard');
        return;
    }

    getRedirectResult(auth)
      .then(async (result) => {
        if (result) {
          // This is the signed-in user
          const user = result.user;
          // Create a user profile if it doesn't exist
          await createUserProfile(user);
          // Force token refresh to get custom claims
          await user.getIdToken(true);
          // Redirect to the dashboard
          router.push('/dashboard');
        }
        // If result is null, it means we are not coming from a redirect.
        // We do nothing and just show the login page.
      })
      .catch((error) => {
        console.error("Authentication error: ", error);
        toast({
          variant: "destructive",
          title: "Sign-in Failed",
          description: error.message || "An unexpected error occurred during sign-in.",
        });
      });
  }, [auth, isLoading, user, router, toast]);

  const handleSignIn = async () => {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
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
