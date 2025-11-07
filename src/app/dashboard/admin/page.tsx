import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserManagement } from '@/components/admin/user-management';
import { DepartmentManagement } from '@/components/admin/department-management';
import { AllRequestsManagement } from '@/components/admin/all-requests-management';
import { getUsers, getDepartments, getAccessRequests } from '@/lib/data';
import { ShieldCheck } from 'lucide-react';

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (user.role !== 'Admin') {
    redirect('/dashboard');
  }

  const users = await getUsers();
  const departments = await getDepartments();
  const requests = await getAccessRequests();

  const requestsWithDetails = requests.map(request => {
    const requestingUser = users.find(u => u.id === request.userId);
    const department = departments.find(d => d.id === request.departmentId);
    return {
      ...request,
      userName: requestingUser?.name || 'Unknown User',
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
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="departments">Department Management</TabsTrigger>
          <TabsTrigger value="requests">All Requests</TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <UserManagement users={users} departments={departments} />
        </TabsContent>
        <TabsContent value="departments">
          <DepartmentManagement departments={departments} />
        </TabsContent>
        <TabsContent value="requests">
            <AllRequestsManagement requests={requestsWithDetails} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
