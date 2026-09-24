import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { clientIp, HttpError, jsonError } from '@/lib/http';
import { enforceRateLimit } from '@/lib/rate-limit';

/**
 * Public, PII-free progress of a submission's automations. The key is the random
 * Idempotency-Key the browser generated, so only the submitter can look it up.
 */
export async function GET(request: Request, { params }: { params: Promise<{ key: string }> }) {
  try {
    const { key } = await params;
    await enforceRateLimit('read', clientIp(request));
    const lead = await prisma.lead.findUnique({
      where: { requestKey: key },
      select: {
        kind: true,
        createdAt: true,
        jobs: { select: { channel: true, status: true, delivery: true, attempts: true, nextRunAt: true } },
      },
    });
    if (!lead) throw new HttpError(404, 'Submission not found.');
    return NextResponse.json(lead, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error);
  }
}
