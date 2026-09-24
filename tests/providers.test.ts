// @vitest-environment node
import { createHmac } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sendClientEmail } from '@/lib/automations/email';
import { ChannelNotConfigured, DeliveryError } from '@/lib/automations/errors';
import type { LeadForMessage } from '@/lib/automations/messages';
import { extractStatuses, sendOwnerAlert, verifyMetaSignature } from '@/lib/automations/whatsapp';

const lead: LeadForMessage = { kind: 'CONTACT', name: 'Alex', email: 'alex@example.com', phone: null, message: 'Hello', booking: null };

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe('Resend email', () => {
  beforeEach(() => {
    vi.stubEnv('RESEND_API_KEY', 're_test');
    vi.stubEnv('RESEND_FROM', 'Bloom <hello@bloom.test>');
    vi.stubEnv('CLINIC_REPLY_TO', 'owner@bloom.test');
  });

  it('sends with an idempotency key tied to the job and returns the provider id', async () => {
    const fetchMock = vi.fn(async () => json({ id: 'email_123' }));
    await expect(sendClientEmail('job1', lead, fetchMock)).resolves.toBe('email_123');
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect((init.headers as Record<string, string>)['Idempotency-Key']).toBe('bloom-job-job1');
    expect(JSON.parse(init.body as string)).toMatchObject({ to: ['alex@example.com'], reply_to: 'owner@bloom.test' });
  });

  it('classifies failures as retryable or permanent', async () => {
    await expect(sendClientEmail('j', lead, async () => json({ message: 'slow down' }, 429))).rejects.toMatchObject({ retryable: true });
    await expect(sendClientEmail('j', lead, async () => json({ message: 'invalid from' }, 422))).rejects.toMatchObject({ retryable: false });
    await expect(sendClientEmail('j', lead, async () => Promise.reject(new Error('ECONNRESET')))).rejects.toBeInstanceOf(DeliveryError);
  });

  it('reports a missing configuration instead of calling the API', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    const fetchMock = vi.fn();
    await expect(sendClientEmail('j', lead, fetchMock)).rejects.toBeInstanceOf(ChannelNotConfigured);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('WhatsApp Cloud API', () => {
  beforeEach(() => {
    vi.stubEnv('WHATSAPP_ACCESS_TOKEN', 'token');
    vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', '12345');
    vi.stubEnv('WHATSAPP_OWNER_NUMBER', '+1 (512) 555-0100');
    vi.stubEnv('WHATSAPP_GRAPH_VERSION', 'v23.0');
  });

  it('sends the approved template to the owner', async () => {
    const fetchMock = vi.fn(async () => json({ messages: [{ id: 'wamid.1' }] }));
    await expect(sendOwnerAlert(lead, fetchMock)).resolves.toBe('wamid.1');
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://graph.facebook.com/v23.0/12345/messages');
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({ to: '15125550100', type: 'template', template: { name: 'bloom_new_inquiry', language: { code: 'en_US' } } });
    expect(body.template.components[0].parameters).toHaveLength(3);
  });

  it('retries on Meta throttling codes but not on bad templates', async () => {
    await expect(sendOwnerAlert(lead, async () => json({ error: { code: 130429, message: 'Rate limit' } }, 400))).rejects.toMatchObject({ retryable: true });
    await expect(sendOwnerAlert(lead, async () => json({ error: { code: 132001, message: 'Template missing' } }, 404))).rejects.toMatchObject({ retryable: false });
  });

  it('verifies webhook signatures', () => {
    const body = '{"entry":[]}';
    const signature = 'sha256=' + createHmac('sha256', 'app-secret').update(body).digest('hex');
    expect(verifyMetaSignature(body, signature, 'app-secret')).toBe(true);
    expect(verifyMetaSignature(body + ' ', signature, 'app-secret')).toBe(false);
    expect(verifyMetaSignature(body, null, 'app-secret')).toBe(false);
    expect(verifyMetaSignature(body, signature, undefined)).toBe(false);
  });

  it('extracts delivery statuses from webhook payloads', () => {
    const payload = {
      entry: [
        {
          changes: [
            { value: { statuses: [{ id: 'wamid.1', status: 'delivered' }, { id: 'wamid.2', status: 'failed', errors: [{ title: 'Undeliverable' }] }] } },
            { value: { messages: [{ id: 'incoming' }] } },
          ],
        },
      ],
    };
    expect(extractStatuses(payload)).toEqual([
      { id: 'wamid.1', status: 'delivered', error: undefined },
      { id: 'wamid.2', status: 'failed', error: 'Undeliverable' },
    ]);
    expect(extractStatuses(null)).toEqual([]);
  });
});
