import { NextResponse } from 'next/server';
import { applyDeliveryStatuses } from '@/lib/automations/processor';
import { extractStatuses, verifyMetaSignature } from '@/lib/automations/whatsapp';
import { safeEqual } from '@/lib/crypto';

/** Meta's one-time subscription handshake. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const token = process.env.WHATSAPP_VERIFY_TOKEN;
  if (params.get('hub.mode') === 'subscribe' && token && safeEqual(params.get('hub.verify_token') ?? '', token)) {
    return new Response(params.get('hub.challenge') ?? '', { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }
  return new Response('Forbidden', { status: 403 });
}

/** Delivery receipts for the owner alerts (sent → delivered → read, or failed). */
export async function POST(request: Request) {
  const raw = await request.text();
  if (!verifyMetaSignature(raw, request.headers.get('x-hub-signature-256'))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }
  try {
    const applied = await applyDeliveryStatuses(extractStatuses(JSON.parse(raw)));
    return NextResponse.json({ ok: true, applied });
  } catch (error) {
    console.error('WhatsApp webhook failed', error);
    // A non-2xx makes Meta retry the delivery later.
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
