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
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [hasCheckedRole, setHasCheckedRole] = useState(false);

  useEffect(() => {
    // Wait until Firebase has finished its initial user check.
    if (isUserLoading) {
      return; // Do nothing, wait for loading to finish.
    }

    // If loading is done and there's no user, redirect to the login page.
    if (!user) {
      router.replace('/');
      return;
    }
    
    // If we have a user, check their roles.
    const checkUserRole = async () => {
      // Force a refresh of the ID token to get the latest custom claims.
      const idTokenResult = await user.getIdTokenResult(true);
      const claims = (idTokenResult.claims || {}) as Partial<UserProfile>;
      const isAdmin = claims.isAdmin === true;
      const isTechLead = claims.isTechLead === true;

      // Redirect based on role and current path.
      if (isAdmin && !pathname.startsWith('/dashboard/admin')) {
        router.replace('/dashboard/admin');
      } else if (!isAdmin && isTechLead && !pathname.startsWith('/dashboard/techlead')) {
        router.replace('/dashboard/techlead');
      } else if (!isAdmin && !isTechLead && (pathname.startsWith('/dashboard/admin') || pathname.startsWith('/dashboard/techlead'))) {
        router.replace('/dashboard');
      }
      
      // Role check is complete, we can show the content.
      setHasCheckedRole(true);
    };

    checkUserRole();
    
  }, [user, isUserLoading, router, pathname]);

  // While Firebase is loading OR we are checking the role, show a loading screen.
  if (isUserLoading || !hasCheckedRole) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Verifying user role...</p>
      </div>
    );
  }

  // If all checks have passed, render the actual dashboard page.
  return <>{children}</>;
}
