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

    let stats;

    if (role === 'teacher') {
      // Get teacher stats
      const { data: courses, error: coursesError } = await supabase
        .from('teacher_courses')
        .select(`
          course_id,
          courses (
            id,
            title,
            current_students,
            max_students,
            price
          )
        `)
        .eq('teacher_id', userId);

      if (coursesError) throw coursesError;

      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('student_enrollments')
        .select('*')
        .in('course_id', courses?.map(c => c.course_id) || []);

      if (enrollmentsError) throw enrollmentsError;

      const totalCourses = courses?.length || 0;
      const totalStudents = enrollments?.length || 0;
      const totalRevenue = courses?.reduce((sum, tc) => {
        const course = tc.courses as any;
        return sum + (course?.price || 0) * (course?.current_students || 0);
      }, 0) || 0;

      const averageProgress = enrollments?.length > 0 
        ? enrollments.reduce((sum, e) => sum + e.progress_percentage, 0) / enrollments.length
        : 0;

      stats = {
        totalCourses,
        totalStudents,
        totalRevenue,
        averageProgress: Math.round(averageProgress * 10) / 10,
        activeEnrollments: enrollments?.filter(e => e.status === 'active').length || 0,
        completionRate: enrollments?.length > 0 
          ? (enrollments.filter(e => e.status === 'completed').length / enrollments.length) * 100
          : 0
      };
    } else {
      // Get student stats
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('student_enrollments')
        .select(`
          *,
          courses (
            id,
            title,
            duration_weeks
          )
        `)
        .eq('student_id', userId);

      if (enrollmentsError) throw enrollmentsError;

      const totalCourses = enrollments?.length || 0;
      const averageProgress = enrollments?.length > 0 
        ? enrollments.reduce((sum, e) => sum + e.progress_percentage, 0) / enrollments.length
        : 0;

      const completedChapters = enrollments?.reduce((sum, enrollment) => {
        const course = enrollment.courses as any;
        return sum + Math.floor((enrollment.progress_percentage / 100) * (course?.duration_weeks || 0));
      }, 0) || 0;

      stats = {
        totalCourses,
        averageProgress: Math.round(averageProgress * 10) / 10,
        completedChapters,
        activeEnrollments: enrollments?.filter(e => e.status === 'active').length || 0,
        studyStreak: 7, // Mock data for now
        weeklyGoal: 85 // Mock data for now
      };
    }

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
