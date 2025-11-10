'use client';

import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { collection, doc, getDoc, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { useEffect, useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { HelpCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Button } from '@/components/ui/button';

interface UserProfile {
    uid: string;
    teamId?: string;
}

interface Team {
    id: string;
    availableServiceIds?: string[];
}

interface Service {
    id: string;
    name: string;
    description: string;
}

interface AccessRequest {
    id: string;
    serviceId: string;
    status: 'pending' | 'approved' | 'rejected';
}


export default function AccessesPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [team, setTeam] = useState<Team | null>(null);
  const [isLoadingTeam, setIsLoadingTeam] = useState(true);

  useEffect(() => {
    if (!user || !firestore) return;
    const fetchTeam = async () => {
        setIsLoadingTeam(true);
        const userDocRef = doc(firestore, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
            const profile = userDoc.data() as UserProfile;
            if(profile.teamId) {
                const teamDocRef = doc(firestore, 'teams', profile.teamId);
                const teamDoc = await getDoc(teamDocRef);
                if (teamDoc.exists()) {
                    setTeam({ id: teamDoc.id, ...teamDoc.data() } as Team);
                }
            }
        }
        setIsLoadingTeam(false);
    }
    fetchTeam();
  }, [user, firestore]);

  const availableServicesQuery = useMemoFirebase(() => {
    if (!firestore || !team?.availableServiceIds || team.availableServiceIds.length === 0) return null;
    return query(collection(firestore, 'services'), where('__name__', 'in', team.availableServiceIds));
  }, [firestore, team]);

  const userRequestsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'requests'), where('userId', '==', user.uid));
  }, [firestore, user]);

  const { data: availableServices, isLoading: isLoadingServices } = useCollection<Service>(availableServicesQuery);
  const { data: userRequestsData } = useCollection<AccessRequest>(userRequestsQuery);
  
  const handleRequestAccess = async (service: Service) => {
    if (!user || !firestore) return;

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

  const isLoading = isLoadingTeam || isLoadingServices;

  return (
     <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <Card>
            <CardHeader>
                <CardTitle>Request Access</CardTitle>
                <CardDescription>
                    Here are the services and tools available for your team to request.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {isLoading ? (
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
    </div>
  );
}
