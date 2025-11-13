
'use client';
import { useState, useMemo } from 'react';
import { collection, doc, updateDoc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useFunctions } from '@/firebase';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Switch } from '@/components/ui/switch';
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
import { httpsCallable } from 'firebase/functions';


// --- Types ---
interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  isAdmin: boolean;
  isTechLead: boolean;
  teamId?: string;
}

interface Team {
  id: string;
  name: string;
}

// --- Edit User Form ---
const formSchema = z.object({
  isAdmin: z.boolean(),
  isTechLead: z.boolean(),
  teamId: z.string().optional(),
}).refine(data => {
    // If user is a tech lead, they must be assigned to a team.
    if (data.isTechLead && (!data.teamId || data.teamId === 'none')) {
        return false;
    }
    return true;
}, {
    message: "A Tech Lead must be assigned to a team.",
    path: ["teamId"], // This error will be shown under the teamId field
});


function EditUserForm({
  user,
  teams,
  onFinished,
}: {
  user: UserProfile;
  teams: Team[];
  onFinished: () => void;
}) {
  const firestore = useFirestore();
  const functions = useFunctions();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      isAdmin: user.isAdmin,
      isTechLead: user.isTechLead,
      teamId: user.teamId || '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!firestore || !functions) return;
    const userDocRef = doc(firestore, 'users', user.uid);
    
    // This data is for display purposes in the Firestore DB
    const displayUpdateData: any = { 
        teamId: values.teamId === 'none' || values.teamId === '' ? null : values.teamId,
        isAdmin: values.isAdmin,
        isTechLead: values.isTechLead,
    };
    
    // This data is for security rules via Custom Claims
    const claimsUpdateData = {
        isAdmin: values.isAdmin,
        isTechLead: values.isTechLead,
        // We also add the teamId to the token to make security rules more efficient
        teamId: displayUpdateData.teamId, 
    }

    try {
        // This is the critical part: Call the cloud function to set custom claims
        // This makes the ID token the source of truth for security rules.
        const setCustomClaims = httpsCallable(functions, 'setCustomClaims');
        await setCustomClaims({ 
            uid: user.uid, 
            claims: claimsUpdateData
        });
        
        // After successfully setting claims, update the Firestore document
        // for display purposes. The security rules will rely on the claims.
        await updateDoc(userDocRef, displayUpdateData);

        toast({
            title: 'User Updated',
            description: `Successfully updated ${user.displayName}. Their new roles will apply on their next login.`,
        });

        onFinished();

    } catch(error: any) {
        console.error("Error updating user or setting claims:", error);
        
        // If it's a Firestore permission error, use our custom handler
        if (error.code === 'permission-denied' && error.details?.path) {
             const permissionError = new FirestorePermissionError({
                path: error.details.path,
                operation: error.details.operation,
                requestResourceData: error.details.requestResourceData,
            });
            errorEmitter.emit('permission-error', permissionError);
        } else {
             toast({
                variant: "destructive",
                title: 'Update Failed',
                description: error.message || 'Could not update user roles or profile.',
            });
        }
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="isAdmin"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel>Administrator</FormLabel>
                  <FormDescription>
                    Grants full access to the system.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="isTechLead"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel>Tech Lead</FormLabel>
                  <FormDescription>
                    Allows managing a specific team.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
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
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="No Team" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">No Team</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Assign this user to a development team.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <DialogFooter>
             <Button type="button" variant="ghost" onClick={onFinished}>
                Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

// --- Main Users Table ---
export function UsersTable() {
  const firestore = useFirestore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  const usersCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'users');
  }, [firestore]);

  const teamsCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'teams');
  }, [firestore]);

  const { data: users, isLoading: isLoadingUsers, error: usersError } = useCollection<UserProfile>(usersCollection);
  const { data: teams, isLoading: isLoadingTeams, error: teamsError } = useCollection<Team>(teamsCollection);

  const teamsMap = useMemo(() => {
    if (!teams) return new Map<string, string>();
    return new Map(teams.map((team) => [team.id, team.name]));
  }, [teams]);

  const handleEditClick = (user: UserProfile) => {
    setSelectedUser(user);
    setIsDialogOpen(true);
  };
  
  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedUser(null);
  };

  const isLoading = isLoadingUsers || isLoadingTeams;
  const error = usersError || teamsError;

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
          This is likely a permissions issue. Make sure you are an
          administrator and that Firestore security rules allow admins to list
          users and teams.
        </p>
      </div>
    );
  }

  if (!users || users.length === 0) {
    return <p>No users found.</p>;
  }

  return (
    <>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Avatar</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Team</TableHead>
              <TableHead className="w-[50px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.uid}>
                <TableCell>
                  <Avatar>
                    <AvatarImage src={user.photoURL} />
                    <AvatarFallback>
                      {user.displayName?.[0] ?? user.email?.[0]}
                    </AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell className="font-medium">{user.displayName}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  {user.isAdmin ? (
                    <Badge>Admin</Badge>
                  ) : user.isTechLead ? (
                    <Badge variant="secondary">Tech Lead</Badge>
                  ) : (
                    <Badge variant="outline">User</Badge>
                  )}
                </TableCell>
                <TableCell>{teamsMap.get(user.teamId ?? '') ?? '-'}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditClick(user)}>
                        Edit User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {selectedUser?.displayName}</DialogTitle>
            <DialogDescription>
              Modify user roles and team assignment. Roles will apply on the user's next login.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && teams && (
            <EditUserForm
              user={selectedUser}
              teams={teams}
              onFinished={handleDialogClose}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
