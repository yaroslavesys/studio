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
import { CheckCircle, Info } from 'lucide-react';
import { useTransition, useState } from 'react';
import { updateRequest } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { SafeDate } from '@/components/safe-date';
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
      toast({ title: `Access Granted`, description: 'The user has been notified.' });
    });
  };
  
  // Corrected Logic: Admin should see requests approved by TechLeads to grant final access.
  const requestsForAdmin = requests.filter(r => r.status === 'Approved');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Requests for Final Approval</CardTitle>
        <CardDescription>Grant access for requests that have been approved by Tech Leads.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Request</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Approved On</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requestsForAdmin.length > 0 ? requestsForAdmin.map(request => (
              <TableRow key={request.id}>
                <TableCell className="font-medium">
                    <div>{request.userName}</div>
                    <div className="text-xs text-muted-foreground">{request.userEmail}</div>
                </TableCell>
                <TableCell>{request.departmentName}</TableCell>
                <TableCell>{request.title}</TableCell>
                <TableCell>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm"><Info className="mr-2 h-4 w-4"/> View Details</Button>
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
                <TableCell><SafeDate dateString={request.updatedAt}/></TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn('font-semibold', statusStyles[request.status])}>
                    Approved by Lead
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => handleAdminAction(request.id, 'Approved')} // This might need a new "Granted" status later
                      disabled={isPending}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Grant Access
                    </Button>
                </TableCell>
              </TableRow>
            )) : (
                <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">No requests pending final review.</TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
