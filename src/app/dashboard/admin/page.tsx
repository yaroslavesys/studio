'use client';

import { useRouter } from 'next/navigation';
import { useAuth, useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { signOut } from 'firebase/auth';
import { Shield } from 'lucide-react';

export default function AdminDashboardPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isLoading } = useUser();

  const handleSignOut = async () => {
    if (auth) {
      await signOut(auth);
      router.push('/');
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <Shield className="h-12 w-12 text-primary" />
          <CardTitle>Admin Dashboard</CardTitle>
          <CardDescription>Welcome, administrator {user.email}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <p className="text-center text-sm text-muted-foreground">You have special privileges.</p>
          <Button onClick={handleSignOut} variant="outline">
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
