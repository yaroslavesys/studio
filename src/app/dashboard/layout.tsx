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
import { useFirebase, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import type { User, Department, AccessRequest, UserRole } from '@/lib/types';
import { createUserProfile, checkAndSeedDatabase } from '@/lib/data';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { collection, query, where, doc } from 'firebase/firestore';
import { PlaceHolderImages } from '@/lib/placeholder-images';

interface DashboardContextProps {
  appUser: (User & { avatarUrl: string }) | null;
  allUsers: (User & { avatarUrl: string })[];
  allDepartments: Department[];
  allRequests: AccessRequest[];
  isDashboardLoading: boolean;
}

const DashboardContext = createContext<DashboardContextProps | null>(null);

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
  const { firestore, user: firebaseUser, isUserLoading } = useFirebase();
  const router = useRouter();

  const [impersonatedRole, setImpersonatedRole] = useState<UserRole | null>(null);
  
  // 1. Fetch the current user's profile from Firestore
  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !firebaseUser) return null;
    return doc(firestore, 'users', firebaseUser.uid);
  }, [firestore, firebaseUser]);
  const { data: realAppUserFromDb, isLoading: isAppUserLoading } = useDoc<Omit<User, 'avatarUrl'>>(userDocRef);

  // 2. Seed database and create profile if it doesn't exist
  useEffect(() => {
    const setupUser = async () => {
      if (!firestore || !firebaseUser || isAppUserLoading) return;
      
      await checkAndSeedDatabase(firestore);

      if (!realAppUserFromDb) {
        try {
          await createUserProfile(firestore, firebaseUser);
          // No need to set state, useDoc will update automatically
        } catch (error) {
          console.error("Failed to create user profile:", error);
          // Handle error, maybe sign out user
        }
      }
    };
    setupUser();
  }, [firestore, firebaseUser, realAppUserFromDb, isAppUserLoading]);

  // 3. Derive the user object, applying impersonation if active
  const realAppUser = useMemo(() => {
    if (!realAppUserFromDb) return null;
    const imageMap = new Map(PlaceHolderImages.map(img => [img.id, img.imageUrl]));
    return {
      ...realAppUserFromDb,
      avatarUrl: imageMap.get(realAppUserFromDb.avatarId) || '',
    };
  }, [realAppUserFromDb]);

  const appUser = useMemo(() => {
    if (!realAppUser) return null;
    if (impersonatedRole && realAppUser.role === 'Admin') {
      return { ...realAppUser, role: impersonatedRole };
    }
    return realAppUser;
  }, [realAppUser, impersonatedRole]);

  // 4. Fetch all other data based on the derived user's role
  const departmentsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'departments') : null, [firestore]);
  const { data: allDepartments, isLoading: deptsLoading } = useCollection<Department>(departmentsQuery);

  const usersQuery = useMemoFirebase(() => {
    if (!firestore || !appUser) return null;
    // Admin can fetch all users.
    if (appUser.role === 'Admin') {
      return collection(firestore, 'users');
    }
    // Non-admins cannot list all users due to security rules, so we don't even try.
    // We fetch their own doc via useDoc, and if needed, other users can be fetched individually.
    // For TechLeads, we'll fetch their department members on the pages that need it.
    return null;
  }, [firestore, appUser]);
  const { data: allUsersFromDb, isLoading: usersLoading } = useCollection<Omit<User, 'avatarUrl'>>(usersQuery);
  
  const requestsQuery = useMemoFirebase(() => {
    if (!firestore || !appUser) return null;
    // Admin gets all requests.
    if (appUser.role === 'Admin') {
      return collection(firestore, 'accessRequests');
    }
    // TechLead gets requests for their department.
    if (appUser.role === 'TechLead') {
      return query(collection(firestore, 'accessRequests'), where('departmentId', '==', appUser.departmentId));
    }
    // User gets their own requests.
    return query(collection(firestore, 'accessRequests'), where('userId', '==', appUser.id));
  }, [firestore, appUser]);
  const { data: allRequests, isLoading: requestsLoading } = useCollection<AccessRequest>(requestsQuery);
  
  // This derived state now handles multiple scenarios for allUsers
  const allUsers = useMemo(() => {
    const imageMap = new Map(PlaceHolderImages.map(img => [img.id, img.imageUrl]));
    
    // Admins get the full list from the 'allUsersFromDb' collection query
    if (appUser?.role === 'Admin' && allUsersFromDb) {
       return allUsersFromDb.map(user => ({
        ...user,
        avatarUrl: imageMap.get(user.avatarId) || '',
      }));
    }

    // For non-admins, 'allUsers' starts with just their own profile.
    // Other components might add to this list if they fetch more user docs.
    if (appUser) {
        return [{ ...appUser }];
    }

    return [];
  }, [allUsersFromDb, appUser]);

  // Handle auth state redirects
  useEffect(() => {
    if (!isUserLoading && !firebaseUser) {
      router.push('/login');
    }
  }, [firebaseUser, isUserLoading, router]);

  const userDepartment = useMemo(() => {
    if (!appUser || !allDepartments || allDepartments.length === 0) return null;
    return allDepartments.find(d => d.id === appUser.departmentId);
  }, [appUser, allDepartments]);

  const isDashboardLoading = isUserLoading || isAppUserLoading || (appUser?.role === 'Admin' && (usersLoading || requestsLoading));

  if (isUserLoading || isAppUserLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading user profile...</p>
      </div>
    );
  }

  if (!appUser) {
     return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Could not load user profile. Redirecting...</p>
      </div>
    );
  }

  const contextValue: DashboardContextProps = {
      appUser,
      allUsers: allUsers || [],
      allDepartments: allDepartments || [],
      allRequests: allRequests || [],
      isDashboardLoading
  };

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
                {realAppUser?.role === 'Admin' && (
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
                 {realAppUser?.role === 'Admin' && (
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
              { isDashboardLoading ? (
                  <div className="flex min-h-full items-center justify-center">
                    <p>Loading dashboard data...</p>
                  </div>
              ) : children }
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </DashboardContext.Provider>
  );
}
