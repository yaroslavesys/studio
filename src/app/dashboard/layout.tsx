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
  const [isCheckingRole, setIsCheckingRole] = useState(true);

  useEffect(() => {
    // If Firebase is still checking the user, we wait.
    if (isUserLoading) {
      return;
    }

    // If loading is done and there is no user, redirect to login.
    if (!user) {
      router.replace('/');
      return;
    }

    // If we have a user, check their role from the ID token.
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
      setIsCheckingRole(false);
    };

    checkUserRole();
    
  }, [user, isUserLoading, router, pathname]);

  // While Firebase is loading OR we are checking the role, show a loading screen.
  if (isUserLoading || isCheckingRole) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Verifying user role...</p>
      </div>
    );
  }
  
  // If loading is done and there's still no user, show a redirecting message.
  // The useEffect above should have already started the redirect.
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Redirecting to login...</p>
      </div>
    );
  }

  // If all checks have passed, render the actual dashboard page.
  return <>{children}</>;
}
