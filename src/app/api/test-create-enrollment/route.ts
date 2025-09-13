import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { studentId, courseId } = await request.json();

    if (!studentId || !courseId) {
      return NextResponse.json(
        { error: 'Missing studentId or courseId' },
        { status: 400 }
      );
    }

    console.log('🔍 Creating enrollment for student:', studentId, 'in course:', courseId);

    // Create enrollment
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('student_enrollments')
      .insert({
        student_id: studentId,
        course_id: courseId,
        enrolled_at: new Date().toISOString()
      })
      .select();

    if (enrollmentError) {
      console.error('❌ Error creating enrollment:', enrollmentError);
      return NextResponse.json(
        { error: 'Database error: ' + enrollmentError.message },
        { status: 500 }
      );
    }

    console.log('✅ Enrollment created:', enrollment);

    return NextResponse.json({
      success: true,
      enrollment: enrollment[0],
      message: 'Enrollment created successfully'
    });

  } catch (error) {
    console.error('💥 Error in create enrollment API:', error);
    return NextResponse.json(
      { error: 'Failed to create enrollment: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
