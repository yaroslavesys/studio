
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleAuthProvider, signInWithPopup, User, getRedirectResult, signInWithRedirect } from 'firebase/auth';
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
  const [isSigningIn, setIsSigningIn] = useState(true); // Start as true

  // Effect to handle redirect result
  useEffect(() => {
    if (!auth) return;

    getRedirectResult(auth)
      .then(async (result) => {
        if (result) {
          toast({ title: 'Вход выполнен', description: 'Создание профиля...' });
          await createUserProfile(result.user);
          // The main useEffect will handle the redirect to /dashboard
        }
        // If there's no result, it means the user just landed on the page
        // without coming from a redirect. In this case, we stop loading.
        setIsSigningIn(false);
      })
      .catch((error) => {
        console.error('[handleRedirectResult] Error:', error);
        toast({ variant: 'destructive', title: 'Ошибка входа', description: error.message });
        setIsSigningIn(false);
      });
  }, [auth]);


  // Effect to redirect user if already logged in
  useEffect(() => {
    // Wait until the user loading is complete and the redirect check is done
    if (user && !isUserLoading && !isSigningIn) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, isSigningIn, router]);

  const createUserProfile = async (user: User) => {
    if (!auth) return;

    if (!user.email) {
      console.error("[HomePage] CRITICAL: User object from auth is missing email. Cannot create profile.", user);
      toast({
          variant: "destructive",
          title: "Ошибка создания профиля",
          description: "Ваш аккаунт Google не предоставил email. Вход невозможен.",
      });
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
          teamId: null, // Explicitly set teamId to null
        };
        await setDoc(userDocRef, newUserProfile);
        toast({ title: "Профиль создан", description: "Добро пожаловать!" });
      }
    } catch (error) {
      console.error("[createUserProfile] Error creating user profile:", error);
      toast({
        variant: "destructive",
        title: "Ошибка профиля",
        description: "Не удалось создать или проверить ваш профиль пользователя.",
      });
    }
  };

  const handleSignIn = async () => {
    if (!auth) {
      toast({ variant: 'destructive', title: 'Сервис аутентификации не готов' });
      return;
    }

    setIsSigningIn(true);
    const provider = new GoogleAuthProvider();
    // We use signInWithRedirect now
    signInWithRedirect(auth, provider);
  };

  // Show a loading screen while Firebase is initializing or if a sign-in is in progress
  if (isUserLoading || isSigningIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p>Загрузка...</p>
      </div>
    );
  }

  // Do not render the login page if the user is already logged in and redirecting
  if (user) {
    return (
       <div className="flex min-h-screen items-center justify-center bg-background">
        <p>Перенаправление на дашборд...</p>
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
            <Button onClick={handleSignIn} disabled={isSigningIn}>
               {isSigningIn ? 'Вход...' : 'Войти с помощью Google'}
            </Button>
            </CardContent>
        </Card>
      </div>
  );
}

    