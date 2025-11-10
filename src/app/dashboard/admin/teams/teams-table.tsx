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
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, PlusCircle } from 'lucide-react';

// --- Types ---
interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
}

interface Team {
  id: string;
  name: string;
  techLeadId: string;
}

// --- Main Teams Table ---
export function TeamsTable() {
  const firestore = useFirestore();

  const teamsCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'teams');
  }, [firestore]);

  const usersCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'users');
  }, [firestore]);

  const { data: teams, isLoading: isLoadingTeams, error: teamsError } = useCollection<Team>(teamsCollection);
  const { data: users, isLoading: isLoadingUsers, error: usersError } = useCollection<UserProfile>(usersCollection);

  const usersMap = useMemo(() => {
    if (!users) return new Map<string, string>();
    return new Map(users.map((user) => [user.uid, user.displayName]));
  }, [users]);
  
  const isLoading = isLoadingTeams || isLoadingUsers;
  const error = teamsError || usersError;

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
          This is likely a permissions issue. Make sure you are an administrator
          and that Firestore security rules allow admins to list users and teams.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-end mb-4">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Team
          </Button>
      </div>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Team Name</TableHead>
              <TableHead>Tech Lead</TableHead>
              <TableHead className="w-[50px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teams && teams.length > 0 ? (
              teams.map((team) => (
                <TableRow key={team.id}>
                  <TableCell className="font-medium">{team.name}</TableCell>
                  <TableCell>{usersMap.get(team.techLeadId) ?? 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center">No teams found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
