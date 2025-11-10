'use client';

import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { collection, query, where } from 'firebase/firestore';
import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { HelpCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SafeDate } from '@/components/safe-date';

interface Service {
    id: string;
    name: string;
}

interface AccessRequest {
    id: string;
    userId: string;
    serviceId: string;
    status: 'pending' | 'approved' | 'rejected';
    requestedAt: any; // Firestore Timestamp
    serviceName?: string; // Populated client-side
}

export default function RequestsPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const servicesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'services');
  }, [firestore]);

  const userRequestsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'requests'), where('userId', '==', user.uid));
  }, [firestore, user]);

  const { data: services, isLoading: isLoadingServices } = useCollection<Service>(servicesQuery);
  const { data: userRequestsData, isLoading: isLoadingRequests } = useCollection<AccessRequest>(userRequestsQuery);

  const servicesMap = useMemo(() => {
    if (!services) return new Map<string, string>();
    return new Map(services.map(s => [s.id, s.name]));
  }, [services]);

  const userRequests = useMemo(() => {
    if (!userRequestsData || !servicesMap) return [];
    return userRequestsData.map(req => ({
      ...req,
      serviceName: servicesMap.get(req.serviceId) || 'Unknown Service',
      requestedAt: req.requestedAt?.toDate ? req.requestedAt.toDate() : null,
    }));
  }, [userRequestsData, servicesMap]);

  const isLoading = isLoadingServices || isLoadingRequests;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <Card>
            <CardHeader>
                <CardTitle>Request History</CardTitle>
                <CardDescription>
                    Here is the status of your recent access requests.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
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
    </div>
  );
}
