import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { autoRefreshToken: false, persistSession: false }
  }
);

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Chapters API called');
    const { courseId } = await request.json();
    console.log('📚 Course ID:', courseId);
    if (!courseId) {
      return NextResponse.json({ error: 'Missing courseId' }, { status: 400 });
    }

    // Read bearer
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    console.log('🔑 Auth header present:', !!authHeader);
    const bearer = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.replace('Bearer ', '').trim()
      : null;
    if (!bearer) {
      console.log('❌ No bearer token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from token
    const authClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: userRes, error: userErr } = await authClient.auth.getUser(bearer);
    if (userErr || !userRes?.user) {
      console.log('❌ Invalid token:', userErr?.message);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    const userId = userRes.user.id;
    console.log('👤 User ID:', userId);

    // Fetch role
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();
    if (profileErr) {
      console.log('❌ Role fetch error:', profileErr.message);
      return NextResponse.json({ error: 'Failed to resolve role' }, { status: 403 });
    }
    const role = profile?.role as string | null;
    console.log('🎭 User role:', role);

    let allowed = false;
    if (role === 'superadmin' || role === 'admin') {
      allowed = true;
      console.log('✅ Admin access granted');
    } else if (role === 'teacher') {
      const { data: tc } = await supabaseAdmin
        .from('teacher_courses')
        .select('teacher_id')
        .eq('teacher_id', userId)
        .eq('course_id', courseId)
        .maybeSingle();
      allowed = !!tc;
      console.log('👨‍🏫 Teacher assignment check:', { found: !!tc, allowed });
    } else if (role === 'student') {
      const { data: se } = await supabaseAdmin
        .from('student_enrollments')
        .select('student_id')
        .eq('student_id', userId)
        .eq('course_id', courseId)
        .maybeSingle();
      allowed = !!se;
      console.log('🎓 Student enrollment check:', { found: !!se, allowed });
    }

    if (!allowed) {
      console.log('❌ Access denied');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Use regular client to respect RLS policies
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${bearer}`
          }
        }
      }
    );

    const { data, error } = await userClient
      .from('chapters')
      .select('*')
      .eq('course_id', courseId)
      .order('created_at', { ascending: true });
    if (error) {
      console.log('❌ Chapters fetch error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.log('✅ Found chapters:', data?.length || 0);
    return NextResponse.json({ success: true, chapters: data || [] });
  } catch (error) {
    console.error('Chapters list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


