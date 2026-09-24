'use client';

import { ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ServiceId } from '@/lib/services';
import { useSiteStore } from '@/lib/store';

export function BookServiceButton({ serviceId, serviceName }: { serviceId: ServiceId; serviceName: string }) {
  const setService = useSiteStore((s) => s.setService);
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-forest"
      aria-label={`Book ${serviceName}`}
      onClick={() => {
        setService(serviceId);
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        document.getElementById('booking')?.scrollIntoView({ behavior: reduce ? 'instant' : 'smooth' });
        document.getElementById('service')?.focus({ preventScroll: true });
      }}
    >
      Book <ArrowUpRight />
    </Button>
  );
}
