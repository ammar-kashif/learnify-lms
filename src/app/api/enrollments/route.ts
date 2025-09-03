import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Enroll current student (provided via body.studentId) into a courseId
export async function POST(request: NextRequest) {
  try {
    const { studentId, courseId } = await request.json();

    if (!studentId || !courseId) {
      return NextResponse.json(
        { error: 'Missing studentId or courseId' },
        { status: 400 }
      );
    }

    // Prevent duplicate enrollment
    const { data: existing, error: checkError } = await supabase
      .from('student_enrollments')
      .select('student_id, course_id')
      .eq('student_id', studentId)
      .eq('course_id', courseId)
      .maybeSingle();

    if (checkError) throw checkError;
    if (existing) {
      return NextResponse.json(
        { message: 'Already enrolled' },
        { status: 200 }
      );
    }

    const { error: insertError } = await supabase
      .from('student_enrollments')
      .insert({ student_id: studentId, course_id: courseId });

    if (insertError) throw insertError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error enrolling student:', error);
    return NextResponse.json(
      { error: 'Failed to enroll in course' },
      { status: 500 }
    );
  }
}




