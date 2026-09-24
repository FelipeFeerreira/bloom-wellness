import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type Props = {
  id: string;
  label: React.ReactNode;
  error?: string;
  className?: string;
  children: (a11y: { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string }) => React.ReactNode;
};

/** Label + control + inline error, wired for screen readers. */
export function FormField({ id, label, error, className, children }: Props) {
  const errorId = `${id}-error`;
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Label htmlFor={id}>{label}</Label>
      {children({ id, 'aria-invalid': !!error, 'aria-describedby': error ? errorId : undefined })}
      {error && (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Hidden from people; bots that fill every input reveal themselves. The label and name avoid
 * anything browser autofill or password managers recognise, so real visitors never trip it.
 */
export function Honeypot({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label>
        Leave this empty
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          name="bloom_trap"
          data-lpignore="true"
          data-1p-ignore="true"
          data-bwignore="true"
          data-form-type="other"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    </div>
  );
}
