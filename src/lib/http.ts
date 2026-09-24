import 'server-only';
import { NextResponse } from 'next/server';
import type { z } from 'zod';
import { fieldErrors } from './schemas';

const MAX_BODY_BYTES = 16 * 1024;

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fields?: Record<string, string | undefined>,
  ) {
    super(message);
  }
}

export function jsonError(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message, fields: error.fields }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json({ error: 'Something went wrong on our side. Please try again in a moment.' }, { status: 500 });
}

export async function parseBody<T extends z.ZodType>(request: Request, schema: T): Promise<z.output<T>> {
  const type = request.headers.get('content-type') ?? '';
  if (!type.includes('application/json')) throw new HttpError(415, 'Expected a JSON body.');
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) throw new HttpError(413, 'That message is too long.');
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new HttpError(400, 'Invalid JSON body.');
  }
  // Honeypot: real visitors never see or fill this field.
  if (data && typeof data === 'object' && (data as { website?: unknown }).website) {
    console.warn(`Rejected ${new URL(request.url).pathname}: honeypot field was filled.`);
    throw new HttpError(400, 'We could not send this form. Please refresh the page and try again.');
  }
  const result = schema.safeParse(data);
  if (!result.success) throw new HttpError(422, 'Please check the highlighted fields.', fieldErrors(result.error));
  return result.data;
}

const KEY_PATTERN = /^[A-Za-z0-9-]{16,64}$/;

/** Client-generated key that makes retries of the same submission idempotent. */
export function requestKeyFrom(request: Request) {
  const key = request.headers.get('idempotency-key') ?? '';
  if (!KEY_PATTERN.test(key)) {
    console.warn(`Rejected ${new URL(request.url).pathname}: missing or invalid Idempotency-Key.`);
    throw new HttpError(400, 'Missing or invalid Idempotency-Key header.');
  }
  return key;
}

export function clientIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || request.headers.get('x-real-ip') || 'unknown';
}

export function bearerToken(request: Request) {
  const header = request.headers.get('authorization') ?? '';
  return header.startsWith('Bearer ') ? header.slice(7) : '';
}
