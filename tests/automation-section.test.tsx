import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { AutomationSection, jobStep, pollInterval } from '@/components/site/automation-section';
import type { JobState, LeadProgress } from '@/lib/api-client';
import { useSiteStore } from '@/lib/store';
import { mockFetch, renderWithQuery } from './utils';

const job = (overrides: Partial<JobState>): JobState => ({
  channel: 'EMAIL',
  status: 'PENDING',
  delivery: null,
  attempts: 0,
  nextRunAt: new Date().toISOString(),
  ...overrides,
});

describe('automation progress', () => {
  beforeEach(() => useSiteStore.setState({ tracked: null }));

  it('maps job states to what visitors see', () => {
    expect(jobStep(job({ status: 'ACCEPTED' }), { done: 'Sent' })).toEqual({ state: 'done', note: 'Sent' });
    expect(jobStep(job({ status: 'ACCEPTED', delivery: 'read' }), { done: 'Sent' }).note).toBe('Sent · read');
    expect(jobStep(job({ status: 'PENDING', attempts: 2 }), { done: '' }).note).toBe('Retrying (attempt 3)…');
    expect(jobStep(job({ status: 'BLOCKED' }), { done: '' }).state).toBe('warning');
    expect(jobStep(job({ status: 'FAILED' }), { done: '' }).state).toBe('failed');
  });

  it('polls only while something is about to happen', () => {
    const progress = (jobs: JobState[]): LeadProgress => ({ kind: 'CONTACT', createdAt: '', jobs });
    expect(pollInterval(undefined)).toBe(1500);
    expect(pollInterval(progress([job({ status: 'PROCESSING' })]))).toBe(1500);
    expect(pollInterval(progress([job({ status: 'ACCEPTED' }), job({ status: 'BLOCKED' })]))).toBe(false);
    const later = new Date(Date.now() + 10 * 60_000).toISOString();
    expect(pollInterval(progress([job({ status: 'PENDING', attempts: 1, nextRunAt: later })]))).toBe(false);
  });

  it('invites visitors to try it when nothing was submitted', () => {
    renderWithQuery(<AutomationSection />);
    expect(screen.getByRole('link', { name: /try it/i })).toHaveAttribute('href', '#contact');
  });

  it('shows live results for the latest submission', async () => {
    useSiteStore.setState({ tracked: { key: 'key-1', kind: 'CONTACT', name: 'Alex' } });
    mockFetch((url) =>
      url === '/api/leads/key-1'
        ? {
            body: {
              kind: 'CONTACT',
              createdAt: new Date().toISOString(),
              jobs: [job({ channel: 'EMAIL', status: 'ACCEPTED', delivery: 'accepted' }), job({ channel: 'WHATSAPP', status: 'BLOCKED' })],
            },
          }
        : undefined,
    );
    renderWithQuery(<AutomationSection />);

    expect(await screen.findByText('Received from Alex')).toBeInTheDocument();
    expect(screen.getByText('Email accepted by Resend')).toBeInTheDocument();
    expect(screen.getByText(/not connected in this environment/i)).toBeInTheDocument();
    expect(screen.getByText('Stored in the CRM')).toBeInTheDocument();
  });
});
