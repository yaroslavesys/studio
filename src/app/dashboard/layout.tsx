'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useFirestore, useUser } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface UserProfile {
  isAdmin: boolean;
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

    const checkAdminRole = async () => {
      const userDocRef = doc(firestore, 'users', user.uid);
      try {
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userProfile = userDoc.data() as UserProfile;
          if (userProfile.isAdmin) {
            // If user is admin and not on an admin page, redirect to admin dashboard
            if (!pathname.startsWith('/dashboard/admin')) {
              router.replace('/dashboard/admin');
            }
          } else {
            // If user is not admin and trying to access admin page, redirect to user dashboard
            if (pathname.startsWith('/dashboard/admin')) {
              router.replace('/dashboard');
            }
          }
        } else {
            // If profile doesn't exist, and they are trying to access admin, redirect.
             if (pathname.startsWith('/dashboard/admin')) {
              router.replace('/dashboard');
            }
        }
      } catch (error) {
        console.error("Error checking admin role:", error);
         if (pathname.startsWith('/dashboard/admin')) {
            router.replace('/dashboard');
          }
      } finally {
        setIsCheckingRole(false);
      }
    };

    checkAdminRole();
  }, [user, isLoading, router, firestore, pathname]);

  if (isLoading || isCheckingRole) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading user data...</p>
      </div>
    );
  }

  return <>{children}</>;
}
