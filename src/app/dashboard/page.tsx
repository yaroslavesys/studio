'use client';

import { useRouter } from 'next/navigation';
import { useAuth, useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { signOut } from 'firebase/auth';
import { collection, doc, getDoc, query, where, getDocs, DocumentData, addDoc, serverTimestamp } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertCircle, HelpCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SafeDate } from '@/components/safe-date';

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
    availableServiceIds?: string[];
}

interface Service {
    id: string;
    name: string;
    description: string;
}

interface AccessRequest {
    id: string;
    userId: string;
    serviceId: string;
    status: 'pending' | 'approved' | 'rejected';
    requestedAt: any; // Firestore Timestamp
    serviceName?: string; // Populated client-side
}


export default function DashboardPage() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Queries for available services and user's requests
  const availableServicesQuery = useMemoFirebase(() => {
    if (!firestore || !team?.availableServiceIds || team.availableServiceIds.length === 0) return null;
    return query(collection(firestore, 'services'), where('__name__', 'in', team.availableServiceIds));
  }, [firestore, team]);

  const userRequestsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'requests'), where('userId', '==', user.uid));
  }, [firestore, user]);

  const { data: availableServices, isLoading: isLoadingServices } = useCollection<Service>(availableServicesQuery);
  const { data: userRequestsData, isLoading: isLoadingRequests } = useCollection<AccessRequest>(userRequestsQuery);

  const servicesMap = useMemo(() => {
    if (!availableServices) return new Map<string, string>();
    return new Map(availableServices.map(s => [s.id, s.name]));
  }, [availableServices]);

  const userRequests = useMemo(() => {
    if (!userRequestsData || !servicesMap) return [];
    return userRequestsData.map(req => ({
      ...req,
      serviceName: servicesMap.get(req.serviceId) || 'Unknown Service',
      // Convert Firestore Timestamp to JS Date for SafeDate component
      requestedAt: req.requestedAt?.toDate ? req.requestedAt.toDate() : null,
    }));
  }, [userRequestsData, servicesMap]);


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

  const handleSignOut = async () => {
    if (auth) {
      await signOut(auth);
      router.push('/');
    }
  };

  const handleRequestAccess = async (service: Service) => {
    if (!user || !firestore) return;

    // Check if there is already a pending or approved request
    const existingRequest = userRequestsData?.find(
        (req) => req.serviceId === service.id && (req.status === 'pending' || req.status === 'approved')
    );

    if (existingRequest) {
        toast({
            variant: "default",
            title: "Request Exists",
            description: `You already have a(n) ${existingRequest.status} request for ${service.name}.`,
        });
        return;
    }

    try {
        const requestsCollection = collection(firestore, 'requests');
        const newRequest = {
            userId: user.uid,
            serviceId: service.id,
            status: 'pending' as const,
            requestedAt: serverTimestamp(),
        };
        await addDoc(requestsCollection, newRequest)
         .catch((e) => {
            const permissionError = new FirestorePermissionError({
              path: requestsCollection.path,
              operation: 'create',
              requestResourceData: newRequest,
            });
            errorEmitter.emit('permission-error', permissionError);
            throw permissionError;
        });

        toast({
            title: "Request Submitted",
            description: `Your request for ${service.name} has been submitted.`,
        });
    } catch (e: any) {
        console.error("Error submitting request:", e);
        toast({
            variant: "destructive",
            title: "Request Failed",
            description: e.message || "Could not submit your access request.",
        });
    }
};


  const isLoading = isUserLoading || isLoadingData;
  
  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
         <div className="flex w-full max-w-6xl flex-col gap-8">
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
        <div className="mx-auto max-w-6xl">
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

            <div className="mt-8">
                <Tabs defaultValue="accesses">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="accesses">Available Accesses</TabsTrigger>
                        <TabsTrigger value="requests">My Requests</TabsTrigger>
                    </TabsList>
                    <TabsContent value="accesses">
                        <Card>
                            <CardHeader>
                                <CardTitle>Request Access</CardTitle>
                                <CardDescription>
                                    Here are the services and tools available for your team to request.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {isLoadingServices ? (
                                    <Skeleton className="h-24 w-full" />
                                ) : availableServices && availableServices.length > 0 ? (
                                    availableServices.map(service => (
                                        <Card key={service.id} className="flex items-center justify-between p-4">
                                            <div>
                                                <h3 className="font-semibold">{service.name}</h3>
                                                <p className="text-sm text-muted-foreground">{service.description}</p>
                                            </div>
                                            <Button onClick={() => handleRequestAccess(service)}>Request</Button>
                                        </Card>
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-8 text-center">
                                        <HelpCircle className="mx-auto h-12 w-12 text-muted-foreground" />
                                        <h3 className="mt-4 text-lg font-semibold">No Services Available</h3>
                                        <p className="mt-1 text-sm text-muted-foreground">There are no services configured for your team to request.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="requests">
                        <Card>
                            <CardHeader>
                                <CardTitle>Request History</CardTitle>
                                <CardDescription>
                                    Here is the status of your recent access requests.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isLoadingRequests ? (
                                    <Skeleton className="h-24 w-full" />
                                ) : userRequests && userRequests.length > 0 ? (
                                   <div className="overflow-hidden rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Service</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Requested On</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {userRequests.map(req => (
                                                <TableRow key={req.id}>
                                                    <TableCell className="font-medium">{req.serviceName}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={
                                                            req.status === 'approved' ? 'default' :
                                                            req.status === 'rejected' ? 'destructive' :
                                                            'secondary'
                                                        }>{req.status}</Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <SafeDate date={req.requestedAt} />
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    </div>
                                ) : (
                                     <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-8 text-center">
                                        <HelpCircle className="mx-auto h-12 w-12 text-muted-foreground" />
                                        <h3 className="mt-4 text-lg font-semibold">No Requests Found</h3>
                                        <p className="mt-1 text-sm text-muted-foreground">You have not made any access requests yet.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

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
