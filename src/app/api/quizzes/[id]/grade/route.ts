import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

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

    if (!userProfile || !['teacher', 'admin', 'superadmin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Only teachers can grade quizzes' }, { status: 403 });
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

    const body = await request.json();
    const { attemptId, grading } = body;

    if (!attemptId || !grading) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get the quiz attempt
    const { data: attempt, error: attemptError } = await supabaseAdmin
      .from('quiz_attempts')
      .select('*')
      .eq('id', attemptId)
      .eq('quiz_id', quizId)
      .single();

    if (attemptError || !attempt) {
      return NextResponse.json({ error: 'Quiz attempt not found' }, { status: 404 });
    }

    // Update the answers with grading
    const updatedAnswers = attempt.answers.map((answer: any) => {
      const questionGrading = grading[answer.question_id];
      if (questionGrading) {
        return {
          ...answer,
          points_earned: questionGrading.points,
          is_correct: questionGrading.points > 0,
          manually_graded: true,
          teacher_feedback: questionGrading.feedback || null,
        };
      }
      return answer;
    });

    // Calculate new score
    const newScore = updatedAnswers.reduce((sum: number, answer: any) => sum + answer.points_earned, 0);

    // Check if all text questions are now graded
    const textAnswers = updatedAnswers.filter((answer: any) => answer.manually_graded);
    const allTextQuestionsGraded = textAnswers.length > 0 && 
      textAnswers.every((answer: any) => answer.points_earned > 0 || answer.teacher_feedback);

    // Determine new status
    const newStatus = allTextQuestionsGraded ? 'graded' : 'pending_grading';

    // Update the quiz attempt
    const { error: updateError } = await supabaseAdmin
      .from('quiz_attempts')
      .update({
        answers: updatedAnswers,
        score: newScore,
        status: newStatus,
      })
      .eq('id', attemptId);

    if (updateError) {
      console.error('Error updating quiz attempt:', updateError);
      return NextResponse.json({ error: 'Failed to update quiz attempt' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Grading submitted successfully',
      newScore 
    });

  } catch (error) {
    console.error('Quiz grading error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
