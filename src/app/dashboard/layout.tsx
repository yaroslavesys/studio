'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useFirestore, useUser } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface UserProfile {
  isAdmin: boolean;
  isTechLead: boolean;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading: isLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const firestore = useFirestore();
  const [isCheckingRole, setIsCheckingRole] = useState(true);

  useEffect(() => {
    if (isLoading || !firestore) {
      return;
    }
    if (!user) {
      router.replace('/');
      return;
    }

    const checkUserRole = async () => {
      const userDocRef = doc(firestore, 'users', user.uid);
      try {
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userProfile = userDoc.data() as UserProfile;
          if (userProfile.isAdmin) {
            if (!pathname.startsWith('/dashboard/admin')) {
              router.replace('/dashboard/admin');
            }
          } else if (userProfile.isTechLead) {
            if (!pathname.startsWith('/dashboard/techlead')) {
              router.replace('/dashboard/techlead');
            }
          } else {
            if (pathname.startsWith('/dashboard/admin') || pathname.startsWith('/dashboard/techlead')) {
              router.replace('/dashboard');
            }
          }
        } else {
            if (pathname.startsWith('/dashboard/admin') || pathname.startsWith('/dashboard/techlead')) {
              router.replace('/dashboard');
            }
        }
      } catch (error) {
        console.error("Error checking user role:", error);
         if (pathname.startsWith('/dashboard/admin') || pathname.startsWith('/dashboard/techlead')) {
            router.replace('/dashboard');
          }
      } finally {
        setIsCheckingRole(false);
      }
    };

    checkUserRole();
  }, [user, isLoading, router, firestore, pathname]);

  if (isLoading || isCheckingRole) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading user data...</p>
      </div>
    );
  }
  
  if (!user) {
     return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Redirecting to login...</p>
      </div>
    );
  }

  return <>{children}</>;
}
