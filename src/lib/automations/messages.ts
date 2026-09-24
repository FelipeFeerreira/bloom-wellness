import { formatAppointment } from '../schedule';
import { getService } from '../services';

export type LeadForMessage = {
  kind: 'CONTACT' | 'BOOKING';
  name: string;
  email: string;
  phone: string | null;
  message: string;
  booking: { service: string; startsAt: Date } | null;
};

const CLINIC = {
  name: 'Bloom Wellness Clinic',
  phone: '(512) 555-0148',
  address: '1428 Willow Grove Lane, Suite 100, Austin, TX 78703',
};

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0];
}

function appointmentLine(lead: LeadForMessage) {
  if (!lead.booking) return null;
  const service = getService(lead.booking.service)?.name ?? lead.booking.service;
  return `${service} · ${formatAppointment(lead.booking.startsAt)}`;
}

export function buildClientEmail(lead: LeadForMessage) {
  const appointment = appointmentLine(lead);
  const subject = appointment ? 'Your Bloom appointment is booked' : 'We received your note — Bloom Wellness';
  const intro = appointment
    ? `Thank you for booking with us. We've saved your spot and are looking forward to meeting you.`
    : `Thank you for reaching out. Your message is with our team, and we'll get back to you during clinic hours (Mon–Fri 9–6, Sat 9–3).`;

  const lines = [
    `Hi ${firstName(lead.name)},`,
    '',
    intro,
    ...(appointment ? ['', `Your appointment: ${appointment}`, `Where: ${CLINIC.address}`, '', 'Need to reschedule? Just reply to this email or call us.'] : ['', `Your message: “${lead.message}”`]),
    '',
    'With care,',
    `The ${CLINIC.name} team`,
    CLINIC.phone,
  ];
  const text = lines.join('\n');

  const html = `<!doctype html><html><body style="margin:0;background:#faf8f2;font-family:Arial,sans-serif;color:#29372e">
<div style="max-width:560px;margin:0 auto;padding:40px 28px">
<p style="font-family:Georgia,serif;font-size:30px;margin:0 0 28px;color:#344b3e">bloom</p>
<p style="font-size:15px;line-height:1.7">Hi ${escapeHtml(firstName(lead.name))},</p>
<p style="font-size:15px;line-height:1.7">${escapeHtml(intro)}</p>
${
  appointment
    ? `<div style="background:#e9ecdf;border-radius:6px;padding:18px 20px;margin:24px 0"><p style="margin:0 0 6px;font-size:11px;letter-spacing:2px;text-transform:uppercase">Your appointment</p><p style="margin:0;font-family:Georgia,serif;font-size:19px">${escapeHtml(appointment)}</p><p style="margin:8px 0 0;font-size:13px;color:#687067">${escapeHtml(CLINIC.address)}</p></div><p style="font-size:14px;line-height:1.7">Need to reschedule? Just reply to this email or call ${CLINIC.phone}.</p>`
    : `<blockquote style="border-left:3px solid #a36b52;margin:24px 0;padding:4px 16px;color:#687067;font-size:14px;line-height:1.7">${escapeHtml(lead.message)}</blockquote>`
}
<p style="font-size:15px;line-height:1.7;margin-top:28px">With care,<br>The ${CLINIC.name} team</p>
</div></body></html>`;

  return { subject, text, html };
}

/** WhatsApp template parameters can't contain newlines, tabs or more than 4 consecutive spaces. */
export function templateText(value: string, max = 600) {
  const clean = value.replace(/[\n\r\t]+/g, ' ').replace(/ {2,}/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean || '-';
}

/**
 * Body parameters for the owner's WhatsApp template. The approved template must have three
 * variables, e.g. "New {{1}} from Bloom's website. Contact: {{2}}. Details: {{3}}".
 */
export function buildOwnerAlertParams(lead: LeadForMessage): [string, string, string] {
  const appointment = appointmentLine(lead);
  const who = `${lead.kind === 'BOOKING' ? 'booking' : 'inquiry'} from ${lead.name}`;
  const contact = [lead.email, lead.phone].filter(Boolean).join(' / ');
  const details = appointment ? `${appointment}. ${lead.message}` : lead.message;
  return [templateText(who, 120), templateText(contact, 200), templateText(details)];
}
