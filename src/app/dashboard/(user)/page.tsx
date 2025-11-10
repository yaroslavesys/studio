'use client';

import { useAuth, useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { collection, doc, getDoc, query, where, getDocs, DocumentData, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { useEffect, useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertCircle, HelpCircle, Star, ArrowUpRight } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SafeDate } from '@/components/safe-date';
import { Button } from '@/components/ui/button';

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

interface Contact {
    id: string;
    name: string;
    url: string;
    order: number;
}


export default function DashboardPage() {
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

  const contactsQuery = useMemoFirebase(() => {
    if(!firestore) return null;
    return query(collection(firestore, 'contacts'), orderBy('order'));
  }, [firestore]);

  const { data: availableServices, isLoading: isLoadingServices } = useCollection<Service>(availableServicesQuery);
  const { data: userRequestsData, isLoading: isLoadingRequests } = useCollection<AccessRequest>(userRequestsQuery);
  const { data: contacts, isLoading: isLoadingContacts } = useCollection<Contact>(contactsQuery);

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


        <Tabs defaultValue="accesses">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="accesses">Available Accesses</TabsTrigger>
                <TabsTrigger value="requests">My Requests</TabsTrigger>
                <TabsTrigger value="contacts">Contacts</TabsTrigger>
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
            <TabsContent value="contacts">
                 <Card>
                    <CardHeader>
                        <CardTitle>Important Contacts</CardTitle>
                        <CardDescription>
                            Quick links to team chats and resources.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {isLoadingContacts ? (
                            <Skeleton className="h-24 w-full" />
                        ) : contacts && contacts.length > 0 ? (
                            contacts.map(contact => (
                                 <a href={contact.url} target="_blank" rel="noopener noreferrer" key={contact.id}>
                                    <Card  className="flex items-center justify-between p-4 transition-all hover:bg-accent hover:text-accent-foreground">
                                        <h3 className="font-semibold">{contact.name}</h3>
                                        <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                                    </Card>
                                </a>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-8 text-center">
                                <HelpCircle className="mx-auto h-12 w-12 text-muted-foreground" />
                                <h3 className="mt-4 text-lg font-semibold">No Contacts Available</h3>
                                <p className="mt-1 text-sm text-muted-foreground">The administrator has not added any contact links yet.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>

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
