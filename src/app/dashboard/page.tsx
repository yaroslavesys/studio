'use client';

import { useRouter } from 'next/navigation';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { signOut } from 'firebase/auth';
import { collection, doc, getDoc, query, where, getDocs, DocumentData } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
}

export default function DashboardPage() {
  const router = useRouter();
  const auth = useAuth();
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
            // 1. Fetch user profile
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
                // 2. Fetch team details
                const teamDocRef = doc(firestore, 'teams', profile.teamId);
                const teamDoc = await getDoc(teamDocRef);
                if (teamDoc.exists()) {
                    setTeam({ id: teamDoc.id, ...teamDoc.data() } as Team);
                } else {
                    setError("Your assigned team could not be found.");
                }

                // 3. Fetch team members
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

  const handleSignOut = async () => {
    if (auth) {
      await signOut(auth);
      router.push('/');
    }
  };

  const isLoading = isUserLoading || isLoadingData;
  
  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
         <div className="flex w-full max-w-4xl flex-col gap-8">
            <Skeleton className="h-40 w-full" />
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
            </div>
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-4xl">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Welcome, {user.displayName}</CardTitle>
                        <CardDescription>
                            {team ? `You are a member of the ${team.name} team.` : "You are not currently assigned to a team."}
                        </CardDescription>
                    </div>
                     <Button onClick={handleSignOut} variant="outline">
                        Sign Out
                    </Button>
                </CardHeader>
            </Card>

            {error && (
                 <Alert variant="destructive" className="mt-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {team && (
                 <div className="mt-8">
                    <h2 className="mb-4 text-2xl font-semibold tracking-tight">
                        Your Team
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
                    <p>No other members found in your team.</p>
                    )}
                </div>
            )}
        </div>
    </div>
  );
}
