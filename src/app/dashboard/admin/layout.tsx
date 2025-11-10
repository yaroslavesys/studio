'use client';

import { useAuth, useUser } from '@/firebase';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  SidebarFooter,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Briefcase, LogOut, Shield, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { signOut } from 'firebase/auth';
import { usePathname, useRouter } from 'next/navigation';
import { Logo } from '@/components/logo';
import Link from 'next/link';

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = async () => {
    if (auth) {
      await signOut(auth);
      router.push('/');
    }
  };

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Logo />
            <span className="text-lg font-semibold">Admin Panel</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <Link href="/dashboard/admin" passHref legacyBehavior>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === '/dashboard/admin'}
                >
                  <a>
                    <Users />
                    Users
                  </a>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/dashboard/admin/teams" passHref legacyBehavior>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith('/dashboard/admin/teams')}
                >
                  <a>
                    <Briefcase />
                    Teams
                  </a>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          {user && (
            <div className="flex min-w-0 items-center gap-2 p-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.photoURL ?? undefined} />
                <AvatarFallback>
                  {user.email?.[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col text-sm">
                <span className="truncate font-medium text-foreground">
                  {user.displayName}
                </span>
                <span className="truncate text-muted-foreground">
                  {user.email}
                </span>
              </div>
            </div>
          )}
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleSignOut}>
                <LogOut />
                Sign Out
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-12 items-center justify-between border-b bg-background px-4 md:hidden">
          <div className="flex items-center gap-2">
            <Shield className="size-5 text-primary" />
            <h1 className="text-lg font-semibold">Admin</h1>
          </div>
          <SidebarTrigger />
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
