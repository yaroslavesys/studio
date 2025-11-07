'use client';

import Link from 'next/link';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { UserNav } from '@/components/auth/user-nav';
import { LayoutDashboard, Shield, Users } from 'lucide-react';
import { Logo } from '@/components/logo';
import { useFirebase } from '@/firebase';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User, Department } from '@/lib/types';
import { getDepartments, getUsers } from '@/lib/data';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user: firebaseUser, isUserLoading } = useFirebase();
  const router = useRouter();
  const [appUser, setAppUser] = useState<(User & { avatarUrl: string }) | null>(null);
  const [userDepartment, setUserDepartment] = useState<Department | null>(null);
  const [allUsers, setAllUsers] = useState<(User & { avatarUrl: string })[]>([]);
  const [allDepartments, setAllDepartments] = useState<Department[]>([]);

  useEffect(() => {
    if (!isUserLoading && !firebaseUser) {
      router.push('/login');
    } else if (firebaseUser) {
      const fetchInitialData = async () => {
        const users = await getUsers();
        const departments = await getDepartments();
        setAllUsers(users);
        setAllDepartments(departments);

        const currentUser = users.find(u => u.email === firebaseUser.email);
        if (currentUser) {
          setAppUser(currentUser);
          const dept = departments.find(d => d.id === currentUser.departmentId);
          setUserDepartment(dept || null);
        } else {
            // This is a new user, let's create a record for them.
            // For now, we'll assign them to the first department and give them a 'User' role.
            const newUser: User = {
                id: firebaseUser.uid,
                name: firebaseUser.displayName || 'New User',
                email: firebaseUser.email || '',
                avatarId: `avatar${(users.length % 5) + 1}`,
                role: 'User',
                departmentId: departments[0].id,
            };
            // In a real app, you would save this new user to your database.
            const usersWithNew = [...users, newUser];
            const userWithAvatar = {
                ...newUser,
                // @ts-ignore
                avatarUrl: (await getUsers()).find(u => u.id === newUser.id)?.avatarUrl || ''
            }
            setAppUser(userWithAvatar);
            setAllUsers(usersWithNew as (User & { avatarUrl: string; })[]);
            const dept = departments.find(d => d.id === newUser.departmentId);
            setUserDepartment(dept || null);
        }
      };
      fetchInitialData();
    }
  }, [firebaseUser, isUserLoading, router]);

  if (isUserLoading || !appUser) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <Sidebar>
          <SidebarHeader className="p-4">
            <div
              className="flex items-center gap-2"
              data-testid="sidebar-header-content"
            >
              <Logo />
              <span className="text-lg font-semibold text-foreground group-data-[collapsible=icon]:hidden">
                Devils access
              </span>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Dashboard">
                  <Link href="/dashboard">
                    <LayoutDashboard />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {appUser.role === 'Admin' && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Admin Panel">
                    <Link href="/dashboard/admin">
                      <Shield />
                      <span>Admin Panel</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
        <SidebarInset>
          <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="md:hidden" />
              <div className="hidden md:block">
                <h1 className="text-xl font-semibold tracking-tight">
                  {userDepartment?.name}
                </h1>
                <p className="text-xs text-muted-foreground">
                  Department View
                </p>
              </div>
            </div>
            <UserNav user={appUser} />
          </header>
          <main className="flex-1 animate-fade-in p-4 sm:p-6">
            {/* Pass the loaded data to child components */}
            {React.cloneElement(children as React.ReactElement, { appUser, allUsers, allDepartments })}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
