import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CreateQuizData } from '@/types/quiz';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// GET /api/quizzes - Get quizzes for a course
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    // const userId = searchParams.get('userId');

    if (!courseId) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 });
    }

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

    // Build query based on user role
    const query = supabaseAdmin
      .from('quizzes')
      .select('*')
      .eq('course_id', courseId)
      .order('created_at', { ascending: false });

    // Students can only see quizzes for enrolled courses
    if (userProfile.role === 'student') {
      const { data: enrollment } = await supabaseAdmin
        .from('student_enrollments')
        .select('course_id')
        .eq('student_id', user.id)
        .eq('course_id', courseId)
        .single();

      if (!enrollment) {
        return NextResponse.json({ error: 'Not enrolled in this course' }, { status: 403 });
      }
    }

    // Teachers can only see quizzes for courses they're assigned to
    if (userProfile.role === 'teacher') {
      const { data: teacherCourse } = await supabaseAdmin
        .from('teacher_courses')
        .select('course_id')
        .eq('teacher_id', user.id)
        .eq('course_id', courseId)
        .single();

      if (!teacherCourse) {
        return NextResponse.json({ error: 'Not assigned to this course' }, { status: 403 });
      }
    }

    console.log('🔍 Fetching quizzes for course:', courseId, 'by user:', user.id, 'role:', userProfile.role);
    
    const { data: quizzes, error } = await query;

    if (error) {
      console.error('❌ Error fetching quizzes:', error);
      return NextResponse.json({ error: 'Failed to fetch quizzes' }, { status: 500 });
    }

    console.log('✅ Quizzes fetched:', quizzes?.length || 0, 'quizzes');
    console.log('📋 Quiz data:', quizzes);

    return NextResponse.json({ quizzes: quizzes || [] });
  } catch (error) {
    console.error('Error in GET /api/quizzes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/quizzes - Create a new quiz
export async function POST(request: NextRequest) {
  try {
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
      return NextResponse.json({ error: 'Only teachers can create quizzes' }, { status: 403 });
    }

    const body: CreateQuizData = await request.json();
    const { course_id, title, description, questions, settings } = body;

    // Validate required fields
    if (!course_id || !title || !questions || questions.length === 0) {
      return NextResponse.json({ 
        error: 'Course ID, title, and at least one question are required' 
      }, { status: 400 });
    }

    // Validate questions
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

    // Check if user is assigned to this course
    const { data: teacherCourse } = await supabaseAdmin
      .from('teacher_courses')
      .select('course_id')
      .eq('teacher_id', user.id)
      .eq('course_id', course_id)
      .single();

    if (!teacherCourse) {
      return NextResponse.json({ error: 'Not assigned to this course' }, { status: 403 });
    }

    // Add unique IDs to questions
    const questionsWithIds = questions.map((q, index) => ({
      ...q,
      id: `q${index + 1}`,
    }));

    // Create quiz
    const { data: quiz, error } = await supabaseAdmin
      .from('quizzes')
      .insert({
        course_id,
        title,
        description,
        questions: questionsWithIds,
        settings: settings || {},
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating quiz:', error);
      return NextResponse.json({ error: 'Failed to create quiz' }, { status: 500 });
    }

    return NextResponse.json({ quiz }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/quizzes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
