import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, List, Clock, XCircle } from 'lucide-react';
import type { AccessRequest } from '@/lib/types';

interface StatCardsProps {
  requests: AccessRequest[];
  userId: string;
}

export function StatCards({ requests, userId }: StatCardsProps) {
  const total = requests.length;
  const pending = requests.filter(r => r.status === 'Pending').length;
  const approved = requests.filter(r => r.status === 'Approved').length;
  const myRequests = requests.filter(r => r.userId === userId).length;

  const stats = [
    { title: 'Total Requests', value: total, icon: List, color: 'text-sky-500' },
    { title: 'Pending Approval', value: pending, icon: Clock, color: 'text-yellow-500' },
    { title: 'Approved Requests', value: approved, icon: CheckCircle2, color: 'text-green-500' },
    { title: 'My Open Requests', value: myRequests, icon: List, color: 'text-purple-500' },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map(stat => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className={`h-4 w-4 text-muted-foreground ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
