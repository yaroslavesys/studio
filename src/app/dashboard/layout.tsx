
'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/firebase';

interface UserClaims {
  isAdmin?: boolean;
  isTechLead?: boolean;
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
    // 1. Wait until Firebase has finished its initial user loading.
    if (isUserLoading) {
      return; // Do nothing, just wait.
    }

    // 2. If loading is finished and there's NO user, redirect to login.
    if (!user) {
      router.replace('/');
      return;
    }
    
    // 3. If loading is finished and there IS a user, check their role via Custom Claims.
    const checkUserRole = async () => {
      try {
        // Force a refresh of the ID token to get the latest custom claims.
        // This is the most critical part to get the correct roles immediately.
        const idTokenResult = await user.getIdTokenResult(true); 
        const claims = (idTokenResult.claims || {}) as UserClaims;
        const isAdmin = claims.isAdmin === true;
        const isTechLead = claims.isTechLead === true;

        // 4. Redirect based on role.
        // This logic prevents infinite loops by checking the current path.
        if (isAdmin && !pathname.startsWith('/dashboard/admin')) {
          router.replace('/dashboard/admin');
        } else if (!isAdmin && isTechLead && !pathname.startsWith('/dashboard/techlead')) {
          router.replace('/dashboard/techlead');
        } else if (!isAdmin && !isTechLead && (pathname.startsWith('/dashboard/admin') || pathname.startsWith('/dashboard/techlead'))) {
          // If a normal user tries to access admin/techlead pages, send them to their dashboard.
          router.replace('/dashboard');
        }
      } catch (error) {
        console.error("Error getting user claims:", error);
        // If we can't get claims, send to basic dashboard to avoid loops.
        router.replace('/dashboard');
      } finally {
        // 5. Mark that the role check is complete.
        setHasCheckedRole(true);
      }
    };

    checkUserRole();
    
  }, [user, isUserLoading, router, pathname]);

  // While Firebase is loading OR we haven't finished the role check, show a loading screen.
  if (isUserLoading || !hasCheckedRole) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Verifying user role...</p>
      </div>
    );
  }

  // If all checks passed, render the actual content for the dashboard.
  return <>{children}</>;
}
