# Portfolio verification

Publication preparation: September 23, 2026.

- Vitest: 44 tests across 9 files passed.

Update, September 24, 2026 (public demo mode and build fix):

- Vitest: 51 tests across 11 files passed, including the Postgres integration suite (demo data purge, and channels parked as BLOCKED when no email/WhatsApp credentials are set).
- `next build` passed with no environment variables and no database available.
- TypeScript and ESLint passed.
- TypeScript: npm run typecheck passed.
- Checks ran on the original working copy whose source was copied into this repository.
- No new production deployment, live email/WhatsApp delivery check or browser end-to-end run was performed.

These checks describe the work actually performed, not a claim of production readiness.
