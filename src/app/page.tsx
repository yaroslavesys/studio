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
  const [isProcessingLogin, setIsProcessingLogin] = useState(true);

  // Effect 1: Handle user redirection
  useEffect(() => {
    // If loading is finished and we have a user, go to the dashboard.
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
    // If loading is finished and there's no user, stop the loading spinner
    // on this page so the login button can be shown.
    if (!isUserLoading && !user) {
        setIsProcessingLogin(false);
    }
  }, [user, isUserLoading, router]);

  // Effect 2: Handle the result from a redirect sign-in flow
  useEffect(() => {
    if (!auth) {
      return;
    }
    
    getRedirectResult(auth)
      .then(async (result) => {
        if (result) {
          // User has successfully signed in via redirect.
          // The `onAuthStateChanged` listener will pick up the user,
          // and Effect 1 will handle the redirection.
          toast({ title: "Signed In", description: "Successfully authenticated."});
          await createUserProfile(result.user);
        } else {
            // No redirect result, which is normal on a fresh visit.
            // We can signal that we're done processing the potential login
            // if the main user loading is also done.
            if(!isUserLoading) {
              setIsProcessingLogin(false);
            }
        }
      })
      .catch((error) => {
        console.error("Redirect Result Error: ", error);
        toast({
          variant: "destructive",
          title: "Sign-in Failed",
          description: error.message || "An error occurred during sign-in.",
        });
        setIsProcessingLogin(false);
      });
  // We only want this to run when the auth service is available and user loading changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth, isUserLoading]);


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
    setIsProcessingLogin(true);
    const provider = new GoogleAuthProvider();
    await signInWithRedirect(auth, provider);
  };


  if (isUserLoading || isProcessingLogin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p>Loading...</p>
      </div>
    );
  }
  
  if (user) {
    return (
       <div className="flex min-h-screen items-center justify-center bg-background">
        <p>Redirecting to dashboard...</p>
      </div>
    )
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
          <Button onClick={handleSignIn} disabled={isProcessingLogin}>
              Sign in with Google
          </Button>
          </CardContent>
      </Card>
      </div>
  );
}
