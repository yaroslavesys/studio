'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, User } from 'firebase/auth';
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
  const [isProcessing, setIsProcessing] = useState(true);
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    // Эта проверка определит, находимся ли мы в iframe.
    // Она выполнится только на клиенте, избегая ошибок гидратации.
    setIsInIframe(window.self !== window.top);
  }, []);

  // Эффект для обработки результата редиректа
  useEffect(() => {
    if (!auth || user) {
        if(user) {
            router.push('/dashboard');
        } else {
             setIsProcessing(false);
        }
      return;
    }
    
    getRedirectResult(auth)
      .then(async (result) => {
        if (result) {
          toast({ title: "Signed In", description: "Successfully authenticated."});
          await createUserProfile(result.user);
          await result.user.getIdToken(true); 
          router.push('/dashboard');
        } else {
          setIsProcessing(false);
        }
      })
      .catch((error) => {
        console.error("Redirect Result Error: ", error);
        toast({
          variant: "destructive",
          title: "Sign-in Failed",
          description: error.message || "An error occurred during sign-in.",
        });
        setIsProcessing(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth]);


  const createUserProfile = async (user: User) => {
    const firestore = getFirestore();
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
        description: "Could not create or verify your user profile.",
      });
    }
  };

  const handleSignIn = async () => {
    if (!auth) {
      toast({ variant: 'destructive', title: 'Authentication service not ready' });
      return;
    }
    setIsProcessing(true);
    const provider = new GoogleAuthProvider();

    if (isInIframe) {
      // Для iframe мы используем signInWithRedirect, так как это самый надежный способ,
      // который не блокируется браузерами. Он перезагрузит весь фрейм.
      await signInWithRedirect(auth, provider);
    } else {
      // Для обычного окна используем signInWithPopup
      try {
        const result = await signInWithPopup(auth, provider);
        toast({ title: "Signed In", description: "Successfully authenticated."});
        await createUserProfile(result.user);
        await result.user.getIdToken(true);
        router.push('/dashboard');
      } catch (error: any) {
         toast({
          variant: "destructive",
          title: "Sign-in Failed",
          description: error.message || "An error occurred during sign-in.",
        });
        setIsProcessing(false);
      }
    }
  };


  if (isUserLoading || isProcessing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p>Loading...</p>
      </div>
    );
  }

  // Если не загружаемся и нет пользователя, показать страницу входа
  if (!user) {
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
                Sign in to access your dashboard.
            </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
            <Button onClick={handleSignIn} disabled={isProcessing}>
                Sign in with Google
            </Button>
            </CardContent>
        </Card>
        </div>
    );
  }

  // Если пользователь уже вошел, можно просто показать загрузку или null перед редиректом
  return (
     <div className="flex min-h-screen items-center justify-center bg-background">
        <p>Redirecting to dashboard...</p>
      </div>
  );
}
