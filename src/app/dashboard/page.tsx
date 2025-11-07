'use client';

import { StatCards } from '@/components/dashboard/stat-cards';
import { RequestsTable } from '@/components/dashboard/requests-table';
import { NewRequestDialog } from '@/components/dashboard/new-request-dialog';
import { getAccessRequests } from '@/lib/data';
import type { AccessRequest, User, Department } from '@/lib/types';
import { useEffect, useState, useMemo } from 'react';

interface DashboardPageProps {
  appUser: User & { avatarUrl: string };
  allUsers: (User & { avatarUrl: string })[];
  allDepartments: Department[];
  isDashboardLoading: boolean; // Receive loading state from layout
}

export default function DashboardPage({ appUser, allUsers, allDepartments, isDashboardLoading }: DashboardPageProps) {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [isRequestsLoading, setIsRequestsLoading] = useState(true);

  useEffect(() => {
    if (appUser) {
        const loadRequests = async () => {
          setIsRequestsLoading(true);
          const allRequests = await getAccessRequests();
          setRequests(allRequests);
          setIsRequestsLoading(false);
        };
        loadRequests();
    }
  }, [appUser]);
  
  const userDepartment = useMemo(() => {
    if (!allDepartments || !appUser) return null;
    return allDepartments.find(d => d.id === appUser.departmentId) || null;
  }, [appUser, allDepartments]);

  const requestsForView = useMemo((): AccessRequest[] => {
    if (!appUser || !requests) return [];
    
    switch (appUser.role) {
      case 'User':
        return requests.filter(r => r.userId === appUser.id);
      case 'TechLead':
        return requests.filter(r => r.departmentId === appUser.departmentId);
      case 'Admin':
        // Admins see department-specific view on main dashboard, and all requests in admin panel
        return requests.filter(r => r.departmentId === appUser.departmentId);
      default:
        return [];
    }
  }, [requests, appUser]);

  const requestsWithUserNames = useMemo(() => {
    if (!requestsForView || !allUsers) return [];
    return requestsForView.map(request => {
      const requestingUser = allUsers.find(u => u.id === request.userId);
      return {
        ...request,
        userName: requestingUser?.name || 'Unknown User',
      };
    });
  }, [requestsForView, allUsers]);

  const isLoading = isDashboardLoading || isRequestsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="animate-pulse bg-muted h-9 w-48 rounded-md"></div>
              <div className="animate-pulse bg-muted h-5 w-64 rounded-md mt-2"></div>
            </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="animate-pulse bg-card h-28 rounded-lg"></div>
            <div className="animate-pulse bg-card h-28 rounded-lg"></div>
            <div className="animate-pulse bg-card h-28 rounded-lg"></div>
            <div className="animate-pulse bg-card h-28 rounded-lg"></div>
        </div>
         <div className="animate-pulse bg-card h-96 rounded-lg"></div>
      </div>
    );
  }
  
  if (!appUser) {
    return null; // Or some other placeholder while appUser is being determined
  }

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
