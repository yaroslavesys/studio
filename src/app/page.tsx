
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
  // State to manage the sign-in process and UI feedback
  const [status, setStatus] = useState<'idle' | 'loading' | 'signingIn' | 'redirecting'>('loading');

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
  
  // This effect runs once on mount to handle the redirect result.
  useEffect(() => {
    if (!auth) return;

    // Set status to loading while we check for redirect result
    setStatus('loading');

    getRedirectResult(auth)
      .then(async (result) => {
        if (result) {
          // User has just signed in from a redirect.
          setStatus('redirecting'); // Show redirecting message
          toast({ title: "Signed In", description: "Successfully authenticated." });
          await createUserProfile(result.user);
          // The useUser hook will pick up the new user state, and the next effect will handle the redirect.
        } else if (!user && !isUserLoading) {
          // No redirect result, user is not logged in, and auth is not loading.
          setStatus('idle'); // Show the sign-in button
        }
      })
      .catch((error) => {
        console.error("Redirect Result Error: ", error);
        toast({
          variant: "destructive",
          title: "Sign-in Failed",
          description: error.message || "An error occurred during sign-in.",
        });
        setStatus('idle'); // On error, allow user to try again
      });
  }, [auth]); // Depends only on the auth service instance.

  // This effect reacts to changes in the user state.
  useEffect(() => {
    // If the user object is available, it means login was successful.
    if (user) {
      setStatus('redirecting');
      router.push('/dashboard');
    }
    // If auth has loaded and there's no user, we are idle.
    else if (!isUserLoading) {
      setStatus('idle');
    }

  }, [user, isUserLoading, router]);

  const handleSignIn = async () => {
    if (!auth) {
      toast({ variant: 'destructive', title: 'Authentication service not ready' });
      return;
    }
    setStatus('signingIn');
    try {
        // This is CRITICAL: It tells Firebase to remember the user across browser sessions.
        await setPersistence(auth, browserLocalPersistence);
        const provider = new GoogleAuthProvider();
        // Start the sign-in process. The user will be redirected to Google and then back.
        await signInWithRedirect(auth, provider);
    } catch(error: any) {
         toast({ variant: 'destructive', title: 'Sign in failed', description: error.message });
         setStatus('idle');
    }
  };
  
  // Render based on the current status
  if (status === 'loading' || status === 'redirecting' || isUserLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p>{status === 'redirecting' ? 'Redirecting to dashboard...' : 'Loading...'}</p>
      </div>
    );
  }

  // If status is idle and no user, show the sign-in page.
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
          <Button onClick={handleSignIn} disabled={status === 'signingIn'}>
             {status === 'signingIn' ? 'Redirecting to Google...' : 'Sign in with Google'}
          </Button>
          </CardContent>
      </Card>
      </div>
  );
}
