'use client';

import { useEffect, useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import { Calendar as CalendarIcon, Clock, Users } from 'lucide-react';

import {
  formatPkt,
  groupSlotsByPktDay,
  isBookable,
  type TrialSlotPublic,
} from '@/lib/trial-booking';

/**
 * The trial-slot calendar.
 *
 * Read-only by design — modelled on `student-live-class-calendar.tsx`, not the
 * editable teacher calendar (whose `statusFilter` is dead code: it calls
 * `setFilteredClasses(liveClasses)` unconditionally).
 *
 * On phones it opens in `listMonth` rather than a month grid. A 360px-wide
 * month cell cannot show "Physics 6:00 pm · 3 seats left" legibly, and this is
 * the top of the funnel — the list view keeps every slot readable without a tap.
 */

interface TrialSlotCalendarProps {
  slots: TrialSlotPublic[];
  loading?: boolean;
  onSelect: (slot: TrialSlotPublic) => void;
}

/** Seat scarcity colours. The orange primary is reserved for the action itself. */
function seatTone(slot: TrialSlotPublic): {
  bg: string;
  border: string;
  text: string;
} {
  if (slot.remainingSeats <= 0) {
    return { bg: '#9CA3AF', border: '#9CA3AF', text: '#FFFFFF' };
  }
  if (slot.remainingSeats <= 3) {
    return { bg: '#D97706', border: '#D97706', text: '#FFFFFF' };
  }
  return { bg: '#2563EB', border: '#2563EB', text: '#FFFFFF' };
}

function seatLabel(slot: TrialSlotPublic): string {
  if (slot.remainingSeats <= 0) return 'Full';
  if (slot.remainingSeats === 1) return '1 seat left';
  if (slot.remainingSeats <= 3) return `Only ${slot.remainingSeats} seats left`;
  return `${slot.remainingSeats} seats left`;
}

export default function TrialSlotCalendar({
  slots,
  loading = false,
  onSelect,
}: TrialSlotCalendarProps) {
  const [isSmall, setIsSmall] = useState(false);

  // Decide the initial view from the viewport. Read once on mount rather than
  // on every resize — FullCalendar re-initialises when initialView changes,
  // which would throw away the user's navigation mid-browse.
  useEffect(() => {
    setIsSmall(window.matchMedia('(max-width: 640px)').matches);
  }, []);

  const events = useMemo(
    () =>
      slots.map(slot => {
        const tone = seatTone(slot);
        const bookable = isBookable(slot);
        return {
          id: slot.id,
          title: `${slot.subject} · ${seatLabel(slot)}`,
          start: slot.startsAt,
          end: new Date(
            new Date(slot.startsAt).getTime() + slot.durationMinutes * 60_000
          ).toISOString(),
          backgroundColor: tone.bg,
          borderColor: tone.border,
          textColor: tone.text,
          classNames: bookable ? ['cursor-pointer'] : ['cursor-not-allowed', 'opacity-70'],
          extendedProps: { slot, bookable },
        };
      }),
    [slots]
  );

  const upcoming = useMemo(() => groupSlotsByPktDay(slots).slice(0, 3), [slots]);

  return (
    <div className="space-y-5">
      {/* Times are always Pakistan time, whatever the visitor's device says. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Clock className="h-4 w-4 text-primary" aria-hidden="true" />
          All times shown in Pakistan Standard Time (PKT)
        </p>
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#2563EB]" aria-hidden="true" />
            Seats available
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#D97706]" aria-hidden="true" />
            Filling up
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#9CA3AF]" aria-hidden="true" />
            Full
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900 sm:p-4">
        {loading ? (
          <div className="flex h-64 items-center justify-center text-sm text-gray-500">
            Loading available slots…
          </div>
        ) : (
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin]}
            initialView={isSmall ? 'listMonth' : 'dayGridMonth'}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: isSmall ? 'listMonth,timeGridDay' : 'dayGridMonth,timeGridWeek,listMonth',
            }}
            events={events}
            eventClick={info => {
              const { slot, bookable } = info.event.extendedProps as {
                slot: TrialSlotPublic;
                bookable: boolean;
              };
              if (!bookable) return; // full or past — nothing to book
              onSelect(slot);
            }}
            height="auto"
            eventDisplay="block"
            dayMaxEvents={3}
            moreLinkClick="popover"
            nowIndicator
            selectable={false}
            editable={false}
            eventTimeFormat={{ hour: 'numeric', minute: '2-digit', hour12: true }}
            slotLabelFormat={{ hour: 'numeric', minute: '2-digit', hour12: true }}
            noEventsText="No trial classes scheduled for this month"
          />
        )}
      </div>

      {/* A plain list of the next few days, so the soonest options are visible
          without navigating the grid at all. */}
      {!loading && upcoming.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Next available
          </h3>
          {upcoming.map(day => (
            <div key={day.dayKey}>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {day.label}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {day.slots.map(slot => {
                  const bookable = isBookable(slot);
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => bookable && onSelect(slot)}
                      disabled={!bookable}
                      aria-disabled={!bookable}
                      aria-label={`${formatPkt(slot.startsAt, 'time')} — ${seatLabel(slot)}`}
                      className={`rounded-xl border p-3 text-left transition-colors ${
                        bookable
                          ? 'border-gray-200 bg-white hover:border-primary hover:bg-primary/5 dark:border-gray-700 dark:bg-gray-900'
                          : 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-60 dark:border-gray-800 dark:bg-gray-900/50'
                      }`}
                    >
                      <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {formatPkt(slot.startsAt, 'time')}
                      </span>
                      <span
                        className={`mt-1 flex items-center gap-1 text-xs ${
                          slot.remainingSeats <= 0
                            ? 'text-gray-500'
                            : slot.remainingSeats <= 3
                              ? 'text-amber-600 dark:text-amber-500'
                              : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        <Users className="h-3 w-3" aria-hidden="true" />
                        {seatLabel(slot)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && slots.length === 0 && (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-gray-300 px-6 py-10 text-center dark:border-gray-700">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <CalendarIcon className="h-6 w-6 text-primary" aria-hidden="true" />
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            No trial classes scheduled for this subject yet
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Message us on WhatsApp and we&apos;ll arrange a time that suits you.
          </p>
        </div>
      )}
    </div>
  );
}
