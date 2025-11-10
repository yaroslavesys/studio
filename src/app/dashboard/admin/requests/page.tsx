
'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { RequestsTable } from './requests-table';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, where } from 'firebase/firestore';

interface UserProfile {
  uid: string;
  isAdmin?: boolean;
  isTechLead?: boolean;
}

export default function AdminRequestsPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  // Admins see requests that are either pending their final approval or can be fast-tracked
  const adminRequestsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'requests'), 
      where('status', 'in', ['approved_by_tech_lead', 'pending']),
      orderBy('status', 'desc'), // Show 'pending' before 'approved_by_tech_lead'
      orderBy('requestedAt', 'asc')
    );
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
          <RequestsTable requestsQuery={adminRequestsQuery} userProfile={userProfile}/>
        </CardContent>
      </Card>
    </div>
  );
}
