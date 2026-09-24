import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DemoBanner } from '@/components/site/demo-banner';

describe('DemoBanner', () => {
  it('shows the demo notice when NEXT_PUBLIC_DEMO_MODE=true', () => {
    vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', 'true');
    render(<DemoBanner />);
    expect(screen.getByRole('note')).toHaveTextContent('Demo site — fictional clinic. Bookings are for testing only.');
  });

  it('renders nothing otherwise', () => {
    vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', '');
    const { container } = render(<DemoBanner />);
    expect(container).toBeEmptyDOMElement();
  });
});
