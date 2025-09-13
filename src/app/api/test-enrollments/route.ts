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

    console.log('🔍 Testing enrollments for student:', studentId);

    // Check if student_enrollments table exists
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('student_enrollments')
      .select('*')
      .eq('student_id', studentId);

    if (enrollmentsError) {
      console.error('❌ Error fetching enrollments:', enrollmentsError);
      return NextResponse.json(
        { error: 'Database error: ' + enrollmentsError.message },
        { status: 500 }
      );
    }

    // Check if courses table exists
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('id, title')
      .limit(5);

    if (coursesError) {
      console.error('❌ Error fetching courses:', coursesError);
      return NextResponse.json(
        { error: 'Courses error: ' + coursesError.message },
        { status: 500 }
      );
    }

    // Check if users table exists
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, full_name')
      .limit(5);

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return NextResponse.json(
        { error: 'Users error: ' + usersError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      studentId,
      enrollments: enrollments || [],
      courses: courses || [],
      users: users || [],
      message: 'All tables accessible'
    });

  } catch (error) {
    console.error('💥 Error in test enrollments API:', error);
    return NextResponse.json(
      { error: 'Failed to test enrollments: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
