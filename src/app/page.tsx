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
import { GoogleAuthProvider, signInWithRedirect } from 'firebase/auth';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

const ALLOWED_DOMAINS = ['trafficdevils.net', 'newdevils.net'];

export default function LoginPage() {
  const { auth, user, isUserLoading } = useFirebase();
  const router = useRouter();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const { toast } = useToast();

  const handleSignIn = async () => {
    if (!auth) return;

    // If user is already logged in, just go to the dashboard.
    if (user) {
        router.push('/dashboard');
        return;
    }

    // If user is not logged in, start the sign-in process.
    setIsSigningIn(true);
    const provider = new GoogleAuthProvider();
    try {
      // Using signInWithRedirect for a more robust sign-in flow
      await signInWithRedirect(auth, provider);
      // The page will redirect to Google, and then back to this page.
      // The onAuthStateChanged listener in FirebaseProvider will handle the user
      // session and redirect to the dashboard if successful.
    } catch (error) {
      console.error('Error signing in with Google: ', error);
       toast({
        variant: "destructive",
        title: "Sign-in Failed",
        description: "An error occurred during the sign-in process.",
      });
      setIsSigningIn(false);
    } 
  };
  
    // Effect to handle redirection after successful sign-in
  useEffect(() => {
    if (!isUserLoading && user) {
        const emailDomain = user.email?.split('@')[1];
        if (emailDomain && ALLOWED_DOMAINS.includes(emailDomain)) {
            router.push('/dashboard');
        } else {
            // This case handles if a user signs in with an unallowed domain
            // after a redirect flow.
            auth?.signOut();
            toast({
                variant: "destructive",
                title: "Access Denied",
                description: "Your email domain is not authorized for access.",
            });
        }
    }
  }, [user, isUserLoading, router, auth, toast]);

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
