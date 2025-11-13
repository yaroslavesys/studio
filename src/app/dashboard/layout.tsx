
'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';

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
  const [isCheckingRole, setIsCheckingRole] = useState(true);
  const [hasChecked, setHasChecked] = useState(false);

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
    
    // 3. Only check role once per user session
    if (hasChecked) {
      setIsCheckingRole(false);
      return;
    }
    
    // 4. If loading is finished and there IS a user, check their role via Custom Claims.
    const checkUserRole = async () => {
      try {
        // Force a refresh of the ID token to get the latest custom claims.
        const idTokenResult = await user.getIdTokenResult(true); 
        const claims = (idTokenResult.claims || {}) as UserClaims;
        const isAdmin = claims.isAdmin === true;
        const isTechLead = claims.isTechLead === true;

        const currentPath = pathname.split('/')[2] || 'user'; // 'admin', 'techlead', or 'user'
        let targetPath = 'user';

        if (isAdmin) {
            targetPath = 'admin';
        } else if (isTechLead) {
            targetPath = 'techlead';
        }
        
        // 5. Redirect based on role, ONLY if necessary.
        if (currentPath !== targetPath && targetPath === 'admin') {
          router.replace('/dashboard/admin');
        } else if (currentPath !== targetPath && targetPath === 'techlead') {
          router.replace('/dashboard/techlead');
        } else if (currentPath !== 'user' && targetPath === 'user') {
           router.replace('/dashboard');
        }
        
        setHasChecked(true);
      } catch (error) {
        console.error("[DashboardLayout] Error getting user claims:", error);
        // If we can't get claims, send to basic dashboard to avoid loops.
        router.replace('/dashboard');
        setHasChecked(true);
      } finally {
        // Always set isCheckingRole to false after role check completes
        setIsCheckingRole(false);
      }
    };

    checkUserRole();
    
  }, [user, isUserLoading, router, pathname, hasChecked]);

  // While Firebase is loading OR we are actively checking the role, show a loading screen.
  if (isUserLoading || isCheckingRole) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className='flex flex-col items-center gap-4'>
            <p className='text-muted-foreground'>Verifying user role...</p>
            <Skeleton className='h-4 w-64' />
        </div>
      </div>
    );
  }

  // If all checks passed, render the actual content for the dashboard.
  return <>{children}</>;
}
