
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
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { HelpCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Button } from '@/components/ui/button';

interface UserProfile {
    uid: string;
    teamId?: string;
    isAdmin?: boolean;
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
    status: 'pending' | 'approved_by_tech_lead' | 'completed' | 'rejected';
}


export default function AccessesPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [team, setTeam] = useState<Team | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  useEffect(() => {
    if (!user || !firestore) return;
    const fetchUserData = async () => {
        setIsLoadingProfile(true);
        const userDocRef = doc(firestore, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
            const userProfile = { uid: user.uid, ...userDoc.data() } as UserProfile;
            setProfile(userProfile);
            if(userProfile.teamId && !userProfile.isAdmin) {
                const teamDocRef = doc(firestore, 'teams', userProfile.teamId);
                const teamDoc = await getDoc(teamDocRef);
                if (teamDoc.exists()) {
                    setTeam({ id: teamDoc.id, ...teamDoc.data() } as Team);
                }
            }
        }
        setIsLoadingProfile(false);
    }
    fetchUserData();
  }, [user, firestore]);

  const availableServicesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    
    // Admins can see all services
    if (profile?.isAdmin) {
        return collection(firestore, 'services');
    }

    // Regular users see services based on their team
    if (!team?.availableServiceIds || team.availableServiceIds.length === 0) return null;
    return query(collection(firestore, 'services'), where('__name__', 'in', team.availableServiceIds));
  }, [firestore, profile, team]);

  const userRequestsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'requests'), where('userId', '==', user.uid));
  }, [firestore, user]);

  const { data: availableServices, isLoading: isLoadingServices } = useCollection<Service>(availableServicesQuery);
  const { data: userRequestsData } = useCollection<AccessRequest>(userRequestsQuery);
  
  const handleRequestAccess = async (service: Service) => {
    if (!user || !firestore) return;

    const existingRequest = userRequestsData?.find(
        (req) => req.serviceId === service.id && (req.status === 'pending' || req.status === 'approved_by_tech_lead' || req.status === 'completed')
    );

    if (existingRequest) {
        toast({
            variant: "default",
            title: "Request Exists",
            description: `You already have an active or completed request for ${service.name}.`,
        });
        return;
    }

    const requestsCollection = collection(firestore, 'requests');
    const newRequest = {
        userId: user.uid,
        serviceId: service.id,
        status: 'pending' as const,
        requestedAt: serverTimestamp(),
    };
    addDoc(requestsCollection, newRequest)
        .then(() => {
             toast({
                title: "Request Submitted",
                description: `Your request for ${service.name} has been submitted for tech lead approval.`,
            });
        })
        .catch((e) => {
            const permissionError = new FirestorePermissionError({
                path: requestsCollection.path,
                operation: 'create',
                requestResourceData: newRequest,
            });
            errorEmitter.emit('permission-error', permissionError);
            toast({
                variant: "destructive",
                title: "Request Failed",
                description: e.message || "Could not submit your access request.",
            });
        });
};

  const isLoading = isLoadingProfile || isLoadingServices;

  return (
     <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <Card>
            <CardHeader>
                <CardTitle>Request Access</CardTitle>
                <CardDescription>
                    {profile?.isAdmin 
                        ? "As an admin, you can see all available services in the system."
                        : "Here are the services and tools available for your team to request."}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {isLoading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                    </div>
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
                        <p className="mt-1 text-sm text-muted-foreground">
                            {profile?.isAdmin 
                                ? "There are no services configured in the system yet."
                                : "There are no services configured for your team to request."}
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    </div>
  );
}
