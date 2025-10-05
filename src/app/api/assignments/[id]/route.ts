import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/assignments/[id] - Get a specific assignment
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    const { data: assignment, error } = await supabase
      .from('assignments')
      .select(`
        *,
        chapters!assignments_chapter_id_fkey (
          id,
          title
        ),
        users!assignments_teacher_id_fkey (
          id,
          full_name
        )
      `)
      .eq('id', params.id)
      .single();

    if (error) {
      console.error('Error fetching assignment:', error);
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ assignment });

  } catch (error) {
    console.error('Error in assignment API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/assignments/[id] - Update an assignment
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      instructions,
      dueDate,
      maxPoints,
      allowedFileTypes,
      maxFileSizeMb,
      maxSubmissions,
      isPublished
    } = body;

    // Get user role
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = userProfile?.role;

    // Only teachers, admins, and superadmins can update assignments
    if (!['teacher', 'admin', 'superadmin'].includes(userRole || '')) {
      return NextResponse.json(
        { error: 'Only teachers can update assignments' },
        { status: 403 }
      );
    }

    // Get the assignment to check permissions
    const { data: existingAssignment, error: fetchError } = await supabase
      .from('assignments')
      .select('*')
      .eq('id', params.id)
      .single();

    if (fetchError || !existingAssignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    // For teachers, verify they own the assignment or are assigned to the course
    if (userRole === 'teacher') {
      if (existingAssignment.teacher_id !== user.id) {
        const { data: teacherCourse } = await supabase
          .from('teacher_courses')
          .select('*')
          .eq('teacher_id', user.id)
          .eq('course_id', existingAssignment.course_id)
          .single();

        if (!teacherCourse) {
          return NextResponse.json(
            { error: 'You can only update your own assignments' },
            { status: 403 }
          );
        }
      }
    }

    // Update assignment
    const { data: assignment, error } = await supabase
      .from('assignments')
      .update({
        title: title || existingAssignment.title,
        description: description !== undefined ? description : existingAssignment.description,
        instructions: instructions !== undefined ? instructions : existingAssignment.instructions,
        due_date: dueDate !== undefined ? dueDate : existingAssignment.due_date,
        max_points: maxPoints || existingAssignment.max_points,
        allowed_file_types: allowedFileTypes || existingAssignment.allowed_file_types,
        max_file_size_mb: maxFileSizeMb || existingAssignment.max_file_size_mb,
        max_submissions: maxSubmissions || existingAssignment.max_submissions,
        is_published: isPublished !== undefined ? isPublished : existingAssignment.is_published
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating assignment:', error);
      return NextResponse.json(
        { error: 'Failed to update assignment' },
        { status: 500 }
      );
    }

    return NextResponse.json({ assignment });

  } catch (error) {
    console.error('Error in assignment API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/assignments/[id] - Delete an assignment
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    // Get user role
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = userProfile?.role;

    // Only teachers, admins, and superadmins can delete assignments
    if (!['teacher', 'admin', 'superadmin'].includes(userRole || '')) {
      return NextResponse.json(
        { error: 'Only teachers can delete assignments' },
        { status: 403 }
      );
    }

    // Get the assignment to check permissions
    const { data: existingAssignment, error: fetchError } = await supabase
      .from('assignments')
      .select('*')
      .eq('id', params.id)
      .single();

    if (fetchError || !existingAssignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    // For teachers, verify they own the assignment or are assigned to the course
    if (userRole === 'teacher') {
      if (existingAssignment.teacher_id !== user.id) {
        const { data: teacherCourse } = await supabase
          .from('teacher_courses')
          .select('*')
          .eq('teacher_id', user.id)
          .eq('course_id', existingAssignment.course_id)
          .single();

        if (!teacherCourse) {
          return NextResponse.json(
            { error: 'You can only delete your own assignments' },
            { status: 403 }
          );
        }
      }
    }

    // Delete assignment (this will cascade delete submissions due to foreign key)
    const { error } = await supabase
      .from('assignments')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Error deleting assignment:', error);
      return NextResponse.json(
        { error: 'Failed to delete assignment' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Assignment deleted successfully' });

  } catch (error) {
    console.error('Error in assignment API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

