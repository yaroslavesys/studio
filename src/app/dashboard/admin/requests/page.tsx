
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

  const allRequestsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    // Admins primarily act on requests approved by tech leads, but can also see pending ones.
    return query(
      collection(firestore, 'requests'), 
      where('status', 'in', ['approved_by_tech_lead', 'pending']),
      orderBy('status'),
      orderBy('requestedAt', 'desc')
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
          <RequestsTable requestsQuery={allRequestsQuery} userProfile={userProfile}/>
        </CardContent>
      </Card>
    </div>
  );
}
