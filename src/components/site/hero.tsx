import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative isolate min-h-[580px] overflow-hidden bg-[#5d6551] text-white md:min-h-[625px] 2xl:min-h-[710px]">
      <Image
        src="/images/hero.jpg"
        alt="Spa essentials with a soft towel, botanical skincare and fresh pink tulips"
        fill
        priority
        sizes="100vw"
        className="-z-10 object-cover object-[65%_center] md:object-[center_58%]"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#18251bcc] via-[#18251b66] to-[#18251b05]" />
      <div className="wrap pt-20 pb-24 md:pt-24 md:pb-28 2xl:pt-32">
        <span className="eyebrow text-[#e9ecdd]">Bloom Wellness Clinic · Austin, Texas</span>
        <h1 id="hero-title" className="mb-6 max-w-[690px] text-[clamp(3.25rem,6.7vw,5.5rem)] leading-[1.02] tracking-[-0.025em]">
          Feel like yourself.
          <br />
          <em className="text-[#e0e6d1]">Only a little lighter.</em>
        </h1>
        <p className="mb-8 max-w-[380px] text-[15px] text-[#f0f0e7]">
          Thoughtful treatments, caring hands, and a quiet place to reconnect with you.
        </p>
        <Button asChild variant="light" size="lg">
          <a href="#booking">
            Book an Appointment <ArrowUpRight />
          </a>
        </Button>
        <div className="mt-9 flex flex-wrap items-center gap-3.5 text-[11px] text-[#edece2]">
          <span className="tracking-[0.15em] text-[#ede3ba]" aria-label="Five stars">
            ★★★★★
          </span>
          <span>Small moments of care. Lasting feelings of well-being.</span>
        </div>
      </div>
      <p className="absolute right-5 bottom-7 text-[9px] tracking-[0.2em] uppercase sm:right-12">Rooted in care. Made for you.</p>
    </section>
  );
}

export function Values() {
  const values = [
    ['✧', 'Care that starts with listening'],
    ['❧', 'A whole-person approach'],
    ['◷', 'Unhurried, always'],
    ['♡', 'Your neighborhood wellness space'],
  ];
  return (
    <div className="bg-mist">
      <ul className="wrap grid grid-cols-2 gap-4 py-6 md:flex md:justify-between">
        {values.map(([icon, label]) => (
          <li key={label} className="flex items-center gap-3 text-[11px] md:text-xs">
            <span aria-hidden className="text-lg md:text-xl">
              {icon}
            </span>
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
