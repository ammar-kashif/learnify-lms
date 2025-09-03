import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const role = searchParams.get('role');

    if (!userId || !role) {
      return NextResponse.json(
        { error: 'Missing userId or role parameter' },
        { status: 400 }
      );
    }

    let courses;

    if (role === 'teacher') {
      // Get teacher's courses (schema has only teacher_id, course_id)
      const { data, error } = await supabase
        .from('teacher_courses')
        .select(
          `
          courses (*)
        `
        )
        .eq('teacher_id', userId);

      if (error) throw error;

      courses = (data || []).map(tc => tc.courses) || [];
    } else {
      // Get student's enrolled courses (schema has only student_id, course_id)
      const { data, error } = await supabase
        .from('student_enrollments')
        .select(
          `
          courses (*)
        `
        )
        .eq('student_id', userId);

      if (error) throw error;

      courses = (data || []).map(enrollment => enrollment.courses) || [];
    }

    return NextResponse.json({ courses });
  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch courses' },
      { status: 500 }
    );
  }
}
