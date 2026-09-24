// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { bookingSchema, contactSchema, fieldErrors } from '@/lib/schemas';

const contact = { name: '  Alex Morgan ', email: ' Alex@Example.com ', phone: '', message: 'Hello there', consent: true };

describe('contactSchema', () => {
  it('normalizes input and drops an empty phone', () => {
    expect(contactSchema.parse(contact)).toEqual({ name: 'Alex Morgan', email: 'alex@example.com', phone: undefined, message: 'Hello there', consent: true });
  });

  it('reports one friendly message per invalid field', () => {
    const result = contactSchema.safeParse({ ...contact, email: 'nope', phone: 'abc', consent: false, message: ' ' });
    expect(result.success).toBe(false);
    const errors = fieldErrors(result.error!);
    expect(errors).toMatchObject({
      email: 'Please enter a valid email address.',
      phone: 'Please enter a valid phone number.',
      message: 'Please enter a few words.',
      consent: 'Please agree so we can get back to you.',
    });
  });

  it('ignores unknown fields such as the honeypot', () => {
    expect(contactSchema.parse({ ...contact, website: '' })).not.toHaveProperty('website');
  });
});

describe('bookingSchema', () => {
  const booking = { service: 'massage', date: '2026-10-01', time: '10:30', name: 'Alex', email: 'a@b.co', consent: true };

  it('accepts a complete booking', () => {
    expect(bookingSchema.parse(booking)).toMatchObject({ service: 'massage' });
    expect(bookingSchema.parse({ ...booking, notes: '  ' }).notes).toBeUndefined();
  });

  it('rejects unknown treatments and missing slots', () => {
    const errors = fieldErrors(bookingSchema.safeParse({ ...booking, service: 'botox', date: '', time: '' }).error!);
    expect(Object.keys(errors).sort()).toEqual(['date', 'service', 'time']);
  });
});
