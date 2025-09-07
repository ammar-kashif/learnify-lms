import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// List available Cambridge O Levels courses a student is not yet enrolled in
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json(
        { error: 'Missing studentId parameter' },
        { status: 400 }
      );
    }

    // Fetch all courses (schema may not include level/status)
    const { data: allCourses, error: coursesError } = await supabase
      .from('courses')
      .select('*');

    if (coursesError) {
      console.error('❌ Error fetching courses:', coursesError);
      throw coursesError;
    }

    console.log('🔍 Available courses query result:', { allCourses, count: allCourses?.length || 0 });

    // Fetch student's enrollments
    const { data: enrollments, error: enrollError } = await supabase
      .from('student_enrollments')
      .select('course_id')
      .eq('student_id', studentId);

    if (enrollError) throw enrollError;

    const enrolledSet = new Set((enrollments || []).map(e => e.course_id));
    const available = (allCourses || []).filter(c => !enrolledSet.has(c.id));

    console.log('🔍 Final available courses:', { available, count: available.length });

    return NextResponse.json({ courses: available });
  } catch (error) {
    console.error('Error fetching available courses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available courses' },
      { status: 500 }
    );
  }
}



