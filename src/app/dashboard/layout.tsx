'use client';

import Link from 'next/link';
import React, { useEffect, useState } from 'react';
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
} from '@/components/ui/sidebar';
import { UserNav } from '@/components/auth/user-nav';
import { LayoutDashboard, Shield } from 'lucide-react';
import { Logo } from '@/components/logo';
import { useFirebase } from '@/firebase';
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
  const [appUser, setAppUser] = useState<User & { avatarUrl: string } | null>(null);
  const [allUsers, setAllUsers] = useState<(User & { avatarUrl: string })[]>([]);
  const [allDepartments, setAllDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      if (isUserLoading) {
        return; 
      }

      if (!firebaseUser) {
        router.push('/login');
        return;
      }

      const usersFromDb = await getUsers();
      const departmentsFromDb = await getDepartments();
      
      setAllUsers(usersFromDb);
      setAllDepartments(departmentsFromDb);

      let currentUser = usersFromDb.find(u => u.email.toLowerCase() === firebaseUser.email?.toLowerCase());

      if (currentUser) {
        setAppUser(currentUser);
      } else {
        const newUser: User & { avatarUrl: string } = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || 'New User',
            email: firebaseUser.email!,
            avatarId: `avatar${(usersFromDb.length % 5) + 1}`,
            role: firebaseUser.email === 'yaroslav_system.admin@trafficdevils.net' ? 'Admin' : 'User',
            departmentId: departmentsFromDb[0].id, // Default to first department for new users
            avatarUrl: 'https://images.unsplash.com/photo-1599566147214-ce487862ea4f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw0fHxwZXJzb24lMjBhdmF0YXJ8ZW58MHx8fHwxNzYyNDE5MjYzfDA&ixlib=rb-4.1.0&q=80&w=1080'
        };
        
        console.log("New user created (locally for demo):", newUser);
        setAppUser(newUser);
        setAllUsers(prev => [...prev, newUser]);
      }
      setIsLoading(false);
    };

    checkAuthAndFetchData();
  }, [firebaseUser, isUserLoading, router]);

  const userDepartment = appUser && allDepartments.length > 0
    ? allDepartments.find(d => d.id === appUser.departmentId)
    : null;

  if (isLoading || isUserLoading || !appUser) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading user data...</p>
      </div>
    );
  }

  const childrenWithProps = React.cloneElement(children as React.ReactElement, { 
    appUser, 
    allUsers, 
    allDepartments 
  });


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
                  {appUser.role === 'Admin' ? 'Admin Dashboard' : (userDepartment?.name || 'My Dashboard')}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {appUser.role} View
                </p>
              </div>
            </div>
            <UserNav user={appUser} />
          </header>
          <main className="flex-1 animate-fade-in p-4 sm:p-6">
            {childrenWithProps}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
