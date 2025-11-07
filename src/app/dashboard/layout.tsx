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
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
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
import { collection } from 'firebase/firestore';
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
  
  const [realAppUser, setRealAppUser] = useState<(User & { avatarUrl: string }) | null>(null);
  const [impersonatedRole, setImpersonatedRole] = useState<UserRole | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // --- Real-time data from Firestore ---
  const usersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: usersFromDb, isLoading: usersLoading } = useCollection<Omit<User, 'avatarUrl'>>(usersQuery);
  
  const departmentsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'departments') : null, [firestore]);
  const { data: allDepartments, isLoading: deptsLoading } = useCollection<Department>(departmentsQuery);

  const requestsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'accessRequests') : null, [firestore]);
  const { data: allRequests, isLoading: requestsLoading } = useCollection<AccessRequest>(requestsQuery);
  
  const allUsers = useMemo(() => {
    if (!usersFromDb) return [];
    const imageMap = new Map(PlaceHolderImages.map(img => [img.id, img.imageUrl]));
    return usersFromDb.map(user => ({
      ...user,
      avatarUrl: imageMap.get(user.avatarId) || '',
    }));
  }, [usersFromDb]);

  useEffect(() => {
    const authAndDataCheck = async () => {
      if (isUserLoading) {
        return; // Wait for Firebase Auth to resolve
      }

      if (!firebaseUser) {
        router.push('/login');
        return;
      }
      
      // On first load, ensure DB has some demo data
      await checkAndSeedDatabase();

      setIsDataLoading(true);
      
      // Find or create a user profile in Firestore
      const userProfile = await createUserProfile(firebaseUser);
      if (userProfile) {
        setRealAppUser(userProfile);
      } else {
        // This case should ideally not happen if createUserProfile is robust
        console.error("Could not get or create user profile. Redirecting.");
        // await auth.signOut(); // Optional: sign out if profile fails
        // router.push('/login');
      }
    };
    
    authAndDataCheck();

  }, [firebaseUser, isUserLoading, router]);

  useEffect(() => {
     // Combined loading state
      if (!usersLoading && !deptsLoading && !requestsLoading && realAppUser) {
        setIsDataLoading(false);
      }
  }, [usersLoading, deptsLoading, requestsLoading, realAppUser]);
  
  const appUser = useMemo(() => {
    if (!realAppUser) return null;
    if (impersonatedRole) {
      return { ...realAppUser, role: impersonatedRole };
    }
    return realAppUser;
  }, [realAppUser, impersonatedRole]);

  const userDepartment = useMemo(() => {
    if (!appUser || !allDepartments || allDepartments.length === 0) return null;
    return allDepartments.find(d => d.id === appUser.departmentId);
  }, [appUser, allDepartments]);

  const isLoading = isUserLoading || isDataLoading;
  
  const contextValue: DashboardContextProps = {
      appUser,
      allUsers: allUsers || [],
      allDepartments: allDepartments || [],
      allRequests: allRequests || [],
      isDashboardLoading: isLoading
  };

  if (isLoading || !appUser) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading application data...</p>
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
