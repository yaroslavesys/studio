'use client';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { User, Department, UserRole } from '@/lib/types';
import { useTransition } from 'react';
import { updateUserRole } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';

interface UserManagementProps {
  users: (User & { avatarUrl: string })[];
  departments: Department[];
}

export function UserManagement({ users, departments }: UserManagementProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    startTransition(async () => {
      await updateUserRole(userId, newRole);
      const updatedUser = users.find(u => u.id === userId);
      toast({
        title: 'User Role Updated',
        description: `${updatedUser?.name}'s role has been changed to ${newRole}.`,
      });
    });
  };

  const getDepartmentName = (id: string) =>
    departments.find(d => d.id === id)?.name || 'N/A';
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
        <CardDescription>View and manage user roles and departments.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map(user => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user.avatarUrl} alt={user.name} />
                      <AvatarFallback>
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="font-medium">
                      <div>{user.name}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{getDepartmentName(user.departmentId)}</TableCell>
                <TableCell>
                   <Select
                      defaultValue={user.role}
                      onValueChange={(value) => handleRoleChange(user.id, value as UserRole)}
                      disabled={isPending || user.email === 'yaroslav_system.admin@trafficdevils.net'}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="User">User</SelectItem>
                        <SelectItem value="TechLead">Tech Lead</SelectItem>
                        <SelectItem value="Admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
