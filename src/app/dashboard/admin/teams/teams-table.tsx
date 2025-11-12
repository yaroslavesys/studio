'use client';
import { useMemo, useState } from 'react';
import {
  collection,
  doc,
  updateDoc,
  writeBatch,
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
import { Service } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { deleteDoc, addDoc } from 'firebase/firestore';


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
  availableServiceIds?: string[];
}

// --- Form Schema ---
const teamFormSchema = z.object({
  name: z.string().min(2, {
    message: 'Team name must be at least 2 characters.',
  }),
  techLeadId: z.string().min(1, { message: 'You must select a tech lead.' }),
  availableServiceIds: z.array(z.string()).default([]),
});

// --- Edit/Create Team Form ---
function TeamForm({
  team,
  users,
  teams,
  services,
  onFinished,
}: {
  team?: Team;
  users: UserProfile[];
  teams: Team[];
  services: Service[];
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
      availableServiceIds: team?.availableServiceIds || [],
    },
  });

  const onSubmit = async (values: z.infer<typeof teamFormSchema>) => {
    if (!firestore) return;
    const batch = writeBatch(firestore);
    const newTechLeadId = values.techLeadId;
    const previousTechLeadId = team?.techLeadId;

    try {
      if (isEditing) {
        const teamDocRef = doc(firestore, 'teams', team.id);
        batch.update(teamDocRef, values);

        if (newTechLeadId !== previousTechLeadId) {
          const newTechLeadRef = doc(firestore, 'users', newTechLeadId);
          batch.update(newTechLeadRef, { isTechLead: true });

          if (previousTechLeadId) {
            const otherTeamsLed = teams.filter(
              (t) =>
                t.techLeadId === previousTechLeadId && t.id !== team.id
            );
            if (otherTeamsLed.length === 0) {
              const previousTechLeadRef = doc(firestore, 'users', previousTechLeadId);
              batch.update(previousTechLeadRef, { isTechLead: false });
            }
          }
        }
        await batch.commit().catch(async () => {
           const permissionError = new FirestorePermissionError({
            path: teamDocRef.path,
            operation: 'update',
            requestResourceData: values,
          });
          errorEmitter.emit('permission-error', permissionError);
        });

        toast({ title: 'Team Updated', description: `The ${values.name} team has been updated.` });

      } else {
        const teamsCollectionRef = collection(firestore, 'teams');
        const newTeamRef = doc(teamsCollectionRef);
        
        batch.set(newTeamRef, values);

        const newTechLeadRef = doc(firestore, 'users', newTechLeadId);
        batch.update(newTechLeadRef, { isTechLead: true });
        
        await batch.commit().catch(async () => {
            const permissionError = new FirestorePermissionError({
            path: teamsCollectionRef.path,
            operation: 'create',
            requestResourceData: values,
          });
          errorEmitter.emit('permission-error', permissionError);
        });
        toast({ title: 'Team Created', description: `The ${values.name} team has been created.` });
      }

      onFinished();
    } catch (error: any) {
      // The .catch() blocks above will handle permission errors
    }
  };

  const otherTeamsTechLeadIds = teams
    .filter((t) => t.id !== team?.id)
    .map((t) => t.techLeadId);
  const availableTechLeads = users.filter(
    (user) => !otherTeamsTechLeadIds.includes(user.uid)
  );


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
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
        </div>
        <Separator />
         <FormField
          control={form.control}
          name="availableServiceIds"
          render={() => (
            <FormItem>
              <div className="mb-4">
                <FormLabel className="text-base">Available Services</FormLabel>
                <FormDescription>
                  Select the services that members of this team can request.
                </FormDescription>
              </div>
              <div className="space-y-2">
              {services.map((service) => (
                <FormField
                  key={service.id}
                  control={form.control}
                  name="availableServiceIds"
                  render={({ field }) => {
                    return (
                      <FormItem
                        key={service.id}
                        className="flex flex-row items-start space-x-3 space-y-0"
                      >
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(service.id)}
                            onCheckedChange={(checked) => {
                              return checked
                                ? field.onChange([...(field.value || []), service.id])
                                : field.onChange(
                                    field.value?.filter(
                                      (value) => value !== service.id
                                    )
                                  )
                            }}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">
                          {service.name}
                        </FormLabel>
                      </FormItem>
                    )
                  }}
                />
              ))}
              </div>
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
  
  const servicesCollection = useMemoFirebase(() => {
    if(!firestore) return null;
    return collection(firestore, 'services');
  }, [firestore]);


  const { data: teams, isLoading: isLoadingTeams, error: teamsError } = useCollection<Team>(teamsCollection);
  const { data: usersData, isLoading: isLoadingUsers, error: usersError } = useCollection<UserProfile>(usersCollection);
  const { data: services, isLoading: isLoadingServices, error: servicesError } = useCollection<Service>(servicesCollection);

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

  const handleDeleteConfirm = () => {
    if (!teamToDelete) return;
    handleDelete(teamToDelete);
    setTeamToDelete(null);
  };

  const handleDeleteRequest = (team: Team) => {
    setTeamToDelete(team);
  };


  const handleDelete = async (teamToDelete: Team) => {
    if (!firestore || !teams) return;
    const batch = writeBatch(firestore);

    
      // 1. Delete the team
      const teamDocRef = doc(firestore, 'teams', teamToDelete.id);
      batch.delete(teamDocRef);

      // 2. Check if the tech lead is a lead of any other team
      const techLeadId = teamToDelete.techLeadId;
      const otherTeamsLed = teams.filter(
        (t) => t.techLeadId === techLeadId && t.id !== teamToDelete.id
      );

      // 3. If they lead no other teams, demote them from tech lead status
      if (otherTeamsLed.length === 0) {
        const userDocRef = doc(firestore, 'users', techLeadId);
        batch.update(userDocRef, { isTechLead: false });
      }
      
      // 4. Commit the batch
      await batch.commit().catch(async () => {
        const permissionError = new FirestorePermissionError({
          path: teamDocRef.path,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
      });

      toast({ title: 'Team Deleted', description: `The ${teamToDelete.name} team has been deleted.` });
  };

  const isLoading = isLoadingTeams || isLoadingUsers || isLoadingServices;
  const error = teamsError || usersError || servicesError;

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
              <TableHead>Available Services</TableHead>
              <TableHead className="w-[50px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teams && teams.length > 0 ? (
              teams.map((team) => (
                <TableRow key={team.id}>
                  <TableCell className="font-medium">{team.name}</TableCell>
                  <TableCell>{usersMap.get(team.techLeadId) ?? 'N/A'}</TableCell>
                  <TableCell>{team.availableServiceIds?.length || 0}</TableCell>
                  <TableCell className="text-right">
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
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => handleDeleteRequest(team)}
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
                <TableCell colSpan={4} className="text-center">
                  No teams found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedTeam ? 'Edit Team' : 'Create New Team'}</DialogTitle>
            <DialogDescription>
              {selectedTeam ? 'Update the details for this team.' : 'Fill out the form to create a new team.'}
            </DialogDescription>
          </DialogHeader>
          {usersData && teams && services && (
            <TeamForm
              team={selectedTeam}
              users={usersData}
              teams={teams}
              services={services}
              onFinished={() => setIsFormOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!teamToDelete} onOpenChange={(open) => !open && setTeamToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the <strong>{teamToDelete?.name}</strong> team.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTeamToDelete(null)}>Cancel</AlertDialogCancel>
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
