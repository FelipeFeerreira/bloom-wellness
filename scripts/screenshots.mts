/**
 * Portfolio screenshots of the deployed site.
 *
 *   ADMIN_TOKEN=... npm run screenshots
 *   BASE_URL=https://... ADMIN_TOKEN=... npm run screenshots   # another deployment
 *   SKIP_SEED=1 ADMIN_TOKEN=... npm run screenshots            # data already seeded
 *
 * Seeds realistic demo submissions through the public API, captures high-resolution PNGs into
 * portfolio-assets/upwork/ and GitHub-sized WebP copies (< 500 KB each) into docs/screenshots/.
 * The admin token is read from the environment, typed into the login form and never logged,
 * put in a URL or shown on screen. Uses the installed Chrome; set PW_CHANNEL= to use Playwright's Chromium.
 */
import { chromium, devices, type Browser, type Page } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

const BASE_URL = (process.env.BASE_URL ?? 'https://bloom-wellnessdefinitive.vercel.app').replace(/\/$/, '');
const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? '';
const CHANNEL = process.env.PW_CHANNEL ?? 'chrome';
const HIGH_RES_DIR = path.resolve('portfolio-assets/upwork');
const GITHUB_DIR = path.resolve('docs/screenshots');
const GITHUB_MAX_BYTES = 500 * 1024;
const DESKTOP = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 };

/** Hides the demo banner (and its layout offset) for the "clean" marketing shots. */
const HIDE_BANNER_CSS = '[data-demo-banner]{display:none!important} :root,:root[data-demo]{--banner-h:0px!important}';

// ---------------------------------------------------------------- demo data

type Seed =
  | { kind: 'contact'; name: string; email: string; phone?: string; message: string }
  | { kind: 'booking'; name: string; email: string; phone?: string; service: string; notes?: string; dayOffset: number; slotIndex: number };

const SEEDS: Seed[] = [
  { kind: 'booking', name: 'Olivia Martinez', email: 'olivia.martinez@example.com', phone: '(512) 555-0182', service: 'facial', notes: 'First facial — I have sensitive skin.', dayOffset: 2, slotIndex: 2 },
  { kind: 'contact', name: 'Daniel Kim', email: 'daniel.kim@example.com', message: 'Do you offer gift cards for a massage? It would be a birthday present.' },
  { kind: 'booking', name: 'Hannah Brooks', email: 'hannah.brooks@example.com', service: 'massage', dayOffset: 1, slotIndex: 0 },
  { kind: 'contact', name: 'Marcus Lee', email: 'marcus.lee@example.com', message: 'Is acupuncture a good fit for recurring tension headaches?' },
];

/** Statuses applied in the CRM so the dashboard shows a realistic mix. */
const STATUSES: Record<string, 'CONTACTED' | 'CLOSED'> = { 'Daniel Kim': 'CONTACTED', 'Marcus Lee': 'CLOSED' };

async function post(pathname: string, body: object) {
  for (let attempt = 1; attempt <= 12; attempt++) {
    const response = await fetch(`${BASE_URL}${pathname}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': randomUUID() },
      body: JSON.stringify(body),
    });
    if (response.status !== 429) return response;
    console.log(`  rate limited on ${pathname}; waiting a minute (attempt ${attempt})…`);
    await new Promise((resolve) => setTimeout(resolve, 60_000));
  }
  throw new Error(`Still rate limited on ${pathname}`);
}

async function bookableDate(offset: number) {
  // Walk forward from today until the API accepts the date (skips Sundays and today).
  for (let d = offset; d < offset + 14; d++) {
    const date = new Date(Date.now() + d * 86_400_000).toISOString().slice(0, 10);
    const res = await fetch(`${BASE_URL}/api/availability?date=${date}`);
    if (res.ok) return { date, slots: ((await res.json()) as { slots: { time: string; available: boolean }[] }).slots };
  }
  throw new Error('No bookable date found');
}

/** Submissions are rate limited per IP in 10-minute windows; start the UI flows in a fresh one. */
async function waitForNextRateWindow() {
  const windowMs = 10 * 60_000;
  const wait = windowMs - (Date.now() % windowMs) + 2_000;
  console.log(`  waiting ${Math.round(wait / 1000)}s for a fresh rate-limit window…`);
  await new Promise((resolve) => setTimeout(resolve, wait));
}

async function seed() {
  for (const s of SEEDS) {
    if (s.kind === 'contact') {
      const res = await post('/api/leads', { name: s.name, email: s.email, phone: s.phone, message: s.message, consent: true });
      console.log(`  contact ${s.name}: ${res.status}`);
    } else {
      const { date, slots } = await bookableDate(s.dayOffset);
      const open = slots.filter((slot) => slot.available);
      const slot = open[Math.min(s.slotIndex, open.length - 1)];
      const res = await post('/api/bookings', { service: s.service, date, time: slot.time, name: s.name, email: s.email, phone: s.phone, notes: s.notes, consent: true });
      console.log(`  booking ${s.name} ${date} ${slot.time}: ${res.status}`);
    }
  }
}

// ---------------------------------------------------------------- page helpers

async function settle(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    // next/image lazy-loads; walk the page so every image is requested, then wait for all of them.
    for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight / 2) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
    const pending = Array.from(document.images).filter((img) => !img.complete);
    await Promise.all(
      pending.map(
        (img) =>
          new Promise((resolve) => {
            img.addEventListener('load', resolve, { once: true });
            img.addEventListener('error', resolve, { once: true });
          }),
      ),
    );
  });
  await page.waitForLoadState('networkidle');
}

async function withStyle<T>(page: Page, css: string, run: () => Promise<T>) {
  const handle = await page.addStyleTag({ content: css });
  try {
    return await run();
  } finally {
    await handle.evaluate((el) => (el as Element).remove());
  }
}

/** Scrolls so `selector` starts just under the sticky header (and banner, when shown). */
async function scrollUnderHeader(page: Page, selector: string, extra = 16) {
  await page.evaluate(
    ({ selector, extra }) => {
      const el = document.querySelector(selector)!;
      const header = document.querySelector('header')!.getBoundingClientRect().bottom;
      window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - header - extra, behavior: 'instant' });
    },
    { selector, extra },
  );
  await page.waitForTimeout(250);
}

async function shot(page: Page, name: string, options: { fullPage?: boolean } = {}) {
  const file = path.join(HIGH_RES_DIR, name);
  await page.screenshot({ path: file, animations: 'disabled', caret: 'hide', ...options });
  console.log(`  ✓ ${name}`);
}

async function newPage(browser: Browser, options: Parameters<Browser['newPage']>[0]) {
  const page = await browser.newPage({ ...options, reducedMotion: 'reduce' });
  page.setDefaultTimeout(30_000);
  return page;
}

async function pickDayAndTime(page: Page, slotIndex = 1) {
  const form = page.getByRole('form', { name: 'Book an appointment' });
  await form.locator('[aria-label="Choose an appointment date"] button:not([disabled])').nth(2).click();
  const slots = form.locator('[aria-label="Available appointment times"] button:not([disabled])');
  await slots.first().waitFor();
  await slots.nth(Math.min(slotIndex, (await slots.count()) - 1)).click();
  return form;
}

// ---------------------------------------------------------------- captures

async function desktop(browser: Browser) {
  const page = await newPage(browser, DESKTOP);
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await settle(page);

  await withStyle(page, HIDE_BANNER_CSS, async () => {
    await shot(page, 'home-hero.png');
    await withStyle(page, 'header{position:static!important}', () => page.locator('#services').screenshot({ path: path.join(HIGH_RES_DIR, 'services.png'), animations: 'disabled' }));
    console.log('  ✓ services.png');
    await withStyle(page, 'header{position:static!important} a[href="#main"]{display:none!important}', () => shot(page, 'full-page.png', { fullPage: true }));
  });

  // Booking: a day selected and its live times visible.
  await page.getByRole('form', { name: 'Book an appointment' }).getByLabel('01 — Your treatment').selectOption('massage');
  const form = await pickDayAndTime(page, 1);
  await scrollUnderHeader(page, 'form[aria-label="Book an appointment"]', 24);
  await shot(page, 'booking.png');

  // Confirmation.
  await form.getByLabel('Full name *').fill('Sophie Turner');
  await form.getByLabel('Email *').fill('sophie.turner@example.com');
  await form.getByLabel('Phone').fill('(512) 555-0147');
  await form.getByRole('checkbox').check();
  await form.getByRole('button', { name: /confirm booking/i }).click();
  await page.getByRole('dialog').waitFor();
  await page.waitForTimeout(400);
  await shot(page, 'booking-success.png');
  await page.getByRole('button', { name: 'Lovely, thank you' }).click();

  // Live automation tracker for a real contact submission.
  const contact = page.getByRole('form', { name: 'Contact form' });
  await contact.getByLabel('Full name *').fill('Priya Patel');
  await contact.getByLabel('Email address *').fill('priya.patel@example.com');
  await contact.getByLabel('How can we help?').fill("I'd love to book my first acupuncture session. Which days are quietest?");
  await contact.getByRole('checkbox').check();
  await contact.getByRole('button', { name: /send message/i }).click();
  await page.getByText('Received from Priya Patel').waitFor();
  await page.getByText('Stored in the CRM').waitFor();
  await page.waitForFunction(() => !document.querySelector('#automation .animate-spin'), undefined, { timeout: 30_000 });
  await scrollUnderHeader(page, '#automation', 0);
  await shot(page, 'live-tracker.png');
  await page.close();
}

async function admin(browser: Browser) {
  if (!ADMIN_TOKEN) throw new Error('Set ADMIN_TOKEN to capture the CRM.');
  const page = await newPage(browser, DESKTOP);
  await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' });
  await page.fill('#token', ADMIN_TOKEN);
  await page.click('button:has-text("Sign in")');
  await page.waitForSelector('table');

  for (const [name, status] of Object.entries(STATUSES)) {
    const row = page.locator('tbody tr', { hasText: name }).first();
    if (!(await row.count())) continue;
    await row.locator('select[name=status]').selectOption(status);
    await Promise.all([
      page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/admin'),
      row.getByRole('button', { name: 'Save' }).click(),
    ]);
  }

  // Reload so the stats reflect the new statuses; the URL never carries the token.
  await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' });
  await settle(page);
  if (page.url().includes(ADMIN_TOKEN) || (await page.content()).includes(ADMIN_TOKEN)) throw new Error('Token visible on the page');
  await shot(page, 'admin-crm.png', { fullPage: true });
  await page.close();
}

async function mobile(browser: Browser) {
  // iPhone 14 metrics, rendered by Chromium.
  const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } = devices['iPhone 14'];
  const page = await newPage(browser, { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch });
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await settle(page);
  await shot(page, 'mobile-home.png');

  await pickDayAndTime(page, 0);
  await scrollUnderHeader(page, '[aria-label="Choose an appointment date"]', 90);
  await shot(page, 'mobile-booking.png');
  await page.close();
}

// ---------------------------------------------------------------- GitHub copies

/** Re-encodes each PNG as WebP in the browser (no extra dependencies), shrinking until < 500 KB. */
async function optimizeForGitHub(browser: Browser, names: string[]) {
  const page = await browser.newPage();
  for (const name of names) {
    const png = await readFile(path.join(HIGH_RES_DIR, name));
    const webp = await page.evaluate(
      async ({ dataUrl, maxBytes }) => {
        const img = new Image();
        img.src = dataUrl;
        await img.decode();
        // GitHub renders at most ~1000px wide; 1600px keeps text crisp on retina screens.
        let width = Math.min(img.naturalWidth, 1600);
        for (let quality = 0.86; ; ) {
          const scale = width / img.naturalWidth;
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.naturalWidth * scale);
          canvas.height = Math.min(Math.round(img.naturalHeight * scale), 16_000);
          canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, img.naturalHeight * scale);
          const blob: Blob = await new Promise((r) => canvas.toBlob((b) => r(b!), 'image/webp', quality));
          if (blob.size <= maxBytes || (quality <= 0.5 && width <= 800)) {
            const bytes = new Uint8Array(await blob.arrayBuffer());
            let binary = '';
            for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
            return btoa(binary);
          }
          if (quality > 0.6) quality -= 0.08;
          else width = Math.round(width * 0.85);
        }
      },
      { dataUrl: `data:image/png;base64,${png.toString('base64')}`, maxBytes: GITHUB_MAX_BYTES },
    );
    const out = path.join(GITHUB_DIR, name.replace(/\.png$/, '.webp'));
    const buffer = Buffer.from(webp, 'base64');
    await writeFile(out, buffer);
    console.log(`  ✓ ${path.basename(out)} ${(buffer.length / 1024).toFixed(0)} KB`);
  }
  await page.close();
}

// ---------------------------------------------------------------- main

await mkdir(HIGH_RES_DIR, { recursive: true });
await mkdir(GITHUB_DIR, { recursive: true });
console.log(`Screenshots of ${BASE_URL}`);

const browser = await chromium.launch(CHANNEL ? { channel: CHANNEL } : {});
try {
  const seeding = process.env.SKIP_SEED !== '1';
  if (seeding) {
    console.log('Seeding demo submissions…');
    await seed();
  }
  console.log('CRM…');
  await admin(browser);
  if (seeding) await waitForNextRateWindow();
  console.log('Desktop…');
  await desktop(browser);
  console.log('Mobile…');
  await mobile(browser);
  console.log('GitHub copies…');
  await optimizeForGitHub(browser, [
    'home-hero.png', 'services.png', 'booking.png', 'booking-success.png', 'live-tracker.png',
    'admin-crm.png', 'full-page.png', 'mobile-home.png', 'mobile-booking.png',
  ]);
} finally {
  await browser.close();
}
