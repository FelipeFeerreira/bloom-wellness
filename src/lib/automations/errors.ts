/** A provider call failed. `retryable` decides between a scheduled retry and a permanent failure. */
export class DeliveryError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}

/** The channel has no credentials configured; the job is parked instead of retried. */
export class ChannelNotConfigured extends Error {}

/** HTTP statuses worth retrying: rate limits, timeouts and server errors. */
export function isRetryableStatus(status: number) {
  return status === 408 || status === 409 || status === 429 || status >= 500;
}
