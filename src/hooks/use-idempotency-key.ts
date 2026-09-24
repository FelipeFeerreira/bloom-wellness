'use client';

import { useCallback, useState } from 'react';

/** One key per logical submission: retries reuse it, a successful send rotates it. */
export function useIdempotencyKey() {
  const [key, setKey] = useState(() => crypto.randomUUID());
  const rotate = useCallback(() => setKey(crypto.randomUUID()), []);
  return [key, rotate] as const;
}
