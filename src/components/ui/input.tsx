import * as React from 'react';
import { cn } from '@/lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-11 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-2 text-sm text-ink transition-colors outline-none placeholder:text-muted-foreground/70 focus-visible:border-forest focus-visible:ring-3 focus-visible:ring-forest/15 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/15',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
