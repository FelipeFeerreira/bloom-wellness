'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ArrowUpRight, Check, ClipboardList, Database, Loader2, Mail, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiFetch, type JobState, type LeadProgress } from '@/lib/api-client';
import { useSiteStore } from '@/lib/store';
import { cn } from '@/lib/utils';

type StepState = 'idle' | 'working' | 'done' | 'warning' | 'failed';

/** Keep polling while a job is running or due to retry within the next minute. */
export function pollInterval(progress: LeadProgress | undefined) {
  if (!progress) return 1500;
  const active = progress.jobs.some(
    (job) => job.status === 'PROCESSING' || (job.status === 'PENDING' && new Date(job.nextRunAt).getTime() - Date.now() < 60_000),
  );
  return active ? 1500 : false;
}

export function jobStep(job: JobState | undefined, labels: { done: string }): { state: StepState; note: string } {
  if (!job) return { state: 'working', note: 'Queued…' };
  switch (job.status) {
    case 'ACCEPTED':
      return { state: 'done', note: job.delivery && job.delivery !== 'accepted' ? `${labels.done} · ${job.delivery}` : labels.done };
    case 'PENDING':
      return { state: 'working', note: job.attempts > 0 ? `Retrying (attempt ${job.attempts + 1})…` : 'Queued…' };
    case 'PROCESSING':
      return { state: 'working', note: 'Sending…' };
    case 'BLOCKED':
      return { state: 'warning', note: 'Channel not connected in this environment — saved for later.' };
    case 'REVIEW':
      return { state: 'warning', note: 'Flagged for the team to double-check.' };
    case 'FAILED':
      return { state: 'failed', note: 'Could not be delivered — the team was flagged.' };
  }
}

const ICONS = {
  idle: null,
  working: <Loader2 className="size-3.5 animate-spin" />,
  done: <Check className="size-3.5" />,
  warning: <AlertCircle className="size-3.5" />,
  failed: <AlertCircle className="size-3.5" />,
};

export function AutomationSection() {
  const tracked = useSiteStore((s) => s.tracked);

  const progress = useQuery({
    queryKey: ['lead-progress', tracked?.key],
    queryFn: () => apiFetch<LeadProgress>(`/api/leads/${tracked!.key}`),
    enabled: !!tracked,
    refetchInterval: (query) => pollInterval(query.state.data),
  });

  const job = (channel: JobState['channel']) => progress.data?.jobs.find((j) => j.channel === channel);
  const live = !!tracked;
  const received = live && progress.isSuccess;

  const steps = [
    {
      icon: <ClipboardList />,
      title: 'A new hello',
      text: 'A visitor submits a form. Their details are validated, protected against spam and duplicates, and saved.',
      status: live ? (received ? { state: 'done' as const, note: `Received from ${tracked.name}` } : { state: 'working' as const, note: 'Saving…' }) : null,
    },
    {
      icon: <Mail />,
      title: 'Instant reassurance',
      text: 'A friendly confirmation email lets the client know their message arrived — or confirms their appointment.',
      status: received ? jobStep(job('EMAIL'), { done: 'Email accepted by Resend' }) : null,
    },
    {
      icon: <MessageCircle />,
      title: 'Your team, in the loop',
      text: "A WhatsApp alert brings the client's name, contact and message straight to the clinic owner's phone.",
      status: received ? jobStep(job('WHATSAPP'), { done: 'WhatsApp alert sent' }) : null,
    },
    {
      icon: <Database />,
      title: 'Every lead, organized',
      text: 'The lead lands in the clinic CRM (PostgreSQL), with status tracking and one-click retries for any failed step.',
      status: received ? { state: 'done' as const, note: 'Stored in the CRM' } : null,
    },
  ];

  return (
    <section id="automation" className="border-t bg-paper py-16 md:py-24">
      <div className="wrap">
        <div className="text-center">
          <span className="mb-5 inline-block rounded-full border border-[#b8c0ae] px-3.5 py-1 text-[10px] tracking-[0.14em]">
            BEHIND THE EXPERIENCE · LIVE AUTOMATION
          </span>
          <h2 className="section-title mb-5">More care. Less admin.</h2>
          <p className="mx-auto max-w-[590px] text-sm text-muted-foreground">
            A thoughtful experience doesn&apos;t end with “Send.” Every form on this page triggers a real workflow — send a note or book a
            time and watch each step happen below.
          </p>
        </div>

        <ol className="my-11 grid gap-5 md:grid-cols-2 lg:grid-cols-4 lg:gap-7" aria-live="polite">
          {steps.map((step, i) => (
            <li
              key={step.title}
              className={cn(
                'relative rounded-md border border-[#d5dacc] bg-cream p-6 transition-colors duration-500',
                step.status?.state === 'done' && 'border-[#7d916e] bg-[#e0e8d6]',
                step.status?.state === 'warning' && 'border-[#e0c9a6] bg-[#f8f1e4]',
                step.status?.state === 'failed' && 'border-destructive/40 bg-destructive/5',
              )}
            >
              <div className="mb-6 grid size-10 place-items-center rounded-full bg-mist text-forest [&_svg]:size-5 [&_svg]:stroke-[1.5]">{step.icon}</div>
              <small className="absolute top-7 right-5 text-[10px] text-muted-foreground">0{i + 1}</small>
              <h3 className="mb-2.5 text-[21px] leading-tight">{step.title}</h3>
              <p className="text-xs leading-[1.8] text-muted-foreground">{step.text}</p>
              {step.status && (
                <p className="mt-4 flex items-center gap-2 border-t pt-3 text-xs font-medium text-forest">
                  {ICONS[step.status.state]}
                  {step.status.note}
                </p>
              )}
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap items-center justify-center gap-5">
          {live ? (
            <p className="text-xs text-muted-foreground">
              {progress.isError ? progress.error.message : `Following your ${tracked.kind === 'BOOKING' ? 'booking' : 'message'} in real time.`}
            </p>
          ) : (
            <>
              <Button asChild variant="outline" size="lg">
                <a href="#contact">
                  Try it — send us a note <ArrowUpRight />
                </a>
              </Button>
              <p className="text-xs text-muted-foreground">Uses your real submission. Nothing is simulated.</p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
