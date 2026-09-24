import 'server-only';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export function hmac(secret: string, value: string) {
  return createHmac('sha256', secret).update(value).digest('hex');
}

/** Constant-time string comparison that tolerates inputs of different lengths. */
export function safeEqual(a: string, b: string) {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb) && a.length === b.length;
}
