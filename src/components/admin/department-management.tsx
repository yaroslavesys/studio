import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import type { Department } from '@/lib/types';

export function DepartmentManagement({ departments }: { departments: Department[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Department Management</CardTitle>
          <CardDescription>View and manage all departments.</CardDescription>
        </div>
        <Button disabled>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Department
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Department Name</TableHead>
              <TableHead>Department ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {departments.map(dept => (
              <TableRow key={dept.id}>
                <TableCell className="font-medium">{dept.name}</TableCell>
                <TableCell className="font-mono text-xs">{dept.id}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
