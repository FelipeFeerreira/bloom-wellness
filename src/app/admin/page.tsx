import type { Metadata } from 'next';
import { formatInTimeZone } from 'date-fns-tz';
import { RefreshCw } from 'lucide-react';
import type { JobStatus, LeadStatus } from '@/generated/prisma/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { isAdmin, isAdminConfigured } from '@/lib/admin-auth';
import { prisma } from '@/lib/db';
import { CLINIC_TIME_ZONE, formatAppointment } from '@/lib/schedule';
import { getService } from '@/lib/services';
import { logout, retryJob, runAutomations, updateLeadStatus } from './actions';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Bloom CRM', robots: { index: false, follow: false } };

const FILTERS = ['ALL', 'NEW', 'CONTACTED', 'CLOSED'] as const;

const JOB_BADGE: Record<JobStatus, 'success' | 'secondary' | 'warning' | 'destructive'> = {
  ACCEPTED: 'success',
  PENDING: 'secondary',
  PROCESSING: 'secondary',
  BLOCKED: 'warning',
  REVIEW: 'warning',
  FAILED: 'destructive',
};

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  if (!(await isAdmin())) {
    return (
      <main className="grid min-h-dvh place-items-center bg-paper p-5">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Bloom CRM</CardTitle>
            <CardDescription>
              {isAdminConfigured() ? 'Sign in with the clinic admin token.' : 'Set ADMIN_TOKEN (24+ characters) to enable the dashboard.'}
            </CardDescription>
          </CardHeader>
          <CardContent>{isAdminConfigured() && <LoginForm />}</CardContent>
        </Card>
      </main>
    );
  }

  const { status } = await searchParams;
  const filter = FILTERS.find((f) => f === status) ?? 'ALL';

  const [leads, counts, attention, upcoming] = await Promise.all([
    prisma.lead.findMany({
      where: filter === 'ALL' ? {} : { status: filter },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { booking: true, jobs: { orderBy: { channel: 'asc' } } },
    }),
    prisma.lead.groupBy({ by: ['status'], _count: true }),
    prisma.automationJob.count({ where: { status: { in: ['FAILED', 'BLOCKED', 'REVIEW'] } } }),
    prisma.booking.count({ where: { startsAt: { gte: new Date() } } }),
  ]);
  const countOf = (s: LeadStatus) => counts.find((c) => c.status === s)?._count ?? 0;

  return (
    <main className="min-h-dvh bg-paper">
      <header className="border-b bg-cream">
        <div className="wrap flex flex-wrap items-center justify-between gap-4 py-5">
          <div>
            <h1 className="text-3xl">Bloom CRM</h1>
            <p className="text-xs text-muted-foreground">Leads, bookings and automation delivery</p>
          </div>
          <div className="flex gap-2">
            <form action={runAutomations}>
              <Button variant="outline" size="sm">
                <RefreshCw /> Run automations now
              </Button>
            </form>
            <form action={logout}>
              <Button variant="ghost" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <div className="wrap grid gap-6 py-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="New leads" value={countOf('NEW')} />
          <Stat label="Contacted" value={countOf('CONTACTED')} />
          <Stat label="Upcoming bookings" value={upcoming} />
          <Stat label="Automations needing attention" value={attention} tone={attention ? 'warning' : undefined} />
        </div>

        <nav className="flex flex-wrap gap-2" aria-label="Filter leads">
          {FILTERS.map((f) => (
            <Button key={f} asChild size="sm" variant={f === filter ? 'default' : 'outline'}>
              <a href={f === 'ALL' ? '/admin' : `/admin?status=${f}`}>{f.charAt(0) + f.slice(1).toLowerCase()}</a>
            </Button>
          ))}
        </nav>

        <div className="overflow-x-auto rounded-lg border bg-cream">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b bg-mist text-xs text-muted-foreground">
              <tr>
                <th className="p-3 font-semibold">Received</th>
                <th className="p-3 font-semibold">Contact</th>
                <th className="p-3 font-semibold">Request</th>
                <th className="p-3 font-semibold">Automations</th>
                <th className="p-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    No leads yet. Submissions from the site will appear here.
                  </td>
                </tr>
              )}
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b align-top last:border-0">
                  <td className="p-3 text-xs whitespace-nowrap text-muted-foreground">
                    {formatInTimeZone(lead.createdAt, CLINIC_TIME_ZONE, 'MMM d, h:mm a')}
                  </td>
                  <td className="p-3">
                    <p className="font-semibold">{lead.name}</p>
                    <a href={`mailto:${lead.email}`} className="block text-xs underline-offset-4 hover:underline">
                      {lead.email}
                    </a>
                    {lead.phone && <span className="text-xs text-muted-foreground">{lead.phone}</span>}
                  </td>
                  <td className="max-w-sm p-3">
                    <Badge variant={lead.kind === 'BOOKING' ? 'default' : 'outline'}>{lead.kind === 'BOOKING' ? 'Booking' : 'Inquiry'}</Badge>
                    {lead.booking && (
                      <p className="mt-1.5 text-xs font-medium">
                        {getService(lead.booking.service)?.name} · {formatAppointment(lead.booking.startsAt)}
                      </p>
                    )}
                    <p className="mt-1.5 line-clamp-3 text-xs text-muted-foreground">{lead.message}</p>
                  </td>
                  <td className="p-3">
                    <ul className="grid gap-2">
                      {lead.jobs.map((job) => (
                        <li key={job.id} className="text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-16">{job.channel === 'EMAIL' ? 'Email' : 'WhatsApp'}</span>
                            <Badge variant={JOB_BADGE[job.status]}>{job.status.toLowerCase()}</Badge>
                            {job.delivery && job.delivery !== 'accepted' && <span className="text-muted-foreground">{job.delivery}</span>}
                            {['FAILED', 'BLOCKED', 'REVIEW'].includes(job.status) && (
                              <form action={retryJob}>
                                <input type="hidden" name="jobId" value={job.id} />
                                <Button variant="link" size="sm" className="h-auto px-1 text-xs">
                                  Retry
                                </Button>
                              </form>
                            )}
                          </div>
                          {job.lastError && <p className="mt-1 max-w-xs text-[11px] break-words text-destructive">{job.lastError}</p>}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="p-3">
                    <form action={updateLeadStatus} className="flex items-center gap-2">
                      <input type="hidden" name="leadId" value={lead.id} />
                      <select
                        name="status"
                        defaultValue={lead.status}
                        aria-label={`Status for ${lead.name}`}
                        className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
                      >
                        <option value="NEW">New</option>
                        <option value="CONTACTED">Contacted</option>
                        <option value="CLOSED">Closed</option>
                      </select>
                      <Button size="sm" variant="secondary">
                        Save
                      </Button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'warning' }) {
  return (
    <Card className={tone === 'warning' ? 'border-[#e0c9a6] bg-[#f8f1e4]' : undefined}>
      <CardContent className="p-5">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-serif text-3xl">{value}</p>
      </CardContent>
    </Card>
  );
}
