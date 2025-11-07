'use client';

import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserManagement } from '@/components/admin/user-management';
import { DepartmentManagement } from '@/components/admin/department-management';
import { AllRequestsManagement } from '@/components/admin/all-requests-management';
import { getAccessRequests } from '@/lib/data';
import { ShieldCheck } from 'lucide-react';
import type { User, Department, AccessRequest } from '@/lib/types';
import { useRouter } from 'next/navigation';

interface AdminPageProps {
  appUser: User;
  allUsers: (User & { avatarUrl: string; })[];
  allDepartments: Department[];
}

export default function AdminPage({ appUser, allUsers, allDepartments }: AdminPageProps) {
  const router = useRouter();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  
   useEffect(() => {
    if (!appUser || appUser.role !== 'Admin') {
      // This is a client-side check for extra security
      router.push('/dashboard');
      return;
    }
    const fetchAllData = async () => {
      // Admins see all requests
      const reqs = await getAccessRequests();
      setRequests(reqs);
    }
    fetchAllData();
  }, [appUser, router]);


  if (!appUser || appUser.role !== 'Admin') {
    return <div className="flex min-h-screen items-center justify-center"><p>Redirecting...</p></div>;
  }

  // Enrich requests with user and department names for display
  const requestsWithDetails = requests.map(request => {
    const requestingUser = allUsers.find(u => u.id === request.userId);
    const department = allDepartments.find(d => d.id === request.departmentId);
    return {
      ...request,
      userName: requestingUser?.name || 'Unknown User',
      userEmail: requestingUser?.email || 'N/A',
      departmentName: department?.name || 'Unknown Dept',
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <ShieldCheck className="h-10 w-10 text-primary" />
        <div>
          <h2 className="font-headline text-3xl font-bold tracking-tight">
            Admin Control Panel
          </h2>
          <p className="text-muted-foreground">
            Manage users, departments, and requests across the organization.
          </p>
        </div>
      </div>
      <Tabs defaultValue="requests" className="space-y-4">
        <TabsList>
          <TabsTrigger value="requests">Access Requests</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="departments">Department Management</TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <UserManagement users={allUsers} departments={allDepartments} />
        </TabsContent>
        <TabsContent value="departments">
          <DepartmentManagement departments={allDepartments} />
        </TabsContent>
        <TabsContent value="requests">
            <AllRequestsManagement requests={requestsWithDetails} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
