import { NextResponse } from 'next/server';
import { processJobs, pruneRateBuckets } from '@/lib/automations/processor';
import { safeEqual } from '@/lib/crypto';
import { bearerToken, jsonError } from '@/lib/http';

export const maxDuration = 60;

/** Vercel Cron calls this with `Authorization: Bearer $CRON_SECRET`. It retries due jobs and tidies up. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !safeEqual(bearerToken(request), secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const [summary, pruned] = await Promise.all([processJobs({ limit: 100 }), pruneRateBuckets()]);
    return NextResponse.json({ ok: true, ...summary, prunedRateBuckets: pruned });
  } catch (error) {
    return jsonError(error);
  }
}
