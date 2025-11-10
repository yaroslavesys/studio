
'use client';

import { useState, useMemo } from 'react';
import {
  collection,
  doc,
  Query,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Check, X, MoreHorizontal, CheckCheck } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { SafeDate } from '@/components/safe-date';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';


interface AccessRequest {
  id: string;
  userId: string;
  serviceId: string;
  status: 'pending' | 'approved_by_tech_lead' | 'completed' | 'rejected';
  requestedAt: any;
  notes?: string;
  resolvedAt?: any;
}

interface UserProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
  email: string;
  isAdmin?: boolean;
  isTechLead?: boolean;
}

interface Service {
  id: string;
  name: string;
}

const RejectRequestForm = ({ request, onFinished }: { request: AccessRequest, onFinished: () => void }) => {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { user: currentUser } = useUser();
    const [notes, setNotes] = useState('');

    const handleReject = async () => {
        if (!firestore || !currentUser) return;
        
        const requestDocRef = doc(firestore, 'requests', request.id);
        const updateData = {
            status: 'rejected' as const,
            resolvedAt: serverTimestamp(),
            resolvedBy: currentUser.uid,
            notes: notes || 'No notes provided.',
        };

        try {
            await updateDoc(requestDocRef, updateData)
            .catch((e) => {
                const permissionError = new FirestorePermissionError({
                    path: requestDocRef.path,
                    operation: 'update',
                    requestResourceData: updateData,
                });
                errorEmitter.emit('permission-error', permissionError);
                throw permissionError;
            });
            toast({ title: 'Request Rejected' });
            onFinished();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Action Failed', description: error.message });
        }
    };
    
    return (
        <div className="space-y-4">
            <Textarea 
                placeholder="Provide a reason for rejection (optional)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
            />
            <DialogFooter>
                <Button variant="ghost" onClick={onFinished}>Cancel</Button>
                <Button variant="destructive" onClick={handleReject}>Confirm Rejection</Button>
            </DialogFooter>
        </div>
    );
};


export function RequestsTable({ requestsQuery, userProfile }: { requestsQuery: Query | null, userProfile?: UserProfile | null }) {
  const firestore = useFirestore();
  const { user: currentUser } = useUser();
  const { toast } = useToast();
  
  const [requestToReject, setRequestToReject] = useState<AccessRequest | null>(null);

  const { data: requests, isLoading: isLoadingRequests, error: requestsError } = useCollection<AccessRequest>(requestsQuery);

  const servicesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'services') : null, [firestore]);
  const usersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  
  const { data: services, isLoading: isLoadingServices } = useCollection<Service>(servicesCollection);
  const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersCollection);

  const servicesMap = useMemo(() => services ? new Map(services.map(s => [s.id, s.name])) : new Map(), [services]);
  const usersMap = useMemo(() => users ? new Map(users.map(u => [u.uid, u])) : new Map(), [users]);

  const handleUpdateStatus = async (request: AccessRequest, newStatus: AccessRequest['status']) => {
    if (!firestore || !currentUser) return;
    const requestDocRef = doc(firestore, 'requests', request.id);
    
    const updateData: any = {
        status: newStatus,
        resolvedBy: currentUser.uid,
    };
    
    let toastTitle = '';
    
    if (newStatus === 'completed' || newStatus === 'approved_by_tech_lead') {
        updateData.resolvedAt = serverTimestamp();
    }
    
    if (newStatus === 'completed') {
        toastTitle = 'Request Marked as Completed';
    } else if (newStatus === 'approved_by_tech_lead') {
      toastTitle = 'Request Approved by Tech Lead';
    }


    try {
        await updateDoc(requestDocRef, updateData)
         .catch((e) => {
            const permissionError = new FirestorePermissionError({
                path: requestDocRef.path,
                operation: 'update',
                requestResourceData: updateData,
            });
            errorEmitter.emit('permission-error', permissionError);
            throw permissionError;
        });
        toast({ title: toastTitle });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Action Failed', description: error.message });
    }
  };

  const getStatusBadge = (status: AccessRequest['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending Tech Lead</Badge>;
      case 'approved_by_tech_lead':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-500">Pending Admin</Badge>;
      case 'completed':
        return <Badge variant="default">Completed</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const isLoading = isLoadingRequests || isLoadingServices || isLoadingUsers;
  const error = requestsError;

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (error) {
     return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Requests</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Requested On</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests && requests.length > 0 ? (
              requests.map((request) => {
                const requestingUser = usersMap.get(request.userId);
                
                // Determine which actions are available
                const canTechLeadAct = userProfile?.isTechLead && request.status === 'pending';
                const canAdminComplete = userProfile?.isAdmin && request.status === 'approved_by_tech_lead';
                const canAdminApprove = userProfile?.isAdmin && request.status === 'pending';
                const canBeRejected = userProfile && (request.status === 'pending' || request.status === 'approved_by_tech_lead');

                return (
                  <TableRow key={request.id}>
                    <TableCell>
                        <div className="flex items-center gap-2">
                           <Avatar className="h-8 w-8">
                                <AvatarImage src={requestingUser?.photoURL} />
                                <AvatarFallback>{requestingUser?.displayName?.[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                                <span className="font-medium">{requestingUser?.displayName || 'Unknown User'}</span>
                                <span className="text-xs text-muted-foreground">{requestingUser?.email}</span>
                            </div>
                        </div>
                    </TableCell>
                    <TableCell>{servicesMap.get(request.serviceId) || 'Unknown Service'}</TableCell>
                    <TableCell><SafeDate date={request.requestedAt?.toDate()} /></TableCell>
                    <TableCell>
                      {getStatusBadge(request.status)}
                    </TableCell>
                    <TableCell className="text-right">
                       {(canTechLeadAct || canAdminComplete || canAdminApprove || canBeRejected) ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {canTechLeadAct && (
                                     <DropdownMenuItem onClick={() => handleUpdateStatus(request, 'approved_by_tech_lead')}>
                                        <Check className="mr-2 h-4 w-4" />
                                        Approve (Tech Lead)
                                    </DropdownMenuItem>
                                )}
                                {canAdminApprove && (
                                    <DropdownMenuItem onClick={() => handleUpdateStatus(request, 'approved_by_tech_lead')}>
                                        <Check className="mr-2 h-4 w-4" />
                                        Approve for Admin
                                    </DropdownMenuItem>
                                )}
                                {canAdminComplete && (
                                     <DropdownMenuItem onClick={() => handleUpdateStatus(request, 'completed')}>
                                        <CheckCheck className="mr-2 h-4 w-4" />
                                        Mark as Completed
                                    </DropdownMenuItem>
                                )}
                                { (canTechLeadAct || canAdminComplete || canAdminApprove) && canBeRejected && <DropdownMenuSeparator />}
                                {canBeRejected && (
                                    <DropdownMenuItem className="text-destructive" onClick={() => setRequestToReject(request)}>
                                        <X className="mr-2 h-4 w-4" />
                                        Reject
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <span className="text-xs text-muted-foreground">Resolved</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
             })
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No requests found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

       <Dialog open={!!requestToReject} onOpenChange={(open) => !open && setRequestToReject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Access Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject this request? You can provide notes below.
            </DialogDescription>
          </DialogHeader>
          {requestToReject && <RejectRequestForm request={requestToReject} onFinished={() => setRequestToReject(null)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
