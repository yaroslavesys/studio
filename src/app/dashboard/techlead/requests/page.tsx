
'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { TechleadRequestsTable } from './techlead-requests-table';
import { useFirestore, useUser, useMemoFirebase, useCollection, useDoc } from '@/firebase';
import { collection, query, where, doc, FirestoreError } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useMemo } from 'react';

interface UserProfile {
  uid: string;
  isTechLead?: boolean;
  teamId?: string;
  displayName: string;
  email: string;
  photoURL?: string;
}

interface Team {
    id: string;
    name: string;
}

interface Service {
    id: string;
    name: string;
}

export default function TechLeadRequestsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  
  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isLoadingProfile, error: profileError } = useDoc<UserProfile>(userProfileRef);
  
  const teamRef = useMemoFirebase(() => {
    if(!firestore || !userProfile?.teamId) return null;
    return doc(firestore, 'teams', userProfile.teamId);
  }, [firestore, userProfile?.teamId]);

  const { data: team, isLoading: isLoadingTeam, error: teamError } = useDoc<Team>(teamRef);

  const teamMembersQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile?.teamId) return null;
    return query(collection(firestore, 'users'), where('teamId', '==', userProfile.teamId));
  }, [firestore, userProfile?.teamId]);

  const { data: teamMembers, isLoading: isLoadingMembers, error: membersError } = useCollection<UserProfile>(teamMembersQuery);
  const teamMemberIds = useMemo(() => teamMembers?.map(m => m.uid) || null, [teamMembers]);

  const servicesQuery = useMemoFirebase(() => {
    if(!firestore) return null;
    return collection(firestore, 'services');
  }, [firestore]);

  const { data: services, isLoading: isLoadingServices, error: servicesError } = useCollection<Service>(servicesQuery);

  const usersMap = useMemo(() => {
    if (!teamMembers) return new Map<string, UserProfile>();
    const fullUsersMap = new Map(teamMembers.map((member) => [member.uid, member]));
    if(userProfile) { 
      fullUsersMap.set(userProfile.uid, userProfile);
    }
    return fullUsersMap;
  }, [teamMembers, userProfile]);

  const servicesMap = useMemo(() => {
    if (!services) return new Map<string, string>();
    return new Map(services.map((s) => [s.id, s.name]));
  }, [services]);
  
  const isLoading = isLoadingProfile || isLoadingMembers || isLoadingServices || isLoadingTeam;
  const error = profileError || membersError || servicesError || teamError;

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
  
  if (!userProfile?.teamId || !team) {
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
          <CardTitle>Team Access Requests for {team.name}</CardTitle>
          <CardDescription>
            Review and manage access requests from your team members that are awaiting your approval.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <TechleadRequestsTable 
                teamMemberIds={teamMemberIds}
                userProfile={userProfile} 
                usersMap={usersMap}
                servicesMap={servicesMap}
            />
        </CardContent>
      </Card>
    </div>
  );
}
