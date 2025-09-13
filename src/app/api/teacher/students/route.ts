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
    const teacherId = searchParams.get('teacherId');

    if (!teacherId) {
      return NextResponse.json(
        { error: 'Missing teacherId parameter' },
        { status: 400 }
      );
    }

    console.log('🔍 Fetching students for teacher:', teacherId);

    // Get teacher's assigned courses
    const { data: teacherCourses, error: teacherCoursesError } = await supabase
      .from('teacher_courses')
      .select('course_id')
      .eq('teacher_id', teacherId);

    if (teacherCoursesError) {
      console.error('❌ Error fetching teacher courses:', teacherCoursesError);
      throw teacherCoursesError;
    }

    const courseIds = teacherCourses?.map(tc => tc.course_id) || [];

    if (courseIds.length === 0) {
      return NextResponse.json({ students: [] });
    }

    // Get students enrolled in teacher's courses
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('student_enrollments')
      .select(`
        student_id,
        course_id,
        users (
          id,
          full_name,
          email,
          created_at
        ),
        courses (
          id,
          title
        )
      `)
      .in('course_id', courseIds);

    if (enrollmentsError) {
      console.error('❌ Error fetching enrollments:', enrollmentsError);
      throw enrollmentsError;
    }

    // Transform the data
    const students = enrollments?.map((enrollment: any) => ({
      id: enrollment.users?.id || '',
      full_name: enrollment.users?.full_name || '',
      email: enrollment.users?.email || '',
      enrolled_at: enrollment.users?.created_at || '',
      course_title: enrollment.courses?.title || '',
      course_id: enrollment.course_id,
      status: 'active' as const,
    })) || [];

    console.log('✅ Students fetched:', students.length);

    return NextResponse.json({ students });

  } catch (error) {
    console.error('💥 Error in teacher students API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch students' },
      { status: 500 }
    );
  }
}
