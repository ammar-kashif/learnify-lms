'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

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
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/auth-context';
import { formatPktWithZone, type TrialSlotAdmin } from '@/lib/trial-booking';

/**
 * Create or edit trial slots.
 *
 * Creating supports several dates at once — a week of availability should be
 * one submit, not seven forms, or ops will not keep the calendar current.
 */

interface CourseOption {
  id: string;
  title: string;
}

interface TrialSlotFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot?: TrialSlotAdmin | null;
  onSuccess?: () => void;
}

/** `datetime-local` wants a local-clock string, not an ISO instant. */
function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function TrialSlotForm({
  open,
  onOpenChange,
  slot,
  onSuccess,
}: TrialSlotFormProps) {
  const { session } = useAuth();
  const isEdit = !!slot;

  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [courseId, setCourseId] = useState('');
  const [dates, setDates] = useState<string[]>(['']);
  const [capacity, setCapacity] = useState(10);
  const [duration, setDuration] = useState(60);
  const [meetingLink, setMeetingLink] = useState('');
  const [description, setDescription] = useState('');
  const [publish, setPublish] = useState(true);
  const [repeatWeeks, setRepeatWeeks] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const response = await fetch('/api/courses/all');
        const data = await response.json();
        setCourses(data.courses ?? []);
      } catch {
        setCourses([]);
      }
    })();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (slot) {
      setCourseId(slot.courseId);
      setDates([toLocalInputValue(slot.startsAt)]);
      setCapacity(slot.capacity);
      setDuration(slot.durationMinutes);
      setMeetingLink(slot.meetingLink ?? '');
      setDescription(slot.description ?? '');
      setPublish(slot.status === 'open');
      setRepeatWeeks(1);
    } else {
      setCourseId('');
      setDates(['']);
      setCapacity(10);
      setDuration(60);
      setMeetingLink('');
      setDescription('');
      setPublish(true);
      setRepeatWeeks(1);
    }
  }, [open, slot]);

  /**
   * Expands the entered dates by the repeat count. `datetime-local` is read in
   * the admin's own browser timezone, so the preview below shows what will
   * actually be saved in PKT — a VA working abroad would otherwise shift every
   * slot by their offset without noticing.
   */
  const expandedDates = useMemo(() => {
    const out: string[] = [];
    for (const value of dates) {
      if (!value) continue;
      const base = new Date(value);
      if (Number.isNaN(base.getTime())) continue;
      for (let week = 0; week < Math.max(repeatWeeks, 1); week += 1) {
        const when = new Date(base.getTime());
        when.setDate(when.getDate() + week * 7);
        out.push(when.toISOString());
      }
    }
    return out;
  }, [dates, repeatWeeks]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session?.access_token || saving) return;

    if (!courseId) {
      toast.error('Pick a course for this slot.');
      return;
    }
    if (expandedDates.length === 0) {
      toast.error('Add at least one date and time.');
      return;
    }

    setSaving(true);
    try {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      };

      if (isEdit && slot) {
        const response = await fetch(`/api/admin/trial-slots/${slot.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            starts_at: expandedDates[0],
            capacity,
            duration_minutes: duration,
            meeting_link: meetingLink,
            description,
            status: publish ? 'open' : 'draft',
          }),
        });
        const data = await response.json();
        if (!response.ok) {
          toast.error(data?.error ?? 'Could not update the slot.');
          return;
        }
        toast.success('Slot updated.');
      } else {
        const response = await fetch('/api/admin/trial-slots', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            course_id: courseId,
            starts_at: expandedDates,
            capacity,
            duration_minutes: duration,
            meeting_link: meetingLink,
            description,
            status: publish ? 'open' : 'draft',
          }),
        });
        const data = await response.json();
        if (!response.ok && !data?.created?.length) {
          toast.error(data?.error ?? 'Could not create the slots.');
          return;
        }
        const created = data.created?.length ?? 0;
        const skipped = data.skipped?.length ?? 0;
        toast.success(
          `${created} slot${created === 1 ? '' : 's'} created` +
            (skipped ? ` · ${skipped} skipped (already exists)` : '')
        );
      }

      onSuccess?.();
      onOpenChange(false);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit trial slot' : 'Add trial slots'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update this slot. Capacity cannot drop below the seats already booked.'
              : 'Add one or more times students can book a free trial class.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="slot-course">Course *</Label>
            <select
              id="slot-course"
              value={courseId}
              onChange={e => setCourseId(e.target.value)}
              disabled={isEdit}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Select a course…</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Date &amp; time *</Label>
            {dates.map((value, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  type="datetime-local"
                  value={value}
                  onChange={e => {
                    const next = [...dates];
                    next[index] = e.target.value;
                    setDates(next);
                  }}
                  required={index === 0}
                />
                {dates.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remove this date"
                    onClick={() => setDates(dates.filter((_, i) => i !== index))}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </Button>
                )}
              </div>
            ))}
            {!isEdit && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDates([...dates, ''])}
              >
                <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Add another time
              </Button>
            )}
          </div>

          {!isEdit && (
            <div className="space-y-2">
              <Label htmlFor="slot-repeat">Repeat weekly</Label>
              <Input
                id="slot-repeat"
                type="number"
                min={1}
                max={12}
                value={repeatWeeks}
                onChange={e => setRepeatWeeks(Number(e.target.value) || 1)}
              />
              <p className="text-xs text-muted-foreground">
                Repeats each time above for this many weeks.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="slot-capacity">Seats *</Label>
              <Input
                id="slot-capacity"
                type="number"
                min={1}
                max={200}
                value={capacity}
                onChange={e => setCapacity(Number(e.target.value) || 1)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slot-duration">Duration (min)</Label>
              <Input
                id="slot-duration"
                type="number"
                min={15}
                max={240}
                value={duration}
                onChange={e => setDuration(Number(e.target.value) || 60)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="slot-link">Meeting link</Label>
            <Input
              id="slot-link"
              value={meetingLink}
              onChange={e => setMeetingLink(e.target.value)}
              placeholder="https://meet.google.com/…"
            />
            <p className="text-xs text-muted-foreground">
              Only shown to people who have booked this slot.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="slot-description">Note for students</Label>
            <Textarea
              id="slot-description"
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional — e.g. bring a notebook"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              id="slot-publish"
              type="checkbox"
              checked={publish}
              onChange={e => setPublish(e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="slot-publish" className="cursor-pointer font-normal">
              Publish immediately (visible on the booking page)
            </Label>
          </div>

          {/* What actually gets saved, in Pakistan time. */}
          {expandedDates.length > 0 && (
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Saves {expandedDates.length} slot
                {expandedDates.length === 1 ? '' : 's'}:
              </p>
              <ul className="mt-1.5 space-y-0.5 text-xs text-gray-600 dark:text-gray-400">
                {expandedDates.slice(0, 6).map(iso => (
                  <li key={iso}>{formatPktWithZone(iso)}</li>
                ))}
                {expandedDates.length > 6 && (
                  <li>…and {expandedDates.length - 6} more</li>
                )}
              </ul>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Saving…
                </>
              ) : isEdit ? (
                'Save changes'
              ) : (
                'Create slots'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
