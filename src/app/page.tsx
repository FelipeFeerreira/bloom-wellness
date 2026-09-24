import { About } from '@/components/site/about';
import { AutomationSection } from '@/components/site/automation-section';
import { Footer } from '@/components/site/footer';
import { Hero, Values } from '@/components/site/hero';
import { BookingSection, ContactSection, Location, Team, Testimonials } from '@/components/site/sections';
import { Services } from '@/components/site/services';
import { SiteHeader } from '@/components/site/site-header';

export default function Home() {
  return (
    <>
      <a href="#main" className="fixed -top-20 left-3 z-50 bg-cream p-2.5 focus:top-2.5">
        Skip to content
      </a>
      <div className="bg-forest px-4 py-2 text-center text-[10px] tracking-[0.08em] text-[#e7ecdf]">
        A little space for yourself. A little closer to feeling good. &nbsp;•&nbsp; Austin, TX
      </div>
      <SiteHeader />
      <main id="main">
        <Hero />
        <Values />
        <About />
        <Services />
        <BookingSection />
        <Testimonials />
        <Team />
        <ContactSection />
        <Location />
        <AutomationSection />
      </main>
      <Footer />
    </>
  );
}
