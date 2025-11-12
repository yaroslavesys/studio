
'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { RequestsTable } from './requests-table';
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { collection, query, orderBy, doc, where } from 'firebase/firestore';
import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';


interface UserProfile {
  uid: string;
  isAdmin?: boolean;
  isTechLead?: boolean;
  displayName: string;
  email: string;
  photoURL?: string;
}

interface Service {
    id: string;
    name: string;
}

export default function AdminRequestsPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isLoadingProfile, error: profileError } = useDoc<UserProfile>(userProfileRef);

  const servicesQuery = useMemoFirebase(() => {
    if(!firestore) return null;
    return collection(firestore, 'services');
  }, [firestore]);

  const usersQuery = useMemoFirebase(() => {
    if(!firestore) return null;
    return collection(firestore, 'users');
  }, [firestore]);

  const { data: services, isLoading: isLoadingServices, error: servicesError } = useCollection<Service>(servicesQuery);
  const { data: users, isLoading: isLoadingUsers, error: usersError } = useCollection<UserProfile>(usersQuery);

  const servicesMap = useMemo(() => services ? new Map(services.map(s => [s.id, s.name])) : new Map(), [services]);
  const usersMap = useMemo(() => users ? new Map(users.map(u => [u.uid, u])) : new Map(), [users]);

  // Admins see requests that are either pending their final approval or can be fast-tracked
  const adminRequestsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile?.isAdmin) return null;
    return query(
      collection(firestore, 'requests'), 
      where('status', 'in', ['approved_by_tech_lead', 'pending']),
      orderBy('requestedAt', 'asc')
    );
  }, [firestore, userProfile]);

  const isLoading = isLoadingProfile || isLoadingServices || isLoadingUsers;
  const error = profileError || servicesError || usersError;

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
        <AlertDescription>{error.message || "Could not load requests."}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Access Requests</CardTitle>
          <CardDescription>
            Review and manage all user requests for services and tools.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RequestsTable 
            requestsQuery={adminRequestsQuery} 
            userProfile={userProfile}
            usersMap={usersMap}
            servicesMap={servicesMap}
            />
        </CardContent>
      </Card>
    </div>
  );
}
