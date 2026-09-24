export const isDemoMode = () => process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

/** Fixed notice shown on the public demo deployment. Its height is exposed as --banner-h for sticky offsets. */
export function DemoBanner() {
  if (!isDemoMode()) return null;
  return (
    <div
      data-demo-banner
      role="note"
      className="fixed inset-x-0 top-0 z-50 flex h-[var(--banner-h)] items-center justify-center bg-ink px-4 text-center text-[11px] tracking-[0.04em] text-[#e7ecdf]"
    >
      Demo site — fictional clinic. Bookings are for testing only.
    </div>
  );
}
