
'use client';
import { useState, useMemo } from 'react';
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  orderBy,
  query
} from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, PlusCircle, Trash2, Edit } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// --- Types ---
interface Contact {
  id: string;
  name: string;
  url: string;
  order: number;
  teamId?: string;
}

interface Team {
  id: string;
  name: string;
}

// --- Form Schema ---
const contactFormSchema = z.object({
  name: z.string().min(2, {
    message: 'Name must be at least 2 characters.',
  }),
  url: z.string().url({ message: 'Please enter a valid URL.' }),
  order: z.coerce.number().int(),
  teamId: z.string().optional(),
});

// --- Edit/Create Contact Form ---
function ContactForm({
  contact,
  teams,
  onFinished,
}: {
  contact?: Contact;
  teams: Team[];
  onFinished: () => void;
}) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const isEditing = !!contact;

  const form = useForm<z.infer<typeof contactFormSchema>>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: contact?.name || '',
      url: contact?.url || '',
      order: contact?.order || 0,
      teamId: contact?.teamId || '',
    },
  });

  const onSubmit = (values: z.infer<typeof contactFormSchema>) => {
    if (!firestore) return;

    const updateData: any = { ...values };
    if (updateData.teamId === '' || updateData.teamId === 'global') {
      updateData.teamId = null;
    }

    
      if (isEditing) {
        const contactDocRef = doc(firestore, 'contacts', contact.id);
        updateDoc(contactDocRef, updateData).catch(async () => {
           const permissionError = new FirestorePermissionError({
            path: contactDocRef.path,
            operation: 'update',
            requestResourceData: updateData,
          });
          errorEmitter.emit('permission-error', permissionError);
        });

        toast({ title: 'Contact Updated', description: `The ${values.name} link has been updated.` });

      } else { // Creating
        const contactsCollectionRef = collection(firestore, 'contacts');
        addDoc(contactsCollectionRef, updateData).catch(async () => {
            const permissionError = new FirestorePermissionError({
            path: contactsCollectionRef.path,
            operation: 'create',
            requestResourceData: updateData,
          });
          errorEmitter.emit('permission-error', permissionError);
        });
        toast({ title: 'Contact Created', description: `The ${values.name} link has been created.` });
      }

      onFinished();
  };


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Link Name</FormLabel>
              <FormControl>
                <Input placeholder="E.g. Support Chat" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL</FormLabel>
               <FormControl>
                <Input placeholder="https://example.com/chat" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="teamId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Team</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value || 'global'}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Assign to a team" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="global">For All Teams</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Assign this link to a specific team, or make it visible to everyone.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="order"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sort Order</FormLabel>
               <FormControl>
                <Input type="number" placeholder="0" {...field} />
              </FormControl>
              <FormDescription>
                Lower numbers appear higher in the list.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onFinished}>
            Cancel
          </Button>
          <Button type="submit">{isEditing ? 'Save Changes' : 'Create Link'}</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

// --- Main Contacts Table ---
export function ContactsTable() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | undefined>(undefined);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);

  const contactsCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'contacts'), orderBy('order'));
  }, [firestore]);
  
  const teamsCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'teams');
  }, [firestore]);


  const { data: contacts, isLoading: isLoadingContacts, error: contactsError } = useCollection<Contact>(contactsCollection);
  const { data: teams, isLoading: isLoadingTeams, error: teamsError } = useCollection<Team>(teamsCollection);

  const teamsMap = useMemo(() => {
    if (!teams) return new Map<string, string>();
    return new Map(teams.map((team) => [team.id, team.name]));
  }, [teams]);


  const handleCreate = () => {
    setSelectedContact(undefined);
    setIsFormOpen(true);
  };

  const handleEdit = (contact: Contact) => {
    setSelectedContact(contact);
    setIsFormOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!contactToDelete) return;
    handleDelete(contactToDelete);
    setContactToDelete(null);
  };

  const handleDeleteRequest = (contact: Contact) => {
    setContactToDelete(contact);
  };


  const handleDelete = (contactToDelete: Contact) => {
    if (!firestore) return;
    const contactDocRef = doc(firestore, 'contacts', contactToDelete.id);
    deleteDoc(contactDocRef).catch(async () => {
        const permissionError = new FirestorePermissionError({
          path: contactDocRef.path,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
      });
      toast({ title: 'Contact Deleted', description: `The ${contactToDelete.name} link has been deleted.` });
  };
  
  const isLoading = isLoadingContacts || isLoadingTeams;
  const error = contactsError || teamsError;

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        <p>
          <span className="font-bold">Error:</span> {error.message}
        </p>
        <p className="mt-2 text-xs">
          This is likely a permissions issue. Make sure you are an administrator.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={handleCreate}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Contact Link
        </Button>
      </div>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Team</TableHead>
              <TableHead className="w-[50px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts && contacts.length > 0 ? (
              contacts.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell>{contact.order}</TableCell>
                  <TableCell className="font-medium">{contact.name}</TableCell>
                  <TableCell><a href={contact.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{contact.url}</a></TableCell>
                  <TableCell>{contact.teamId ? teamsMap.get(contact.teamId) : 'All Teams'}</TableCell>
                  <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(contact)}>
                            <Edit className="mr-2 h-4 w-4" />
                            <span>Edit</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => handleDeleteRequest(contact)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Delete</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  No contacts found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedContact ? 'Edit Contact Link' : 'Create New Contact Link'}</DialogTitle>
            <DialogDescription>
              {selectedContact ? 'Update the details for this link.' : 'Fill out the form to create a new link.'}
            </DialogDescription>
          </DialogHeader>
           {teams && (
            <ContactForm
                contact={selectedContact}
                teams={teams}
                onFinished={() => setIsFormOpen(false)}
              />
           )}
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!contactToDelete} onOpenChange={(open) => !open && setContactToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the <strong>{contactToDelete?.name}</strong> link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setContactToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
