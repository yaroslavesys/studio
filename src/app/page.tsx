
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
  const [status, setStatus] = useState<'loading' | 'signingIn' | 'redirecting' | 'idle'>('loading');

  // Effect 1: Handle user state changes
  useEffect(() => {
    console.log(`[HomePage] User State Effect. isUserLoading: ${isUserLoading}, user: ${user?.email}`);
    if (isUserLoading) {
      setStatus('loading');
      return;
    }
    if (user) {
      console.log('[HomePage] User found. Redirecting to /dashboard');
      setStatus('redirecting');
      router.push('/dashboard');
    } else {
      // Only check for redirect result if we are not already signing in and have no user
      if (status !== 'signingIn') {
        console.log('[HomePage] No user and not signing in. Checking for redirect result.');
        setStatus('loading'); // Set to loading while we check the redirect
        
        getRedirectResult(auth)
          .then(async (result) => {
            if (result) {
              console.log('[HomePage] Redirect result RECEIVED.', result);
              setStatus('redirecting');
              toast({ title: "Signed In", description: "Успешная аутентификация. Создание профиля..." });
              
              await createUserProfile(result.user);
              // The user state will change, and this useEffect will run again to redirect.
            } else {
              console.log('[HomePage] Redirect result is NULL. Setting status to idle.');
              setStatus('idle'); // No user, no redirect, we are idle.
            }
          })
          .catch((error) => {
            console.error("[HomePage] Redirect Result Error: ", error);
            toast({
              variant: "destructive",
              title: "Sign-in Failed",
              description: error.message || "Произошла ошибка во время входа.",
            });
            setStatus('idle');
          });
      }
    }
  }, [user, isUserLoading, auth, router, toast]);

  const createUserProfile = async (user: User) => {
    if (!auth) return;
    
    console.log('[createUserProfile] Attempting to create profile for UID:', user.uid);

    if (!user.email) {
      console.error("[HomePage] CRITICAL: User object from redirect is missing email. Cannot create profile.", user);
      toast({
          variant: "destructive",
          title: "Ошибка создания профиля",
          description: "Ваш аккаунт Google не предоставил email. Вход невозможен.",
      });
      setStatus('idle');
      return;
    }

    const firestore = getFirestore(auth.app);
    const userDocRef = doc(firestore, 'users', user.uid);
    try {
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) {
        const newUserProfile = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          isAdmin: false, 
          isTechLead: false, 
        };
        console.log('[createUserProfile] User does not exist. Creating with data:', newUserProfile);
        await setDoc(userDocRef, newUserProfile, { merge: true });
        console.log('[createUserProfile] Profile CREATED successfully.');
      } else {
        console.log('[createUserProfile] User already exists. No action needed.');
      }
    } catch (error) {
      console.error("[createUserProfile] Error creating user profile:", error);
      toast({
        variant: "destructive",
        title: "Profile Error",
        description: "Не удалось создать или проверить ваш профиль пользователя.",
      });
    }
  };

  const handleSignIn = async () => {
    if (!auth) {
      toast({ variant: 'destructive', title: 'Сервис аутентификации не готов' });
      return;
    }
    console.log('[handleSignIn] Starting sign-in process...');
    setStatus('signingIn');
    try {
        await setPersistence(auth, browserLocalPersistence);
        console.log('[handleSignIn] Persistence set. Creating GoogleAuthProvider.');
        const provider = new GoogleAuthProvider(); // Use the specific provider
        await signInWithRedirect(auth, provider);
        console.log('[handleSignIn] signInWithRedirect called. Now waiting for redirect...');
    } catch(error: any) {
         console.error('[handleSignIn] Error:', error);
         toast({ variant: 'destructive', title: 'Sign in failed', description: error.message });
         setStatus('idle');
    }
  };
  
  if (status === 'loading' || status === 'redirecting') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p>{status === 'redirecting' ? 'Перенаправление на дашборд...' : 'Загрузка...'}</p>
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
              Войдите, чтобы получить доступ к своей панели управления.
          </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
          <Button onClick={handleSignIn} disabled={status === 'signingIn'}>
             {status === 'signingIn' ? 'Перенаправление в Google...' : 'Войти с помощью Google'}
          </Button>
          </CardContent>
      </Card>
      </div>
  );
}
