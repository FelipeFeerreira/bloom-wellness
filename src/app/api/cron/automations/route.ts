import { NextResponse } from 'next/server';
import { processJobs, pruneRateBuckets } from '@/lib/automations/processor';
import { safeEqual } from '@/lib/crypto';
import { isDemoServer, purgeDemoData } from '@/lib/demo';
import { bearerToken, jsonError } from '@/lib/http';

export const maxDuration = 60;

/**
 * Vercel Cron calls this with `Authorization: Bearer $CRON_SECRET`. It retries due jobs, tidies up
 * and, on the public demo (DEMO_MODE=true), removes submissions older than 24 hours.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !safeEqual(bearerToken(request), secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const demo = isDemoServer() ? await purgeDemoData() : null;
    const [summary, pruned] = await Promise.all([processJobs({ limit: 100 }), pruneRateBuckets()]);
    return NextResponse.json({ ok: true, ...summary, prunedRateBuckets: pruned, ...(demo && { demoPurged: demo }) });
  } catch (error) {
    return jsonError(error);
  }
}
