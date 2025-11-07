'use client';

import Link from 'next/link';
import React, { useEffect, useState, createContext, useContext, useMemo } from 'react';
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
import { LayoutDashboard, Shield, Eye } from 'lucide-react';
import { Logo } from '@/components/logo';
import { useFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import type { User, Department, AccessRequest, UserRole } from '@/lib/types';
import { getDepartments, getUsers, getAccessRequests } from '@/lib/data';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

// 1. Create a context to hold all our dashboard data
interface DashboardContextProps {
  appUser: (User & { avatarUrl: string }) | null;
  allUsers: (User & { avatarUrl: string })[];
  allDepartments: Department[];
  allRequests: AccessRequest[];
  isDashboardLoading: boolean;
}

const DashboardContext = createContext<DashboardContextProps | null>(null);

// Custom hook to use the context
export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardLayout');
  }
  return context;
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user: firebaseUser, isUserLoading } = useFirebase();
  const router = useRouter();
  
  const [realAppUser, setRealAppUser] = useState<(User & { avatarUrl: string }) | null>(null);
  const [impersonatedRole, setImpersonatedRole] = useState<UserRole | null>(null);
  
  const [allUsers, setAllUsers] = useState<(User & { avatarUrl: string })[]>([]);
  const [allDepartments, setAllDepartments] = useState<Department[]>([]);
  const [allRequests, setAllRequests] = useState<AccessRequest[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      if (isUserLoading) {
        return; 
      }

      if (!firebaseUser) {
        router.push('/login');
        return;
      }

      setIsDataLoading(true);

      const [usersFromDb, departmentsFromDb, requestsFromDb] = await Promise.all([
        getUsers(),
        getDepartments(),
        getAccessRequests()
      ]);
      
      setAllUsers(usersFromDb);
      setAllDepartments(departmentsFromDb);
      setAllRequests(requestsFromDb);

      let currentUser = usersFromDb.find(u => u.email.toLowerCase() === firebaseUser.email?.toLowerCase());

      if (currentUser) {
        setRealAppUser(currentUser);
      } else {
        // This logic creates a new user object for users signing in for the first time.
        const newUser: User & { avatarUrl: string } = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || 'New User',
            email: firebaseUser.email!,
            avatarId: `avatar${(usersFromDb.length % 5) + 1}`,
            // Assign 'Admin' role based on email, otherwise 'User'
            role: firebaseUser.email === 'yaroslav_system.admin@trafficdevils.net' ? 'Admin' : 'User',
            // Assign to the first department by default, or empty if none exist
            departmentId: departmentsFromDb.length > 0 ? departmentsFromDb[0].id : '', 
            avatarUrl: 'https://images.unsplash.com/photo-1599566147214-ce487862ea4f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw0fHxwZXJzb24lMjBhdmF0YXJ8ZW58MHx8fHwxNzYyNDE5MjYzfDA&ixlib=rb-4.1.0&q=80&w=1080'
        };
        console.log("New user created (locally for demo):", newUser);
        setRealAppUser(newUser);
        setAllUsers(prev => [...prev, newUser]);
      }
      setIsDataLoading(false);
    };

    checkAuthAndFetchData();
  }, [firebaseUser, isUserLoading, router]);
  
  // This is the user object that will be passed to the rest of the app.
  // If impersonation is active, we return a modified user object.
  const appUser = useMemo(() => {
    if (!realAppUser) return null;
    if (impersonatedRole) {
      return { ...realAppUser, role: impersonatedRole };
    }
    return realAppUser;
  }, [realAppUser, impersonatedRole]);


  const userDepartment = useMemo(() => {
    if (!appUser || allDepartments.length === 0) return null;
    return allDepartments.find(d => d.id === appUser.departmentId);
  }, [appUser, allDepartments]);

  const isLoading = isUserLoading || isDataLoading;
  
  const contextValue: DashboardContextProps = {
      appUser,
      allUsers,
      allDepartments,
      allRequests,
      isDashboardLoading: isLoading
  };

  if (isLoading || !appUser) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading user data...</p>
      </div>
    );
  }

  return (
    <DashboardContext.Provider value={contextValue}>
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
                {realAppUser.role === 'Admin' && (
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
              <div className="flex items-center gap-4">
                 {realAppUser.role === 'Admin' && (
                    <div className="flex items-center gap-2">
                        <Eye className="h-5 w-5 text-muted-foreground" />
                        <Label htmlFor="impersonate-role" className="text-sm font-medium text-muted-foreground">View as:</Label>
                        <Select
                            value={impersonatedRole || 'Admin'}
                            onValueChange={(value) => setImpersonatedRole(value === 'Admin' ? null : value as UserRole)}
                        >
                            <SelectTrigger className="w-[150px] h-9" id="impersonate-role">
                                <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Admin">Admin</SelectItem>
                                <SelectItem value="TechLead">TechLead</SelectItem>
                                <SelectItem value="User">User</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                 )}
                <UserNav user={appUser} />
              </div>
            </header>
            <main className="flex-1 animate-fade-in p-4 sm:p-6">
              {children}
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </DashboardContext.Provider>
  );
}
