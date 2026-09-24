export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    throw new ApiError(0, 'We could not reach the clinic. Please check your connection and try again.');
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(response.status, body.error ?? 'Something went wrong. Please try again.', body.fields ?? {});
  }
  return body as T;
}

export function postJson<T>(url: string, data: unknown, idempotencyKey: string) {
  return apiFetch<T>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(data),
  });
}

/** Submissions carry an idempotency key, so network blips and 5xx can be retried safely. */
export function retryTransient(failureCount: number, error: unknown) {
  return failureCount < 2 && error instanceof ApiError && (error.status === 0 || error.status >= 500);
}

export type SubmissionResponse = { requestKey: string; duplicate: boolean };
export type BookingResponse = SubmissionResponse & { service: string; startsAt: string; when: string };
export type AvailabilityResponse = { date: string; slots: { time: string; label: string; available: boolean }[] };
export type JobState = {
  channel: 'EMAIL' | 'WHATSAPP';
  status: 'PENDING' | 'PROCESSING' | 'ACCEPTED' | 'BLOCKED' | 'FAILED' | 'REVIEW';
  delivery: string | null;
  attempts: number;
  nextRunAt: string;
};
export type LeadProgress = { kind: 'CONTACT' | 'BOOKING'; createdAt: string; jobs: JobState[] };
