import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
// import { Quiz } from '@/types/quiz';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// GET /api/quizzes/[id] - Get a specific quiz
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const quizId = params.id;

    // Get user session
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user role
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Get quiz
    const { data: quiz, error } = await supabaseAdmin
      .from('quizzes')
      .select('*')
      .eq('id', quizId)
      .single();

    if (error) {
      console.error('Error fetching quiz:', error);
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    // Check permissions
    if (userProfile.role === 'student') {
      // Check if student is enrolled in the course
      const { data: enrollment } = await supabaseAdmin
        .from('student_enrollments')
        .select('course_id')
        .eq('student_id', user.id)
        .eq('course_id', quiz.course_id)
        .single();

      if (!enrollment) {
        return NextResponse.json({ error: 'Not enrolled in this course' }, { status: 403 });
      }
    } else if (userProfile.role === 'teacher') {
      // Check if teacher is assigned to the course
      const { data: teacherCourse } = await supabaseAdmin
        .from('teacher_courses')
        .select('course_id')
        .eq('teacher_id', user.id)
        .eq('course_id', quiz.course_id)
        .single();

      if (!teacherCourse && quiz.created_by !== user.id) {
        return NextResponse.json({ error: 'Not assigned to this course' }, { status: 403 });
      }
    }

    return NextResponse.json({ quiz });
  } catch (error) {
    console.error('Error in GET /api/quizzes/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/quizzes/[id] - Update a quiz
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const quizId = params.id;

    // Get user session
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user role
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userProfile || userProfile.role !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can update quizzes' }, { status: 403 });
    }

    // Check if quiz exists and user owns it
    const { data: existingQuiz, error: fetchError } = await supabaseAdmin
      .from('quizzes')
      .select('created_by')
      .eq('id', quizId)
      .single();

    if (fetchError || !existingQuiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    if (existingQuiz.created_by !== user.id) {
      return NextResponse.json({ error: 'Not authorized to update this quiz' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, questions, settings } = body;

    // Validate questions if provided
    if (questions) {
      for (const question of questions) {
        if (!question.question || !question.options || question.options.length < 2) {
          return NextResponse.json({ 
            error: 'Each question must have a question text and at least 2 options' 
          }, { status: 400 });
        }
        if (question.correct_answer < 0 || question.correct_answer >= question.options.length) {
          return NextResponse.json({ 
            error: 'Correct answer index must be valid for the options' 
          }, { status: 400 });
        }
      }
    }

    // Update quiz
    const { data: quiz, error } = await supabaseAdmin
      .from('quizzes')
      .update({
        title,
        description,
        questions,
        settings,
        updated_at: new Date().toISOString(),
      })
      .eq('id', quizId)
      .select()
      .single();

    if (error) {
      console.error('Error updating quiz:', error);
      return NextResponse.json({ error: 'Failed to update quiz' }, { status: 500 });
    }

    return NextResponse.json({ quiz });
  } catch (error) {
    console.error('Error in PUT /api/quizzes/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/quizzes/[id] - Delete a quiz
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const quizId = params.id;

    // Get user session
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user role
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userProfile || userProfile.role !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can delete quizzes' }, { status: 403 });
    }

    // Check if quiz exists and user owns it
    const { data: existingQuiz, error: fetchError } = await supabaseAdmin
      .from('quizzes')
      .select('created_by')
      .eq('id', quizId)
      .single();

    if (fetchError || !existingQuiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    if (existingQuiz.created_by !== user.id) {
      return NextResponse.json({ error: 'Not authorized to delete this quiz' }, { status: 403 });
    }

    // Delete quiz (attempts will be deleted automatically due to CASCADE)
    const { error } = await supabaseAdmin
      .from('quizzes')
      .delete()
      .eq('id', quizId);

    if (error) {
      console.error('Error deleting quiz:', error);
      return NextResponse.json({ error: 'Failed to delete quiz' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Quiz deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/quizzes/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
