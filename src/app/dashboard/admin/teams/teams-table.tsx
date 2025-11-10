'use client';
import { useMemo, useState } from 'react';
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

// --- Types ---
interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  isTechLead?: boolean;
}

interface Team {
  id: string;
  name: string;
  techLeadId: string;
}

// --- Form Schema ---
const teamFormSchema = z.object({
  name: z.string().min(2, {
    message: 'Team name must be at least 2 characters.',
  }),
  techLeadId: z.string().min(1, { message: 'You must select a tech lead.' }),
});

// --- Edit/Create Team Form ---
function TeamForm({
  team,
  users,
  onFinished,
}: {
  team?: Team;
  users: UserProfile[];
  onFinished: () => void;
}) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const isEditing = !!team;

  const form = useForm<z.infer<typeof teamFormSchema>>({
    resolver: zodResolver(teamFormSchema),
    defaultValues: {
      name: team?.name || '',
      techLeadId: team?.techLeadId || '',
    },
  });

  const onSubmit = async (values: z.infer<typeof teamFormSchema>) => {
    try {
      if (isEditing) {
        const teamDocRef = doc(firestore, 'teams', team.id);
        await updateDoc(teamDocRef, values).catch((e) => {
          const permissionError = new FirestorePermissionError({
            path: teamDocRef.path,
            operation: 'update',
            requestResourceData: values,
          });
          errorEmitter.emit('permission-error', permissionError);
          throw permissionError;
        });
        toast({ title: 'Team Updated', description: `The ${values.name} team has been updated.` });
      } else {
        const teamsCollectionRef = collection(firestore, 'teams');
        await addDoc(teamsCollectionRef, values).catch((e) => {
          const permissionError = new FirestorePermissionError({
            path: teamsCollectionRef.path,
            operation: 'create',
            requestResourceData: values,
          });
          errorEmitter.emit('permission-error', permissionError);
          throw permissionError;
        });
        toast({ title: 'Team Created', description: `The ${values.name} team has been created.` });
      }
      onFinished();
    } catch (error: any) {
      console.error('Error saving team: ', error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: error.message || 'Could not save the team.',
      });
    }
  };

  // Filter out users who are already tech leads of other teams.
  // If editing, the current tech lead of this team should still be in the list.
  const availableTechLeads = users.filter(
    (user) => !user.isTechLead || user.uid === team?.techLeadId
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Team Name</FormLabel>
              <FormControl>
                <Input placeholder="E.g. Frontend Warriors" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="techLeadId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tech Lead</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user to lead the team" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {availableTechLeads.map((user) => (
                    <SelectItem key={user.uid} value={user.uid}>
                      {user.displayName} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onFinished}>
            Cancel
          </Button>
          <Button type="submit">{isEditing ? 'Save Changes' : 'Create Team'}</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

// --- Main Teams Table ---
export function TeamsTable() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | undefined>(undefined);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);

  const teamsCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'teams');
  }, [firestore]);

  const usersCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'users');
  }, [firestore]);

  const { data: teams, isLoading: isLoadingTeams, error: teamsError } = useCollection<Team>(teamsCollection);
  const { data: usersData, isLoading: isLoadingUsers, error: usersError } = useCollection<UserProfile>(usersCollection);

  const usersMap = useMemo(() => {
    if (!usersData) return new Map<string, string>();
    return new Map(usersData.map((user) => [user.uid, user.displayName]));
  }, [usersData]);

  const handleCreate = () => {
    setSelectedTeam(undefined);
    setIsFormOpen(true);
  };

  const handleEdit = (team: Team) => {
    setSelectedTeam(team);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!teamToDelete) return;

    try {
      const teamDocRef = doc(firestore, 'teams', teamToDelete.id);
      await deleteDoc(teamDocRef).catch((e) => {
        const permissionError = new FirestorePermissionError({
          path: teamDocRef.path,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
        throw permissionError;
      });
      toast({ title: 'Team Deleted', description: `The ${teamToDelete.name} team has been deleted.` });
      setTeamToDelete(null);
    } catch (error: any) {
      console.error('Error deleting team: ', error);
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: error.message || 'Could not delete the team.',
      });
    }
  };

  const isLoading = isLoadingTeams || isLoadingUsers;
  const error = teamsError || usersError;

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
          This is likely a permissions issue. Make sure you are an administrator
          and that Firestore security rules allow admins to list users and teams.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={handleCreate}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Team
        </Button>
      </div>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Team Name</TableHead>
              <TableHead>Tech Lead</TableHead>
              <TableHead className="w-[50px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teams && teams.length > 0 ? (
              teams.map((team) => (
                <TableRow key={team.id}>
                  <TableCell className="font-medium">{team.name}</TableCell>
                  <TableCell>{usersMap.get(team.techLeadId) ?? 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(team)}>
                            <Edit className="mr-2 h-4 w-4" />
                            <span>Edit</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Delete</span>
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the <strong>{team.name}</strong> team.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setTeamToDelete(null)}>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive hover:bg-destructive/90"
                            onClick={() => {
                              setTeamToDelete(team);
                              handleDelete();
                            }}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center">
                  No teams found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedTeam ? 'Edit Team' : 'Create New Team'}</DialogTitle>
            <DialogDescription>
              {selectedTeam ? 'Update the details for this team.' : 'Fill out the form to create a new team.'}
            </DialogDescription>
          </DialogHeader>
          {usersData && (
            <TeamForm
              team={selectedTeam}
              users={usersData}
              onFinished={() => setIsFormOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
