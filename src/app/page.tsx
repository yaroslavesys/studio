'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { useFirebase } from '@/firebase';
import { GoogleAuthProvider, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const { auth, user } = useFirebase();
  const router = useRouter();
  const [isSigningIn, setIsSigningIn] = useState(true); // Start as true to handle initial redirect check
  const { toast } = useToast();

  // This effect runs ONLY ONCE on page load.
  // 1. It helps developers authorize their domain in Firebase Console.
  // 2. It handles the result after returning from Google's sign-in page.
  useEffect(() => {
    if (!auth) {
      setIsSigningIn(false);
      return;
    };

    // --- Helper for developers to authorize their domain ---
    if (process.env.NODE_ENV === 'development') {
      try {
        const currentHostname = window.location.hostname;
        // This is a common point of failure for developers, so we'll log a helpful message.
        console.log(
          `%c[Firebase Auth]%c Make sure this domain is authorized in the Firebase Console: %c${currentHostname}`,
          'color: #FFCA28; font-weight: bold;',
          'color: inherit;',
          'color: #1E88E5; font-weight: bold;'
        );
         console.log(
          `%c[Firebase Auth]%c Or go to: %chttps://console.firebase.google.com/project/${auth.app.options.projectId}/authentication/providers`,
          'color: #FFCA28; font-weight: bold;',
          'color: inherit;',
          'color: #1E88E5; font-weight: bold; text-decoration: underline;'
        );
      } catch (e) {
        // This might fail in non-browser environments, but it's safe to ignore.
      }
    }
    // --- End of helper ---

    getRedirectResult(auth)
      .then((result) => {
        // If result is not null, it means the user just signed in successfully.
        if (result && result.user) {
          // Redirect to dashboard immediately after successful sign-in.
          router.push('/dashboard');
        } else {
          // If result is null, it means this is a normal page load, not a redirect.
          // We can stop the loading indicator.
          setIsSigningIn(false);
        }
      })
      .catch((error) => {
        console.error('Error getting redirect result:', error);
        toast({
          variant: 'destructive',
          title: 'Sign-in Failed',
          description: 'Could not complete sign-in. Please try again.',
        });
        setIsSigningIn(false);
      });
  }, [auth, router, toast]);

  // This function handles the button click. It will always initiate the sign-in process.
  const handleSignIn = async () => {
    if (!auth) return;
    
    setIsSigningIn(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account',
    });

    try {
      // This will redirect the user to the Google sign-in page.
      // After they sign in, the useEffect hook above will handle the result.
      await signInWithRedirect(auth, provider);
    } catch (error) {
      console.error('Error starting sign-in redirect: ', error);
       toast({
        variant: "destructive",
        title: "Sign-in Failed",
        description: "An error occurred during the sign-in process.",
      });
      setIsSigningIn(false);
    } 
  };

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
            Упрощенное управление доступом для вашей организации.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button
            onClick={handleSignIn}
            className="w-full transform transition-transform duration-150 hover:scale-105"
            size="lg"
            disabled={isSigningIn}
          >
            {isSigningIn ? 'Signing In...' : 'Sign In with Google'}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Restricted to users within approved domains.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
