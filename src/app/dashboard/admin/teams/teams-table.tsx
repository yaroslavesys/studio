
'use client';
import { useMemo, useState } from 'react';
import {
  collection,
  doc,
  writeBatch,
  addDoc,
  updateDoc
} from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useFunctions } from '@/firebase';
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
import { Service } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { httpsCallable } from 'firebase/functions';


// --- Types ---
interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  isAdmin?: boolean;
  isTechLead?: boolean;
  teamId?: string;
}

interface Team {
  id: string;
  name: string;
  techLeadId?: string;
  availableServiceIds?: string[];
}

// --- Form Schema ---
const teamFormSchema = z.object({
  name: z.string().min(2, {
    message: 'Team name must be at least 2 characters.',
  }),
  techLeadId: z.string().optional(),
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
  const functions = useFunctions();
  const { toast } = useToast();
  const isEditing = !!team;

  const form = useForm<z.infer<typeof teamFormSchema>>({
    resolver: zodResolver(teamFormSchema),
    defaultValues: {
      name: team?.name || '',
      techLeadId: team?.techLeadId || 'none',
      availableServiceIds: team?.availableServiceIds || [],
    },
  });

  const onSubmit = async (values: z.infer<typeof teamFormSchema>) => {
    if (!firestore || !functions) return;
    
    const setCustomClaims = httpsCallable(functions, 'setCustomClaims');
    const newTechLeadId = values.techLeadId === 'none' ? null : values.techLeadId;
    const previousTechLeadId = team?.techLeadId;

    const finalTeamData: any = {
        name: values.name,
        availableServiceIds: values.availableServiceIds,
        techLeadId: newTechLeadId,
    };

    try {
      if (isEditing) {
        // Update team document
        const teamDocRef = doc(firestore, 'teams', team.id);
        await updateDoc(teamDocRef, finalTeamData);
        
        // Handle tech lead changes
        if (newTechLeadId !== previousTechLeadId) {
          // Demote previous tech lead if they are no longer leading this team
          if (previousTechLeadId) {
            const previousTechLeadUser = users.find(u => u.uid === previousTechLeadId);
             if (previousTechLeadUser) {
                  await setCustomClaims({ uid: previousTechLeadId, claims: { isTechLead: false, teamId: null, isAdmin: !!previousTechLeadUser.isAdmin } });
             }
          }
          // Promote new tech lead
          if (newTechLeadId) {
             const newTechLeadUser = users.find(u => u.uid === newTechLeadId);
             if(newTechLeadUser) {
                await setCustomClaims({ uid: newTechLeadId, claims: { isTechLead: true, teamId: team.id, isAdmin: !!newTechLeadUser.isAdmin } });
             }
          }
        }
      } else { // Creating a new team
        const newTeamRef = await addDoc(collection(firestore, 'teams'), finalTeamData);
        // If a tech lead is assigned on creation, update their claims
        if (newTechLeadId) {
            const newTechLeadUser = users.find(u => u.uid === newTechLeadId);
            if (newTechLeadUser) {
              await setCustomClaims({ uid: newTechLeadId, claims: { isTechLead: true, teamId: newTeamRef.id, isAdmin: !!newTechLeadUser.isAdmin } });
            }
        }
      }

      toast({ title: isEditing ? 'Team Updated' : 'Team Created' });
      onFinished();

    } catch (error: any) {
        console.error("Error saving team:", error);
        toast({
            variant: "destructive",
            title: 'Save Failed',
            description: error.message || 'Could not save team data.',
        });
    }
  };

  const otherTeamsTechLeadIds = teams
    .filter((t) => t.id !== team?.id && t.techLeadId)
    .map((t) => t.techLeadId);

  const availableTechLeads = users.filter(
    (user) => !otherTeamsTechLeadIds.includes(user.uid) || user.uid === team?.techLeadId
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
                <FormLabel>Tech Lead (Optional)</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value || 'none'}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a user to lead the team" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    <SelectItem value="none">No Tech Lead</SelectItem>
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
  const functions = useFunctions();
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
    if (!firestore || !teams || !functions) return;
    const batch = writeBatch(firestore);
    const setCustomClaims = httpsCallable(functions, 'setCustomClaims');
    
    try {
      // 1. Delete the team
      const teamDocRef = doc(firestore, 'teams', teamToDelete.id);
      batch.delete(teamDocRef);

      // 2. If the team had a tech lead, handle their demotion.
      const techLeadId = teamToDelete.techLeadId;
      if (techLeadId) {
        const techLeadUser = usersData?.find(u => u.uid === techLeadId);
        if (techLeadUser) {
           await setCustomClaims({ uid: techLeadId, claims: { isTechLead: false, teamId: null, isAdmin: !!techLeadUser.isAdmin } });
        }
      }
      
      // TODO: Find all users in this team and unassign them. This is a more complex operation.
      // For now, users will remain in the team until reassigned manually. A Cloud Function trigger would be better for this.
      
      // 4. Commit the batch
      await batch.commit();

      toast({ title: 'Team Deleted', description: `The ${teamToDelete.name} team has been deleted.` });
    } catch (error: any) {
       console.error("Error deleting team:", error);
        toast({
            variant: "destructive",
            title: 'Delete Failed',
            description: error.message || 'Could not delete team.',
        });
    }
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
                  <TableCell>{team.techLeadId ? usersMap.get(team.techLeadId) ?? 'N/A' : 'N/A'}</TableCell>
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

    