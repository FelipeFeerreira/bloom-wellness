// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildClientEmail, buildOwnerAlertParams, templateText, type LeadForMessage } from '@/lib/automations/messages';

const contactLead: LeadForMessage = {
  kind: 'CONTACT',
  name: 'Alex <b>Morgan</b>',
  email: 'alex@example.com',
  phone: null,
  message: 'Hi!\n\nCan I   book a <script>facial</script>?',
  booking: null,
};

describe('client email', () => {
  it('escapes user content in the HTML version', () => {
    const { html, text } = buildClientEmail(contactLead);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;facial&lt;/script&gt;');
    expect(text).toContain('Hi Alex,');
  });

  it('includes the appointment in Central Time for bookings', () => {
    const { subject, text } = buildClientEmail({
      ...contactLead,
      name: 'Sam',
      kind: 'BOOKING',
      booking: { service: 'facial', startsAt: new Date('2026-10-01T15:30:00Z') },
    });
    expect(subject).toBe('Your Bloom appointment is booked');
    expect(text).toContain('Facial Treatment · Thursday, October 1, 2026 at 10:30 AM (Central Time)');
  });
});

describe('WhatsApp template parameters', () => {
  it('removes newlines, tabs and repeated spaces that Meta rejects', () => {
    expect(templateText('a\n\tb     c')).toBe('a b c');
    expect(templateText('   ')).toBe('-');
    expect(templateText('x'.repeat(700))).toHaveLength(600);
  });

  it('builds the three body variables', () => {
    const [who, contact, details] = buildOwnerAlertParams({ ...contactLead, phone: '(512) 555-0123' });
    expect(who).toBe('inquiry from Alex <b>Morgan</b>');
    expect(contact).toBe('alex@example.com / (512) 555-0123');
    expect(details).not.toMatch(/\n| {2,}/);
  });
});
