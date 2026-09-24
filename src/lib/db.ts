import 'server-only';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getClient() {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set.');
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  // Reused across hot reloads in dev and across invocations of a warm serverless instance.
  globalForPrisma.prisma = client;
  return client;
}

/**
 * Connects on first use rather than on import, so `next build` works without a database
 * (Next imports route modules while collecting page data).
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getClient();
    const value = Reflect.get(client, property, client);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
