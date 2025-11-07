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
import { getCurrentUser } from '@/lib/auth';
import { UserNav } from '@/components/auth/user-nav';
import { LayoutDashboard, Shield, Users } from 'lucide-react';
import { Logo } from '@/components/logo';
import { getDepartments, getUsers } from '@/lib/data';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const users = await getUsers();
  const departments = await getDepartments();
  const userDepartment = departments.find(d => d.id === user.departmentId);

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
              {user.role === 'Admin' && (
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
                 <h1 className="text-xl font-semibold tracking-tight">{userDepartment?.name}</h1>
                 <p className="text-xs text-muted-foreground">Department View</p>
              </div>
            </div>
            <UserNav user={user} />
          </header>
          <main className="flex-1 animate-fade-in p-4 sm:p-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
