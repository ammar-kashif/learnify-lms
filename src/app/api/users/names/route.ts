import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ids = searchParams.get('ids');

    if (!ids) {
      return NextResponse.json({ error: 'User IDs are required' }, { status: 400 });
    }

    const userIds = ids.split(',').filter(Boolean);

    if (userIds.length === 0) {
      return NextResponse.json({ users: [] });
    }

    console.log('🔍 Fetching names for user IDs:', userIds);

    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email')
      .in('id', userIds);

    if (error) {
      console.error('❌ Error fetching user names:', error);
      return NextResponse.json({ error: 'Failed to fetch user names' }, { status: 500 });
    }

    console.log('✅ User names fetched:', users?.length || 0);

    return NextResponse.json({ users: users || [] });

  } catch (error) {
    console.error('💥 Error in user names API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
