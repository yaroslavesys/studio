'use client';

import { StatCards } from '@/components/dashboard/stat-cards';
import { RequestsTable } from '@/components/dashboard/requests-table';
import { NewRequestDialog } from '@/components/dashboard/new-request-dialog';
import { getAccessRequests, getDepartments, getUsers } from '@/lib/data';
import type { AccessRequest, User, Department } from '@/lib/types';
import { useEffect, useState } from 'react';

// Props are passed from the layout
interface DashboardPageProps {
  appUser: User;
  allUsers: User[];
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
    return null; // Or a loading indicator
  }

  // Filter requests based on user role
  const requestsForUser: AccessRequest[] =
    appUser.role === 'User'
      ? requests.filter(r => r.userId === appUser.id)
      : appUser.role === 'TechLead'
      ? requests.filter(r => r.departmentId === appUser.departmentId)
      : requests;

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
            Welcome, {appUser.name}!
          </h2>
          <p className="text-muted-foreground">
            Here&apos;s what&apos;s happening in the {userDepartment?.name} department.
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <NewRequestDialog user={appUser} />
        </div>
      </div>
      <StatCards requests={requestsForUser} userId={appUser.id} />
      <RequestsTable requests={requestsWithUserNames} user={appUser} />
    </div>
  );
}
