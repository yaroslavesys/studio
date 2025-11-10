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
import { useAuth } from '@/firebase';
import { GoogleAuthProvider, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const auth = useAuth();
  const router = useRouter();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!auth) return;

    // This is the crucial part for handling the redirect back from Google.
    getRedirectResult(auth)
      .then((result) => {
        if (result && result.user) {
          // User has successfully signed in. Redirect to dashboard.
          router.push('/dashboard');
        }
        // If result is null, it means the user just landed on the page
        // without a redirect. Do nothing and let them click the button.
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

  }, [auth, router, toast]);

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
            {isSigningIn ? 'Проверка...' : 'Sign In with Google'}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Restricted to users within approved domains.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
