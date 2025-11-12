'use client';

import { useEffect, useState } from 'react';
import { useFirestore, useUser, useMemoFirebase, useCollection } from '@/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  DocumentData,
  CollectionReference,
  limit,
} from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  techLeadId: string;
}

interface TeamMember {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  teamId: string;
}

export default function TechLeadDashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [team, setTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !firestore) return;

    const fetchTeam = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const teamsRef = collection(firestore, 'teams');
        const teamQuery = query(teamsRef, where('techLeadId', '==', user.uid), limit(1));
        const teamSnapshot = await getDocs(teamQuery);

        if (teamSnapshot.empty) {
          setError('You are not assigned to any team as a tech lead.');
          setTeam(null);
        } else {
          const foundTeam = {
            id: teamSnapshot.docs[0].id,
            ...teamSnapshot.docs[0].data(),
          } as Team;
          setTeam(foundTeam);
        }
      } catch (e: any) {
        console.error(e);
        setError(e.message || 'An error occurred while fetching your team data.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeam();
  }, [user, firestore]);

  const teamMembersQuery = useMemoFirebase(() => {
    if (!firestore || !team) return null;
    return query(collection(firestore, 'users'), where('teamId', '==', team.id));
  }, [firestore, team]);

  const { data: teamMembers, isLoading: isLoadingMembers, error: membersError } = useCollection<TeamMember>(teamMembersQuery);

  const finalIsLoading = isLoading || isLoadingMembers;
  const finalError = error || membersError?.message;


  if (finalIsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  if (finalError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{finalError}</AlertDescription>
      </Alert>
    );
  }
  
  if(!team) {
     return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No Team Assigned</AlertTitle>
        <AlertDescription>You are not assigned to a team as a Tech Lead.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Team Management</CardTitle>
          <CardDescription>
            You are the tech lead for the{' '}
            <span className="font-bold text-primary">{team?.name}</span> team.
          </CardDescription>
        </CardHeader>
      </Card>
      <div>
        <h2 className="mb-4 text-2xl font-semibold tracking-tight">
          Team Members
        </h2>
        {teamMembers && teamMembers.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {teamMembers.map((member) => (
              <Card key={member.uid}>
                <CardContent className="flex items-center gap-4 p-4">
                  <Avatar>
                    <AvatarImage src={member.photoURL} />
                    <AvatarFallback>
                      {member.displayName?.[0] ?? member.email?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{member.displayName}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {member.email}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p>No members found in your team.</p>
        )}
      </div>
    </div>
  );
}
