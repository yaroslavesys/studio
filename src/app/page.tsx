'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Logo } from '@/components/logo';

export default function HomePage() {
  return (
    <div className="flex min-h-screen animate-fade-in items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-primary/20 shadow-lg shadow-primary/10">
        <CardHeader className="text-center">
          <div className="mx-auto mb-6">
            <Logo />
          </div>
          <CardTitle className="font-headline text-3xl tracking-tighter">
            Welcome to Devils access
          </CardTitle>
          <CardDescription className="pt-1">
            Application has been reset. Ready to start from scratch.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-center text-sm text-muted-foreground">
            Let me know what you want to build next.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
