import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BookingForm } from '@/components/site/booking-form';
import { useSiteStore } from '@/lib/store';
import { mockFetch, renderWithQuery } from './utils';

// Tuesday, Sept 22 2026 in Austin.
const NOW = new Date('2026-09-22T15:00:00Z');

const slots = [
  { time: '09:00', label: '9:00 am', available: true },
  { time: '10:30', label: '10:30 am', available: false },
  { time: '12:00', label: '12:00 pm', available: true },
];

describe('BookingForm', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    useSiteStore.setState({ service: 'facial', tracked: null });
  });
  afterEach(() => vi.useRealTimers());

  it('only enables bookable days', () => {
    mockFetch(() => undefined);
    renderWithQuery(<BookingForm />);
    expect(screen.getByText('02 — September 2026')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tuesday, September 22, 2026' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Sunday, September 27, 2026' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Wednesday, September 23, 2026' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Previous month' })).toBeDisabled();
  });

  it('loads live availability, books a slot and confirms it', async () => {
    const fetchMock = mockFetch((url, init) => {
      if (url === '/api/availability?date=2026-09-24') return { body: { date: '2026-09-24', slots } };
      if (url === '/api/bookings' && init?.method === 'POST') {
        return {
          status: 201,
          body: { requestKey: 'book-1', duplicate: false, service: 'Therapeutic Massage', startsAt: '2026-09-24T17:00:00.000Z', when: 'Thursday, September 24, 2026 at 12:00 PM (Central Time)' },
        };
      }
    });
    const user = userEvent.setup();
    renderWithQuery(<BookingForm />);

    await user.selectOptions(screen.getByLabelText('01 — Your treatment'), 'massage');
    await user.click(screen.getByRole('button', { name: 'Thursday, September 24, 2026' }));

    const times = screen.getByRole('group', { name: 'Available appointment times' });
    expect(await within(times).findByRole('button', { name: '10:30 am, booked' })).toBeDisabled();
    await user.click(within(times).getByRole('button', { name: '12:00 pm' }));

    await user.type(screen.getByLabelText('Full name *'), 'Sam Lee');
    await user.type(screen.getByLabelText('Email *'), 'sam@example.com');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /confirm booking/i }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText("You're all set.")).toBeInTheDocument();
    expect(within(dialog).getByText(/Therapeutic Massage · Thursday, September 24, 2026 at 12:00 PM/)).toBeInTheDocument();

    const post = fetchMock.mock.calls.find(([url]) => url === '/api/bookings') as unknown as [string, RequestInit];
    expect(JSON.parse(post[1].body as string)).toMatchObject({ service: 'massage', date: '2026-09-24', time: '12:00', name: 'Sam Lee' });
    expect(useSiteStore.getState().tracked).toMatchObject({ key: 'book-1', kind: 'BOOKING' });
  });

  it('asks for a date and time before submitting', async () => {
    const fetchMock = mockFetch(() => undefined);
    const user = userEvent.setup();
    renderWithQuery(<BookingForm />);

    await user.click(screen.getByRole('button', { name: /confirm booking/i }));
    expect(screen.getByRole('alert')).toHaveTextContent('Please choose a date.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('handles a slot taken by someone else', async () => {
    let availabilityCalls = 0;
    mockFetch((url) => {
      if (url.startsWith('/api/availability')) {
        availabilityCalls++;
        return { body: { date: '2026-09-24', slots } };
      }
      return { status: 409, body: { error: 'Someone just booked that time.', fields: { time: 'That time was just taken.' } } };
    });
    const user = userEvent.setup();
    renderWithQuery(<BookingForm />);

    await user.click(screen.getByRole('button', { name: 'Thursday, September 24, 2026' }));
    await user.click(await screen.findByRole('button', { name: '9:00 am' }));
    await user.type(screen.getByLabelText('Full name *'), 'Sam Lee');
    await user.type(screen.getByLabelText('Email *'), 'sam@example.com');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /confirm booking/i }));

    expect(await screen.findByText('That time was just taken.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '9:00 am' })).toHaveAttribute('aria-pressed', 'false');
    expect(availabilityCalls).toBe(2);
  });
});
