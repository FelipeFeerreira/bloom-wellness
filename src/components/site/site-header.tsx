'use client';

import { ArrowUpRight, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BloomMark } from './bloom-mark';

const LINKS = [
  { href: '#about', label: 'Our story' },
  { href: '#services', label: 'Treatments' },
  { href: '#team', label: 'Our people' },
  { href: '#contact', label: 'Visit us' },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-transparent bg-cream/90 backdrop-blur supports-[backdrop-filter]:bg-cream/80">
      <div className="wrap relative flex h-[76px] items-center justify-between gap-6 md:h-[88px]">
        <a href="#" className="flex items-center gap-3 text-forest" aria-label="Bloom Wellness Clinic home">
          <BloomMark className="h-11 w-9" />
          <span className="font-serif text-[34px] leading-none tracking-[-0.05em]">
            bloom
            <small className="mt-1.5 block font-sans text-[7px] tracking-[0.35em] uppercase">Wellness Clinic</small>
          </span>
        </a>

        <Button
          variant="ghost"
          size="icon"
          className="text-forest md:hidden"
          aria-label={open ? 'Close navigation' : 'Open navigation'}
          aria-expanded={open}
          aria-controls="navigation"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </Button>

        <nav
          id="navigation"
          aria-label="Main navigation"
          className={cn(
            'items-center gap-7 text-[13px] md:flex',
            open ? 'absolute inset-x-0 top-full flex flex-col items-stretch gap-4 bg-cream p-6 shadow-lg' : 'hidden',
          )}
        >
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} className="transition-colors hover:text-clay" onClick={() => setOpen(false)}>
              {link.label}
            </a>
          ))}
          <Button asChild size="lg" onClick={() => setOpen(false)}>
            <a href="#booking">
              Book an Appointment <ArrowUpRight />
            </a>
          </Button>
        </nav>
      </div>
    </header>
  );
}
