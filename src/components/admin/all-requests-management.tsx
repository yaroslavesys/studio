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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { AccessRequest, RequestStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { MoreVertical, Trash2 } from 'lucide-react';
import { useTransition } from 'react';
import { deleteRequest } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';

const statusStyles: Record<RequestStatus, string> = {
  Pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  Approved: 'bg-green-500/10 text-green-400 border-green-500/20',
  Rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
};

type RequestWithDetails = AccessRequest & { userName: string; departmentName: string };

export function AllRequestsManagement({ requests }: { requests: RequestWithDetails[] }) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteRequest(id);
      toast({ title: 'Request Deleted', description: 'The access request has been permanently removed.' });
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Access Requests</CardTitle>
        <CardDescription>A complete log of all access requests across the organization.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map(request => (
              <TableRow key={request.id}>
                <TableCell className="font-medium">{request.userName}</TableCell>
                <TableCell>{request.departmentName}</TableCell>
                <TableCell>{request.title}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn('font-semibold', statusStyles[request.status])}>
                    {request.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" disabled={isPending}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() => handleDelete(request.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Request
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
