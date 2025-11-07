import { StatCards } from '@/components/dashboard/stat-cards';
import { RequestsTable } from '@/components/dashboard/requests-table';
import { NewRequestDialog } from '@/components/dashboard/new-request-dialog';
import { getAccessRequests, getDepartments, getUsers } from '@/lib/data';
import { getCurrentUser } from '@/lib/auth';
import type { AccessRequest } from '@/lib/types';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const allRequests = await getAccessRequests();
  const allUsers = await getUsers();
  const allDepartments = await getDepartments();

  const userDepartment = allDepartments.find(d => d.id === user.departmentId);

  // Filter requests based on user role
  const requestsForUser: AccessRequest[] =
    user.role === 'User'
      ? allRequests.filter(r => r.userId === user.id)
      : user.role === 'TechLead'
      ? allRequests.filter(r => r.departmentId === user.departmentId)
      : allRequests;

  const requestsWithUserNames = requestsForUser.map(request => {
    const requestingUser = allUsers.find(u => u.id === request.userId);
    return {
      ...request,
      userName: requestingUser?.name || 'Unknown User',
    };
  });
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="font-headline text-3xl font-bold tracking-tight">
            Welcome, {user.name}!
          </h2>
          <p className="text-muted-foreground">
            Here&apos;s what&apos;s happening in the {userDepartment?.name} department.
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <NewRequestDialog user={user} />
        </div>
      </div>
      <StatCards requests={requestsForUser} userId={user.id} />
      <RequestsTable requests={requestsWithUserNames} user={user} />
    </div>
  );
}
