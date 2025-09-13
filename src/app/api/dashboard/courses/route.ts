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
    const studentId = searchParams.get('studentId') || searchParams.get('userId');

    if (!studentId) {
      return NextResponse.json(
        { error: 'Missing studentId or userId parameter' },
        { status: 400 }
      );
    }

    console.log('🔍 Fetching enrolled courses for student:', studentId);

    // First, let's check if the student_enrollments table exists and has data
    const { data: enrollmentsCheck, error: checkError } = await supabase
      .from('student_enrollments')
      .select('*')
      .eq('student_id', studentId)
      .limit(1);

    if (checkError) {
      console.error('❌ Error checking student enrollments table:', checkError);
      return NextResponse.json(
        { error: 'Database error: ' + checkError.message },
        { status: 500 }
      );
    }

    console.log('✅ Student enrollments check:', enrollmentsCheck?.length || 0);

    // Get student's enrolled courses with course details and instructor info
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('student_enrollments')
      .select(`
        course_id,
        courses (
          id,
          title,
          description,
          created_at,
          updated_at,
          created_by,
          users!courses_created_by_fkey (
            full_name
          )
        )
      `)
      .eq('student_id', studentId);

    if (enrollmentsError) {
      console.error('❌ Error fetching student enrollments with courses:', enrollmentsError);
      return NextResponse.json(
        { error: 'Database error: ' + enrollmentsError.message },
        { status: 500 }
      );
    }

    console.log('✅ Enrollments fetched:', enrollments?.length || 0);

    // Transform the data to match the expected format
    const courses = enrollments?.map((enrollment: any) => {
      const course = enrollment.courses;
      return {
        id: course?.id || '',
        title: course?.title || '',
        description: course?.description || '',
        subject: 'General', // Default subject since courses table doesn't have this column
        created_at: course?.created_at || '',
        updated_at: course?.updated_at || '',
        enrolled_at: new Date().toISOString(), // Use current date since enrolled_at column doesn't exist
        progress: Math.floor(Math.random() * 100), // Mock progress for now
        total_lessons: Math.floor(Math.random() * 20) + 5, // Mock total lessons
        completed_lessons: Math.floor(Math.random() * 10), // Mock completed lessons
        next_lesson: 'Introduction to Course', // Mock next lesson
        instructor_name: course?.users?.full_name || 'Unknown Instructor',
      };
    }) || [];

    console.log('✅ Courses transformed:', courses.length);

    return NextResponse.json({ courses });

  } catch (error) {
    console.error('💥 Error in student courses API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch student courses' },
      { status: 500 }
    );
  }
}