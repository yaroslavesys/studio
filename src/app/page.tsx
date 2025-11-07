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

const ALLOWED_DOMAINS = ['trafficdevils.net', 'newdevils.net'];

export default function LoginPage() {
  const { auth, user, isUserLoading } = useFirebase();
  const router = useRouter();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const { toast } = useToast();

  // Effect to handle the result of the redirect
  useEffect(() => {
    if (!auth || isSigningIn) return;

    const processRedirectResult = async () => {
        setIsSigningIn(true);
        try {
            const result = await getRedirectResult(auth);
            if (result && result.user) {
                const emailDomain = result.user.email?.split('@')[1];
                if (emailDomain && ALLOWED_DOMAINS.includes(emailDomain)) {
                    router.push('/dashboard');
                } else {
                    await auth.signOut();
                    toast({
                        variant: 'destructive',
                        title: 'Access Denied',
                        description: 'Your email domain is not authorized for access.',
                    });
                }
            }
        } catch (error) {
            console.error('Error handling redirect result: ', error);
            toast({
                variant: 'destructive',
                title: 'Sign-in Failed',
                description: 'An error occurred during the sign-in process.',
            });
        } finally {
            setIsSigningIn(false);
        }
    };

    processRedirectResult();
  }, [auth, router, toast, isSigningIn]);


  const handleSignIn = async () => {
    if (!auth) return;

    // If user is already logged in from a previous session, just go to the dashboard.
    if (user) {
        router.push('/dashboard');
        return;
    }

    // If user is not logged in, start the sign-in process.
    setIsSigningIn(true);
    const provider = new GoogleAuthProvider();
    // Add custom parameters to ensure the user always has to select an account.
    provider.setCustomParameters({
      prompt: 'select_account',
    });
    try {
      await signInWithRedirect(auth, provider);
      // The page will redirect to Google, and then back.
      // The useEffect hook will handle the result.
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
  
  const isLoading = isUserLoading || isSigningIn;

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
