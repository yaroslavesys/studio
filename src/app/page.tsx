
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleAuthProvider, signInWithPopup, User } from 'firebase/auth';
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
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Effect to redirect user if already logged in
  useEffect(() => {
    // Wait until the user loading is complete
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

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
          teamId: null,
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
    
    try {
        const result = await signInWithPopup(auth, provider);
        toast({ title: 'Вход выполнен', description: 'Создание профиля...' });
        await createUserProfile(result.user);
        // The useEffect will handle the redirect
    } catch (error: any) {
        // Handle common errors
        if (error.code === 'auth/popup-closed-by-user') {
            toast({ variant: 'default', title: 'Вход отменен', description: 'Вы закрыли окно входа.' });
        } else {
            console.error('[handleSignIn] Error:', error);
            toast({ variant: 'destructive', title: 'Ошибка входа', description: error.message });
        }
    } finally {
        setIsSigningIn(false);
    }
  };

  // Show a loading screen while Firebase is initializing
  if (isUserLoading) {
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
