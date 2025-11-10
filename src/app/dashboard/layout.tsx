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
import { LayoutDashboard, Shield } from 'lucide-react';
import { Logo } from '@/components/logo';
import { useFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import type { User } from '@/lib/types';
import { createUserProfile } from '@/lib/data';
import { doc } from 'firebase/firestore';
import { useDoc, useMemoFirebase } from '@/firebase';
import { PlaceHolderImages } from '@/lib/placeholder-images';

interface DashboardContextProps {
  appUser: (User & { avatarUrl: string }) | null;
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
  const [isCreatingProfile, setIsCreatingProfile] = useState(true);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isUserLoading && !firebaseUser) {
      router.push('/');
    }
  }, [firebaseUser, isUserLoading, router]);
  
  // Create user profile if it doesn't exist
  useEffect(() => {
    if (firestore && firebaseUser) {
      setIsCreatingProfile(true);
      createUserProfile(firestore, firebaseUser).finally(() => setIsCreatingProfile(false));
    } else {
        setIsCreatingProfile(false);
    }
  }, [firestore, firebaseUser]);

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !firebaseUser) return null;
    return doc(firestore, 'users', firebaseUser.uid);
  }, [firestore, firebaseUser]);
  
  const { data: userFromDb, isLoading: isUserLoadingFromDb } = useDoc<User>(userDocRef);

  const appUser = useMemo(() => {
    if (!userFromDb) return null;
    const imageMap = new Map(PlaceHolderImages.map(img => [img.id, img.imageUrl]));
    return {
      ...userFromDb,
      avatarUrl: imageMap.get(userFromDb.avatarId) || '',
    };
  }, [userFromDb]);

  const isDashboardLoading = isUserLoading || isUserLoadingFromDb || isCreatingProfile;

  if (isDashboardLoading) {
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
      isDashboardLoading,
  };

  return (
    <DashboardContext.Provider value={contextValue}>
      <SidebarProvider>
        <div className="flex min-h-screen">
          <Sidebar>
            <SidebarHeader className="p-4">
              <div className="flex items-center gap-2">
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
              </SidebarMenu>
            </SidebarContent>
          </Sidebar>
          <SidebarInset>
            <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6">
              <div className="flex items-center gap-2">
                <SidebarTrigger className="md:hidden" />
                <div>
                  <h1 className="text-xl font-semibold tracking-tight">
                    Dashboard
                  </h1>
                </div>
              </div>
              <div className="flex items-center gap-4">
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
