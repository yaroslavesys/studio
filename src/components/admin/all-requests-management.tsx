'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { AccessRequest, RequestStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CheckCircle, Info, Trash2, XCircle } from 'lucide-react';
import { useTransition, useState } from 'react';
import { deleteRequest, updateRequest } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { SafeDate } from '@/components/safe-date';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const statusStyles: Record<RequestStatus, string> = {
  Pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  Approved: 'bg-green-500/10 text-green-400 border-green-500/20',
  Rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
};

type RequestWithDetails = AccessRequest & { userName: string; departmentName: string, userEmail: string };

export function AllRequestsManagement({ requests }: { requests: RequestWithDetails[] }) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleAdminAction = (id: string, status: RequestStatus) => {
    startTransition(async () => {
      await updateRequest(id, status);
      toast({ title: `Request status set to ${status}` });
    });
  };
  
  const handleDelete = (id: string) => {
      startTransition(async () => {
          await deleteRequest(id);
          toast({ variant: 'destructive', title: `Request deleted` });
      })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Access Requests</CardTitle>
        <CardDescription>Review, approve, reject, or delete any request in the organization.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Request</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Details</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests && requests.length > 0 ? requests.map(request => (
              <TableRow key={request.id}>
                <TableCell className="font-medium">
                    <div>{request.userName}</div>
                    <div className="text-xs text-muted-foreground">{request.userEmail}</div>
                </TableCell>
                <TableCell>{request.departmentName}</TableCell>
                <TableCell className="max-w-[200px] truncate">{request.title}</TableCell>
                 <TableCell>
                  <Badge variant="outline" className={cn('font-semibold', statusStyles[request.status])}>
                    {request.status}
                  </Badge>
                </TableCell>
                <TableCell><SafeDate dateString={request.createdAt}/></TableCell>
                <TableCell>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm"><Info className="mr-2 h-4 w-4"/> View</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{request.title}</DialogTitle>
                                <DialogDescription>Request from {request.userName} ({request.userEmail})</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div>
                                    <h4 className="font-semibold mb-2">User's Justification</h4>
                                    <p className="text-sm p-3 bg-muted rounded-md">{request.description}</p>
                                </div>
                                {request.techLeadComment && (
                                     <div>
                                        <h4 className="font-semibold mb-2">Tech Lead's Comment</h4>
                                        <p className="text-sm p-3 bg-blue-950/80 text-blue-200 rounded-md">{request.techLeadComment}</p>
                                    </div>
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>
                </TableCell>
                <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-green-500/30 text-green-400 hover:bg-green-500/10 hover:text-green-300"
                          onClick={() => handleAdminAction(request.id, 'Approved')}
                          disabled={isPending || request.status === 'Approved'}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleAdminAction(request.id, 'Rejected')}
                          disabled={isPending || request.status === 'Rejected'}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Reject
                        </Button>
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive" className="bg-red-800/50" disabled={isPending}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the access request.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(request.id)}>
                                    Yes, delete it
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </TableCell>
              </TableRow>
            )) : (
                <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">No requests found.</TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}