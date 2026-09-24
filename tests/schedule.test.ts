// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { availableSlots, clinicToday, formatTimeLabel, isBookableDate, isValidSlot, slotStart, slotTimesFor } from '@/lib/schedule';

// Wednesday, Sept 23 2026, 02:30 UTC = Tuesday Sept 22, 21:30 in Austin.
const NOW = new Date('2026-09-23T02:30:00Z');

describe('schedule', () => {
  it('uses the clinic calendar day, not UTC', () => {
    expect(clinicToday(NOW)).toBe('2026-09-22');
  });

  it('opens six slots on weekdays, three on Saturday, none on Sunday', () => {
    expect(slotTimesFor('2026-09-23')).toHaveLength(6);
    expect(slotTimesFor('2026-09-26')).toEqual(['09:00', '10:30', '12:00']);
    expect(slotTimesFor('2026-09-27')).toEqual([]);
  });

  it('only books from tomorrow, inside the 90-day window, and never on Sundays', () => {
    expect(isBookableDate('2026-09-22', NOW)).toBe(false);
    expect(isBookableDate('2026-09-23', NOW)).toBe(true);
    expect(isBookableDate('2026-09-27', NOW)).toBe(false);
    expect(isBookableDate('2026-12-21', NOW)).toBe(true);
    expect(isBookableDate('2026-12-22', NOW)).toBe(false);
    expect(isBookableDate('2026-02-31', NOW)).toBe(false);
    expect(isBookableDate('not-a-date', NOW)).toBe(false);
  });

  it('rejects times that are not on the grid for that day', () => {
    expect(isValidSlot('2026-09-26', '13:30', NOW)).toBe(false);
    expect(isValidSlot('2026-09-24', '13:30', NOW)).toBe(true);
    expect(isValidSlot('2026-09-24', '13:31', NOW)).toBe(false);
  });

  it('converts local slots to the right instant across daylight saving time', () => {
    expect(slotStart('2026-09-24', '09:00').toISOString()).toBe('2026-09-24T14:00:00.000Z'); // CDT, UTC-5
    expect(slotStart('2026-12-01', '09:00').toISOString()).toBe('2026-12-01T15:00:00.000Z'); // CST, UTC-6
  });

  it('marks booked slots as unavailable', () => {
    const slots = availableSlots('2026-09-24', [slotStart('2026-09-24', '10:30')], NOW);
    expect(slots.find((s) => s.time === '10:30')).toEqual({ time: '10:30', label: '10:30 am', available: false });
    expect(slots.filter((s) => s.available)).toHaveLength(5);
  });

  it('formats 12-hour labels', () => {
    expect(formatTimeLabel('09:00')).toBe('9:00 am');
    expect(formatTimeLabel('12:00')).toBe('12:00 pm');
    expect(formatTimeLabel('16:30')).toBe('4:30 pm');
  });
});
