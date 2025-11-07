'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Bot, Sparkles } from 'lucide-react';
import { summarizeDashboard } from '@/ai/flows/dashboard-summary';
import type { AccessRequest } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';

export function DashboardSummary({ requests }: { requests: AccessRequest[] }) {
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSummarize = async () => {
    setIsLoading(true);
    setError('');
    setSummary('');
    try {
      const dashboardData = JSON.stringify(
        requests.map(r => ({
          title: r.title,
          status: r.status,
          type: r.requestType,
          date: r.createdAt,
        })),
        null,
        2
      );

      const result = await summarizeDashboard({ dashboardData });
      setSummary(result.summary);
    } catch (e) {
      setError('Failed to generate summary. Please try again later.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" onClick={handleSummarize}>
          <Sparkles className="mr-2 h-4 w-4" />
          AI Summary
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            Dashboard AI Summary
          </SheetTitle>
          <SheetDescription>
            An AI-powered overview of the current access requests.
          </SheetDescription>
        </SheetHeader>
        <div className="py-4">
          {isLoading && (
            <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
            </div>
          )}
          {error && (
            <Alert variant="destructive">
              <Terminal className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {summary && <p className="text-sm leading-relaxed text-muted-foreground">{summary}</p>}
        </div>
      </SheetContent>
    </Sheet>
  );
}
