'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { RequestsTable } from './requests-table';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';

export default function AdminRequestsPage() {
  const firestore = useFirestore();

  const allRequestsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'requests'), orderBy('requestedAt', 'desc'));
  }, [firestore]);

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
          <RequestsTable requestsQuery={allRequestsQuery} />
        </CardContent>
      </Card>
    </div>
  );
}
