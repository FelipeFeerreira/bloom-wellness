import { after, NextResponse } from 'next/server';
import { processJobs } from '@/lib/automations/processor';
import { clientIp, jsonError, parseBody, requestKeyFrom } from '@/lib/http';
import { createContactLead } from '@/lib/leads';
import { enforceRateLimit } from '@/lib/rate-limit';
import { contactSchema } from '@/lib/schemas';

export async function POST(request: Request) {
  try {
    const requestKey = requestKeyFrom(request);
    const data = await parseBody(request, contactSchema);
    await enforceRateLimit('submit', clientIp(request));

    const lead = await createContactLead(data, requestKey);
    // Deliver right after responding; the cron job picks up anything that fails here.
    if (!lead.duplicate) after(() => processJobs({ leadId: lead.id }));

    return NextResponse.json({ requestKey: lead.requestKey, duplicate: lead.duplicate }, { status: lead.duplicate ? 200 : 201 });
  } catch (error) {
    return jsonError(error);
  }
}
