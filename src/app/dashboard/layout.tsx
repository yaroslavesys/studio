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
      // Если Firebase все еще проверяет пользователя, ничего не делаем, ждем.
      return;
    }
    if (!user) {
      // Если загрузка завершена и пользователя нет, перенаправляем на главную.
      router.replace('/');
      return;
    }

    // Если пользователь есть, начинаем проверку ролей.
    const checkUserRole = async () => {
      // Force a refresh of the ID token to get the latest custom claims.
      const idTokenResult = await user.getIdTokenResult(true);
      const claims = (idTokenResult.claims || {}) as Partial<UserProfile>;
      const isAdmin = claims.isAdmin === true;
      const isTechLead = claims.isTechLead === true;

      // Логика перенаправления в зависимости от роли
      if (isAdmin && !pathname.startsWith('/dashboard/admin')) {
        router.replace('/dashboard/admin');
      } else if (isTechLead && !pathname.startsWith('/dashboard/techlead')) {
        router.replace('/dashboard/techlead');
      } else if (!isAdmin && !isTechLead && (pathname.startsWith('/dashboard/admin') || pathname.startsWith('/dashboard/techlead'))) {
        router.replace('/dashboard');
      }
      
      // Проверка ролей завершена
      setIsCheckingRole(false);
    };

    checkUserRole();
  }, [user, isLoading, router, pathname]);

  // Пока идет начальная загрузка Firebase или проверка ролей, показываем заглушку.
  if (isLoading || isCheckingRole) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Verifying user role...</p>
      </div>
    );
  }
  
  // Если загрузка завершена и пользователя все еще нет, показываем заглушку,
  // хотя useEffect выше уже должен был сделать редирект.
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Redirecting to login...</p>
      </div>
    );
  }

  // Если все проверки пройдены, показываем дочерние компоненты (страницы дашборда).
  return <>{children}</>;
}
