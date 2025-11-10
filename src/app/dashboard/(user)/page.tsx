'use client';

import { useAuth, useUser, useFirestore } from '@/firebase';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { collection, doc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertCircle, Star } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';


interface UserProfile {
    uid: string;
    displayName: string;
    email: string;
    photoURL: string;
    teamId?: string;
}

interface Team {
    id: string;
    name: string;
    techLeadId: string;
    availableServiceIds?: string[];
}

export default function DashboardPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isUserLoading || !user || !firestore) {
        return;
    }

    const fetchData = async () => {
        setIsLoadingData(true);
        setError(null);
        try {
            const userDocRef = doc(firestore, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);
            if (!userDoc.exists()) {
                setError("Your user profile could not be found.");
                setIsLoadingData(false);
                return;
            }
            const profile = userDoc.data() as UserProfile;
            setUserProfile(profile);

            if (profile.teamId) {
                const teamDocRef = doc(firestore, 'teams', profile.teamId);
                const teamDoc = await getDoc(teamDocRef);
                if (teamDoc.exists()) {
                    setTeam({ id: teamDoc.id, ...teamDoc.data() } as Team);
                } else {
                    setError("Your assigned team could not be found.");
                }

                const usersRef = collection(firestore, 'users');
                const membersQuery = query(usersRef, where('teamId', '==', profile.teamId));
                const membersSnapshot = await getDocs(membersQuery);
                const members = membersSnapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile));
                setTeamMembers(members);
            }
        } catch (e: any) {
            console.error(e);
            setError(e.message || "An error occurred while fetching your data.");
        } finally {
            setIsLoadingData(false);
        }
    };

    fetchData();

  }, [user, isUserLoading, firestore]);

  const isLoading = isUserLoading || isLoadingData;
  
  if (isLoading || !userProfile) {
    return (
      <div className="flex flex-col gap-8">
         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
        </div>
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        {error && (
             <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}

        <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Welcome, {userProfile.displayName}</h1>
            <p className="text-muted-foreground">
                {team ? `You are a member of the ${team.name} team.` : "You are not currently assigned to a team."}
            </p>
        </div>
        
        {team && (
             <div className="mt-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Your Team</CardTitle>
                        <CardDescription>Members of the {team.name} team.</CardDescription>
                    </CardHeader>
                    <CardContent>
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
                                <div className="flex items-center gap-2">
                                     <p className="truncate font-medium">{member.displayName}</p>
                                      {team?.techLeadId === member.uid && (
                                        <Badge variant="secondary" className="flex items-center gap-1">
                                            <Star className="h-3 w-3" />
                                            Tech Lead
                                        </Badge>
                                    )}
                                </div>
                                <p className="truncate text-sm text-muted-foreground">
                                {member.email}
                                </p>
                            </div>
                            </CardContent>
                        </Card>
                        ))}
                    </div>
                    ) : (
                    <p>No other members found in your team.</p>
                    )}
                    </CardContent>
                </Card>
            </div>
        )}
    </div>
  );
}
