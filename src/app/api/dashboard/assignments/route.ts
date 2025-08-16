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
    const status = searchParams.get('status'); // 'upcoming', 'overdue', 'completed'

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      );
    }

    // Get student's enrolled courses
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('student_enrollments')
      .select('course_id')
      .eq('student_id', userId)
      .eq('status', 'active');

    if (enrollmentsError) throw enrollmentsError;

    const courseIds = enrollments?.map(e => e.course_id) || [];

    if (courseIds.length === 0) {
      return NextResponse.json({ assignments: [] });
    }

    // Get chapters for enrolled courses
    const { data: chapters, error: chaptersError } = await supabase
      .from('chapters')
      .select('id')
      .in('course_id', courseIds);

    if (chaptersError) throw chaptersError;

    const chapterIds = chapters?.map(c => c.id) || [];

    if (chapterIds.length === 0) {
      return NextResponse.json({ assignments: [] });
    }

    // Get assignments for those chapters
    const { data: assignments, error: assignmentsError } = await supabase
      .from('assignments')
      .select(`
        *,
        chapters (
          id,
          title,
          courses (
            id,
            title,
            subject
          )
        )
      `)
      .in('chapter_id', chapterIds)
      .order('due_date', { ascending: true });

    if (assignmentsError) throw assignmentsError;

    // Filter assignments based on status
    let filteredAssignments = assignments || [];

    if (status === 'upcoming') {
      const now = new Date();
      filteredAssignments = assignments?.filter(a => new Date(a.due_date) > now) || [];
    } else if (status === 'overdue') {
      const now = new Date();
      filteredAssignments = assignments?.filter(a => new Date(a.due_date) < now) || [];
    } else if (status === 'completed') {
      // This would need a submissions table to track completion
      // For now, return empty array
      filteredAssignments = [];
    }

    // Add calculated fields
    const enrichedAssignments = filteredAssignments.map(assignment => {
      const dueDate = new Date(assignment.due_date);
      const now = new Date();
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        ...assignment,
        daysUntilDue,
        isOverdue: dueDate < now,
        isDueSoon: daysUntilDue <= 3 && daysUntilDue >= 0
      };
    });

    return NextResponse.json({ assignments: enrichedAssignments });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assignments' },
      { status: 500 }
    );
  }
}
