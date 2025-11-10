'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { doc, getDoc, getFirestore } from 'firebase/firestore';

interface UserProfile {
  isAdmin: boolean;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const [isCheckingRole, setIsCheckingRole] = useState(true);

  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (!user) {
      router.replace('/');
      return;
    }

    const checkAdminRole = async () => {
      const firestore = getFirestore();
      const userDocRef = doc(firestore, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userProfile = userDoc.data() as UserProfile;
        if (userProfile.isAdmin) {
          // If user is admin and not already on the admin page, redirect
          if (!router.pathname?.startsWith('/dashboard/admin')) {
             router.replace('/dashboard/admin');
          }
        }
      }
      setIsCheckingRole(false);
    };

    checkAdminRole();
  }, [user, isLoading, router]);

  if (isLoading || isCheckingRole) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading user data...</p>
      </div>
    );
  }

  return <>{children}</>;
}
