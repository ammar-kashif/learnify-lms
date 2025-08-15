import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
      // Get teacher's courses
      const { data, error } = await supabase
        .from('teacher_courses')
        .select(`
          *,
          courses (
            id,
            title,
            subject,
            level,
            description,
            thumbnail_url,
            duration_weeks,
            price,
            max_students,
            current_students,
            status,
            created_at,
            updated_at
          )
        `)
        .eq('teacher_id', userId);

      if (error) throw error;

      courses = data?.map(tc => ({
        ...tc.courses,
        teacher_assignment: {
          assigned_at: tc.assigned_at,
          is_primary: tc.is_primary
        }
      })) || [];
    } else {
      // Get student's enrolled courses
      const { data, error } = await supabase
        .from('student_enrollments')
        .select(`
          *,
          courses (
            id,
            title,
            subject,
            level,
            description,
            thumbnail_url,
            duration_weeks,
            price,
            max_students,
            current_students,
            status,
            created_at,
            updated_at
          )
        `)
        .eq('student_id', userId);

      if (error) throw error;

      courses = data?.map(enrollment => ({
        ...enrollment.courses,
        enrollment: {
          enrolled_at: enrollment.enrolled_at,
          progress_percentage: enrollment.progress_percentage,
          last_accessed: enrollment.last_accessed,
          status: enrollment.status
        }
      })) || [];
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
