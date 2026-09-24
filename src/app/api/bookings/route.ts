import { after, NextResponse } from 'next/server';
import { processJobs } from '@/lib/automations/processor';
import { clientIp, jsonError, parseBody, requestKeyFrom } from '@/lib/http';
import { createBookingLead } from '@/lib/leads';
import { enforceRateLimit } from '@/lib/rate-limit';
import { formatAppointment } from '@/lib/schedule';
import { bookingSchema } from '@/lib/schemas';
import { getService } from '@/lib/services';

export async function POST(request: Request) {
  try {
    const requestKey = requestKeyFrom(request);
    const data = await parseBody(request, bookingSchema);
    await enforceRateLimit('submit', clientIp(request));

    const lead = await createBookingLead(data, requestKey);
    if (!lead.duplicate) after(() => processJobs({ leadId: lead.id }));

    return NextResponse.json(
      {
        requestKey: lead.requestKey,
        duplicate: lead.duplicate,
        service: getService(data.service)!.name,
        startsAt: lead.startsAt.toISOString(),
        when: formatAppointment(lead.startsAt),
      },
      { status: lead.duplicate ? 200 : 201 },
    );
  } catch (error) {
    return jsonError(error);
  }
}
