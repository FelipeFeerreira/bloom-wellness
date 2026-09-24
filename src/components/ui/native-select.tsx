import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

function NativeSelect({ className, ...props }: React.ComponentProps<'select'>) {
  return (
    <div className="relative">
      <select
        data-slot="native-select"
        className={cn(
          'h-11 w-full appearance-none rounded-md border border-input bg-transparent py-2 pr-9 pl-3 text-sm text-ink outline-none focus-visible:border-forest focus-visible:ring-3 focus-visible:ring-forest/15 focus-visible:outline-none disabled:opacity-50 aria-invalid:border-destructive',
          className,
        )}
        {...props}
      />
      <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

export { NativeSelect };
