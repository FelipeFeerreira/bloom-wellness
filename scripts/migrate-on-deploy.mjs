// Applies pending Prisma migrations during Vercel production builds, so the database schema always
// matches the code being deployed. Previews and local builds skip it: they may share the database
// and must not apply migrations that are not merged yet.
import { execSync } from 'node:child_process';

const hasDatabase = Boolean(process.env.DIRECT_URL || process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL);

if (process.env.VERCEL_ENV !== 'production') {
  console.log('migrate-on-deploy: not a Vercel production build, skipping migrations.');
} else if (!hasDatabase) {
  console.error('migrate-on-deploy: no DATABASE_URL configured for production.');
  process.exit(1);
} else {
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
}
