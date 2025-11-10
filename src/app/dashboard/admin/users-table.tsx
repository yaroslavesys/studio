'use client';
import { useMemo } from 'react';
import { collection } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  isAdmin: boolean;
}

export function UsersTable() {
  const firestore = useFirestore();

  const usersCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'users');
  }, [firestore]);

  const { data: users, isLoading, error } = useCollection<UserProfile>(usersCollection);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        <p>
          <span className="font-bold">Error:</span> {error.message}
        </p>
        <p className="mt-2 text-xs">
          This is likely a permissions issue. Make sure you are an administrator and that Firestore security rules allow admins to list users.
        </p>
      </div>
    );
  }

  if (!users || users.length === 0) {
    return <p>No users found.</p>;
  }

  return (
    <div className="overflow-hidden rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">Avatar</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.uid}>
              <TableCell>
                <Avatar>
                  <AvatarImage src={user.photoURL} />
                  <AvatarFallback>
                    {user.displayName?.[0] ?? user.email?.[0]}
                  </AvatarFallback>
                </Avatar>
              </TableCell>
              <TableCell className="font-medium">{user.displayName}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                {user.isAdmin ? (
                  <Badge>Admin</Badge>
                ) : (
                  <Badge variant="secondary">User</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
