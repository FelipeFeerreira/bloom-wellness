import type { Metadata, Viewport } from 'next';
import { DM_Sans, Fraunces } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const sans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans', display: 'swap' });
const serif = Fraunces({ subsets: ['latin'], variable: '--font-fraunces', display: 'swap', axes: ['SOFT', 'opsz'] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || 'http://localhost:3000'),
  title: 'Bloom Wellness Clinic | A little care. A better you.',
  description: 'Bloom Wellness Clinic — a thoughtful approach to facials, massage, acupuncture and everyday wellbeing in Austin, Texas.',
  openGraph: {
    title: 'Bloom Wellness Clinic',
    description: 'Thoughtful treatments, caring hands, and a quiet place to reconnect with you.',
    images: ['/images/hero.jpg'],
    type: 'website',
  },
};

export const viewport: Viewport = { themeColor: '#344b3e' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
