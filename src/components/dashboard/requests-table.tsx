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
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { AccessRequest, RequestStatus, User } from '@/lib/types';
import { updateRequest } from '@/lib/actions';
import { useTransition } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { SafeDate } from '@/components/safe-date';

const statusStyles: Record<RequestStatus, string> = {
  Pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  Approved: 'bg-green-500/10 text-green-400 border-green-500/20',
  Rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
};

type RequestWithDetails = AccessRequest & { userName?: string; departmentName?: string, userEmail?: string };


export function RequestsTable({
  requests,
  user,
}: {
  requests: RequestWithDetails[];
  user: User;
  allUsers: (User & { avatarUrl: string })[];
}) {
  let [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleAction = (id: string, status: RequestStatus, comment?: string) => {
    startTransition(async () => {
      await updateRequest(id, status, comment);
      toast({ title: `Request ${status}` });
    });
  };

  const isTechLead = user.role === 'TechLead';
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Access Requests</CardTitle>
        <CardDescription>
          {user.role === 'User'
            ? 'A history of your submitted access requests.'
            : `Requests for your review.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {user.role !== 'User' && <TableHead>User</TableHead>}
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                {isTechLead && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isTechLead ? 6 : 5} className="h-24 text-center">
                    No requests found.
                  </TableCell>
                </TableRow>
              ) : (
                requests.map(request => (
                  <TableRow key={request.id}>
                    {user.role !== 'User' && <TableCell className="font-medium">{request.userName}</TableCell>}
                    <TableCell className="max-w-[250px] truncate font-medium">{request.title}</TableCell>
                    <TableCell>{request.requestType}</TableCell>
                    <TableCell>
                      <SafeDate dateString={request.createdAt} />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('font-semibold', statusStyles[request.status])}>
                        {request.status}
                      </Badge>
                    </TableCell>
                    {isTechLead && (
                      <TableCell className="text-right">
                        {request.status === 'Pending' ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-green-500/30 text-green-400 hover:bg-green-500/10 hover:text-green-300"
                              onClick={() => handleAction(request.id, 'Approved')}
                              disabled={isPending}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleAction(request.id, 'Rejected')}
                              disabled={isPending}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Reject
                            </Button>
                          </div>
                        ) : (
                           <div className="flex justify-end text-muted-foreground text-xs italic">
                                Action taken
                           </div>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}