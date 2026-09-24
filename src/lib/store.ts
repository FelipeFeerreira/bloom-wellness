import { create } from 'zustand';
import type { ServiceId } from './services';

export type TrackedSubmission = { key: string; kind: 'CONTACT' | 'BOOKING'; name: string };

type SiteState = {
  /** Treatment preselected in the booking form (set from the service cards). */
  service: ServiceId;
  setService: (service: ServiceId) => void;
  /** Latest submission, followed live by the automation section. */
  tracked: TrackedSubmission | null;
  track: (submission: TrackedSubmission) => void;
};

export const useSiteStore = create<SiteState>()((set) => ({
  service: 'facial',
  setService: (service) => set({ service }),
  tracked: null,
  track: (tracked) => set({ tracked }),
}));
