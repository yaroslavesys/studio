
'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { RequestsTable } from '../../admin/requests/requests-table'; // Re-use the same table component
import { useFirestore, useUser, useMemoFirebase, useCollection, useDoc } from '@/firebase';
import { collection, query, where, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface Team {
  id: string;
}

interface UserProfile {
  uid: string;
  isAdmin?: boolean;
  isTechLead?: boolean;
  teamId?: string;
}

export default function TechLeadRequestsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [team, setTeam] = useState<Team | null>(null);
  const [isLoadingTeam, setIsLoadingTeam] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isLoadingProfile } = useDoc<UserProfile>(userProfileRef);

  useEffect(() => {
    if (!userProfile) return;
    const fetchTeam = async () => {
      setIsLoadingTeam(true);
      setError(null);
       if (userProfile && userProfile.teamId) {
          setTeam({ id: userProfile.teamId });
        } else {
          setError("You don't seem to be assigned to a team.");
        }
      setIsLoadingTeam(false);
    };
    fetchTeam();
  }, [userProfile]);

  const teamMembersQuery = useMemoFirebase(() => {
    if (!firestore || !team) return null;
    return query(collection(firestore, 'users'), where('teamId', '==', team.id));
  }, [firestore, team]);

  const { data: teamMembers, isLoading: isLoadingMembers } = useCollection(teamMembersQuery);

  const teamRequestsQuery = useMemoFirebase(() => {
    if (!firestore || !teamMembers || teamMembers.length === 0) return null;
    const memberIds = teamMembers.map(m => m.id);
    // Tech lead only acts on pending requests
    return query(
      collection(firestore, 'requests'),
      where('userId', 'in', memberIds),
      where('status', '==', 'pending'),
      orderBy('requestedAt', 'desc')
    );
  }, [firestore, teamMembers]);
  
  if (isLoadingProfile || isLoadingTeam || isLoadingMembers) {
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
            Review and manage access requests from your team members that are awaiting your approval.
          </CardDescription>
        </CardHeader>
        <CardContent>
            {/* We pass the specific query for team requests to the generic table */}
            <RequestsTable requestsQuery={teamRequestsQuery} userProfile={userProfile} />
        </CardContent>
      </Card>
    </div>
  );
}
