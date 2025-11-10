
'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { TechleadRequestsTable } from './techlead-requests-table';
import { useFirestore, useUser, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, orderBy } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface UserProfile {
  uid: string;
  isTechLead?: boolean;
  teamId?: string;
}

export default function TechLeadRequestsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  
  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isLoadingProfile, error: profileError } = useDoc<UserProfile>(userProfileRef);

  // This query finds all users who are members of the tech lead's team.
  const teamMembersQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile?.teamId) return null;
    return query(collection(firestore, 'users'), where('teamId', '==', userProfile.teamId));
  }, [firestore, userProfile]);

  const { data: teamMembers, isLoading: isLoadingMembers, error: membersError } = useCollection(teamMembersQuery);

  // This query finds all PENDING requests from the members of the tech lead's team.
  const teamRequestsQuery = useMemoFirebase(() => {
    if (!firestore || !teamMembers || teamMembers.length === 0) return null;
    const memberIds = teamMembers.map(m => m.id);
    return query(
      collection(firestore, 'requests'),
      where('userId', 'in', memberIds),
      where('status', '==', 'pending'),
      orderBy('requestedAt', 'desc')
    );
  }, [firestore, teamMembers]);
  
  const isLoading = isLoadingProfile || isLoadingMembers;
  const error = profileError || membersError;

  if (isLoading) {
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
        <AlertDescription>{error.message || "Could not load team requests."}</AlertDescription>
      </Alert>
    );
  }
  
  if (!userProfile?.teamId) {
     return (
       <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No Team Assigned</AlertTitle>
        <AlertDescription>You are not assigned to a team, so there are no requests to display.</AlertDescription>
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
            {/* We pass the specific query for team requests to the dedicated table */}
            <TechleadRequestsTable requestsQuery={teamRequestsQuery} userProfile={userProfile} />
        </CardContent>
      </Card>
    </div>
  );
}
