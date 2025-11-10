'use client';

import { useDashboard } from './layout';

export default function DashboardPage() {
  const { appUser, isDashboardLoading } = useDashboard();
  
  if (isDashboardLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse bg-muted h-9 w-48 rounded-md"></div>
        <div className="animate-pulse bg-muted h-5 w-64 rounded-md mt-2"></div>
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
            This is your dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}
