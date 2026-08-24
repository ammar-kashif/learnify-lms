import { NextRequest, NextResponse } from 'next/server';

import { noStore, requireAdmin, serviceClient } from '@/lib/trial-booking-server';
import { buildSlotCancelledWhatsappMessage } from '@/lib/trial-booking';
import { whatsappLink } from '@/config/contact';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/trial-slots/[id]/cancel
 *
 * Admin/superadmin. Cancels a slot and every live booking on it.
 *
 * The response carries the affected guests with a prebuilt wa.me link each.
 * That list is not a nicety: this app has no email provider, so WhatsApp is
 * the only way anyone finds out their class was called off. Cancelling without
 * surfacing who to contact would strand people.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = serviceClient();
    const auth = await requireAdmin(request, supabase);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json().catch(() => ({}));
    const reason =
      typeof body?.reason === 'string' && body.reason.trim()
        ? body.reason.trim().slice(0, 500)
        : 'slot cancelled';

    // Read the slot before cancelling — afterwards we still need its time and
    // course title to compose the apology message.
    const { data: slot } = await supabase
      .from('trial_slots')
      .select('id, starts_at, courses ( title )')
      .eq('id', params.id)
      .maybeSingle();

    if (!slot) {
      return NextResponse.json({ error: 'Slot not found.' }, { status: 404 });
    }

    const { data, error } = await supabase.rpc('cancel_trial_slot', {
      p_slot_id: params.id,
      p_reason: reason,
    });

    if (error) {
      console.error('[admin/trial-slots/cancel] rpc failed:', error);
      return NextResponse.json(
        { error: 'Could not cancel the slot.' },
        { status: 500 }
      );
    }

    const result = data as {
      ok: boolean;
      reason?: string;
      affected?: Array<{
        guest_name: string;
        guest_email: string;
        guest_phone: string;
      }>;
    };

    if (!result?.ok) {
      return NextResponse.json(
        { error: 'Could not cancel the slot.', reason: result?.reason },
        { status: result?.reason === 'not_found' ? 404 : 400 }
      );
    }

    const courseTitle = (slot as any).courses?.title ?? 'your subject';

    const affected = (result.affected ?? []).map(guest => ({
      name: guest.guest_name,
      email: guest.guest_email,
      phone: guest.guest_phone,
      whatsappUrl: whatsappLink(
        buildSlotCancelledWhatsappMessage({
          name: guest.guest_name,
          courseTitle,
          startsAtIso: slot.starts_at,
        })
      ),
    }));

    return noStore(NextResponse.json({ success: true, affected }));
  } catch (error) {
    console.error('[admin/trial-slots/cancel] unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
