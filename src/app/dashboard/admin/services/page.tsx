'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ServicesTable } from './services-table';

export default function AdminServicesPage() {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Service Management</CardTitle>
          <CardDescription>
            Manage the services and access rights that users can request.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ServicesTable />
        </CardContent>
      </Card>
    </div>
  );
}
