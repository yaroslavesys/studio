
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
    if (isUserLoading) {
      return; 
    }

    if (!user) {
      router.replace('/');
      return;
    }
    
    const checkUserRole = async () => {
      const idTokenResult = await user.getIdTokenResult(true);
      const claims = (idTokenResult.claims || {}) as Partial<UserProfile>;
      const isAdmin = claims.isAdmin === true;
      const isTechLead = claims.isTechLead === true;

      if (isAdmin && !pathname.startsWith('/dashboard/admin')) {
        router.replace('/dashboard/admin');
      } else if (!isAdmin && isTechLead && !pathname.startsWith('/dashboard/techlead')) {
        router.replace('/dashboard/techlead');
      } else if (!isAdmin && !isTechLead && (pathname.startsWith('/dashboard/admin') || pathname.startsWith('/dashboard/techlead'))) {
        router.replace('/dashboard');
      }
      
      setHasCheckedRole(true);
    };

    checkUserRole();
    
  }, [user, isUserLoading, router, pathname]);

  if (isUserLoading || !hasCheckedRole) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Verifying user role...</p>
      </div>
    );
  }

  return <>{children}</>;
}
