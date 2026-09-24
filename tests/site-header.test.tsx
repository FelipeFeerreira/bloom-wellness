import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { SiteHeader } from '@/components/site/site-header';

describe('SiteHeader', () => {
  it('opens and closes the mobile menu, including with Escape', async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);

    const toggle = screen.getByRole('button', { name: 'Open navigation' });
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Close navigation' })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(toggle);
    await user.click(screen.getByRole('link', { name: 'Treatments' }));
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });
});
