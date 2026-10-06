# Bloom Wellness Clinic

A full-stack website for a (fictional) wellness clinic in Austin, TX. Visitors can book real appointment slots or send a message, and every submission triggers working automations: a confirmation email to the client, a WhatsApp alert to the owner, and a CRM entry the team manages from a private dashboard.

**Live demo:** https://bloom-wellnessdefinitive.vercel.app (fictional clinic; submissions are deleted after 24 hours)

| Booking with live availability | Automation tracker |
| --- | --- |
| ![Booking form with a day selected and live time slots](docs/screenshots/booking.webp) | ![Live automation tracker showing each step's real status](docs/screenshots/live-tracker.webp) |

| CRM dashboard | Mobile |
| --- | --- |
| ![Admin CRM with leads, bookings, delivery status and retries](docs/screenshots/admin-crm.webp) | ![Mobile booking calendar](docs/screenshots/mobile-booking.webp) |

More in [docs/screenshots](docs/screenshots). Regenerate them with `ADMIN_TOKEN=… npm run screenshots` (see `scripts/screenshots.mts`).

## Stack

| Layer | Tech |
| --- | --- |
| Framework | Next.js 16 (App Router, Route Handlers, Server Actions), React 19, TypeScript |
| Styling | Tailwind CSS 4 + shadcn/ui (Radix primitives) |
| Data fetching | TanStack Query (availability, submissions, live automation polling) · Zustand for shared UI state |
| Validation | Zod schemas shared by the browser and the API |
| Database | PostgreSQL + Prisma 7 (driver adapter `@prisma/adapter-pg`) |
| Automations | Resend (email) · WhatsApp Cloud API (owner alerts + delivery webhooks) · Vercel Cron |
| Tests | Vitest + React Testing Library (unit, component, Postgres integration) · Playwright (E2E) |

## What works

- **Booking**: live availability per day (Central Time, DST-safe). A slot can only be booked once: a unique constraint on `startsAt` settles races, and the loser gets a 409 with a fresh slot list.
- **Contact form**: validated on both sides, with a honeypot field against bots and rate limiting per IP (stored in Postgres and HMAC-hashed, so it works across serverless instances).
- **Idempotency**: each submission sends an `Idempotency-Key`, so retries after a network blip never create duplicates. Double-submits of the same content within 10 minutes are ignored too.
- **Automation queue** (`src/lib/automations`):
  - Each lead creates `EMAIL` and `WHATSAPP` jobs in the same transaction.
  - Jobs run right after the response (`after()`), and the cron picks up anything left over.
  - A conditional update claims each job, so concurrent workers never send twice. Resend also receives an idempotency key per job.
  - Temporary failures retry with exponential backoff (up to 5 attempts). Permanent failures are marked `FAILED`. Channels without credentials are parked as `BLOCKED`. Jobs interrupted mid-send go to `REVIEW` rather than being resent blindly.
  - WhatsApp delivery receipts (`sent → delivered → read / failed`) come in through a signed webhook.
- **Live tracker**: the "More care. Less admin." section polls the visitor's own submission and shows each step's real status.
- **CRM** at `/admin`: sign in with a token. It lists leads and bookings, lets you change a lead's status, shows delivery errors, and offers one-click retry and a "run automations now" button.

## Running locally

```bash
cp .env.example .env              # then fill in the secrets (see below)
npm install
npm run db:up                     # Postgres 17 in Docker
npm run db:migrate                # apply migrations
npm run dev
```

Generate the secrets (`ADMIN_TOKEN`, `CRON_SECRET`, `RATE_LIMIT_SECRET`, `WHATSAPP_VERIFY_TOKEN`) with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Without Resend or WhatsApp credentials, everything still works. Those jobs show up as `BLOCKED` in the CRM, and you can retry them once the keys are set.

## Connecting the real channels

**Email (Resend)**: verify a domain at resend.com and set `RESEND_API_KEY`, `RESEND_FROM` (on the verified domain) and optionally `CLINIC_REPLY_TO`.

**WhatsApp (Meta Cloud API)**:
1. Create a Meta app with the WhatsApp product. Set `WHATSAPP_ACCESS_TOKEN` (a permanent System User token), `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_GRAPH_VERSION` (e.g. `v23.0`) and `WHATSAPP_OWNER_NUMBER` (the owner's phone number, with country code).
2. Create a *Utility* message template named `bloom_new_inquiry` with **three body variables**, for example:
   `New {{1}} on the website. Contact: {{2}}. Details: {{3}}`
3. Webhook: callback URL `https://<your-domain>/api/webhooks/whatsapp`, verify token = `WHATSAPP_VERIFY_TOKEN`. Subscribe to `messages` and set `META_APP_SECRET` so signatures can be checked.

## Deploying to Vercel

1. Create a Postgres database (Neon, Supabase, Vercel Postgres…). Set `DATABASE_URL` (pooled) and `DIRECT_URL` (direct, used for migrations).
2. Add every variable from `.env.example` to the project settings.
3. Migrations run automatically in Vercel production builds (`scripts/migrate-on-deploy.mjs`). Preview and local builds skip them. Elsewhere, run `npm run db:migrate`.
4. `vercel.json` schedules `/api/cron/automations`, and Vercel sends `Authorization: Bearer $CRON_SECRET` automatically. The Hobby plan allows one run a day. Deliveries happen immediately after each submission anyway, and the cron is only the safety net.

## Tests

```bash
npm test                  # unit + component tests; integration runs when TEST_DATABASE_URL is set
npm run test:integration  # queue, locking, retries and double-booking against real Postgres
npm run test:e2e          # Playwright (desktop + mobile), starts the dev server
```

First-time integration setup: `docker compose exec db createdb -U bloom bloom_test` and then
`DATABASE_URL=postgresql://bloom:bloom@localhost:5432/bloom_test npx prisma migrate deploy`.

## Project layout

```
src/
  app/                  pages, API routes (leads, bookings, availability, cron, webhooks), /admin CRM
  components/ui/        shadcn/ui components
  components/site/      page sections and forms
  lib/                  schemas, schedule, rate limiting, lead creation, Prisma client
  lib/automations/      queue processor, Resend + WhatsApp providers, message templates
prisma/                 schema + migrations
tests/                  Vitest + RTL (tests/integration hits Postgres)
e2e/                    Playwright
legacy/index.html       the original single-file static version
```

_Portfolio concept: the business, team and testimonials are fictional. Photography: Unsplash._
