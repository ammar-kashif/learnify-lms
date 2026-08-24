'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarClock, GraduationCap, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { subjectIcon } from '@/lib/course-taxonomy';
import { formatPkt, type TrialSlotPublic } from '@/lib/trial-booking';
import WhatsAppHelpNote from '@/components/trial/whatsapp-help-note';
import TrialBookingDialog, {
  type BookingResult,
} from '@/components/trial/trial-booking-dialog';
import TrialBookingConfirmation from '@/components/trial/trial-booking-confirmation';

/**
 * FullCalendar pulls in five packages. This page is the top of the funnel on
 * mobile, so the calendar is loaded on demand rather than blocking first paint.
 */
const TrialSlotCalendar = dynamic(
  () => import('@/components/trial/trial-slot-calendar'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-gray-200 text-sm text-gray-500 dark:border-gray-800">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
        Loading calendar…
      </div>
    ),
  }
);

interface SubjectOption {
  courseId: string;
  courseTitle: string;
  subject: string;
  board: string | null;
  openSlotCount: number;
  totalSeatsLeft: number;
  nextSlotAt: string | null;
}

interface LevelOption {
  level: string;
  boards: string[];
  subjects: SubjectOption[];
}

interface TrialBookingFlowProps {
  initialCourseId?: string;
  source?: string;
}

type Step = 'level' | 'subject' | 'slot' | 'done';

export default function TrialBookingFlow({
  initialCourseId,
  source = 'web',
}: TrialBookingFlowProps) {
  const [levels, setLevels] = useState<LevelOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  const [level, setLevel] = useState<string | null>(null);
  const [board, setBoard] = useState<string | null>(null);
  const [course, setCourse] = useState<SubjectOption | null>(null);

  const [slots, setSlots] = useState<TrialSlotPublic[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TrialSlotPublic | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [result, setResult] = useState<BookingResult | null>(null);

  // ------------------------------------------------------------ load options
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/trial-slots/options');
        const data = await response.json();
        if (cancelled) return;
        if (!response.ok) throw new Error(data?.error ?? 'Failed to load');
        setLevels(data.levels ?? []);
      } catch {
        if (!cancelled) setOptionsError('We could not load the available classes.');
      } finally {
        if (!cancelled) setOptionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Deep link from a course card: jump straight past level and subject.
  useEffect(() => {
    if (!initialCourseId || !levels.length || course) return;
    for (const lvl of levels) {
      const match = lvl.subjects.find(s => s.courseId === initialCourseId);
      if (match) {
        setLevel(lvl.level);
        setBoard(match.board);
        setCourse(match);
        return;
      }
    }
  }, [initialCourseId, levels, course]);

  // Only one level on offer? Don't make anyone click a list of one.
  useEffect(() => {
    if (!level && !course && levels.length === 1) setLevel(levels[0].level);
  }, [levels, level, course]);

  const activeLevel = useMemo(
    () => levels.find(l => l.level === level) ?? null,
    [levels, level]
  );

  // A board picker only earns its place when there is a real choice to make.
  const showBoardPicker = (activeLevel?.boards.length ?? 0) > 1;

  const visibleSubjects = useMemo(() => {
    if (!activeLevel) return [];
    if (!showBoardPicker || !board) return activeLevel.subjects;
    return activeLevel.subjects.filter(s => s.board === board);
  }, [activeLevel, board, showBoardPicker]);

  // -------------------------------------------------------------- load slots
  const loadSlots = useCallback(async () => {
    if (!course) return;
    setSlotsLoading(true);
    try {
      const response = await fetch(
        `/api/trial-slots?course_id=${encodeURIComponent(course.courseId)}`
      );
      const data = await response.json();
      setSlots(response.ok ? (data.slots ?? []) : []);
    } catch {
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [course]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  // Seats go stale in an open tab. Refresh on a timer and whenever the visitor
  // comes back to the tab, so nobody picks a slot that filled ten minutes ago.
  useEffect(() => {
    if (!course || result) return;
    const timer = window.setInterval(() => void loadSlots(), 45_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void loadSlots();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [course, result, loadSlots]);

  const step: Step = result
    ? 'done'
    : course
      ? 'slot'
      : level
        ? 'subject'
        : 'level';

  if (step === 'done' && result) {
    return <TrialBookingConfirmation result={result} />;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Stepper step={step} />

      {optionsLoading ? (
        <div className="flex h-48 items-center justify-center text-sm text-gray-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          Loading available classes…
        </div>
      ) : optionsError ? (
        <div className="space-y-4">
          <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
            {optionsError}
          </p>
          <WhatsAppHelpNote />
        </div>
      ) : levels.length === 0 ? (
        <div className="space-y-4 text-center">
          <div className="rounded-2xl border border-dashed border-gray-300 px-6 py-10 dark:border-gray-700">
            <CalendarClock className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
            <p className="mt-3 font-medium text-gray-900 dark:text-white">
              No trial classes are scheduled right now
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Message us on WhatsApp and we&apos;ll arrange one for you.
            </p>
          </div>
          <WhatsAppHelpNote />
        </div>
      ) : (
        <>
          {/* ---------------------------------------------------- step 1 */}
          {step === 'level' && (
            <section aria-labelledby="step-level">
              <h2 id="step-level" className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                Which qualification are you studying?
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {levels.map(option => (
                  <button
                    key={option.level}
                    type="button"
                    onClick={() => {
                      setLevel(option.level);
                      setBoard(null);
                    }}
                    className="group rounded-2xl border border-gray-200 bg-white p-6 text-left transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-lg dark:border-gray-800 dark:bg-gray-900"
                  >
                    <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-transform group-hover:scale-110">
                      <GraduationCap className="h-6 w-6 text-primary" aria-hidden="true" />
                    </div>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {option.level}
                    </p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {option.subjects.length} subject
                      {option.subjects.length === 1 ? '' : 's'} available
                    </p>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* ---------------------------------------------------- step 2 */}
          {step === 'subject' && activeLevel && (
            <section aria-labelledby="step-subject">
              <BackButton onClick={() => setLevel(null)} label="Change qualification" />
              <h2 id="step-subject" className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                Which subject would you like to try?
              </h2>

              {showBoardPicker && (
                <div
                  role="tablist"
                  aria-label="Filter by exam board"
                  className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0"
                >
                  {[null, ...activeLevel.boards].map(option => {
                    const isActive = board === option;
                    return (
                      <button
                        key={option ?? 'all'}
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => setBoard(option)}
                        className={`flex-shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                          isActive
                            ? 'border-primary bg-primary text-white shadow-sm'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-primary/40 hover:text-primary dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'
                        }`}
                      >
                        {option ?? 'All boards'}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visibleSubjects.map(option => {
                  const Icon = subjectIcon(option.subject);
                  return (
                    <button
                      key={option.courseId}
                      type="button"
                      onClick={() => setCourse(option)}
                      className="group rounded-2xl border border-gray-200 bg-white p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-lg dark:border-gray-800 dark:bg-gray-900"
                    >
                      <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 transition-transform group-hover:scale-110">
                        <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                      </div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {option.subject}
                      </p>
                      {option.board && (
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                          {option.board}
                        </p>
                      )}
                      {option.nextSlotAt && (
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          Next: {formatPkt(option.nextSlotAt, 'full')}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* ---------------------------------------------------- step 3 */}
          {step === 'slot' && course && (
            <section aria-labelledby="step-slot">
              <BackButton
                onClick={() => {
                  setCourse(null);
                  setSlots([]);
                }}
                label="Change subject"
              />
              <h2 id="step-slot" className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">
                Pick a time for your {course.subject} trial class
              </h2>
              <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
                {course.courseTitle}
              </p>

              <TrialSlotCalendar
                slots={slots}
                loading={slotsLoading}
                onSelect={slot => {
                  setSelectedSlot(slot);
                  setDialogOpen(true);
                }}
              />
            </section>
          )}
        </>
      )}

      <WhatsAppHelpNote slot={selectedSlot} />

      <TrialBookingDialog
        slot={selectedSlot}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        source={source}
        onBooked={booking => {
          setDialogOpen(false);
          setResult(booking);
        }}
        onSlotUnavailable={() => void loadSlots()}
      />
    </div>
  );
}

function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="mb-3 -ml-2 text-gray-600 dark:text-gray-400"
    >
      <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
      {label}
    </Button>
  );
}

function Stepper({ step }: { step: Step }) {
  const steps: Array<{ key: Step; label: string }> = [
    { key: 'level', label: 'Qualification' },
    { key: 'subject', label: 'Subject' },
    { key: 'slot', label: 'Time' },
  ];
  const activeIndex = steps.findIndex(s => s.key === step);

  return (
    <ol className="flex items-center gap-2 text-xs font-medium" aria-label="Booking progress">
      {steps.map((s, index) => {
        const state =
          index < activeIndex ? 'done' : index === activeIndex ? 'current' : 'todo';
        return (
          <li key={s.key} className="flex flex-1 items-center gap-2">
            <span
              aria-current={state === 'current' ? 'step' : undefined}
              className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[11px] ${
                state === 'todo'
                  ? 'bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                  : 'bg-primary text-white'
              }`}
            >
              {index + 1}
            </span>
            <span
              className={`hidden sm:inline ${
                state === 'todo'
                  ? 'text-gray-400 dark:text-gray-500'
                  : 'text-gray-900 dark:text-gray-100'
              }`}
            >
              {s.label}
            </span>
            {index < steps.length - 1 && (
              <span
                aria-hidden="true"
                className={`h-px flex-1 ${
                  index < activeIndex ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-800'
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
