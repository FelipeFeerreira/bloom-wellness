import 'server-only';
import { hmac, safeEqual } from '../crypto';
import { ChannelNotConfigured, DeliveryError, isRetryableStatus } from './errors';
import { buildOwnerAlertParams, type LeadForMessage } from './messages';

/** Meta error codes that are temporary (throttling, service hiccups). */
const RETRYABLE_META_CODES = new Set([1, 2, 4, 17, 80007, 130429, 131000, 131016, 131048, 131056]);

function config() {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const owner = process.env.WHATSAPP_OWNER_NUMBER?.replace(/\D/g, '');
  const version = process.env.WHATSAPP_GRAPH_VERSION;
  if (!token || !phoneNumberId || !owner || !version) {
    throw new ChannelNotConfigured('WhatsApp credentials (token, phone number id, owner number, graph version) not set.');
  }
  return {
    token,
    owner,
    url: `https://graph.facebook.com/${version}/${phoneNumberId}/messages`,
    template: process.env.WHATSAPP_TEMPLATE_NAME || 'bloom_new_inquiry',
    language: process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en_US',
  };
}

/** Business-initiated messages must use an approved template; this one alerts the clinic owner. */
export async function sendOwnerAlert(lead: LeadForMessage, fetchImpl: typeof fetch = fetch) {
  const { token, owner, url, template, language } = config();
  const parameters = buildOwnerAlertParams(lead).map((text) => ({ type: 'text', text }));

  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: owner,
        type: 'template',
        template: { name: template, language: { code: language }, components: [{ type: 'body', parameters }] },
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    throw new DeliveryError(`WhatsApp request failed: ${(error as Error).message}`, true);
  }

  const body = (await response.json().catch(() => ({}))) as {
    messages?: { id: string }[];
    error?: { message?: string; code?: number };
  };
  const id = body.messages?.[0]?.id;
  if (!response.ok || !id) {
    const code = body.error?.code;
    const retryable = isRetryableStatus(response.status) || (code !== undefined && RETRYABLE_META_CODES.has(code));
    throw new DeliveryError(`WhatsApp ${response.status}${code ? ` (#${code})` : ''}: ${body.error?.message ?? 'unknown error'}`, retryable);
  }
  return id;
}

/** Validates Meta's `X-Hub-Signature-256` header against the raw request body. */
export function verifyMetaSignature(rawBody: string, header: string | null, appSecret = process.env.META_APP_SECRET) {
  if (!appSecret || !header?.startsWith('sha256=')) return false;
  return safeEqual(header.slice(7), hmac(appSecret, rawBody));
}

export type StatusUpdate = { id: string; status: string; error?: string };

/** Pulls message status callbacks (sent / delivered / read / failed) out of a webhook payload. */
export function extractStatuses(payload: unknown): StatusUpdate[] {
  const out: StatusUpdate[] = [];
  const entries = (payload as { entry?: unknown[] })?.entry ?? [];
  for (const entry of entries as { changes?: { value?: { statuses?: unknown[] } }[] }[]) {
    for (const change of entry.changes ?? []) {
      for (const s of (change.value?.statuses ?? []) as { id?: string; status?: string; errors?: { title?: string; message?: string }[] }[]) {
        if (typeof s.id === 'string' && typeof s.status === 'string') {
          const err = s.errors?.[0];
          out.push({ id: s.id, status: s.status, error: err ? (err.message ?? err.title) : undefined });
        }
      }
    }
  }
  return out;
}
