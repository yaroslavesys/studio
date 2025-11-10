'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { RequestsTable } from '../../admin/requests/requests-table'; // Re-use the same table component
import { useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface Team {
  id: string;
}

export default function TechLeadRequestsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [team, setTeam] = useState<Team | null>(null);
  const [isLoadingTeam, setIsLoadingTeam] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !firestore) return;
    const fetchTeam = async () => {
      setIsLoadingTeam(true);
      setError(null);
      try {
        const userProfileRef = doc(firestore, 'users', user.uid);
        const userProfileSnap = await getDoc(userProfileRef);
        if (userProfileSnap.exists() && userProfileSnap.data().teamId) {
          setTeam({ id: userProfileSnap.data().teamId });
        } else {
          setError("You don't seem to be assigned to a team.");
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setIsLoadingTeam(false);
      }
    };
    fetchTeam();
  }, [user, firestore]);

  const teamMembersQuery = useMemoFirebase(() => {
    if (!firestore || !team) return null;
    return query(collection(firestore, 'users'), where('teamId', '==', team.id));
  }, [firestore, team]);

  const { data: teamMembers, isLoading: isLoadingMembers } = useCollection(teamMembersQuery);

  const teamRequestsQuery = useMemoFirebase(() => {
    if (!firestore || !teamMembers || teamMembers.length === 0) return null;
    const memberIds = teamMembers.map(m => m.id);
    return query(
      collection(firestore, 'requests'),
      where('userId', 'in', memberIds),
      orderBy('requestedAt', 'desc')
    );
  }, [firestore, teamMembers]);
  
  if (isLoadingTeam || isLoadingMembers) {
    return (
        <Card>
            <CardHeader>
                 <Skeleton className="h-6 w-1/2" />
                 <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-48 w-full" />
            </CardContent>
        </Card>
    );
  }

  if (error) {
     return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }


  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Team Access Requests</CardTitle>
          <CardDescription>
            Review and manage access requests from your team members.
          </CardDescription>
        </CardHeader>
        <CardContent>
            {/* We pass the specific query for team requests to the generic table */}
            <RequestsTable requestsQuery={teamRequestsQuery} />
        </CardContent>
      </Card>
    </div>
  );
}
