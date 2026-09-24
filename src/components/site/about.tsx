import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';

export function About() {
  return (
    <section id="about" className="py-16 md:py-24">
      <div className="wrap grid items-center gap-10 md:grid-cols-2 lg:gap-24">
        <div className="relative h-[360px] md:h-[480px]">
          <Image
            src="/images/about.jpg"
            alt="Sunlit lounge with natural textures, comfortable seating and leafy plants"
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="rounded-[3px_90px_3px_3px] object-cover"
          />
          <p className="absolute bottom-6 left-6 bg-cream px-5 py-4 font-serif text-xl text-ink italic">A softer pace starts here.</p>
        </div>
        <div className="space-y-4 text-sm leading-[1.9] text-muted-foreground">
          <span className="eyebrow text-ink">Welcome to Bloom</span>
          <h2 className="section-title mb-6 text-ink">
            Good care feels
            <br />
            like being seen.
          </h2>
          <p>Life asks a lot of you. We believe taking care of yourself should feel like an exhale, not another thing on your list.</p>
          <p>
            Bloom began with a simple idea: create the kind of neighborhood space where you can slow down, be heard, and feel comfortable
            exactly as you are. Here, a conversation comes before a treatment, and your comfort shapes every appointment.
          </p>
          <p>Whether you&apos;re making room for a monthly facial or exploring a new approach to well-being, we&apos;ll meet you where you are.</p>
          <p className="pt-2 font-serif text-2xl text-ink italic">
            With care, the Bloom team
            <small className="mt-1.5 block font-sans text-[10px] tracking-[0.1em] text-muted-foreground not-italic">
              AUSTIN ROOTS. A PERSONAL TOUCH.
            </small>
          </p>
          <a href="#team" className="inline-flex items-center gap-8 border-b border-[#a4ae9f] pb-2 text-xs font-semibold text-ink">
            Meet your people <ArrowUpRight className="size-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
