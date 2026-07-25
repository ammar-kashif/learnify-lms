'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Play, Award, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import {
  EmptyState,
  Meta,
  StatusDot,
  panel,
  plural,
  primaryButton,
  quietButton,
  row,
  rowGroup,
} from '@/components/course/course-ui';
import { cn } from '@/lib/utils';
import { Quiz, QuizAttempt } from '@/types/quiz';
import QuizForm from './quiz-form';
import QuizAttempts from './quiz-attempts';
import QuizTaker from './quiz-taker';
import QuizGrading from './quiz-grading';

interface QuizSectionProps {
  courseId: string;
  userRole: 'student' | 'teacher' | 'admin' | 'superadmin';
  userId: string;
  /** Off when the page already renders its own section heading above the list. */
  showHeading?: boolean;
}

export default function QuizSection({ courseId, userRole, userId, showHeading = true }: QuizSectionProps) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [viewingAttempts, setViewingAttempts] = useState<Quiz | null>(null);
  const [takingQuiz, setTakingQuiz] = useState<Quiz | null>(null);
  const [gradingQuiz, setGradingQuiz] = useState<Quiz | null>(null);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [session, setSession] = useState<any>(null);
  const [studentAttempts, setStudentAttempts] = useState<Map<string, QuizAttempt[]>>(new Map());

  // Load session for API calls
  useEffect(() => {
    const loadSession = async () => {
      try {
        console.log('🔍 Loading session for quiz section...');
        const { data: { session } } = await import('@/lib/supabase').then(m => m.supabase.auth.getSession());
        console.log('📱 Session loaded:', session ? 'Yes' : 'No');
        console.log('🔑 Session token:', session?.access_token ? 'Present' : 'Missing');
        setSession(session);
      } catch (error) {
        console.error('❌ Error loading session:', error);
      }
    };
    loadSession();
  }, []);

  // Load student attempts for each quiz in parallel
  const loadStudentAttempts = useCallback(async (quizIds: string[]) => {
    if (userRole !== 'student' || !session || quizIds.length === 0) return;

    try {
      // Make all requests in parallel instead of sequentially
      const attemptPromises = quizIds.map(async (quizId) => {
        try {
          const response = await fetch(`/api/quizzes/${quizId}/attempt`, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            return { quizId, attempts: data.attempts || [] };
          }
          return { quizId, attempts: [] };
        } catch (error) {
          console.error(`Error loading attempts for quiz ${quizId}:`, error);
          return { quizId, attempts: [] };
        }
      });

      const results = await Promise.all(attemptPromises);
      const attemptsMap = new Map<string, QuizAttempt[]>();
      
      results.forEach(({ quizId, attempts }) => {
        attemptsMap.set(quizId, attempts);
      });
      
      setStudentAttempts(attemptsMap);
    } catch (error) {
      console.error('Error loading student attempts:', error);
    }
  }, [userRole, session]);



  // Load quizzes
  useEffect(() => {
    if (!session) return;
    
    const loadQuizzes = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/quizzes?courseId=${courseId}&userId=${userId}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Failed to fetch quizzes: ${errorData.error || response.statusText}`);
        }

        const data = await response.json();
        const quizzesData = data.quizzes || [];
        setQuizzes(quizzesData);
        
        // Early return if no quizzes to avoid unnecessary processing
        if (quizzesData.length === 0) return;
        
        // Load student attempts if user is a student (in parallel with UI update)
        if (userRole === 'student') {
          const quizIds = quizzesData.map((q: Quiz) => q.id);
          // Don't await this - let it load in background
          loadStudentAttempts(quizIds);
        }
      } catch (error) {
        console.error('Error loading quizzes:', error);
        toast.error('Failed to load quizzes');
      } finally {
        setLoading(false);
      }
    };

    loadQuizzes();
  }, [courseId, userId, session, userRole, loadStudentAttempts]);


  // Load attempts for a specific quiz
  const loadAttempts = async (quizId: string) => {
    if (!session) return;

    try {
      if (userRole === 'student') {
        // Students: load only their attempts via quiz-specific endpoint
        const res = await fetch(`/api/quizzes/${quizId}/attempt`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        });

        if (!res.ok) {
          throw new Error('Failed to fetch attempts');
        }

        const data = await res.json();
        const ownAttempts = (data.attempts || [])
          .filter((a: any) => a.student_id === userId) // ensure only own
          .map((a: any) => ({
            id: a.id,
            quiz_id: a.quiz_id,
            student_id: a.student_id,
            student_name: a.student_name || 'You',
            answers: a.answers || [],
            score: a.score,
            max_score: a.max_score,
            completed_at: a.completed_at,
            created_at: a.created_at || a.completed_at,
          }));
        setAttempts(ownAttempts);
        return;
      }

      // Admin/teacher: use aggregated results API
      const response = await fetch(`/api/quizzes/results?courseId=${courseId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch attempts');
      }

      const data = await response.json();
      const quizAttempts = (data.results || [])
        .filter((result: any) => result.quiz_id === quizId)
        .map((result: any) => ({
          id: result.id,
          quiz_id: result.quiz_id,
          student_id: result.student_id || '',
          student_name: result.student_name,
          answers: result.answers || [],
          score: result.score,
          max_score: result.max_score,
          completed_at: result.completed_at,
          created_at: result.created_at || result.completed_at
        }));
      setAttempts(quizAttempts);
    } catch (error) {
      console.error('Error loading attempts:', error);
      toast.error('Failed to load attempts');
    }
  };

  const handleCreateQuiz = async (quizData: any) => {
    if (!session) return;

    try {
      const response = await fetch('/api/quizzes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(quizData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create quiz');
      }

      const data = await response.json();
      setQuizzes(prev => [data.quiz, ...prev]);
      setShowCreateForm(false);
      toast.success('Quiz created successfully!');
    } catch (error: any) {
      console.error('Error creating quiz:', error);
      toast.error(error.message || 'Failed to create quiz');
    }
  };

  const handleUpdateQuiz = async (quizData: any) => {
    if (!session || !editingQuiz) return;

    try {
      const response = await fetch(`/api/quizzes/${editingQuiz.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(quizData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update quiz');
      }

      const data = await response.json();
      setQuizzes(prev => prev.map(q => q.id === editingQuiz.id ? data.quiz : q));
      setEditingQuiz(null);
      toast.success('Quiz updated successfully!');
    } catch (error: any) {
      console.error('Error updating quiz:', error);
      toast.error(error.message || 'Failed to update quiz');
    }
  };


  const handleViewAttempts = async (quizId: string) => {
    const quiz = quizzes.find(q => q.id === quizId);
    if (quiz) {
      setViewingAttempts(quiz);
      await loadAttempts(quizId);
    }
  };

  const handleReviewAnswers = async (quiz: Quiz) => {
    setViewingAttempts(quiz);
    await loadAttempts(quiz.id);
  };

  const handleTakeQuiz = (quiz: Quiz) => {
    setTakingQuiz(quiz);
  };

  const handleGradeQuiz = async (quiz: Quiz) => {
    setGradingQuiz(quiz);
    await loadAttempts(quiz.id);
  };

  const handleQuizComplete = async (attempt: QuizAttempt) => {
    setTakingQuiz(null);
    
    // Refresh student attempts if user is a student
    if (userRole === 'student' && takingQuiz) {
      const updatedAttempts = new Map(studentAttempts);
      const currentAttempts = updatedAttempts.get(takingQuiz.id) || [];
      updatedAttempts.set(takingQuiz.id, [...currentAttempts, attempt]);
      setStudentAttempts(updatedAttempts);
    }
    
    // Refresh quizzes to show updated attempt count
    if (session) {
      const loadQuizzes = async () => {
        try {
          const response = await fetch(`/api/quizzes?courseId=${courseId}&userId=${userId}`, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            setQuizzes(data.quizzes || []);
          }
        } catch (error) {
          console.error('Error refreshing quizzes:', error);
        }
      };
      loadQuizzes();
    }
  };

  // Show quiz form
  if (showCreateForm || editingQuiz) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between pl-0 pt-2">
          <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white tracking-tight">
            {editingQuiz ? 'Edit Quiz' : 'Create Quiz'}
          </h2>
          <Button variant="outline" onClick={() => {
            setShowCreateForm(false);
            setEditingQuiz(null);
          }}>
            Cancel
          </Button>
        </div>
        <QuizForm
          courseId={courseId}
          onSave={editingQuiz ? handleUpdateQuiz : handleCreateQuiz}
          onCancel={() => {
            setShowCreateForm(false);
            setEditingQuiz(null);
          }}
          initialData={editingQuiz ? {
            title: editingQuiz.title,
            description: editingQuiz.description,
            questions: editingQuiz.questions,
            settings: editingQuiz.settings,
          } : undefined}
        />
      </div>
    );
  }

  // Show quiz attempts
  if (viewingAttempts) {
    return (
      <QuizAttempts
        quiz={viewingAttempts}
        attempts={attempts}
        onBack={() => setViewingAttempts(null)}
        loading={false}
      />
    );
  }

  // Show quiz taker
  if (takingQuiz) {
    return (
      <QuizTaker
        quiz={takingQuiz}
        onComplete={handleQuizComplete}
        onCancel={() => setTakingQuiz(null)}
        loading={false}
      />
    );
  }

  // Show grading interface
  if (gradingQuiz) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Grade Quiz: {gradingQuiz.title}</h2>
          <Button
            variant="outline"
            onClick={() => setGradingQuiz(null)}
          >
            Close Grading
          </Button>
        </div>
        <QuizGrading
          quiz={gradingQuiz}
          attempts={attempts}
          onGradingComplete={() => {
            setGradingQuiz(null);
            // Refresh attempts
            if (gradingQuiz) {
              loadAttempts(gradingQuiz.id);
            }
          }}
        />
      </div>
    );
  }

  // Show quiz list
  const isTeacher = userRole === 'teacher' || userRole === 'admin' || userRole === 'superadmin';

  return (
    <div className="space-y-4">
      {(showHeading || isTeacher) && (
        <div className="flex items-center justify-between gap-3">
          {showHeading ? (
            <div className="flex items-baseline gap-2.5">
              <h3 className="text-lg font-semibold tracking-[-0.01em] text-gray-900 dark:text-white">
                Quizzes
              </h3>
              <span className="text-sm tabular-nums text-gray-400 dark:text-gray-500">
                {quizzes.length}
              </span>
            </div>
          ) : (
            <span />
          )}
          {isTeacher && (
            <Button
              onClick={() => setShowCreateForm(true)}
              size="sm"
              className={cn(primaryButton, 'h-9')}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Create quiz
            </Button>
          )}
        </div>
      )}

      {loading ? (
        <QuizSkeletons />
      ) : quizzes.length === 0 ? (
        <EmptyState
          icon={Award}
          title={isTeacher ? 'No quizzes yet' : 'No quizzes available'}
          description={
            isTeacher
              ? 'Create your first quiz to start assessing your students.'
              : "Your teacher hasn't created any quizzes for this course yet."
          }
          action={
            isTeacher ? (
              <Button
                onClick={() => setShowCreateForm(true)}
                size="sm"
                className={cn(primaryButton, 'h-9')}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Create quiz
              </Button>
            ) : undefined
          }
        />
      ) : (
        /* Rows, not cards. Each quiz is four short facts and one action — a
           200px card per quiz is why this tab read as filler. */
        <div className={rowGroup}>
          {quizzes.map((quiz) => {
            const totalPoints = quiz.questions.reduce((sum, q) => sum + q.points, 0);
            const timeLimit = quiz.settings?.time_limit;
            const maxAttempts = quiz.settings?.max_attempts || 1;
            const attempts = studentAttempts.get(quiz.id) || [];
            const isCompleted = !isTeacher && attempts.length >= maxAttempts;
            const hasAttempted = attempts.length > 0;
            const remaining = Math.max(0, maxAttempts - attempts.length);

            return (
              <div key={quiz.id} className={row}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {!isTeacher && hasAttempted && (
                      <StatusDot tone={isCompleted ? 'green' : 'amber'} />
                    )}
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                      {quiz.title}
                    </p>
                  </div>
                  {quiz.description && (
                    <p className="mt-0.5 line-clamp-1 text-[13px] text-gray-500 dark:text-gray-400">
                      {quiz.description}
                    </p>
                  )}
                  <Meta
                    className="mt-1 text-[13px]"
                    items={[
                      plural(quiz.questions.length, 'question'),
                      plural(totalPoints, 'point'),
                      timeLimit ? `${timeLimit} min` : null,
                      quiz.settings?.shuffle_questions ? 'Shuffled' : null,
                      isTeacher
                        ? plural(maxAttempts, 'attempt')
                        : isCompleted
                          ? 'Completed'
                          : `${remaining} of ${maxAttempts} left`,
                    ]}
                  />
                </div>

                <div className="flex flex-shrink-0 items-center gap-1.5">
                  {isTeacher ? (
                    <>
                      <Button
                        onClick={() => handleViewAttempts(quiz.id)}
                        className={cn(quietButton, 'h-8 px-2.5 text-[13px]')}
                      >
                        <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
                        Attempts
                      </Button>
                      {quiz.questions.some((q) => q.type === 'text') && (
                        <Button
                          onClick={() => handleGradeQuiz(quiz)}
                          className={cn(primaryButton, 'h-8 px-2.5 text-[13px]')}
                        >
                          Grade
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      {hasAttempted && (
                        <Button
                          onClick={() => handleReviewAnswers(quiz)}
                          className={cn(quietButton, 'h-8 px-2.5 text-[13px]')}
                        >
                          <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
                          Attempts
                        </Button>
                      )}
                      {!isCompleted && (
                        <Button
                          onClick={() => handleTakeQuiz(quiz)}
                          className={cn(primaryButton, 'h-8 px-2.5 text-[13px]')}
                        >
                          <Play className="mr-1.5 h-3.5 w-3.5" />
                          {hasAttempted ? 'Retake' : 'Start'}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Loading placeholders.
 *
 * The old inline version used a bare `bg-gray-200` with no dark variant, so in
 * dark mode it was three near-invisible bars on a dark card.
 */
function QuizSkeletons() {
  return (
    <div className="space-y-4" role="status" aria-busy="true">
      <span className="sr-only">Loading quizzes…</span>
      {[1, 2, 3].map((i) => (
        <Card key={i} className={cn(panel, 'animate-pulse')}>
          <CardHeader className="space-y-2">
            <div className="h-5 w-1/3 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-4 w-1/2 rounded bg-gray-100 dark:bg-gray-800/70" />
          </CardHeader>
          <CardContent>
            <div className="h-4 w-3/4 rounded bg-gray-100 dark:bg-gray-800/70" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
