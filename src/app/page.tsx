
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

  useEffect(() => {
    if (isUserLoading) {
      return; 
    }
    if (user) {
      setStatus('redirecting');
      router.push('/dashboard');
    } else {
      setStatus('idle');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (!auth) return;

    getRedirectResult(auth)
      .then(async (result) => {
        if (result) {
          setStatus('redirecting');
          toast({ title: "Signed In", description: "Успешная аутентификация. Создание профиля..." });
          await createUserProfile(result.user);
          // The useUser hook will update and the first useEffect will handle the redirect.
        }
      })
      .catch((error) => {
        console.error("Redirect Result Error: ", error);
        toast({
          variant: "destructive",
          title: "Sign-in Failed",
          description: error.message || "Произошла ошибка во время входа.",
        });
        setStatus('idle');
      });
  }, [auth]);

  const createUserProfile = async (user: User) => {
    if (!auth) return;

    // --- ЭТО ФИНАЛЬНЫЙ ФИКС ---
    // Если по какой-то причине аккаунт Google не вернул email,
    // мы не можем создать профиль и должны остановить процесс.
    if (!user.email) {
      console.error("CRITICAL: User object is missing email. Cannot create profile.", user);
      toast({
          variant: "destructive",
          title: "Ошибка создания профиля",
          description: "Ваш аккаунт Google не предоставил email. Вход невозможен.",
      });
      // Предотвращаем дальнейшее выполнение, чтобы избежать ошибок
      return;
    }
    
    const firestore = getFirestore(auth.app);
    const userDocRef = doc(firestore, 'users', user.uid);
    try {
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          isAdmin: false, 
          isTechLead: false, 
        }, { merge: true });
      }
    } catch (error) {
      console.error("Error creating user profile:", error);
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
    setStatus('signingIn');
    try {
        await setPersistence(auth, browserLocalPersistence);
        const provider = new GoogleAuthProvider();
        await signInWithRedirect(auth, provider);
    } catch(error: any) {
         toast({ variant: 'destructive', title: 'Sign in failed', description: error.message });
         setStatus('idle');
    }
  };
  
  if (status === 'loading' || status === 'redirecting' || isUserLoading) {
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
