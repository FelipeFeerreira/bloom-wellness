import Image from 'next/image';
import { Mail, Phone } from 'lucide-react';
import { BookingForm } from './booking-form';
import { ContactForm } from './contact-form';

export function BookingSection() {
  return (
    <section id="booking" className="bg-forest py-16 text-cream md:py-24">
      <div className="wrap grid items-start gap-10 md:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <div className="md:sticky md:top-28">
          <span className="eyebrow">Make space for yourself</span>
          <h2 className="mb-6 text-[clamp(2.6rem,4.4vw,3.3rem)] leading-[1.08] tracking-[-0.03em]">
            Your next deep breath
            <br />
            starts here.
          </h2>
          <p className="text-sm text-[#c3ccbf]">
            Choose your treatment and a time that works for you.
            <br />
            We&apos;ll take care of the little details.
          </p>
          <ul className="mt-8 grid gap-4 text-[13px] text-[#e0e4d8]">
            {['One-on-one care, tailored to you', 'A warm welcome, even on your first visit', 'Clear pricing, with no surprises'].map((item) => (
              <li key={item} className="flex gap-3">
                <span aria-hidden className="text-[#bdcba8]">
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-9 text-xs text-[#c3ccbf]">
            Prefer a conversation?
            <br />
            <a href="tel:+15125550148" className="text-[#f2f1e7] underline-offset-4 hover:underline">
              Call us at (512) 555-0148 ↗
            </a>
          </p>
        </div>
        <BookingForm />
      </div>
    </section>
  );
}

const REVIEWS = [
  {
    quote: 'My skin is sensitive, and I usually feel nervous trying a new facial. Olivia took time to listen and explained every step. I felt so comfortable.',
    name: 'Sarah M.',
    service: 'Facial treatment',
    image: '/images/review-sarah.jpg',
  },
  {
    quote: 'I spend all week at a desk. James checked in about the pressure and focused on exactly where I needed it. That quiet hour is now part of my month.',
    name: 'Daniel R.',
    service: 'Therapeutic massage',
    image: '/images/review-daniel.jpg',
  },
  {
    quote: 'It was my first acupuncture session, and I had so many questions. Maya never rushed me. The whole space makes it easy to slow down.',
    name: 'Emily K.',
    service: 'Acupuncture',
    image: '/images/review-emily.jpg',
  },
];

export function Testimonials() {
  return (
    <section className="py-16 md:py-24">
      <div className="wrap">
        <div className="text-center">
          <span className="eyebrow text-clay">Kind words, warm hearts</span>
          <h2 className="section-title">A little better, together.</h2>
        </div>
        <div className="mt-10 grid gap-4 md:mt-12 md:grid-cols-3 md:gap-6">
          {REVIEWS.map((review) => (
            <figure key={review.name} className="border border-[#e8e6dc] bg-paper p-7">
              <div className="text-xs tracking-[0.25em] text-clay" aria-label="5 out of 5 stars">
                ★★★★★
              </div>
              <blockquote className="my-5 font-serif text-[19px] leading-relaxed">“{review.quote}”</blockquote>
              <figcaption className="flex items-center gap-3">
                <Image src={review.image} alt="" width={40} height={40} className="size-10 rounded-full object-cover" />
                <span>
                  <strong className="block text-xs">{review.name}</strong>
                  <small className="text-[11px] text-muted-foreground">{review.service}</small>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

const TEAM = [
  { name: 'Olivia Bennett', role: 'Founder & Lead Esthetician', bio: 'Olivia pairs a gentle touch with a love of simple, thoughtful skincare rituals.', image: '/images/team-olivia.jpg' },
  { name: 'James Parker', role: 'Massage Therapist', bio: 'James brings a calm presence and an attentive approach to every massage.', image: '/images/team-james.jpg' },
  { name: 'Maya Chen', role: 'Acupuncture Practitioner', bio: 'Maya makes space for questions, connection, and a comfortable first experience.', image: '/images/team-maya.jpg' },
];

export function Team() {
  return (
    <section id="team" className="pb-16 md:pb-24">
      <div className="wrap">
        <div className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="eyebrow">The people behind the care</span>
            <h2 className="section-title">Good hands. Kind hearts.</h2>
          </div>
          <p className="max-w-[300px] text-sm text-muted-foreground">
            Different specialties. One shared belief: you deserve to feel cared for.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3 md:gap-8">
          {TEAM.map((person) => (
            <article key={person.name} className="grid grid-cols-[125px_1fr] items-center gap-5 md:block">
              <div className="relative h-44 overflow-hidden rounded-[3px] bg-paper md:h-[330px]">
                <Image src={person.image} alt={`Portrait of ${person.name}`} fill sizes="(min-width: 768px) 33vw, 125px" className="object-cover object-[center_30%] saturate-[.65]" />
              </div>
              <div>
                <h3 className="text-2xl md:mt-5 md:mb-1">{person.name}</h3>
                <span className="text-[10px] tracking-[0.15em] text-clay uppercase">{person.role}</span>
                <p className="mt-3 max-w-[300px] text-[13px] text-muted-foreground">{person.bio}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ContactSection() {
  return (
    <section id="contact" className="bg-mist py-16 md:py-24">
      <div className="wrap grid items-start gap-10 md:grid-cols-2 lg:gap-24">
        <div>
          <span className="eyebrow">Let&apos;s talk</span>
          <h2 className="section-title mb-6">
            You&apos;re welcome here.
            <br />
            Questions and all.
          </h2>
          <p className="max-w-[340px] text-sm text-muted-foreground">
            Curious about a treatment or planning your first visit? Leave us a note. We&apos;d love to get to know you.
          </p>
          <a className="mt-4 flex items-center gap-3 text-sm hover:text-clay" href="mailto:hello@bloomwellness.example">
            <Mail className="size-4" /> hello@bloomwellness.example
          </a>
          <a className="mt-3 flex items-center gap-3 text-sm hover:text-clay" href="tel:+15125550148">
            <Phone className="size-4" /> (512) 555-0148
          </a>
        </div>
        <ContactForm />
      </div>
    </section>
  );
}

export function Location() {
  return (
    <section id="visit" className="py-16 md:py-24">
      <div className="wrap grid items-center gap-10 md:grid-cols-[1.15fr_1fr] lg:gap-20">
        <div className="relative h-[300px] overflow-hidden rounded-[3px] bg-[#e9eadf] md:h-[360px]" role="img" aria-label="Illustrative neighborhood map locating Bloom in Austin, Texas">
          <svg viewBox="0 0 580 360" preserveAspectRatio="xMidYMid slice" aria-hidden className="size-full">
            <rect width="580" height="360" fill="#e8e9de" />
            <g fill="#d5dfcc">
              <rect x="25" y="30" width="100" height="70" rx="10" />
              <rect x="380" y="230" width="170" height="105" rx="30" />
              <rect x="320" y="20" width="200" height="90" rx="20" />
            </g>
            <path d="M-20 320Q150 150 310 320T620 260" stroke="#b8cec7" strokeWidth="35" fill="none" />
            <g fill="none" stroke="#faf8f2" strokeWidth="17">
              <path d="M-20 125H600M-20 225H600M150-20V380M340-20V380M490-20V380M-20 20L600 345" />
            </g>
            <g fill="#969f8e" fontFamily="Arial" fontSize="9" letterSpacing="1">
              <text x="195" y="118">W 6TH STREET</text>
              <text x="360" y="217">W 5TH STREET</text>
              <text x="387" y="272">WEST AUSTIN</text>
              <text x="24" y="345">LADY BIRD LAKE</text>
            </g>
          </svg>
          <div className="absolute top-[43%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
            <i className="mx-auto mb-3 grid size-11 -rotate-45 place-items-center rounded-[50%_50%_50%_0] bg-forest text-white shadow-lg not-italic">
              <span className="rotate-45 text-xl">❧</span>
            </i>
            <strong className="block bg-cream px-3 py-1.5 text-xs whitespace-nowrap shadow">Bloom Wellness Clinic</strong>
          </div>
        </div>
        <div>
          <span className="eyebrow">Your neighborhood exhale</span>
          <h2 className="mb-6 text-[clamp(2.3rem,3.6vw,2.75rem)] leading-[1.1] tracking-[-0.03em]">
            A calm little corner
            <br />
            of Austin.
          </h2>
          <address className="text-sm text-muted-foreground not-italic">
            1428 Willow Grove Lane, Suite 100
            <br />
            Austin, TX 78703
          </address>
          <dl className="mt-6 max-w-[340px] text-xs">
            {[
              ['Monday – Friday', '9:00 am – 6:00 pm'],
              ['Saturday', '9:00 am – 3:00 pm'],
              ['Sunday', 'Closed, recharging'],
            ].map(([day, hours]) => (
              <div key={day} className="flex justify-between border-b py-2.5">
                <dt>{day}</dt>
                <dd>{hours}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
