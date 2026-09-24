import 'server-only';
import { Prisma } from '@/generated/prisma/client';
import { prisma } from './db';
import { sha256 } from './crypto';
import { HttpError } from './http';
import { isValidSlot, slotStart } from './schedule';
import { getService } from './services';
import type { BookingData, ContactData } from './schemas';

const DUPLICATE_WINDOW_MS = 10 * 60_000;
const leadSelect = { id: true, requestKey: true, kind: true, createdAt: true } as const;

export type CreatedLead = Prisma.LeadGetPayload<{ select: typeof leadSelect }> & { duplicate: boolean };

/** Every lead fans out to a confirmation email for the client and a WhatsApp alert for the owner. */
const jobs = { create: [{ channel: 'EMAIL' as const }, { channel: 'WHATSAPP' as const }] };

/** Same request retried, or the same form double-submitted within a few minutes. */
async function findDuplicate(requestKey: string, fingerprint: string): Promise<CreatedLead | null> {
  const lead = await prisma.lead.findFirst({
    where: {
      OR: [{ requestKey }, { fingerprint, createdAt: { gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) } }],
    },
    select: leadSelect,
    orderBy: { createdAt: 'desc' },
  });
  return lead && { ...lead, duplicate: true };
}

function isUniqueViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

export async function createContactLead(data: ContactData, requestKey: string): Promise<CreatedLead> {
  const fingerprint = sha256(['CONTACT', data.email, data.message].join('|'));
  const found = await findDuplicate(requestKey, fingerprint);
  if (found) return found;
  try {
    const lead = await prisma.lead.create({
      data: { requestKey, fingerprint, kind: 'CONTACT', name: data.name, email: data.email, phone: data.phone, message: data.message, jobs },
      select: leadSelect,
    });
    return { ...lead, duplicate: false };
  } catch (error) {
    if (isUniqueViolation(error)) {
      const again = await findDuplicate(requestKey, fingerprint);
      if (again) return again;
    }
    throw error;
  }
}

export async function createBookingLead(data: BookingData, requestKey: string): Promise<CreatedLead & { startsAt: Date }> {
  if (!isValidSlot(data.date, data.time)) {
    throw new HttpError(422, 'That time is not available. Please choose another.', { time: 'Please choose an available time.' });
  }
  const service = getService(data.service)!;
  const startsAt = slotStart(data.date, data.time);
  const fingerprint = sha256(['BOOKING', data.email, startsAt.toISOString()].join('|'));

  const found = await findDuplicate(requestKey, fingerprint);
  if (found) return { ...found, startsAt };

  try {
    const lead = await prisma.lead.create({
      data: {
        requestKey,
        fingerprint,
        kind: 'BOOKING',
        name: data.name,
        email: data.email,
        phone: data.phone,
        message: data.notes ?? `Booking: ${service.name}`,
        booking: { create: { service: service.id, startsAt } },
        jobs,
      },
      select: leadSelect,
    });
    return { ...lead, duplicate: false, startsAt };
  } catch (error) {
    if (isUniqueViolation(error)) {
      // Either this exact request raced itself, or someone else took the slot.
      const again = await findDuplicate(requestKey, fingerprint);
      if (again) return { ...again, startsAt };
      throw new HttpError(409, 'Someone just booked that time. Please choose another slot.', { time: 'That time was just taken.' });
    }
    throw error;
  }
}
