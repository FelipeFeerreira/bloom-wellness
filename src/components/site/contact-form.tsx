'use client';

import { useMutation } from '@tanstack/react-query';
import { ArrowUpRight, CheckCircle2, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useIdempotencyKey } from '@/hooks/use-idempotency-key';
import { ApiError, postJson, type SubmissionResponse } from '@/lib/api-client';
import { contactSchema, fieldErrors, type FieldErrors } from '@/lib/schemas';
import { useSiteStore } from '@/lib/store';
import { ConsentField } from './consent-field';
import { FormField, Honeypot } from './form-field';

const EMPTY = { name: '', email: '', phone: '', message: '', consent: false, website: '' };

export function ContactForm() {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [requestKey, rotateKey] = useIdempotencyKey();
  const track = useSiteStore((s) => s.track);

  const mutation = useMutation({
    mutationFn: (payload: typeof values) => postJson<SubmissionResponse>('/api/leads', payload, requestKey),
    onSuccess: (data, payload) => {
      setSentTo(payload.name.trim().split(/\s+/)[0]);
      track({ key: data.requestKey, kind: 'CONTACT', name: payload.name });
      setValues(EMPTY);
      rotateKey();
    },
    onError: (error) => {
      if (error instanceof ApiError) setErrors(error.fields);
    },
  });

  const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSentTo(null);
    const result = contactSchema.safeParse(values);
    if (!result.success) {
      setErrors(fieldErrors(result.error));
      return;
    }
    setErrors({});
    mutation.mutate(values);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="relative grid gap-5" aria-label="Contact form">
      <Honeypot value={values.website} onChange={(v) => set('website', v)} />
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="contact-name" label="Full name *" error={errors.name}>
          {(a11y) => (
            <Input {...a11y} autoComplete="name" placeholder="Your full name" maxLength={100} value={values.name} onChange={(e) => set('name', e.target.value)} />
          )}
        </FormField>
        <FormField id="contact-email" label="Email address *" error={errors.email}>
          {(a11y) => (
            <Input {...a11y} type="email" autoComplete="email" placeholder="you@example.com" maxLength={160} value={values.email} onChange={(e) => set('email', e.target.value)} />
          )}
        </FormField>
      </div>
      <FormField id="contact-phone" label={<>Phone number <span className="font-normal text-muted-foreground">(optional)</span></>} error={errors.phone}>
        {(a11y) => (
          <Input {...a11y} type="tel" autoComplete="tel" placeholder="(512) 555-0123" maxLength={35} value={values.phone} onChange={(e) => set('phone', e.target.value)} />
        )}
      </FormField>
      <FormField id="contact-message" label="How can we help? *" error={errors.message}>
        {(a11y) => (
          <Textarea {...a11y} placeholder="Tell us what's on your mind…" maxLength={2000} value={values.message} onChange={(e) => set('message', e.target.value)} />
        )}
      </FormField>
      <ConsentField id="contact-consent" checked={values.consent} onChange={(v) => set('consent', v)} error={errors.consent}>
        I agree that Bloom may store these details and email me about my inquiry.
      </ConsentField>

      <Button type="submit" size="lg" className="justify-self-start" disabled={mutation.isPending}>
        {mutation.isPending ? (
          <>
            <Loader2 className="animate-spin" /> Sending…
          </>
        ) : (
          <>
            Send Message <ArrowUpRight />
          </>
        )}
      </Button>

      <div aria-live="polite" role="status">
        {mutation.isError && !Object.keys(errors).some((k) => errors[k]) && (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{mutation.error.message}</p>
        )}
        {sentTo && (
          <p className="flex gap-3 rounded-md border border-[#a9baa0] bg-[#dce5d4] px-4 py-3 text-sm">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-forest" />
            <span>
              Thank you, {sentTo}! Your message is with our team. A confirmation email is on its way —{' '}
              <a href="#automation" className="font-semibold underline underline-offset-4">
                follow it live below
              </a>
              .
            </span>
          </p>
        )}
      </div>
    </form>
  );
}
