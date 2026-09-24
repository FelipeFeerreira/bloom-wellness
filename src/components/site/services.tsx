import Image from 'next/image';
import { SERVICES } from '@/lib/services';
import { BookServiceButton } from './book-service-button';

export function Services() {
  return (
    <section id="services" className="bg-paper py-16 md:py-24">
      <div className="wrap">
        <div className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="eyebrow">A little care goes a long way</span>
            <h2 className="section-title">Find your kind of well.</h2>
          </div>
          <p className="max-w-[300px] text-sm text-muted-foreground">
            Personalized treatments that make room for your needs, your pace, and your everyday life.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {SERVICES.map((service) => (
            <article
              key={service.id}
              className="group flex flex-col border border-[#e1e1d6] bg-cream transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_12px_25px_#344b3e14]"
            >
              <div className="relative h-44 overflow-hidden md:h-52">
                <Image
                  src={service.image}
                  alt={service.alt}
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition duration-700 group-hover:scale-105"
                />
              </div>
              <div className="flex flex-1 flex-col p-5 lg:p-6">
                <h3 className="mb-3 text-[22px] leading-tight">{service.name}</h3>
                <p className="flex-1 text-[13px] leading-[1.8] text-muted-foreground">{service.description}</p>
                <div className="mt-4 flex items-center justify-between border-t pt-4 text-xs">
                  <span>
                    From ${service.price} · {service.minutes} min
                  </span>
                  <BookServiceButton serviceId={service.id} serviceName={service.name} />
                </div>
              </div>
            </article>
          ))}
        </div>
        <p className="mt-8 text-center text-xs">
          Not sure where to begin?{' '}
          <a href="#contact" className="underline underline-offset-4 hover:text-clay">
            We&apos;re happy to help you find the right fit.
          </a>
        </p>
      </div>
    </section>
  );
}
