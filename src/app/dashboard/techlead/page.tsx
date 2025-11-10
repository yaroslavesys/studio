'use client';

import { useEffect, useState } from 'react';
import { useFirestore, useUser, useMemoFirebase } from '@/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  DocumentData,
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
import { Badge } from '@/components/ui/badge';
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
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !firestore) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // 1. Find the team for the current tech lead
        const teamsRef = collection(firestore, 'teams');
        const teamQuery = query(teamsRef, where('techLeadId', '==', user.uid));
        const teamSnapshot = await getDocs(teamQuery);

        if (teamSnapshot.empty) {
          setError('You are not assigned to any team as a tech lead.');
          setIsLoading(false);
          return;
        }

        const foundTeam = {
          id: teamSnapshot.docs[0].id,
          ...teamSnapshot.docs[0].data(),
        } as Team;
        setTeam(foundTeam);

        // 2. Find all users in that team
        const usersRef = collection(firestore, 'users');
        const membersQuery = query(
          usersRef,
          where('teamId', '==', foundTeam.id)
        );
        const membersSnapshot = await getDocs(membersQuery);

        const members = membersSnapshot.docs.map(
          (doc) => ({ ...doc.data(), uid: doc.id } as TeamMember)
        );
        setTeamMembers(members);
      } catch (e: any) {
        console.error(e);
        setError(e.message || 'An error occurred while fetching data.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, firestore]);

  if (isLoading) {
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
        {teamMembers.length > 0 ? (
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
