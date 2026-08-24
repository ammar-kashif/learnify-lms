import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import {
  bookingReference,
  type TrialBookingAdmin,
  type TrialSlotAdmin,
  type TrialSlotPublic,
} from '@/lib/trial-booking';

/**
 * Server-only helpers for the trial-booking routes.
 *
 * Kept apart from `src/lib/trial-booking.ts` so the service-role key and the
 * `next/server` imports never end up in the client bundle — that module is
 * imported by browser components.
 */

/** Service-role client. Bypasses RLS, so every route must authorise itself. */
export function serviceClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export type AdminRole = 'admin' | 'superadmin';

/**
 * Verifies the caller is an admin or superadmin.
 *
 * Returns a `NextResponse` on failure so callers can `if (result instanceof
 * NextResponse) return result;` — the same shape the rest of the codebase uses,
 * without copy-pasting the twelve-line guard into every route.
 */
export async function requireAdmin(
  request: NextRequest,
  supabase: SupabaseClient
): Promise<{ userId: string; role: AdminRole } | NextResponse> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.split(' ')[1];
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'admin' && profile.role !== 'superadmin')) {
    return NextResponse.json(
      { error: 'Forbidden — admin access required' },
      { status: 403 }
    );
  }

  return { userId: user.id, role: profile.role as AdminRole };
}

/**
 * Resolves an optional Bearer token to a user id, without requiring one.
 * Booking is open to guests; if a signed-in student books, we link the row.
 */
export async function optionalUserId(
  request: NextRequest,
  supabase: SupabaseClient
): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser(authHeader.split(' ')[1]);
    return user?.id ?? null;
  } catch {
    return null;
  }
}

/** Nothing about slot availability may be cached. */
export function noStore(response: NextResponse): NextResponse {
  response.headers.set(
    'Cache-Control',
    'no-store, no-cache, must-revalidate, max-age=0'
  );
  return response;
}

// ------------------------------------------------------------------ shapes

/** The columns every slot query needs, including the joined course taxonomy. */
export const SLOT_SELECT = `
  id, course_id, teacher_id, starts_at, duration_minutes, capacity,
  booked_count, meeting_link, description, status, created_at,
  courses!inner ( id, title, level, board, subject, is_published )
`;

type SlotRow = Record<string, any>;

/**
 * Maps a slot row to its public shape.
 *
 * `meeting_link` is deliberately dropped here — it is the join link for a class
 * the caller has not yet booked, and it must never appear in a public response.
 */
export function toPublicSlot(row: SlotRow): TrialSlotPublic {
  const course = row.courses ?? {};
  return {
    id: row.id,
    courseId: row.course_id,
    courseTitle: course.title ?? '',
    level: course.level ?? '',
    board: course.board ?? null,
    subject: course.subject ?? course.title ?? '',
    startsAt: row.starts_at,
    durationMinutes: row.duration_minutes,
    capacity: row.capacity,
    remainingSeats: Math.max((row.capacity ?? 0) - (row.booked_count ?? 0), 0),
    description: row.description ?? null,
  };
}

export function toAdminSlot(
  row: SlotRow,
  teacherName: string | null = null
): TrialSlotAdmin {
  return {
    ...toPublicSlot(row),
    status: row.status,
    bookedCount: row.booked_count ?? 0,
    meetingLink: row.meeting_link ?? null,
    teacherId: row.teacher_id ?? null,
    teacherName,
    createdAt: row.created_at,
  };
}

export function toAdminBooking(
  row: SlotRow,
  courseTitle: string,
  startsAt: string
): TrialBookingAdmin {
  return {
    id: row.id,
    reference: bookingReference(row.id),
    status: row.status,
    guestName: row.guest_name,
    createdAt: row.created_at,
    slotId: row.slot_id,
    courseId: row.course_id,
    courseTitle,
    startsAt,
    guestEmail: row.guest_email,
    guestPhone: row.guest_phone,
    userId: row.user_id ?? null,
    convertedAt: row.converted_at ?? null,
    source: row.source ?? 'web',
    notes: row.notes ?? null,
  };
}
