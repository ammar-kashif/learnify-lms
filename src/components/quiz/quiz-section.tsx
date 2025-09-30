'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Play, Clock, Award, Users, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { Quiz, QuizAttempt } from '@/types/quiz';
import QuizForm from './quiz-form';
import QuizAttempts from './quiz-attempts';
import QuizTaker from './quiz-taker';

interface QuizSectionProps {
  courseId: string;
  userRole: 'student' | 'teacher' | 'admin' | 'superadmin';
  userId: string;
}

export default function QuizSection({ courseId, userRole, userId }: QuizSectionProps) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [viewingAttempts, setViewingAttempts] = useState<Quiz | null>(null);
  const [takingQuiz, setTakingQuiz] = useState<Quiz | null>(null);
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

  // Show quiz list
  return (
    <div className="space-y-5">
      {(userRole === 'teacher' || userRole === 'admin' || userRole === 'superadmin') ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Quizzes ({quizzes.length})</h3>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : quizzes.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Award className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No quizzes yet
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4 text-center">
                  Create your first quiz to start assessing your students
                </p>
                <Button onClick={() => setShowCreateForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Quiz
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {quizzes.map((quiz) => {
                const totalPoints = quiz.questions.reduce((sum, q) => sum + q.points, 0);
                const timeLimit = quiz.settings?.time_limit;

                return (
                  <Card key={quiz.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{quiz.title}</CardTitle>
                          {quiz.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                              {quiz.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary" className="bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                            {quiz.questions.length} questions
                          </Badge>
                          <Badge variant="outline">
                            {totalPoints} points
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        {timeLimit && (
                          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                            <Clock className="h-4 w-4" />
                            <span>{timeLimit} minutes</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                          <Users className="h-4 w-4" />
                          <span>{quiz.settings?.max_attempts || 1} attempt(s)</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                          <Award className="h-4 w-4" />
                          <span>
                            {quiz.settings?.shuffle_questions ? 'Shuffled' : 'Fixed order'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                          <span>Created: {new Date(quiz.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Clean View Attempts Button for Admins */}
                      <div className="flex justify-end pt-4">
                        <Button 
                          onClick={() => handleViewAttempts(quiz.id)}
                          className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg shadow-sm"
                        >
                          <BarChart3 className="h-4 w-4 mr-2" />
                          View Attempts
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        // Student view
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : quizzes.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Award className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No quizzes available
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-center">
                  Your teacher hasn&apos;t created any quizzes for this course yet
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {quizzes.map((quiz) => {
                const totalPoints = quiz.questions.reduce((sum, q) => sum + q.points, 0);
                const timeLimit = quiz.settings?.time_limit;
                const attempts = studentAttempts.get(quiz.id) || [];
                const maxAttempts = quiz.settings?.max_attempts || 1;
                const isCompleted = attempts.length >= maxAttempts;
                const hasAttempted = attempts.length > 0;
                  
                  return (
                    <Card key={quiz.id} className={`hover:shadow-md transition-shadow ${isCompleted ? 'opacity-75' : ''}`}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{quiz.title}</CardTitle>
                            {quiz.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                {quiz.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary" className="bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                              {quiz.questions.length} questions
                            </Badge>
                            <Badge variant="outline">
                              {totalPoints} points
                            </Badge>
                            {hasAttempted && (
                              <Badge variant={isCompleted ? "destructive" : "default"} className={isCompleted ? "bg-orange-500 hover:bg-orange-600 text-white" : ""}>
                                {isCompleted ? 'Completed' : `${attempts.length}/${maxAttempts} attempts`}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                          {timeLimit && (
                            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                              <Clock className="h-4 w-4" />
                              <span>{timeLimit} minutes</span>
                            </div>
                          )}
                          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                            <Users className="h-4 w-4" />
                            <span>{maxAttempts} attempt(s)</span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                            <Award className="h-4 w-4" />
                            <span>
                              {quiz.settings?.shuffle_questions ? 'Shuffled' : 'Fixed order'}
                            </span>
                          </div>
                        </div>

                        {/* Clean View Attempts Button for Students */}
                        {hasAttempted && attempts.length > 0 && (
                          <div className="flex justify-center pt-4">
                            <Button 
                              onClick={() => handleReviewAnswers(quiz)}
                              className="bg-primary hover:bg-primary/90 text-white px-6 py-2"
                            >
                              <BarChart3 className="h-4 w-4 mr-2" />
                              View Attempts
                            </Button>
                          </div>
                        )}

                        <div className="flex justify-between items-center">
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {hasAttempted ? `${maxAttempts - attempts.length} attempt(s) remaining` : `${maxAttempts} attempt(s) available`}
                          </div>
                          
                          {!isCompleted && (
                            <Button
                              onClick={() => handleTakeQuiz(quiz)}
                              className="bg-primary text-white hover:bg-primary-600"
                            >
                              <Play className="h-4 w-4 mr-2" />
                              {hasAttempted ? 'Retake Quiz' : 'Take Quiz'}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
