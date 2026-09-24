import { z } from 'zod';
import { SERVICE_IDS } from './services';
import { DATE_PATTERN, TIME_PATTERN } from './schedule';

const name = z.string().trim().min(2, 'Please enter your name.').max(100, 'Please keep your name under 100 characters.');
const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(160, 'Please use a shorter email address.')
  .pipe(z.email('Please enter a valid email address.'));
const phone = z
  .string()
  .trim()
  .max(35, 'Please use a shorter phone number.')
  .regex(/^$|^[+()\d\s.-]{7,35}$/, 'Please enter a valid phone number.')
  .optional()
  .transform((v) => v || undefined);
const consent = z.literal(true, { error: 'Please agree so we can get back to you.' });

export const contactSchema = z.object({
  name,
  email,
  phone,
  message: z.string().trim().min(2, 'Please enter a few words.').max(2000, 'Please keep your message under 2000 characters.'),
  consent,
});

export const bookingSchema = z.object({
  service: z.enum(SERVICE_IDS, { error: 'Please choose a treatment.' }),
  date: z.string().regex(DATE_PATTERN, 'Please choose a date.'),
  time: z.string().regex(TIME_PATTERN, 'Please choose an available time.'),
  name,
  email,
  phone,
  notes: z.string().trim().max(1000, 'Please keep your note under 1000 characters.').optional().transform((v) => v || undefined),
  consent,
});

export type ContactInput = z.input<typeof contactSchema>;
export type ContactData = z.output<typeof contactSchema>;
export type BookingInput = z.input<typeof bookingSchema>;
export type BookingData = z.output<typeof bookingSchema>;

export type FieldErrors = Partial<Record<string, string>>;

/** First error message per field, for form display. */
export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    out[key] ??= issue.message;
  }
  return out;
}
