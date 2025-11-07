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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { AccessRequest, RequestStatus, User } from '@/lib/types';
import { approveRequest, rejectRequest, deleteRequest } from '@/lib/actions';
import { useTransition } from 'react';
import { CheckCircle, XCircle, MoreVertical, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { SafeDate } from '@/components/safe-date';

const statusStyles: Record<RequestStatus, string> = {
  Pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  Approved: 'bg-green-500/10 text-green-400 border-green-500/20',
  Rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
};

type RequestWithUser = AccessRequest & { userName: string };

export function RequestsTable({
  requests,
  user,
}: {
  requests: RequestWithUser[];
  user: User;
}) {
  let [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleAction = (action: (id: string) => Promise<void>, id: string, message: string) => {
    startTransition(async () => {
      await action(id);
      toast({ title: message });
    });
  };

  const isTechLeadOrAdmin = user.role === 'TechLead' || user.role === 'Admin';
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Access Requests</CardTitle>
        <CardDescription>
          {user.role === 'User'
            ? 'A history of your submitted access requests.'
            : `Requests for the ${user.role === 'Admin' ? 'organization' : 'department'}.`}
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
                {isTechLeadOrAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={user.role === 'User' ? 4 : 6} className="h-24 text-center">
                    No requests found.
                  </TableCell>
                </TableRow>
              ) : (
                requests.map(request => (
                  <TableRow key={request.id}>
                    {user.role !== 'User' && <TableCell className="font-medium">{request.userName}</TableCell>}
                    <TableCell className="max-w-[250px] truncate">{request.title}</TableCell>
                    <TableCell>{request.requestType}</TableCell>
                    <TableCell>
                      <SafeDate dateString={request.createdAt} />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('font-semibold', statusStyles[request.status])}>
                        {request.status}
                      </Badge>
                    </TableCell>
                    {isTechLeadOrAdmin && (
                      <TableCell className="text-right">
                        {request.status === 'Pending' ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAction(approveRequest, request.id, 'Request Approved')}
                              disabled={isPending}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleAction(rejectRequest, request.id, 'Request Rejected')}
                              disabled={isPending}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Reject
                            </Button>
                          </div>
                        ) : (
                           user.role === 'Admin' && (
                             <div className="flex justify-end">
                                <DropdownMenu>
                                   <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" disabled={isPending}>
                                         <MoreVertical className="h-4 w-4"/>
                                      </Button>
                                   </DropdownMenuTrigger>
                                   <DropdownMenuContent>
                                      <DropdownMenuItem onClick={() => handleAction(deleteRequest, request.id, 'Request Deleted')} className="text-destructive">
                                         <Trash2 className="mr-2 h-4 w-4"/>
                                         Delete
                                      </DropdownMenuItem>
                                   </DropdownMenuContent>
                                </DropdownMenu>
                             </div>
                           )
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
