'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Play, Clock, Award, Users, Eye, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Quiz, QuizAttempt } from '@/types/quiz';
import QuizForm from './quiz-form';
import QuizAttempts from './quiz-attempts';
import QuizTaker from './quiz-taker';

interface QuizSectionProps {
  courseId: string;
  userRole: 'student' | 'teacher' | 'superadmin';
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
  const [allStudentAttempts, setAllStudentAttempts] = useState<Map<string, QuizAttempt[]>>(new Map());

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

  // Load student attempts for each quiz
  const loadStudentAttempts = useCallback(async (quizIds: string[]) => {
    if (userRole !== 'student' || !session) return;

    try {
      const attemptsMap = new Map<string, QuizAttempt[]>();
      
      for (const quizId of quizIds) {
        const response = await fetch(`/api/quizzes/${quizId}/attempt`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          attemptsMap.set(quizId, data.attempts || []);
        }
      }
      
      setStudentAttempts(attemptsMap);
    } catch (error) {
      console.error('Error loading student attempts:', error);
    }
  }, [userRole, session]);

  // Load student names for display
  const [studentNames, setStudentNames] = useState<Map<string, string>>(new Map());
  const [namesLoading, setNamesLoading] = useState(false);
  
  const loadStudentNames = useCallback(async (studentIds: string[]) => {
    if (!session || studentIds.length === 0) return;
    
    setNamesLoading(true);
    try {
      const response = await fetch(`/api/users/names?ids=${studentIds.join(',')}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const namesMap = new Map<string, string>();
        data.users?.forEach((user: any) => {
          namesMap.set(user.id, user.full_name || user.email || 'Unknown Student');
        });
        setStudentNames(namesMap);
      }
    } catch (error) {
      console.error('Error loading student names:', error);
    } finally {
      setNamesLoading(false);
    }
  }, [session]);

  // Load all student attempts for teachers
const loadAllStudentAttempts = useCallback(async (quizIds: string[]) => {
    if (userRole !== 'teacher' || !session) return;

    try {
      const attemptsMap = new Map<string, QuizAttempt[]>();
      const allStudentIds = new Set<string>();
      
      for (const quizId of quizIds) {
        const response = await fetch(`/api/quizzes/${quizId}/attempt?allStudents=true`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const attempts = data.attempts || [];
          attemptsMap.set(quizId, attempts);
          
          // Collect all student IDs for name loading
          attempts.forEach((attempt: QuizAttempt) => allStudentIds.add(attempt.student_id));
        }
      }
      
      setAllStudentAttempts(attemptsMap);
      
      // Load student names immediately after getting attempts
      if (allStudentIds.size > 0) {
        await loadStudentNames(Array.from(allStudentIds));
      }
    } catch (error) {
      console.error('Error loading all student attempts:', error);
    }
  }, [userRole, session, loadStudentNames]);

  // Load quizzes
  useEffect(() => {
    if (!session) {
      console.log('⏳ Waiting for session to load...');
      return;
    }
    
    console.log('✅ Session available, loading quizzes...');
    
    const loadQuizzes = async () => {
      setLoading(true);
      try {
        console.log('🔍 Fetching quizzes for course:', courseId, 'user:', userId);
        
        const response = await fetch(`/api/quizzes?courseId=${courseId}&userId=${userId}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        console.log('📡 Quiz API response status:', response.status);

        if (!response.ok) {
          const errorData = await response.json();
          console.error('❌ Quiz API error:', errorData);
          throw new Error(`Failed to fetch quizzes: ${errorData.error || response.statusText}`);
        }

        const data = await response.json();
        console.log('📋 Quiz API response data:', data);
        
        const quizzesData = data.quizzes || [];
        console.log('✅ Quizzes loaded:', quizzesData.length, 'quizzes');
        setQuizzes(quizzesData);
        
        // Load student attempts if user is a student
        if (userRole === 'student') {
          const quizIds = quizzesData.map((q: Quiz) => q.id);
          await loadStudentAttempts(quizIds);
        }
        
        // Load all student attempts if user is a teacher
        if (userRole === 'teacher') {
          const quizIds = quizzesData.map((q: Quiz) => q.id);
          await loadAllStudentAttempts(quizIds);
        }
      } catch (error) {
        console.error('Error loading quizzes:', error);
        toast.error('Failed to load quizzes');
      } finally {
        setLoading(false);
      }
    };

    loadQuizzes();
  }, [courseId, userId, session, userRole, loadAllStudentAttempts, loadStudentAttempts]);


  // Load attempts for a specific quiz
  const loadAttempts = async (quizId: string) => {
    if (!session) return;

    try {
      const response = await fetch(`/api/quizzes/${quizId}/attempt`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch attempts');
      }

      const data = await response.json();
      setAttempts(data.attempts || []);
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

  const handleDeleteQuiz = async (quizId: string) => {
    if (!session) return;

    try {
      const response = await fetch(`/api/quizzes/${quizId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete quiz');
      }

      setQuizzes(prev => prev.filter(q => q.id !== quizId));
      toast.success('Quiz deleted successfully!');
    } catch (error: any) {
      console.error('Error deleting quiz:', error);
      toast.error(error.message || 'Failed to delete quiz');
      throw error; // Re-throw to let QuizList handle the error state
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
      <div className="flex items-center justify-between pl-0 pt-2">
        <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white tracking-tight">Quizzes</h2>
        {userRole === 'teacher' && (
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Quiz
          </Button>
        )}
      </div>

      {userRole === 'teacher' ? (
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
                const studentAttempts = allStudentAttempts.get(quiz.id) || [];
                const uniqueStudents = new Set(studentAttempts.map(attempt => attempt.student_id));
                const averageScore = studentAttempts.length > 0 
                  ? Math.round(studentAttempts.reduce((sum, attempt) => sum + (attempt.score / attempt.max_score) * 100, 0) / studentAttempts.length)
                  : 0;

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

                      {/* Student Results Section */}
                      {studentAttempts.length > 0 && !namesLoading && (
                        <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-gray-900 dark:text-white">Student Results</h4>
                            <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-300">
                              <span>{uniqueStudents.size} students</span>
                              <span>{studentAttempts.length} attempts</span>
                              <span>Avg: {averageScore}%</span>
                            </div>
                          </div>
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {Array.from(uniqueStudents).map((studentId) => {
                              const studentSpecificAttempts = studentAttempts.filter(attempt => attempt.student_id === studentId);
                              const latestAttempt = studentSpecificAttempts[studentSpecificAttempts.length - 1];
                              const percentage = Math.round((latestAttempt.score / latestAttempt.max_score) * 100);
                              const isPassing = percentage >= 70;
                              
                              return (
                                <div key={studentId} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded">
                                  <div className="flex items-center space-x-3">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                      isPassing ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                                    }`}>
                                      {percentage}%
                                    </div>
                                    <div>
                                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                                        {studentNames.get(studentId) || `Student ${studentId.slice(0, 8)}...`}
                                      </div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400">
                                        {studentSpecificAttempts.length} attempt(s)
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                      {latestAttempt.score}/{latestAttempt.max_score} points
                                    </div>
                                    <div className={`text-xs ${isPassing ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                      {isPassing ? 'Passed' : 'Failed'}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewAttempts(quiz.id)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Attempts
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingQuiz(quiz)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteQuiz(quiz.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
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
              {quizzes
                .map((quiz) => {
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

                        {hasAttempted && attempts.length > 0 && (
                          <div className={`mb-4 p-4 rounded-lg ${isCompleted ? 'bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 border border-green-300 dark:border-green-700' : 'bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800 dark:to-slate-800'}`}>
                            {isCompleted ? (
                              // Cool results display for completed quizzes
                              <div className="flex items-center justify-between">
                                {/* Left side - Status and Info */}
                                <div className="flex items-center space-x-4">
                                  {/* Status Icon */}
                                  {(() => {
                                    const latestAttempt = attempts[attempts.length - 1];
                                    const percentage = Math.round((latestAttempt.score / latestAttempt.max_score) * 100);
                                    const isPassing = percentage >= 70;
                                    
                                    return (
                                      <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                                        isPassing ? 'bg-green-500' : 'bg-red-500'
                                      }`}>
                                        {isPassing ? (
                                          <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                          </svg>
                                        ) : (
                                          <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                          </svg>
                                        )}
                                      </div>
                                    );
                                  })()}

                                  {/* Quiz Info */}
                                  <div>
                                    <h4 className="font-semibold text-gray-900 dark:text-white">Quiz Results</h4>
                                    {(() => {
                                      const latestAttempt = attempts[attempts.length - 1];
                                      const percentage = Math.round((latestAttempt.score / latestAttempt.max_score) * 100);
                                      const isPassing = percentage >= 70;
                                      const grade = percentage >= 90 ? 'A+' : percentage >= 80 ? 'A' : percentage >= 70 ? 'B' : percentage >= 60 ? 'C' : 'D';
                                      
                                      return (
                                        <div className="flex items-center space-x-2 mt-1">
                                          <Badge className={`text-sm px-2 py-1 ${
                                            isPassing 
                                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                          }`}>
                                            {grade} ({percentage}%)
                                          </Badge>
                                          <span className="text-sm text-gray-600 dark:text-gray-400">
                                            {latestAttempt.score}/{latestAttempt.max_score} points
                                          </span>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </div>

                                {/* Right side - Message and Button */}
                                <div className="flex items-center space-x-3">
                                  {(() => {
                                    const latestAttempt = attempts[attempts.length - 1];
                                    const percentage = Math.round((latestAttempt.score / latestAttempt.max_score) * 100);
                                    const isPassing = percentage >= 70;
                                    
                                    return (
                                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {isPassing ? '🎉 Congratulations!' : '💪 Keep trying!'}
                                      </span>
                                    );
                                  })()}
                                  
                                  <Button 
                                    onClick={() => handleReviewAnswers(quiz)}
                                    size="sm" 
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                  >
                                    📝 Review
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              // Regular display for incomplete quizzes
                              <div>
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                                    Previous Attempts:
                                  </h4>
                                </div>
                                <div className="space-y-2">
                                  {attempts.map((attempt, index) => {
                                    const percentage = Math.round((attempt.score / attempt.max_score) * 100);
                                    const isPassing = percentage >= 70;
                                    
                                    return (
                                      <div key={attempt.id} className="p-3 rounded-lg bg-white dark:bg-gray-800">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center space-x-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                              isPassing ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                                            }`}>
                                              {percentage}%
                                            </div>
                                            <div>
                                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                Attempt {index + 1}
                                              </div>
                                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {attempt.completed_at ? new Date(attempt.completed_at).toLocaleDateString() : 'Unknown date'}
                                              </div>
                                            </div>
                                          </div>
                                          <div className="text-right">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                              {attempt.score}/{attempt.max_score} points
                                            </div>
                                            <div className={`text-xs ${isPassing ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                              {isPassing ? 'Passed' : 'Failed'}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex justify-between items-center">
                          {isCompleted ? (
                            <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                              Quiz completed - No more attempts allowed
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {hasAttempted ? `${maxAttempts - attempts.length} attempt(s) remaining` : `${maxAttempts} attempt(s) available`}
                            </div>
                          )}
                          
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
