export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-forest-deep pt-16 pb-6 text-[#edf0e4]">
      <div className="wrap">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="col-span-2 md:col-span-1">
            <p className="font-serif text-4xl leading-none tracking-[-0.05em]">
              bloom
              <small className="mt-1.5 block font-sans text-[7px] tracking-[0.35em] uppercase">Wellness Clinic</small>
            </p>
            <p className="mt-5 text-xs text-[#b9c6b6]">
              A little care. A better you.
              <br />
              Rooted in Austin, made for your well-being.
            </p>
          </div>
          <FooterColumn title="Find your well" links={[['#about', 'Our story'], ['#services', 'Our treatments'], ['#team', 'Our people'], ['#booking', 'Book an appointment']]} />
          <div>
            <h4 className="mb-3 text-[10px] font-medium tracking-[0.1em] uppercase">Come say hello</h4>
            <address className="mb-2 text-xs text-[#b9c6b6] not-italic">
              1428 Willow Grove Lane, Suite 100
              <br />
              Austin, TX 78703
            </address>
            <div className="grid gap-2 text-xs text-[#d0d8c9]">
              <a href="tel:+15125550148">(512) 555-0148</a>
              <a href="mailto:hello@bloomwellness.example">hello@bloomwellness.example</a>
            </div>
          </div>
          <FooterColumn title="A little more" links={[['#contact', 'Get in touch'], ['#visit', 'Location & hours'], ['#automation', 'The automation experience']]} />
        </div>
        <div className="mt-10 flex flex-col justify-between gap-2 border-t border-[#58664f] pt-5 text-[10px] text-[#a8b8a4] md:flex-row">
          <span>© {year} Bloom Wellness Clinic. All rights reserved.</span>
          <span>Portfolio concept · Fictional business, team &amp; testimonials · Photography: Unsplash</span>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h4 className="mb-3 text-[10px] font-medium tracking-[0.1em] uppercase">{title}</h4>
      <nav className="grid gap-2 text-xs text-[#d0d8c9]">
        {links.map(([href, label]) => (
          <a key={href} href={href} className="hover:text-white">
            {label}
          </a>
        ))}
      </nav>
    </div>
  );
}
