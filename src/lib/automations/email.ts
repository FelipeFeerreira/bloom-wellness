import 'server-only';
import { ChannelNotConfigured, DeliveryError, isRetryableStatus } from './errors';
import { buildClientEmail, type LeadForMessage } from './messages';

const RESEND_URL = 'https://api.resend.com/emails';

/** Sends the client's confirmation through Resend. Returns the provider message id. */
export async function sendClientEmail(jobId: string, lead: LeadForMessage, fetchImpl: typeof fetch = fetch) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) throw new ChannelNotConfigured('RESEND_API_KEY / RESEND_FROM not set.');

  const { subject, text, html } = buildClientEmail(lead);
  let response: Response;
  try {
    response = await fetchImpl(RESEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        // Resend de-duplicates on this key for 24h, so a retried job never emails twice.
        'Idempotency-Key': `bloom-job-${jobId}`,
      },
      body: JSON.stringify({
        from,
        to: [lead.email],
        subject,
        text,
        html,
        ...(process.env.CLINIC_REPLY_TO ? { reply_to: process.env.CLINIC_REPLY_TO } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    throw new DeliveryError(`Resend request failed: ${(error as Error).message}`, true);
  }

  const body = (await response.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
  if (!response.ok || !body.id) {
    throw new DeliveryError(`Resend ${response.status}: ${body.message ?? body.name ?? 'unknown error'}`, isRetryableStatus(response.status));
  }
  return body.id;
}
