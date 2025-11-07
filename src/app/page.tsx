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
  const { auth, user, isUserLoading } = useFirebase();
  const router = useRouter();
  const [isSigningIn, setIsSigningIn] = useState(true); // Start as true to handle initial redirect check
  const { toast } = useToast();

  // This effect runs ONLY ONCE on page load to check if this is a redirect from Google sign-in.
  useEffect(() => {
    if (auth) {
      getRedirectResult(auth)
        .then((result) => {
          // If result is not null, it means the user just signed in.
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
    }
  }, [auth, router, toast]);

  // This function handles the button click. It will always initiate the sign-in process.
  const handleSignIn = async () => {
    if (!auth) return;
    
    // If the user is already authenticated, a redirect will quickly resolve and bring them back.
    // This simplifies the logic to a single action.
    setIsSigningIn(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account',
    });

    try {
      // This will redirect the user to the Google sign-in page.
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
  
  // The page is loading if we are checking for a redirect result OR if the initial user state is still loading.
  const isLoading = isSigningIn || isUserLoading;

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
            disabled={isLoading}
          >
            {isLoading ? 'Signing In...' : 'Sign In with Google'}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Restricted to users within approved domains.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
