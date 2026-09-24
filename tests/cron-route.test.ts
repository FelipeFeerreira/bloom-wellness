// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const purgeDemoData = vi.fn(async () => ({ leads: 3, bookings: 0 }));
vi.mock('@/lib/demo', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/demo')>()), purgeDemoData }));
vi.mock('@/lib/db', () => ({ prisma: {} }));
vi.mock('@/lib/automations/processor', () => ({
  processJobs: vi.fn(async () => ({ accepted: 0, retrying: 0, failed: 0, blocked: 0, recovered: 0 })),
  pruneRateBuckets: vi.fn(async () => 0),
}));

const { GET } = await import('@/app/api/cron/automations/route');

const call = (token?: string) =>
  GET(new Request('http://localhost/api/cron/automations', { headers: token ? { Authorization: `Bearer ${token}` } : {} }));

describe('cron route', () => {
  beforeEach(() => {
    vi.stubEnv('CRON_SECRET', 'cron-secret-value');
    purgeDemoData.mockClear();
  });

  it('rejects calls without the cron secret', async () => {
    expect((await call()).status).toBe(401);
    expect((await call('wrong')).status).toBe(401);
    expect(purgeDemoData).not.toHaveBeenCalled();
  });

  it('purges old demo data only when DEMO_MODE=true', async () => {
    vi.stubEnv('DEMO_MODE', 'true');
    const response = await call('cron-secret-value');
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, demoPurged: { leads: 3 } });
    expect(purgeDemoData).toHaveBeenCalledTimes(1);
  });

  it('keeps every lead on a real deployment', async () => {
    vi.stubEnv('DEMO_MODE', '');
    const body = await (await call('cron-secret-value')).json();
    expect(body).not.toHaveProperty('demoPurged');
    expect(purgeDemoData).not.toHaveBeenCalled();
  });
});
