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

    console.log('🔍 Fetching courses for teacher:', teacherId);

    // Get teacher's assigned courses with course details and student count
    const { data: teacherCourses, error: teacherCoursesError } = await supabase
      .from('teacher_courses')
      .select(`
        course_id,
        courses (
          id,
          title,
          description,
          created_at,
          updated_at
        )
      `)
      .eq('teacher_id', teacherId);

    if (teacherCoursesError) {
      console.error('❌ Error fetching teacher courses:', teacherCoursesError);
      throw teacherCoursesError;
    }

    // Get student counts for each course
    const courseIds = teacherCourses?.map(tc => tc.course_id) || [];
    let studentCounts: { [key: string]: number } = {};

    if (courseIds.length > 0) {
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('student_enrollments')
        .select('course_id')
        .in('course_id', courseIds);

      if (!enrollmentsError && enrollments) {
        studentCounts = enrollments.reduce((acc: { [key: string]: number }, enrollment) => {
          acc[enrollment.course_id] = (acc[enrollment.course_id] || 0) + 1;
          return acc;
        }, {});
      }
    }

    console.log('✅ Teacher courses fetched:', teacherCourses?.length || 0);

    // Transform the data to match the expected format
    const courses = teacherCourses?.map((tc: any) => ({
      id: tc.courses?.id || '',
      title: tc.courses?.title || '',
      description: tc.courses?.description || '',
      subject: 'General', // Default subject since it's not in the database
      created_at: tc.courses?.created_at || '',
      updated_at: tc.courses?.updated_at || '',
      // Real student count from database
      current_students: studentCounts[tc.course_id] || 0,
      price: 0, // Teachers don't see pricing
    })) || [];

    return NextResponse.json({ courses });

  } catch (error) {
    console.error('💥 Error in teacher courses API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch teacher courses' },
      { status: 500 }
    );
  }
}
