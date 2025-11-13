
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

  console.log('[HomePage] Render. Status:', status, 'isUserLoading:', isUserLoading, 'User:', user?.email);

  useEffect(() => {
    if (isUserLoading) {
      console.log('[HomePage] useEffect (user check): Firebase is loading user. Waiting...');
      setStatus('loading');
      return; 
    }
    if (user) {
      console.log('[HomePage] useEffect (user check): User is already logged in, redirecting to dashboard. User:', user.email);
      setStatus('redirecting');
      router.push('/dashboard');
    } else {
       console.log('[HomePage] useEffect (user check): No user found yet. Status becomes idle.');
       // Only set to idle if we aren't already in the middle of a sign-in flow
       if (status !== 'signingIn') {
           setStatus('idle');
       }
    }
  }, [user, isUserLoading, router, status]);

  useEffect(() => {
    // This effect should only run once when the auth service is available
    if (!auth) {
      console.log('[HomePage] Redirect useEffect: Auth service not ready.');
      return;
    }

    console.log('[HomePage] Redirect useEffect: Auth ready. Checking for redirect result...');
    getRedirectResult(auth)
      .then(async (result) => {
        if (result) {
          console.log('[HomePage] Redirect result RECEIVED.', result);
          setStatus('redirecting');
          toast({ title: "Signed In", description: "Успешная аутентификация. Создание профиля..." });
          
          if (!result.user.email) {
            console.error("[HomePage] CRITICAL: User object from redirect is missing email. Cannot create profile.", result.user);
            toast({
                variant: "destructive",
                title: "Ошибка создания профиля",
                description: "Ваш аккаунт Google не предоставил email. Вход невозможен.",
            });
            setStatus('idle');
            return;
          }

          console.log('[HomePage] Calling createUserProfile for user:', result.user.email);
          await createUserProfile(result.user);
          // The useUser hook will update, and the first useEffect will handle the redirect.
        } else {
          console.log('[HomePage] Redirect result is NULL. No user from redirect.');
           // If there is no result and no user is loading, we are truly idle.
          if(!isUserLoading && !user) {
            setStatus('idle');
          }
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
  }, [auth]); // Depend only on auth

  const createUserProfile = async (user: User) => {
    if (!auth) return;
    
    console.log('[createUserProfile] Attempting to create profile for UID:', user.uid);

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
        const provider = new GoogleAuthProvider();
        await signInWithRedirect(auth, provider);
        console.log('[handleSignIn] signInWithRedirect called. Now waiting for redirect...');
    } catch(error: any) {
         console.error('[handleSignIn] Error:', error);
         toast({ variant: 'destructive', title: 'Sign in failed', description: error.message });
         setStatus('idle');
    }
  };
  
  // A consolidated loading state
  if (status === 'loading' || status === 'redirecting' || (isUserLoading && status !== 'idle')) {
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
