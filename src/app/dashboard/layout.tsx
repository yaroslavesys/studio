'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/firebase';

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
  const [isCheckingRole, setIsCheckingRole] = useState(true);

  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (!user) {
      router.replace('/');
      return;
    }

    const checkUserRole = async () => {
      // Force a refresh of the ID token to get the latest custom claims.
      const idTokenResult = await user.getIdTokenResult(true);
      const claims = (idTokenResult.claims || {}) as Partial<UserProfile>;
      const isAdmin = claims.isAdmin === true;
      const isTechLead = claims.isTechLead === true;

      if (isAdmin) {
        if (!pathname.startsWith('/dashboard/admin')) {
          router.replace('/dashboard/admin');
        }
      } else if (isTechLead) {
        if (!pathname.startsWith('/dashboard/techlead')) {
          router.replace('/dashboard/techlead');
        }
      } else {
        if (
          pathname.startsWith('/dashboard/admin') ||
          pathname.startsWith('/dashboard/techlead')
        ) {
          router.replace('/dashboard');
        }
      }
      setIsCheckingRole(false);
    };

    checkUserRole();
  }, [user, isLoading, router, pathname]);

  if (isLoading || isCheckingRole) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Verifying user role...</p>
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
