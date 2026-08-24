'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  CalendarClock,
  Download,
  Loader2,
  MessageCircle,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import TrialSlotForm from '@/components/trial/trial-slot-form';
import {
  formatPktWithZone,
  type TrialBookingAdmin,
  type TrialSlotAdmin,
} from '@/lib/trial-booking';

/**
 * Admin console for free-trial slots and their bookings.
 *
 * The bookings table carries full contact details on purpose: this app has no
 * email provider, so staff confirm every booking by hand over WhatsApp. That is
 * also why cancelling a slot surfaces a per-guest message link rather than just
 * succeeding quietly.
 */
export default function TrialSlotManager() {
  const { session } = useAuth();

  const [slots, setSlots] = useState<TrialSlotAdmin[]>([]);
  const [bookings, setBookings] = useState<TrialBookingAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TrialSlotAdmin | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notify, setNotify] = useState<
    Array<{ name: string; phone: string; whatsappUrl: string }>
  >([]);

  const load = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${session.access_token}` };
      const [slotRes, bookingRes] = await Promise.all([
        fetch('/api/admin/trial-slots', { headers }),
        fetch('/api/admin/trial-bookings', { headers }),
      ]);
      const slotData = await slotRes.json();
      const bookingData = await bookingRes.json();
      setSlots(slotRes.ok ? (slotData.slots ?? []) : []);
      setBookings(bookingRes.ok ? (bookingData.bookings ?? []) : []);
      if (!slotRes.ok) toast.error(slotData?.error ?? 'Could not load slots.');
    } catch {
      toast.error('Could not load trial slots.');
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDelete = async (slot: TrialSlotAdmin) => {
    if (!session?.access_token) return;
    setBusyId(slot.id);
    try {
      const response = await fetch(`/api/admin/trial-slots/${slot.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data?.error ?? 'Could not delete the slot.');
        return;
      }
      toast.success('Slot deleted.');
      void load();
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async (slot: TrialSlotAdmin) => {
    if (!session?.access_token) return;
    setBusyId(slot.id);
    try {
      const response = await fetch(`/api/admin/trial-slots/${slot.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ reason: 'cancelled by admin' }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data?.error ?? 'Could not cancel the slot.');
        return;
      }
      setNotify(data.affected ?? []);
      toast.success(
        data.affected?.length
          ? `Slot cancelled — ${data.affected.length} guest(s) need telling.`
          : 'Slot cancelled.'
      );
      void load();
    } finally {
      setBusyId(null);
    }
  };

  const exportCsv = () => {
    const header = [
      'Reference',
      'Name',
      'Email',
      'Phone',
      'Subject',
      'Class time (PKT)',
      'Status',
      'Source',
      'Booked at',
    ];
    const rows = bookings.map(b => [
      b.reference,
      b.guestName,
      b.guestEmail,
      b.guestPhone,
      b.courseTitle,
      formatPktWithZone(b.startsAt),
      b.status,
      b.source,
      new Date(b.createdAt).toISOString(),
    ]);
    const csv = [header, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'learnify-trial-bookings.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const upcoming = slots.filter(
    s => s.status !== 'cancelled' && new Date(s.startsAt).getTime() > Date.now()
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Free trial slots
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Times students can book a free trial class. All times in PKT.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw
              className={`mr-1.5 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Add slots
          </Button>
        </div>
      </div>

      {/* After cancelling, this is how the affected guests actually find out. */}
      {notify.length > 0 && (
        <Card className="border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-amber-900 dark:text-amber-200">
              Tell these {notify.length} student(s) their class was cancelled
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {notify.map(guest => (
              <div
                key={guest.phone}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white p-3 dark:bg-gray-900"
              >
                <span className="text-sm text-gray-900 dark:text-gray-100">
                  {guest.name} · {guest.phone}
                </span>
                <a
                  href={guest.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1ebe5b]"
                >
                  <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  Message
                </a>
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setNotify([])}>
              Done
            </Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center text-sm text-gray-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          Loading…
        </div>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Upcoming slots ({upcoming.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcoming.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500">
                  No upcoming slots. Add some so students can book a trial class.
                </p>
              ) : (
                <div className="space-y-2">
                  {upcoming.map(slot => (
                    <div
                      key={slot.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-800"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-900 dark:text-gray-100">
                          {slot.courseTitle}
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                            {formatPktWithZone(slot.startsAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" aria-hidden="true" />
                            {slot.bookedCount} / {slot.capacity} booked
                          </span>
                          {slot.status === 'draft' && (
                            <Badge variant="outline" className="text-[10px]">
                              Draft
                            </Badge>
                          )}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label="Edit slot"
                          onClick={() => {
                            setEditing(slot);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        {slot.bookedCount > 0 ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-amber-600"
                            disabled={busyId === slot.id}
                            onClick={() => void handleCancel(slot)}
                          >
                            Cancel
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label="Delete slot"
                            className="text-red-600"
                            disabled={busyId === slot.id}
                            onClick={() => void handleDelete(slot)}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">
                Bookings ({bookings.length})
              </CardTitle>
              {bookings.length > 0 && (
                <Button variant="outline" size="sm" onClick={exportCsv}>
                  <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  Export CSV
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {bookings.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500">
                  No trial bookings yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800">
                        <th className="py-2 pr-4 font-medium">Student</th>
                        <th className="py-2 pr-4 font-medium">Contact</th>
                        <th className="py-2 pr-4 font-medium">Class</th>
                        <th className="py-2 pr-4 font-medium">Status</th>
                        <th className="py-2 font-medium">Ref</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map(booking => (
                        <tr
                          key={booking.id}
                          className="border-b border-gray-100 dark:border-gray-800/60"
                        >
                          <td className="py-2.5 pr-4 font-medium text-gray-900 dark:text-gray-100">
                            {booking.guestName}
                          </td>
                          <td className="py-2.5 pr-4 text-gray-600 dark:text-gray-400">
                            <div className="flex flex-col">
                              <span>{booking.guestEmail}</span>
                              <span className="text-xs">{booking.guestPhone}</span>
                            </div>
                          </td>
                          <td className="py-2.5 pr-4 text-gray-600 dark:text-gray-400">
                            <div className="flex flex-col">
                              <span>{booking.courseTitle}</span>
                              <span className="text-xs">
                                {formatPktWithZone(booking.startsAt)}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 pr-4">
                            <Badge
                              variant={
                                booking.status === 'booked' ? 'default' : 'secondary'
                              }
                              className="text-[10px]"
                            >
                              {booking.status}
                            </Badge>
                          </td>
                          <td className="py-2.5 font-mono text-xs text-gray-500">
                            {booking.reference}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <TrialSlotForm
        open={formOpen}
        onOpenChange={setFormOpen}
        slot={editing}
        onSuccess={() => void load()}
      />
    </div>
  );
}
