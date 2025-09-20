import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SubmitQuizData, StudentAnswer } from '@/types/quiz';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// POST /api/quizzes/[id]/attempt - Submit quiz attempt
export async function POST(
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

    if (!userProfile || userProfile.role !== 'student') {
      return NextResponse.json({ error: 'Only students can submit quiz attempts' }, { status: 403 });
    }

    // Get quiz
    const { data: quiz, error: quizError } = await supabaseAdmin
      .from('quizzes')
      .select('*')
      .eq('id', quizId)
      .single();

    if (quizError || !quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

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

    // Check max attempts
    const { data: existingAttempts } = await supabaseAdmin
      .from('quiz_attempts')
      .select('id')
      .eq('quiz_id', quizId)
      .eq('student_id', user.id);

    const maxAttempts = quiz.settings?.max_attempts || 1;
    if (existingAttempts && existingAttempts.length >= maxAttempts) {
      return NextResponse.json({ 
        error: `Maximum attempts (${maxAttempts}) reached for this quiz` 
      }, { status: 400 });
    }

    const body: SubmitQuizData = await request.json();
    const { answers } = body;

    // Validate answers
    if (!answers || answers.length === 0) {
      return NextResponse.json({ error: 'Answers are required' }, { status: 400 });
    }

    // Grade the quiz
    const gradedAnswers: StudentAnswer[] = answers.map(answer => {
      const question = quiz.questions.find((q: any) => q.id === answer.question_id);
      if (!question) {
        return {
          ...answer,
          is_correct: false,
          points_earned: 0,
          question_text: 'Question not found',
          correct_answer: 'Not available',
          points: 0,
        };
      }

      const isCorrect = answer.selected_answer === question.correct_answer;
      const pointsEarned = isCorrect ? question.points : 0;

      return {
        ...answer,
        is_correct: isCorrect,
        points_earned: pointsEarned,
        question_text: question.question || 'Question text not available',
        correct_answer: question.options?.[question.correct_answer] || 'Correct answer not available',
        points: question.points || 0,
      };
    });

    // Calculate scores
    const score = gradedAnswers.reduce((sum, answer) => sum + answer.points_earned, 0);
    const maxScore = quiz.questions.reduce((sum: number, q: any) => sum + q.points, 0);

    // Create quiz attempt
    const { data: attempt, error: attemptError } = await supabaseAdmin
      .from('quiz_attempts')
      .insert({
        quiz_id: quizId,
        student_id: user.id,
        answers: gradedAnswers,
        score,
        max_score: maxScore,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (attemptError) {
      console.error('Error creating quiz attempt:', attemptError);
      return NextResponse.json({ error: 'Failed to submit quiz' }, { status: 500 });
    }

    return NextResponse.json({ 
      attempt,
      results: {
        score,
        maxScore,
        percentage: Math.round((score / maxScore) * 100),
        passed: score >= (maxScore * 0.6), // 60% passing grade
      }
    });
  } catch (error) {
    console.error('Error in POST /api/quizzes/[id]/attempt:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/quizzes/[id]/attempt - Get student's attempts for a quiz
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

    // Get quiz attempts
    let query = supabaseAdmin
      .from('quiz_attempts')
      .select('*')
      .eq('quiz_id', quizId);

    // Students can only see their own attempts
    if (userProfile.role === 'student') {
      query = query.eq('student_id', user.id);
    }

    const { data: attempts, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching quiz attempts:', error);
      return NextResponse.json({ error: 'Failed to fetch attempts' }, { status: 500 });
    }

    return NextResponse.json({ attempts: attempts || [] });
  } catch (error) {
    console.error('Error in GET /api/quizzes/[id]/attempt:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
