import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-md',
        className
      )}
    >
      <ShieldCheck className="h-6 w-6" />
    </div>
  );
}
