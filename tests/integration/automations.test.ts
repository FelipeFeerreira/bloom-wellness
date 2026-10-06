// @vitest-environment node
/**
 * Runs against a real Postgres (TEST_DATABASE_URL), because the queue's correctness depends on
 * database guarantees: unique constraints and conditional updates used as locks.
 */
import { addDays, format, parseISO } from 'date-fns';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { clinicToday, weekdayOf } from '@/lib/schedule';

const url = process.env.TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;

type Modules = {
  prisma: typeof import('@/lib/db').prisma;
  leads: typeof import('@/lib/leads');
  processor: typeof import('@/lib/automations/processor');
  errors: typeof import('@/lib/automations/errors');
};
let m: Modules;

const contact = { name: 'Alex Morgan', email: 'alex@example.com', phone: undefined, message: 'Hello!', consent: true as const };
const key = () => crypto.randomUUID();

suite('automation queue (Postgres)', () => {
  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    m = {
      prisma: (await import('@/lib/db')).prisma,
      leads: await import('@/lib/leads'),
      processor: await import('@/lib/automations/processor'),
      errors: await import('@/lib/automations/errors'),
    };
  });

  beforeEach(async () => {
    await m.prisma.$executeRawUnsafe('TRUNCATE "Lead", "Booking", "AutomationJob", "RateBucket" CASCADE');
  });

  afterAll(async () => {
    await m?.prisma.$disconnect();
  });

  it('stores a lead with one email and one WhatsApp job, and is idempotent per request key', async () => {
    const requestKey = key();
    const first = await m.leads.createContactLead(contact, requestKey);
    const retry = await m.leads.createContactLead(contact, requestKey);
    expect(first.duplicate).toBe(false);
    expect(retry).toMatchObject({ id: first.id, duplicate: true });

    const jobs = await m.prisma.automationJob.findMany({ where: { leadId: first.id } });
    expect(jobs.map((j) => j.channel).sort()).toEqual(['EMAIL', 'WHATSAPP']);
    expect(await m.prisma.lead.count()).toBe(1);
  });

  it('treats the same message resent with a new key as a duplicate', async () => {
    await m.leads.createContactLead(contact, key());
    const again = await m.leads.createContactLead(contact, key());
    expect(again.duplicate).toBe(true);
  });

  it('delivers, retries with backoff, then succeeds', async () => {
    const lead = await m.leads.createContactLead(contact, key());
    let whatsappCalls = 0;
    const handlers = {
      EMAIL: vi.fn(async () => 'email_1'),
      WHATSAPP: vi.fn(async () => {
        whatsappCalls++;
        if (whatsappCalls === 1) throw new m.errors.DeliveryError('Meta 503', true);
        return 'wamid.1';
      }),
    };
    const now = new Date();
    expect(await m.processor.processJobs({ leadId: lead.id, handlers, now })).toMatchObject({ accepted: 1, retrying: 1 });

    const waiting = await m.prisma.automationJob.findFirstOrThrow({ where: { channel: 'WHATSAPP' } });
    expect(waiting).toMatchObject({ status: 'PENDING', attempts: 1, lastError: 'Meta 503' });
    expect(waiting.nextRunAt.getTime()).toBe(now.getTime() + m.processor.backoffMs(1));

    // Not due yet.
    expect(await m.processor.processJobs({ handlers, now })).toMatchObject({ accepted: 0, retrying: 0 });
    const later = new Date(now.getTime() + m.processor.backoffMs(1));
    expect(await m.processor.processJobs({ handlers, now: later })).toMatchObject({ accepted: 1 });

    const jobs = await m.prisma.automationJob.findMany({ orderBy: { channel: 'asc' } });
    expect(jobs.map((j) => [j.channel, j.status, j.providerId])).toEqual([
      ['EMAIL', 'ACCEPTED', 'email_1'],
      ['WHATSAPP', 'ACCEPTED', 'wamid.1'],
    ]);
    expect(handlers.EMAIL).toHaveBeenCalledTimes(1);
  });

  it('never delivers the same job twice when workers race', async () => {
    await m.leads.createContactLead(contact, key());
    const handlers = { EMAIL: vi.fn(async () => `e_${Math.random()}`), WHATSAPP: vi.fn(async () => `w_${Math.random()}`) };
    await Promise.all([m.processor.processJobs({ handlers }), m.processor.processJobs({ handlers }), m.processor.processJobs({ handlers })]);
    expect(handlers.EMAIL).toHaveBeenCalledTimes(1);
    expect(handlers.WHATSAPP).toHaveBeenCalledTimes(1);
  });

  it('parks unconfigured channels, fails permanent errors, and can requeue them', async () => {
    await m.leads.createContactLead(contact, key());
    const handlers = {
      EMAIL: async () => {
        throw new m.errors.ChannelNotConfigured('RESEND_API_KEY not set');
      },
      WHATSAPP: async () => {
        throw new m.errors.DeliveryError('Template missing', false);
      },
    };
    expect(await m.processor.processJobs({ handlers })).toMatchObject({ blocked: 1, failed: 1 });

    const email = await m.prisma.automationJob.findFirstOrThrow({ where: { channel: 'EMAIL' } });
    await m.processor.requeueJob(email.id);
    await m.processor.processJobs({ jobIds: [email.id], handlers: { ...handlers, EMAIL: async () => 'email_ok' } });
    expect(await m.prisma.automationJob.findUniqueOrThrow({ where: { id: email.id } })).toMatchObject({ status: 'ACCEPTED', attempts: 1 });
  });

  it('gives up after the maximum number of attempts', async () => {
    await m.leads.createContactLead(contact, key());
    const handlers = {
      EMAIL: async () => 'ok',
      WHATSAPP: async () => {
        throw new m.errors.DeliveryError('Meta 500', true);
      },
    };
    let now = new Date();
    for (let i = 0; i < m.processor.MAX_ATTEMPTS; i++) {
      await m.processor.processJobs({ handlers, now });
      now = new Date(now.getTime() + 24 * 60 * 60_000);
    }
    expect(await m.prisma.automationJob.findFirstOrThrow({ where: { channel: 'WHATSAPP' } })).toMatchObject({
      status: 'FAILED',
      attempts: m.processor.MAX_ATTEMPTS,
    });
  });

  it('sends stale in-flight jobs to review instead of resending them', async () => {
    const lead = await m.leads.createContactLead(contact, key());
    const past = new Date(Date.now() - m.processor.STALE_LOCK_MS - 1000);
    await m.prisma.automationJob.updateMany({ where: { leadId: lead.id, channel: 'EMAIL' }, data: { status: 'PROCESSING', lockedAt: past } });
    const handlers = { EMAIL: vi.fn(async () => 'x'), WHATSAPP: vi.fn(async () => 'y') };
    expect(await m.processor.processJobs({ handlers })).toMatchObject({ recovered: 1, accepted: 1 });
    expect(handlers.EMAIL).not.toHaveBeenCalled();
    expect(await m.prisma.automationJob.findFirstOrThrow({ where: { channel: 'EMAIL' } })).toMatchObject({ status: 'REVIEW' });
  });

  it('applies WhatsApp receipts in order, letting failures win', async () => {
    await m.leads.createContactLead(contact, key());
    await m.processor.processJobs({ handlers: { EMAIL: async () => 'e', WHATSAPP: async () => 'wamid.X' } });
    await m.processor.applyDeliveryStatuses([{ id: 'wamid.X', status: 'read' }]);
    await m.processor.applyDeliveryStatuses([{ id: 'wamid.X', status: 'delivered' }, { id: 'unknown', status: 'read' }]);
    expect(await m.prisma.automationJob.findUniqueOrThrow({ where: { providerId: 'wamid.X' } })).toMatchObject({ delivery: 'read' });
    await m.processor.applyDeliveryStatuses([{ id: 'wamid.X', status: 'failed', error: 'Undeliverable' }]);
    expect(await m.prisma.automationJob.findUniqueOrThrow({ where: { providerId: 'wamid.X' } })).toMatchObject({ delivery: 'failed', status: 'FAILED' });
  });

  it('lets only one person book a slot', async () => {
    let date = format(addDays(parseISO(clinicToday()), 7), 'yyyy-MM-dd');
    if (weekdayOf(date) === 0) date = format(addDays(parseISO(date), 1), 'yyyy-MM-dd');
    const booking = { service: 'facial' as const, date, time: '10:30', name: 'A', email: 'a@x.co', phone: undefined, notes: undefined, consent: true as const };

    const results = await Promise.allSettled([
      m.leads.createBookingLead(booking, key()),
      m.leads.createBookingLead({ ...booking, email: 'b@x.co' }, key()),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    expect(rejected.reason).toMatchObject({ status: 409 });
    expect(await m.prisma.booking.count()).toBe(1);
  });
});
