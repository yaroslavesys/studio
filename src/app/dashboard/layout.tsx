
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
  // State to track the role check process
  const [status, setStatus] = useState<'loading' | 'checking' | 'verified'>('loading');

  console.log('[DashboardLayout] Render. Status:', status, 'isUserLoading:', isUserLoading, 'User:', user?.email);

  useEffect(() => {
    // 1. Wait until Firebase has finished its initial user loading.
    if (isUserLoading) {
      console.log('[DashboardLayout] useEffect: Firebase is loading user. Waiting...');
      setStatus('loading');
      return; // Do nothing, just wait.
    }

    // 2. If loading is finished and there's NO user, redirect to login.
    if (!user) {
      console.log('[DashboardLayout] useEffect: No user found after loading. Redirecting to /');
      router.replace('/');
      return;
    }
    
    // 3. If loading is finished and there IS a user, check their role via Custom Claims.
    console.log('[DashboardLayout] useEffect: User found. Checking roles...');
    setStatus('checking');
    const checkUserRole = async () => {
      try {
        // Force a refresh of the ID token to get the latest custom claims.
        // This is the most critical part to get the correct roles immediately after they are set.
        console.log('[DashboardLayout] Forcing token refresh to get latest claims...');
        const idTokenResult = await user.getIdTokenResult(true); 
        const claims = (idTokenResult.claims || {}) as UserClaims;
        const isAdmin = claims.isAdmin === true;
        const isTechLead = claims.isTechLead === true;

        console.log('[DashboardLayout] Claims received:', { isAdmin, isTechLead, allClaims: claims });

        const currentRoleSegment = pathname.split('/')[2]; // e.g., 'admin', 'techlead', or undefined
        console.log('[DashboardLayout] Current path segment:', currentRoleSegment);

        // 4. Redirect based on role, ONLY if necessary.
        if (isAdmin && currentRoleSegment !== 'admin') {
          console.log('[DashboardLayout] User is ADMIN, but not in admin section. Redirecting to /dashboard/admin');
          router.replace('/dashboard/admin');
        } else if (!isAdmin && isTechLead && currentRoleSegment !== 'techlead') {
          console.log('[DashboardLayout] User is TECHLEAD, but not in techlead section. Redirecting to /dashboard/techlead');
          router.replace('/dashboard/techlead');
        } else if (!isAdmin && !isTechLead && (currentRoleSegment === 'admin' || currentRoleSegment === 'techlead')) {
          console.log('[DashboardLayout] User is NORMAL USER, but in a restricted section. Redirecting to /dashboard');
          // If a normal user somehow lands on a restricted page, send them to their dashboard.
          router.replace('/dashboard');
        } else {
           console.log('[DashboardLayout] User is on the correct page. Verification complete.');
           // If user is already on the correct page, we are done.
           setStatus('verified');
        }
      } catch (error) {
        console.error("[DashboardLayout] Error getting user claims:", error);
        // If we can't get claims, send to basic dashboard to avoid loops.
        router.replace('/dashboard');
      }
    };

    checkUserRole();
    
  }, [user, isUserLoading, router, pathname]);

  // While Firebase is loading OR we haven't finished the role check, show a full-page loading screen.
  // This prevents any child layout from rendering prematurely.
  if (status !== 'verified') {
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
