'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { useIdempotencyKey } from '@/hooks/use-idempotency-key';
import { apiFetch, ApiError, postJson, type AvailabilityResponse, type BookingResponse } from '@/lib/api-client';
import { bookingSchema, fieldErrors, type FieldErrors } from '@/lib/schemas';
import { SERVICES, type ServiceId } from '@/lib/services';
import { useSiteStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { BookingCalendar } from './booking-calendar';
import { ConsentField } from './consent-field';
import { FormField, Honeypot } from './form-field';

const EMPTY_DETAILS = { name: '', email: '', phone: '', notes: '', consent: false, website: '' };

export function availabilityQuery(date: string | null) {
  return {
    queryKey: ['availability', date] as const,
    queryFn: () => apiFetch<AvailabilityResponse>(`/api/availability?date=${date}`),
    enabled: !!date,
  };
}

export function BookingForm() {
  const service = useSiteStore((s) => s.service);
  const setService = useSiteStore((s) => s.setService);
  const track = useSiteStore((s) => s.track);
  const queryClient = useQueryClient();

  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [details, setDetails] = useState(EMPTY_DETAILS);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [confirmed, setConfirmed] = useState<BookingResponse | null>(null);
  const [requestKey, rotateKey] = useIdempotencyKey();

  const availability = useQuery(availabilityQuery(date));

  const mutation = useMutation({
    mutationFn: (payload: object) => postJson<BookingResponse>('/api/bookings', payload, requestKey),
    onSuccess: (data) => {
      setConfirmed(data);
      track({ key: data.requestKey, kind: 'BOOKING', name: details.name });
      setDetails(EMPTY_DETAILS);
      setTime(null);
      rotateKey();
      queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
    onError: (error) => {
      if (!(error instanceof ApiError)) return;
      setErrors(error.fields);
      if (error.status === 409) {
        setTime(null);
        queryClient.invalidateQueries({ queryKey: ['availability', date] });
      }
    },
  });

  const setDetail = <K extends keyof typeof details>(key: K, value: (typeof details)[K]) => {
    setDetails((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const payload = { service, date: date ?? '', time: time ?? '', ...details };
    const result = bookingSchema.safeParse(payload);
    if (!result.success) {
      setErrors(fieldErrors(result.error));
      return;
    }
    setErrors({});
    mutation.mutate(payload);
  }

  const slots = availability.data?.slots ?? [];
  const slotError = errors.date ?? errors.time;
  const generalError = mutation.isError && !Object.values(errors).some(Boolean) ? mutation.error.message : null;

  return (
    <>
      <form onSubmit={onSubmit} noValidate aria-label="Book an appointment" className="relative rounded-md bg-cream p-6 text-ink shadow-[0_15px_35px_#14231a33] sm:p-8">
        <Honeypot value={details.website} onChange={(v) => setDetail('website', v)} />
        <h3 className="text-[26px] leading-tight">A moment, just for you.</h3>
        <p className="mb-6 text-xs text-muted-foreground">Select your appointment below — it&apos;s reserved the moment you confirm.</p>

        <div className="grid gap-6">
          <FormField id="service" label="01 — Your treatment" error={errors.service}>
            {(a11y) => (
              <NativeSelect
                {...a11y}
                value={service}
                onChange={(e) => {
                  setService(e.target.value as ServiceId);
                  setErrors((er) => ({ ...er, service: undefined }));
                }}
              >
                {SERVICES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.minutes} min · From ${s.price}
                  </option>
                ))}
              </NativeSelect>
            )}
          </FormField>

          <BookingCalendar
            value={date}
            onChange={(d) => {
              setDate(d);
              setTime(null);
              setErrors((er) => ({ ...er, date: undefined, time: undefined }));
            }}
          />

          <div>
            <span className="mb-2.5 block text-xs font-semibold">03 — Available times · Austin (Central Time)</span>
            <div role="group" aria-label="Available appointment times" aria-busy={availability.isFetching} className="grid grid-cols-3 gap-2">
              {!date && <p className="col-span-3 text-xs text-muted-foreground">Choose a date to see open times.</p>}
              {date && availability.isPending && Array.from({ length: 6 }, (_, i) => <span key={i} className="h-10 animate-pulse rounded-md bg-paper" />)}
              {availability.isError && <p className="col-span-3 text-xs text-destructive">{availability.error.message}</p>}
              {slots.map((slot) => (
                <button
                  key={slot.time}
                  type="button"
                  disabled={!slot.available}
                  aria-pressed={time === slot.time}
                  aria-label={slot.available ? slot.label : `${slot.label}, booked`}
                  onClick={() => {
                    setTime(slot.time);
                    setErrors((er) => ({ ...er, time: undefined }));
                  }}
                  className={cn(
                    'h-10 rounded-md border text-[11px] transition-colors hover:border-forest disabled:cursor-not-allowed disabled:text-muted-foreground/60 disabled:line-through disabled:hover:border-border',
                    time === slot.time && 'border-forest bg-forest text-white',
                  )}
                >
                  {slot.label}
                </button>
              ))}
            </div>
            {slotError && (
              <p role="alert" className="mt-2 text-xs text-destructive">
                {slotError}
              </p>
            )}
          </div>

          <fieldset className="grid gap-4">
            <legend className="mb-3 text-xs font-semibold">04 — Your details</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="booking-name" label="Full name *" error={errors.name}>
                {(a11y) => <Input {...a11y} autoComplete="name" maxLength={100} value={details.name} onChange={(e) => setDetail('name', e.target.value)} />}
              </FormField>
              <FormField id="booking-email" label="Email *" error={errors.email}>
                {(a11y) => (
                  <Input {...a11y} type="email" autoComplete="email" maxLength={160} value={details.email} onChange={(e) => setDetail('email', e.target.value)} />
                )}
              </FormField>
            </div>
            <FormField id="booking-phone" label={<>Phone <span className="font-normal text-muted-foreground">(optional)</span></>} error={errors.phone}>
              {(a11y) => <Input {...a11y} type="tel" autoComplete="tel" maxLength={35} value={details.phone} onChange={(e) => setDetail('phone', e.target.value)} />}
            </FormField>
            <FormField id="booking-notes" label={<>Anything we should know? <span className="font-normal text-muted-foreground">(optional)</span></>} error={errors.notes}>
              {(a11y) => (
                <Textarea {...a11y} className="min-h-20" maxLength={1000} value={details.notes} onChange={(e) => setDetail('notes', e.target.value)} />
              )}
            </FormField>
            <ConsentField id="booking-consent" checked={details.consent} onChange={(v) => setDetail('consent', v)} error={errors.consent}>
              I agree that Bloom may store these details and email me about this appointment.
            </ConsentField>
          </fieldset>
        </div>

        {generalError && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {generalError}
          </p>
        )}
        <Button type="submit" size="lg" className="mt-6 w-full" disabled={mutation.isPending}>
          {mutation.isPending ? (
            <>
              <Loader2 className="animate-spin" /> Reserving your time…
            </>
          ) : (
            <>
              Confirm Booking <ArrowUpRight />
            </>
          )}
        </Button>
        <p className="mt-3 text-center text-[11px] text-muted-foreground">No payment needed now. You&apos;ll get a confirmation by email.</p>
      </form>

      <Dialog open={!!confirmed} onOpenChange={(open) => !open && setConfirmed(null)}>
        <DialogContent>
          <div aria-hidden className="mx-auto mb-2 grid size-14 place-items-center rounded-full bg-sage text-2xl">
            ✓
          </div>
          <span className="eyebrow mb-0">Your moment of calm</span>
          <DialogTitle>You&apos;re all set.</DialogTitle>
          <DialogDescription>
            {confirmed?.service} · {confirmed?.when}
          </DialogDescription>
          <p className="text-sm text-muted-foreground">We&apos;ve reserved your time and sent the details to your inbox.</p>
          <DialogClose asChild>
            <Button className="mx-auto mt-2">Lovely, thank you</Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </>
  );
}
