import 'server-only';
import { prisma } from './db';

export const DEMO_RETENTION_MS = 24 * 60 * 60_000;

export function isDemoServer() {
  return process.env.DEMO_MODE === 'true';
}

/**
 * On the public demo, visitor submissions older than 24h are removed so the calendar never fills up.
 * Deleting a lead cascades to its booking and automation jobs.
 */
export async function purgeDemoData(now = new Date()) {
  const cutoff = new Date(now.getTime() - DEMO_RETENTION_MS);
  const [leads, orphanBookings] = await prisma.$transaction([
    prisma.lead.deleteMany({ where: { createdAt: { lt: cutoff } } }),
    prisma.booking.deleteMany({ where: { createdAt: { lt: cutoff } } }),
  ]);
  return { leads: leads.count, bookings: orphanBookings.count };
}
