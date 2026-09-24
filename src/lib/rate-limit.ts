import 'server-only';
import { prisma } from './db';
import { hmac } from './crypto';
import { HttpError } from './http';

type Rule = { limit: number; windowMs: number };

export const RATE_LIMITS = {
  submit: { limit: 5, windowMs: 10 * 60_000 },
  read: { limit: 120, windowMs: 60_000 },
} satisfies Record<string, Rule>;

/**
 * Fixed-window counter stored in Postgres so it holds across serverless instances.
 * IPs are keyed through an HMAC so raw addresses are never stored.
 */
export async function enforceRateLimit(scope: keyof typeof RATE_LIMITS, ip: string, now = Date.now()) {
  const { limit, windowMs } = RATE_LIMITS[scope];
  const window = Math.floor(now / windowMs);
  const secret = process.env.RATE_LIMIT_SECRET || 'dev-only-rate-limit-secret';
  const key = `${scope}:${hmac(secret, ip).slice(0, 32)}:${window}`;
  const expiresAt = new Date((window + 1) * windowMs);

  let count: number;
  try {
    ({ count } = await prisma.rateBucket.upsert({
      where: { key },
      create: { key, expiresAt },
      update: { count: { increment: 1 } },
      select: { count: true },
    }));
  } catch {
    // Two first requests raced on the insert; the loser simply increments.
    ({ count } = await prisma.rateBucket.update({ where: { key }, data: { count: { increment: 1 } }, select: { count: true } }));
  }
  if (count > limit) {
    throw new HttpError(429, 'Too many requests. Please wait a few minutes and try again.');
  }
}
