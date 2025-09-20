import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { autoRefreshToken: false, persistSession: false }
  }
);

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Quiz results API called');
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    console.log('📚 Course ID:', courseId);

    if (!courseId) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 });
    }

    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify the JWT token and get user using regular client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('❌ Authentication error:', authError);
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    
    console.log('✅ User authenticated for quiz results:', user.id);

    // Get user role from database using admin client
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Only admins and superadmins can view quiz results
    if (userProfile.role !== 'admin' && userProfile.role !== 'superadmin') {
      return NextResponse.json({ error: 'Only admins can view quiz results' }, { status: 403 });
    }

    // First get quizzes for this course
    console.log('🔍 Fetching quizzes for course:', courseId);
    const { data: quizzes, error: quizzesError } = await supabaseAdmin
      .from('quizzes')
      .select('id, title')
      .eq('course_id', courseId);

    if (quizzesError) {
      console.error('❌ Error fetching quizzes:', quizzesError);
      return NextResponse.json({ error: 'Failed to fetch quizzes' }, { status: 500 });
    }
    console.log('✅ Quizzes found:', quizzes?.length || 0);

    const quizIds = quizzes?.map(q => q.id) || [];
    
    if (quizIds.length === 0) {
      return NextResponse.json({ success: true, results: [] });
    }

    // Fetch quiz results for the course
    console.log('🔍 Fetching quiz attempts for quiz IDs:', quizIds);
    
    // Fetch quiz attempts from the quiz_attempts table
    console.log('🔍 Fetching quiz attempts from quiz_attempts table');
    const { data: results, error: resultsError } = await supabaseAdmin
      .from('quiz_attempts')
      .select(`
        id,
        score,
        max_score,
        answers,
        completed_at,
        created_at,
        quiz_id,
        student_id
      `)
      .in('quiz_id', quizIds)
      .order('completed_at', { ascending: false });

    if (resultsError) {
      console.error('❌ Error fetching quiz results:', resultsError);
      return NextResponse.json({ 
        error: 'Failed to fetch quiz results', 
        details: resultsError.message 
      }, { status: 500 });
    }
    console.log('✅ Quiz attempts found:', results?.length || 0);

    // Get student names
    const studentIds = Array.from(new Set(results?.map(r => r.student_id) || []));
    const { data: students, error: studentsError } = await supabaseAdmin
      .from('users')
      .select('id, full_name')
      .in('id', studentIds);

    if (studentsError) {
      console.error('❌ Error fetching students:', studentsError);
      return NextResponse.json({ error: 'Failed to fetch student data' }, { status: 500 });
    }

    // Create lookup maps
    const quizMap = new Map(quizzes?.map(q => [q.id, q.title]) || []);
    const studentMap = new Map(students?.map(s => [s.id, s.full_name]) || []);

    // Transform the data to include quiz title and student name
    const transformedResults = results?.map(result => {
      // Calculate correct answers and total questions from the answers array
      const answers = result.answers || [];
      const correctAnswers = answers.filter((answer: any) => answer.is_correct).length;
      const totalQuestions = answers.length;
      
      return {
        id: result.id,
        quiz_title: quizMap.get(result.quiz_id) || 'Unknown Quiz',
        student_name: studentMap.get(result.student_id) || 'Unknown Student',
        score: result.score,
        max_score: result.max_score,
        correct_answers: correctAnswers,
        total_questions: totalQuestions,
        percentage: result.max_score > 0 ? Math.round((result.score / result.max_score) * 100) : 0,
        completed_at: result.completed_at,
        created_at: result.created_at,
        quiz_id: result.quiz_id,
        answers: answers
      };
    }) || [];

    console.log('✅ Quiz results fetched:', transformedResults.length, 'results');

    return NextResponse.json({ 
      success: true, 
      results: transformedResults 
    });
  } catch (error) {
    console.error('❌ Quiz results error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
