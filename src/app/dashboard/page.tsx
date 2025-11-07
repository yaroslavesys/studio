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
}

export default function DashboardPage({ appUser, allUsers, allDepartments }: DashboardPageProps) {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadRequests = async () => {
      setIsLoading(true);
      const allRequests = await getAccessRequests();
      setRequests(allRequests);
      setIsLoading(false);
    };
    loadRequests();
  }, []);

  const userDepartment = useMemo(() => {
    return allDepartments.find(d => d.id === appUser.departmentId) || null;
  }, [appUser, allDepartments]);

  const requestsForView = useMemo((): AccessRequest[] => {
    if (!appUser) return [];
    
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
    return requestsForView.map(request => {
      const requestingUser = allUsers.find(u => u.id === request.userId);
      return {
        ...request,
        userName: requestingUser?.name || 'Unknown User',
      };
    });
  }, [requestsForView, allUsers]);

  if (isLoading || !appUser) {
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
