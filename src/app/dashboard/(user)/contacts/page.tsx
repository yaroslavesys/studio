'use client';

import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { collection, doc, getDoc, orderBy, query } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUpRight, HelpCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface Contact {
    id: string;
    name: string;
    url: string;
    order: number;
    teamId?: string;
}

interface UserProfile {
    teamId?: string;
}

export default function ContactsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if(!user || !firestore) return;
    const fetchProfile = async () => {
      const userDocRef = doc(firestore, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        setUserProfile(userDoc.data() as UserProfile);
      }
    };
    fetchProfile();
  }, [user, firestore]);

  const contactsQuery = useMemoFirebase(() => {
    if(!firestore) return null;
    return query(collection(firestore, 'contacts'), orderBy('order'));
  }, [firestore]);

  const { data: allContacts, isLoading: isLoadingContacts } = useCollection<Contact>(contactsQuery);

  const filteredContacts = useMemo(() => {
    if (!allContacts) return [];
    // Show global contacts and contacts for the user's team
    return allContacts.filter(contact => !contact.teamId || contact.teamId === userProfile?.teamId);
  }, [allContacts, userProfile]);

  const isLoading = isLoadingContacts || !userProfile;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <Card>
            <CardHeader>
                <CardTitle>Important Contacts</CardTitle>
                <CardDescription>
                    Quick links to team chats and resources.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {isLoading ? (
                    <Skeleton className="h-24 w-full" />
                ) : filteredContacts && filteredContacts.length > 0 ? (
                    filteredContacts.map(contact => (
                         <a href={contact.url} target="_blank" rel="noopener noreferrer" key={contact.id}>
                            <Card  className="flex items-center justify-between p-4 transition-all hover:bg-accent hover:text-accent-foreground">
                                <h3 className="font-semibold">{contact.name}</h3>
                                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                            </Card>
                        </a>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-8 text-center">
                        <HelpCircle className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-semibold">No Contacts Available</h3>
                        <p className="mt-1 text-sm text-muted-foreground">The administrator has not added any contact links yet.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    </div>
  );
}
