import 'server-only';
import type { JobChannel, JobStatus } from '@/generated/prisma/client';
import { prisma } from '../db';
import { sendClientEmail } from './email';
import { ChannelNotConfigured, DeliveryError } from './errors';
import type { LeadForMessage } from './messages';
import { sendOwnerAlert } from './whatsapp';

export const MAX_ATTEMPTS = 5;
/** A job stuck in PROCESSING this long most likely died mid-delivery. */
export const STALE_LOCK_MS = 5 * 60_000;

/** 2, 4, 8, 16 minutes… capped at 6 hours. */
export function backoffMs(attempts: number) {
  return Math.min(2 ** attempts * 60_000, 6 * 60 * 60_000);
}

export type Handler = (job: { id: string }, lead: LeadForMessage) => Promise<string>;
export type Handlers = Record<JobChannel, Handler>;

const defaultHandlers: Handlers = {
  EMAIL: (job, lead) => sendClientEmail(job.id, lead),
  WHATSAPP: (_job, lead) => sendOwnerAlert(lead),
};

type Outcome = 'accepted' | 'retrying' | 'failed' | 'blocked';
export type RunSummary = Record<Outcome | 'recovered', number>;

type Options = { leadId?: string; jobIds?: string[]; limit?: number; now?: Date; handlers?: Handlers };

/**
 * Claims due jobs one by one (a conditional update acts as the lock, so concurrent runs from
 * `after()`, the cron and the admin never deliver the same job twice), then records the outcome.
 */
export async function processJobs({ leadId, jobIds, limit = 25, now = new Date(), handlers = defaultHandlers }: Options = {}) {
  const summary: RunSummary = { accepted: 0, retrying: 0, failed: 0, blocked: 0, recovered: 0 };

  // Delivery outcome is unknown for stale locks, so they go to a human instead of being resent.
  const stale = await prisma.automationJob.updateMany({
    where: { status: 'PROCESSING', lockedAt: { lt: new Date(now.getTime() - STALE_LOCK_MS) } },
    data: { status: 'REVIEW', lockedAt: null, lastError: 'Interrupted mid-delivery. Check the provider dashboard before retrying.' },
  });
  summary.recovered = stale.count;

  const due = await prisma.automationJob.findMany({
    where: { status: 'PENDING', nextRunAt: { lte: now }, ...(leadId && { leadId }), ...(jobIds && { id: { in: jobIds } }) },
    orderBy: { nextRunAt: 'asc' },
    take: limit,
    select: { id: true },
  });

  const outcomes = await Promise.all(due.map(({ id }) => runJob(id, now, handlers)));
  for (const outcome of outcomes) if (outcome) summary[outcome]++;
  return summary;
}

async function runJob(id: string, now: Date, handlers: Handlers): Promise<Outcome | null> {
  const claimed = await prisma.automationJob.updateMany({
    where: { id, status: 'PENDING' },
    data: { status: 'PROCESSING', lockedAt: now, attempts: { increment: 1 } },
  });
  if (claimed.count === 0) return null;

  const job = await prisma.automationJob.findUniqueOrThrow({
    where: { id },
    include: { lead: { include: { booking: { select: { service: true, startsAt: true } } } } },
  });

  let status: JobStatus;
  let outcome: Outcome;
  let providerId: string | null = null;
  let lastError: string | null = null;
  let nextRunAt = job.nextRunAt;

  try {
    providerId = await handlers[job.channel](job, job.lead);
    status = 'ACCEPTED';
    outcome = 'accepted';
  } catch (error) {
    lastError = (error as Error).message.slice(0, 500);
    if (error instanceof ChannelNotConfigured) {
      status = 'BLOCKED';
      outcome = 'blocked';
    } else if (error instanceof DeliveryError && error.retryable && job.attempts < MAX_ATTEMPTS) {
      status = 'PENDING';
      outcome = 'retrying';
      nextRunAt = new Date(now.getTime() + backoffMs(job.attempts));
    } else {
      if (!(error instanceof DeliveryError)) console.error(`Automation job ${id} crashed`, error);
      status = 'FAILED';
      outcome = 'failed';
    }
  }

  await prisma.automationJob.update({
    where: { id },
    data: { status, providerId, lastError, nextRunAt, lockedAt: null, ...(status === 'ACCEPTED' && { delivery: 'accepted' }) },
  });
  return outcome;
}

/** Puts a job back in the queue (admin action), e.g. after fixing credentials. */
export async function requeueJob(id: string) {
  await prisma.automationJob.updateMany({
    where: { id, status: { in: ['FAILED', 'BLOCKED', 'REVIEW'] } },
    data: { status: 'PENDING', nextRunAt: new Date(), attempts: 0, lastError: null, lockedAt: null },
  });
}

const DELIVERY_RANK: Record<string, number> = { accepted: 0, sent: 1, delivered: 2, read: 3 };

/** Applies WhatsApp delivery receipts. Status only moves forward; `failed` always wins. */
export async function applyDeliveryStatuses(updates: { id: string; status: string; error?: string }[]) {
  let applied = 0;
  for (const update of updates) {
    const job = await prisma.automationJob.findUnique({ where: { providerId: update.id }, select: { id: true, delivery: true } });
    if (!job) continue;
    if (update.status === 'failed') {
      await prisma.automationJob.update({
        where: { id: job.id },
        data: { delivery: 'failed', status: 'FAILED', lastError: `WhatsApp delivery failed: ${update.error ?? 'unknown reason'}`.slice(0, 500) },
      });
      applied++;
    } else if ((DELIVERY_RANK[update.status] ?? -1) > (DELIVERY_RANK[job.delivery ?? ''] ?? -1) && job.delivery !== 'failed') {
      await prisma.automationJob.update({ where: { id: job.id }, data: { delivery: update.status } });
      applied++;
    }
  }
  return applied;
}

/** Old rate-limit buckets are only useful for their window. */
export async function pruneRateBuckets(now = new Date()) {
  const { count } = await prisma.rateBucket.deleteMany({ where: { expiresAt: { lt: now } } });
  return count;
}
