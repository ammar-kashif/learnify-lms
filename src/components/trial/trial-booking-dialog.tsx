'use client';

import { useEffect, useState } from 'react';
import { CalendarClock, Loader2, Users } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import WhatsAppHelpNote from '@/components/trial/whatsapp-help-note';
import {
  formatPktWithZone,
  normalisePkPhone,
  type TrialSlotPublic,
} from '@/lib/trial-booking';

export interface BookingResult {
  booking: {
    id: string;
    reference: string;
    cancelToken: string;
    guestName: string;
  };
  slot: {
    id: string;
    startsAt: string;
    durationMinutes: number;
    remainingSeats: number;
  };
  courseTitle: string;
  whatsappMessage: string;
  manageUrl: string;
}

interface TrialBookingDialogProps {
  slot: TrialSlotPublic | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source?: string;
  onBooked: (result: BookingResult) => void;
  /** Called when the slot filled up under us, so the parent can refetch. */
  onSlotUnavailable?: () => void;
}

export default function TrialBookingDialog({
  slot,
  open,
  onOpenChange,
  source = 'web',
  onBooked,
  onSlotUnavailable,
}: TrialBookingDialogProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset only the error when reopening; keep the contact details so someone
  // whose slot filled up does not have to retype everything.
  useEffect(() => {
    if (open) setError(null);
  }, [open, slot?.id]);

  const normalisedPhone = phone ? normalisePkPhone(phone) : null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!slot || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/trial-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId: slot.id,
          name,
          email,
          phone,
          source,
          website,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error ?? 'Something went wrong. Please try again.');
        // The slot is gone or full — let the parent refresh the calendar so the
        // visitor is not staring at a time they can no longer have.
        if (['full', 'closed', 'too_late', 'not_found'].includes(data?.reason)) {
          onSlotUnavailable?.();
        }
        return;
      }

      // Durable receipt: this stands in for the confirmation email the app has
      // no way to send, and lets us recognise our own double-submit later.
      try {
        window.localStorage.setItem(
          'learnify-trial-booking',
          JSON.stringify({
            token: data.booking.cancelToken,
            slotId: slot.id,
            courseTitle: data.courseTitle,
            startsAt: data.slot.startsAt,
          })
        );
      } catch {
        // Private browsing or a full quota — not worth failing the booking over.
      }

      onBooked(data as BookingResult);
    } catch {
      setError('We could not reach the server. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Book your free trial class</DialogTitle>
          <DialogDescription>
            No account and no payment needed — just your details so we can
            confirm your seat.
          </DialogDescription>
        </DialogHeader>

        {slot && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="font-semibold text-gray-900 dark:text-gray-100">
              {slot.courseTitle}
            </p>
            <p className="mt-2 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <CalendarClock className="h-4 w-4 text-primary" aria-hidden="true" />
              {formatPktWithZone(slot.startsAt)} · {slot.durationMinutes} min
            </p>
            <p className="mt-1 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Users className="h-4 w-4" aria-hidden="true" />
              {slot.remainingSeats} of {slot.capacity} seats left
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="trial-name">Full name</Label>
            <Input
              id="trial-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ayesha Khan"
              autoComplete="name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="trial-email">Email</Label>
            <Input
              id="trial-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="trial-phone">WhatsApp number</Label>
            <Input
              id="trial-phone"
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="0300 1234567"
              autoComplete="tel"
              required
              aria-describedby="trial-phone-hint"
            />
            <p
              id="trial-phone-hint"
              className="text-xs text-muted-foreground"
            >
              {normalisedPhone
                ? `We'll message you on ${normalisedPhone}`
                : 'This is how we confirm your class — a Pakistani number like 0300 1234567.'}
            </p>
          </div>

          {/* Honeypot. Hidden from people, irresistible to bots. Not
              `display:none` — some bots skip those; this is off-screen but
              still "visible" to a naive form filler. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-[-9999px] h-0 w-0 overflow-hidden"
          >
            <label htmlFor="website">Website</label>
            <input
              id="website"
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={e => setWebsite(e.target.value)}
            />
          </div>

          {error && (
            <div className="space-y-3">
              <p
                role="alert"
                className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400"
              >
                {error}
              </p>
              <WhatsAppHelpNote slot={slot} tone="inline" />
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Booking your seat…
                </>
              ) : (
                'Confirm booking'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Back
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
