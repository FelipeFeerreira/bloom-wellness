import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { ContactForm } from '@/components/site/contact-form';
import { useSiteStore } from '@/lib/store';
import { mockFetch, renderWithQuery } from './utils';

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Full name *'), 'Alex Morgan');
  await user.type(screen.getByLabelText('Email address *'), 'alex@example.com');
  await user.type(screen.getByLabelText('How can we help? *'), 'First facial, please.');
  await user.click(screen.getByRole('checkbox'));
}

describe('ContactForm', () => {
  beforeEach(() => useSiteStore.setState({ tracked: null }));

  it('validates on the client before sending anything', async () => {
    const fetchMock = mockFetch(() => undefined);
    const user = userEvent.setup();
    renderWithQuery(<ContactForm />);

    await user.click(screen.getByRole('button', { name: /send message/i }));

    expect(screen.getByText('Please enter your name.')).toBeInTheDocument();
    expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument();
    expect(screen.getByText('Please agree so we can get back to you.')).toBeInTheDocument();
    expect(screen.getByLabelText('Full name *')).toHaveAttribute('aria-invalid', 'true');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts the lead with an idempotency key and starts tracking the automation', async () => {
    const fetchMock = mockFetch((url) => (url === '/api/leads' ? { status: 201, body: { requestKey: 'key-123', duplicate: false } } : undefined));
    const user = userEvent.setup();
    renderWithQuery(<ContactForm />);

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /send message/i }));

    expect(await screen.findByText(/thank you, alex!/i)).toBeInTheDocument();
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>)['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/);
    expect(JSON.parse(init.body as string)).toMatchObject({ name: 'Alex Morgan', email: 'alex@example.com', consent: true, website: '' });
    expect(useSiteStore.getState().tracked).toEqual({ key: 'key-123', kind: 'CONTACT', name: 'Alex Morgan' });
    expect(screen.getByLabelText('Full name *')).toHaveValue('');
  });

  it('shows errors returned by the server', async () => {
    mockFetch(() => ({ status: 429, body: { error: 'Too many requests. Please wait a few minutes and try again.' } }));
    const user = userEvent.setup();
    renderWithQuery(<ContactForm />);

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => expect(screen.getByText(/too many requests/i)).toBeInTheDocument());
    expect(useSiteStore.getState().tracked).toBeNull();
  });
});
