'use client';

import { StatCards } from '@/components/dashboard/stat-cards';
import { RequestsTable } from '@/components/dashboard/requests-table';
import { NewRequestDialog } from '@/components/dashboard/new-request-dialog';
import { getAccessRequests } from '@/lib/data';
import type { AccessRequest, User, Department } from '@/lib/types';
import { useEffect, useState } from 'react';

// Props are passed from the layout
interface DashboardPageProps {
  appUser: User & { avatarUrl: string };
  allUsers: (User & { avatarUrl: string })[];
  allDepartments: Department[];
}

export default function DashboardPage({ appUser, allUsers, allDepartments }: DashboardPageProps) {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [userDepartment, setUserDepartment] = useState<Department | null>(null);

  useEffect(() => {
    if (appUser) {
      const loadRequests = async () => {
        const allRequests = await getAccessRequests();
        setRequests(allRequests);
      };
      loadRequests();
      setUserDepartment(allDepartments.find(d => d.id === appUser.departmentId) || null);
    }
  }, [appUser, allDepartments]);

  if (!appUser) {
    return null; // Should be handled by layout's loading state
  }

  // Filter requests based on user role
  const requestsForView: AccessRequest[] =
    appUser.role === 'User'
      ? requests.filter(r => r.userId === appUser.id)
      : appUser.role === 'TechLead'
      ? requests.filter(r => r.departmentId === appUser.departmentId)
      : requests; // Admin sees all requests on the admin page, this could be department-specific for them too

  const requestsWithUserNames = requestsForView.map(request => {
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
            Welcome, {appUser.name.split(' ')[0]}!
          </h2>
          <p className="text-muted-foreground">
            {appUser.role === 'User'
              ? "Here's an overview of your access requests."
              : `Here's what's happening in the ${userDepartment?.name} department.`}
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          {appUser.role === 'User' && <NewRequestDialog user={appUser} />}
        </div>
      </div>
      <StatCards requests={requestsForView} userId={appUser.id} />
      <RequestsTable requests={requestsWithUserNames} user={appUser} allUsers={allUsers} />
    </div>
  );
}
