'use client';

import { StatCards } from '@/components/dashboard/stat-cards';
import { RequestsTable } from '@/components/dashboard/requests-table';
import { NewRequestDialog } from '@/components/dashboard/new-request-dialog';
import type { AccessRequest } from '@/lib/types';
import { useMemo } from 'react';
import { useDashboard } from './layout';

export default function DashboardPage() {
  const { appUser, allUsers, allDepartments, allRequests, isDashboardLoading } = useDashboard();
  
  const userDepartment = useMemo(() => {
    if (!allDepartments || !appUser) return null;
    return allDepartments.find(d => d.id === appUser.departmentId) || null;
  }, [appUser, allDepartments]);

  const requestsForView = useMemo((): AccessRequest[] => {
    if (!appUser || !allRequests) return [];
    
    switch (appUser.role) {
      case 'User':
        return allRequests.filter(r => r.userId === appUser.id);
      case 'TechLead':
        return allRequests.filter(r => r.departmentId === appUser.departmentId);
      case 'Admin':
        return allRequests;
      default:
        return [];
    }
  }, [allRequests, appUser]);

  const requestsWithDetails = useMemo(() => {
    if (!requestsForView || !allUsers || !allDepartments) return [];
    return requestsForView.map(request => {
      const requestingUser = allUsers.find(u => u.id === request.userId);
      const department = allDepartments.find(d => d.id === request.departmentId);
      return {
        ...request,
        userName: requestingUser?.name || 'Unknown User',
        userEmail: requestingUser?.email || 'N/A',
        departmentName: department?.name || 'Unknown Dept',
      };
    });
  }, [requestsForView, allUsers, allDepartments]);


  if (isDashboardLoading) {
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
  
  if (!appUser) return null; 

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
      <RequestsTable requests={requestsWithDetails} user={appUser} allUsers={allUsers} />
    </div>
  );
}