import { addDays, format, parseISO } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

export const CLINIC_TIME_ZONE = 'America/Chicago';
export const BOOKING_WINDOW_DAYS = 90;

const WEEKDAY_SLOTS = ['09:00', '10:30', '12:00', '13:30', '15:00', '16:30'];
const SATURDAY_SLOTS = WEEKDAY_SLOTS.slice(0, 3);

export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_PATTERN = /^\d{2}:\d{2}$/;

/** Day of week (0 = Sunday) for a calendar date, independent of the runtime's time zone. */
export function weekdayOf(date: string) {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

/** Today's calendar date at the clinic, as yyyy-MM-dd. */
export function clinicToday(now = new Date()) {
  return formatInTimeZone(now, CLINIC_TIME_ZONE, 'yyyy-MM-dd');
}

export function lastBookableDate(now = new Date()) {
  return format(addDays(parseISO(clinicToday(now)), BOOKING_WINDOW_DAYS), 'yyyy-MM-dd');
}

export function slotTimesFor(date: string): string[] {
  const day = weekdayOf(date);
  if (day === 0) return [];
  return day === 6 ? SATURDAY_SLOTS : WEEKDAY_SLOTS;
}

/** Bookable days start tomorrow (clinic time), exclude Sundays and stay inside the booking window. */
export function isBookableDate(date: string, now = new Date()) {
  if (!DATE_PATTERN.test(date) || Number.isNaN(parseISO(date).getTime())) return false;
  return date > clinicToday(now) && date <= lastBookableDate(now) && slotTimesFor(date).length > 0;
}

export function isValidSlot(date: string, time: string, now = new Date()) {
  return isBookableDate(date, now) && slotTimesFor(date).includes(time);
}

/** The absolute instant of a clinic-local date + time. */
export function slotStart(date: string, time: string) {
  return fromZonedTime(`${date}T${time}:00`, CLINIC_TIME_ZONE);
}

export function formatTimeLabel(time: string) {
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function formatAppointment(startsAt: Date) {
  return formatInTimeZone(startsAt, CLINIC_TIME_ZONE, "EEEE, MMMM d, yyyy 'at' h:mm a") + ' (Central Time)';
}

export type Slot = { time: string; label: string; available: boolean };

export function availableSlots(date: string, booked: Date[], now = new Date()): Slot[] {
  if (!isBookableDate(date, now)) return [];
  const taken = new Set(booked.map((d) => d.getTime()));
  return slotTimesFor(date).map((time) => ({
    time,
    label: formatTimeLabel(time),
    available: !taken.has(slotStart(date, time).getTime()),
  }));
}
