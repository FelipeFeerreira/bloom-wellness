'use server';

import { revalidatePath } from 'next/cache';
import { cookies, headers } from 'next/headers';
import { z } from 'zod';
import { ADMIN_COOKIE, checkAdminToken, isAdmin, SESSION_MAX_AGE, sessionValue } from '@/lib/admin-auth';
import { processJobs, requeueJob } from '@/lib/automations/processor';
import { prisma } from '@/lib/db';
import { HttpError } from '@/lib/http';
import { enforceRateLimit } from '@/lib/rate-limit';

export type LoginState = { error?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  try {
    await enforceRateLimit('submit', `admin:${ip}`);
  } catch (error) {
    if (error instanceof HttpError) return { error: error.message };
    throw error;
  }
  if (!checkAdminToken(String(formData.get('token') ?? ''))) return { error: 'That token is not right.' };

  (await cookies()).set(ADMIN_COOKIE, sessionValue()!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/admin',
    maxAge: SESSION_MAX_AGE,
  });
  revalidatePath('/admin');
  return {};
}

export async function logout() {
  (await cookies()).delete({ name: ADMIN_COOKIE, path: '/admin' });
  revalidatePath('/admin');
}

async function requireAdmin() {
  if (!(await isAdmin())) throw new Error('Unauthorized');
}

const statusSchema = z.object({ leadId: z.string().min(1), status: z.enum(['NEW', 'CONTACTED', 'CLOSED']) });

export async function updateLeadStatus(formData: FormData) {
  await requireAdmin();
  const { leadId, status } = statusSchema.parse(Object.fromEntries(formData));
  await prisma.lead.update({ where: { id: leadId }, data: { status } });
  revalidatePath('/admin');
}

export async function retryJob(formData: FormData) {
  await requireAdmin();
  const jobId = z.string().min(1).parse(formData.get('jobId'));
  await requeueJob(jobId);
  await processJobs({ jobIds: [jobId] });
  revalidatePath('/admin');
}

export async function runAutomations() {
  await requireAdmin();
  await processJobs({ limit: 100 });
  revalidatePath('/admin');
}
