'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ContactsTable } from './contacts-table';

export default function AdminContactsPage() {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Contact Link Management</CardTitle>
          <CardDescription>
            Manage the contact links that appear for all users on their dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ContactsTable />
        </CardContent>
      </Card>
    </div>
  );
}
