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
import { useAuth, useFirebase } from '@/firebase';
import { GoogleAuthProvider, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const { auth, user, isUserLoading } = useFirebase();
  const router = useRouter();
  const [isSigningIn, setIsSigningIn] = useState(true); // Start as true to handle redirect
  const { toast } = useToast();

  useEffect(() => {
    if (!isUserLoading) {
      if (user) {
        // If user is already logged in, redirect to dashboard
        router.push('/dashboard');
      } else {
        // If no user, handle redirect result
        if (!auth) return;
        getRedirectResult(auth)
          .then((result) => {
            if (result && result.user) {
              // This is the success case after redirect.
              // The user object will be picked up by the auth state listener,
              // triggering the redirect to dashboard.
            }
          })
          .catch((error) => {
            console.error('Error getting redirect result:', error);
            toast({
              variant: 'destructive',
              title: 'Sign-in Failed',
              description: error.message || 'Could not complete sign-in. Please try again.',
            });
          })
          .finally(() => {
            setIsSigningIn(false);
          });
      }
    }
  }, [auth, user, isUserLoading, router, toast]);

  const handleSignIn = async () => {
    if (!auth) {
       toast({
        variant: "destructive",
        title: "Sign-in Failed",
        description: "Authentication service is not available. Please try again later.",
      });
      return;
    }
    
    setIsSigningIn(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      // signInWithRedirect will navigate away, the useEffect hook will handle the return.
      await signInWithRedirect(auth, provider);
    } catch (error) {
      console.error('Error starting sign-in redirect: ', error);
      toast({
        variant: "destructive",
        title: "Sign-in Failed",
        description: (error as Error).message || "An error occurred during the sign-in process.",
      });
      setIsSigningIn(false);
    } 
  };
  
  // Show a loading state while checking auth status
  if (isUserLoading || isSigningIn) {
      return (
          <div className="flex min-h-screen items-center justify-center">
            <p>Loading...</p>
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
            Упрощенное управление доступом для вашей организации.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button
            onClick={handleSignIn}
            className="w-full transform transition-transform duration-150 hover:scale-105"
            size="lg"
          >
            Sign In with Google
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Restricted to users within approved domains.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
