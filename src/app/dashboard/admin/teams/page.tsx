'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { TeamsTable } from './teams-table';

export default function AdminTeamsPage() {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Team Management</CardTitle>
          <CardDescription>
            Create, view, and manage teams in the organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TeamsTable />
        </CardContent>
      </Card>
    </div>
  );
}
