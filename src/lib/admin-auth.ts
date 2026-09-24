import 'server-only';
import { cookies } from 'next/headers';
import { hmac, safeEqual } from './crypto';

export const ADMIN_COOKIE = 'bloom_admin';
export const SESSION_MAX_AGE = 8 * 60 * 60;

function adminToken() {
  const token = process.env.ADMIN_TOKEN;
  return token && token.length >= 24 ? token : null;
}

/** The cookie holds an HMAC derived from the token, never the token itself. Rotating ADMIN_TOKEN signs everyone out. */
export function sessionValue() {
  const token = adminToken();
  return token ? hmac(token, 'bloom-admin-session-v1') : null;
}

export function isAdminConfigured() {
  return adminToken() !== null;
}

export function checkAdminToken(candidate: string) {
  const token = adminToken();
  return !!token && safeEqual(candidate, token);
}

export async function isAdmin() {
  const expected = sessionValue();
  const actual = (await cookies()).get(ADMIN_COOKIE)?.value;
  return !!expected && !!actual && safeEqual(actual, expected);
}
