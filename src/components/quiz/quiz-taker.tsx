'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Quiz, QuizAttempt } from '@/types/quiz';

interface QuizTakerProps {
  quiz: Quiz;
  onComplete: (attempt: QuizAttempt) => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function QuizTaker({ quiz, onComplete, onCancel, loading = false }: QuizTakerProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [questionId: string]: number | string }>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showAnswerReview, setShowAnswerReview] = useState(false);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const totalQuestions = quiz.questions.length;
  const answeredQuestions = Object.keys(answers).length;
  const progress = (answeredQuestions / totalQuestions) * 100;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerSelect = (questionId: string, answerIndex: number) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answerIndex
    }));
  };

  const handleTextAnswer = (questionId: string, textAnswer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: textAnswer
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = useCallback(async () => {
    if (isSubmitted) return;

    // Check if all questions are answered
    const unansweredQuestions = quiz.questions.filter(q => answers[q.id] === undefined);
    if (unansweredQuestions.length > 0) {
      const confirmSubmit = window.confirm(
        `You have ${unansweredQuestions.length} unanswered questions. Are you sure you want to submit?`
      );
      if (!confirmSubmit) return;
    }

    setIsSubmitted(true);

    try {
      // Prepare answers for submission
      const submitAnswers = quiz.questions.map(q => {
        const answer = answers[q.id];
        if (q.type === 'text') {
          return {
            question_id: q.id,
            text_answer: typeof answer === 'string' ? answer : '', // Text answer
          };
        } else {
          return {
            question_id: q.id,
            selected_answer: typeof answer === 'number' ? answer : -1, // -1 for unanswered
          };
        }
      });

      // Get session for API call
      const { data: { session } } = await import('@/lib/supabase').then(m => m.supabase.auth.getSession());
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/quizzes/${quiz.id}/attempt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          quiz_id: quiz.id,
          answers: submitAnswers,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit quiz');
      }

      const data = await response.json();
      setAttempt(data.attempt);
      setShowResults(true);
      onComplete(data.attempt);
      
      toast.success('Quiz submitted successfully!');
    } catch (error) {
      console.error('Error submitting quiz:', error);
      toast.error('Failed to submit quiz. Please try again.');
      setIsSubmitted(false);
    }
  }, [isSubmitted, quiz, answers, onComplete]);

  // Timer effect
  useEffect(() => {
    if (!quiz.settings?.time_limit || isSubmitted) return;

    setTimeLeft(quiz.settings.time_limit * 60); // Convert to seconds

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          // Just set to 0, let the auto-submit effect handle submission
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [quiz.settings?.time_limit, isSubmitted]);

  // Auto-submit when time runs out
  useEffect(() => {
    if (timeLeft === 0 && !isSubmitted) {
      setIsSubmitted(true);

      const submitQuiz = async () => {
        try {
          // Prepare answers for submission
          const submitAnswers = quiz.questions.map(q => {
            const answer = answers[q.id];
            if (q.type === 'text') {
              return {
                question_id: q.id,
                text_answer: typeof answer === 'string' ? answer : '', // Text answer
              };
            } else {
              return {
                question_id: q.id,
                selected_answer: typeof answer === 'number' ? answer : -1, // -1 for unanswered
              };
            }
          });

          // Get session for API call
          const { data: { session } } = await import('@/lib/supabase').then(m => m.supabase.auth.getSession());
          if (!session) {
            throw new Error('Not authenticated');
          }

          const response = await fetch(`/api/quizzes/${quiz.id}/attempt`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              quiz_id: quiz.id,
              answers: submitAnswers,
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to submit quiz');
          }

          const data = await response.json();
          setAttempt(data.attempt);
          setShowResults(true);
          onComplete(data.attempt);
          
          toast.success('Quiz submitted automatically due to time limit!');
        } catch (error) {
          console.error('Error auto-submitting quiz:', error);
          toast.error('Failed to auto-submit quiz.');
        }
      };

      submitQuiz();
    }
  }, [timeLeft, isSubmitted, quiz, answers, onComplete]);

  const getGradeColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-200';
    if (percentage >= 60) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200';
    return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200';
  };

  const getGradeText = (percentage: number) => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    return 'F';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse"></div>
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-gray-200 rounded w-3/4"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showResults && attempt) {
    // Check if there are any manually graded questions that need grading
    const hasTextQuestions = quiz.questions.some((q: any) => q.type === 'text');
    const isPendingGrading = hasTextQuestions && attempt.score === 0;
    const percentage = isPendingGrading ? 0 : Math.round((attempt.score / attempt.max_score) * 100);
    const grade = isPendingGrading ? 'Pending' : getGradeText(percentage);
    const passed = !isPendingGrading && percentage >= 60;
    
    console.log('🎯 QuizTaker: Rendering results, showAnswerReview:', showAnswerReview, 'HasTextQuestions:', hasTextQuestions);

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Quiz Results</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="flex justify-center">
              {isPendingGrading ? (
                <Clock className="h-16 w-16 text-yellow-500" />
              ) : passed ? (
                <CheckCircle className="h-16 w-16 text-green-500" />
              ) : (
                <XCircle className="h-16 w-16 text-red-500" />
              )}
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-2">{quiz.title}</h3>
              <Badge className={`text-lg px-4 py-2 ${
                isPendingGrading 
                  ? 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200'
                  : getGradeColor(percentage)
              }`}>
                {grade} {!isPendingGrading && `(${percentage}%)`}
              </Badge>
            </div>
            
            {isPendingGrading ? (
              <div className="text-center space-y-2">
                <p className="text-lg font-semibold text-yellow-600 dark:text-yellow-400">
                  Quiz Submitted Successfully!
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Your quiz contains text questions that require manual grading by your teacher.
                  You&apos;ll see your final grade once the teacher has reviewed your answers.
                </p>
                <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mt-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-400">--</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Points Earned</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{attempt.max_score}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Total Points</p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{attempt.score}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Points Earned</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{attempt.max_score}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Total Points</p>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold">
                    {passed ? 'Congratulations! You passed!' : 'Better luck next time!'}
                  </p>
                </div>
              </>
            )}
            <div className="text-center mt-6">
              <Button 
                onClick={() => {
                  console.log('🎯 QuizTaker: Review Answers button clicked');
                  setShowAnswerReview(true);
                }} 
                size="lg" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                📝 Review Answers
              </Button>
            </div>
          </CardContent>
        </Card>

        {showAnswerReview && (
          <Card>
            <CardHeader>
              <CardTitle>Answer Review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {quiz.questions.map((question, index) => {
                const answer = attempt.answers.find(a => a.question_id === question.id);
                const isCorrect = answer?.is_correct || false;
                const selectedAnswer = answer?.selected_answer ?? -1;
                const textAnswer = answer?.text_answer || (question.type === 'text' ? answer?.selected_answer : '') || '';

                return (
                  <div key={question.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-medium">Question {index + 1}</h4>
                      <div className="flex items-center space-x-2">
                        {question.type === 'text' ? (
                          <Badge variant="outline" className="text-blue-600 border-blue-600">
                            {answer?.manually_graded ? 'Graded' : 'Pending Review'}
                          </Badge>
                        ) : (
                          <>
                            {isCorrect ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                          </>
                        )}
                        <span className="text-sm font-medium">
                          {answer?.points_earned || 0}/{question.points} points
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 mb-3">{question.question}</p>
                    
                    {question.type === 'multiple_choice' ? (
                      <div className="space-y-2">
                        {question.options?.map((option, optionIndex) => {
                          const isSelected = selectedAnswer === optionIndex;
                          const isCorrectAnswer = question.correct_answer === optionIndex;
                          
                          return (
                            <div
                              key={optionIndex}
                              className={`p-2 rounded border ${
                                isSelected && isCorrectAnswer
                                  ? 'bg-green-100 border-green-500 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : isSelected && !isCorrectAnswer
                                  ? 'bg-red-100 border-red-500 text-red-800 dark:bg-red-900 dark:text-red-200'
                                  : isCorrectAnswer
                                  ? 'bg-green-50 border-green-300 text-green-700 dark:bg-green-800 dark:text-green-300'
                                  : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'
                              }`}
                            >
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">{String.fromCharCode(65 + optionIndex)}.</span>
                                <span>{option}</span>
                                {isCorrectAnswer && (
                                  <Badge variant="outline" className="text-green-600 border-green-600">
                                    Correct
                                  </Badge>
                                )}
                                {isSelected && !isCorrectAnswer && (
                                  <Badge variant="outline" className="text-red-600 border-red-600">
                                    Your Answer
                                  </Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <label htmlFor={`text-answer-${question.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Your Answer:
                          </label>
                          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                            <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                              {textAnswer || 'No answer provided'}
                            </p>
                          </div>
                        </div>
                        
                        {answer?.teacher_feedback && (
                          <div>
                            <label htmlFor={`teacher-feedback-${question.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Teacher Feedback:
                            </label>
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                              <p className="text-blue-900 dark:text-blue-100 whitespace-pre-wrap">
                                {answer.teacher_feedback}
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {question.correct_text_answer && (
                          <div>
                            <label htmlFor={`expected-answer-${question.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Expected Answer:
                            </label>
                            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                              <p className="text-green-900 dark:text-green-100 whitespace-pre-wrap">
                                {question.correct_text_answer}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        <div className="flex justify-center space-x-4">
          {showAnswerReview && (
            <Button onClick={() => setShowAnswerReview(false)} variant="outline" size="lg">
              Back to Results
            </Button>
          )}
          <Button onClick={onCancel} size="lg">
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{quiz.title}</h2>
          {quiz.description && (
            <p className="text-sm text-gray-600 dark:text-gray-300">{quiz.description}</p>
          )}
        </div>
        <div className="flex items-center space-x-4">
          {timeLeft !== null && (
            <div className="flex items-center space-x-2 text-sm">
              <Clock className="h-4 w-4" />
              <span className={timeLeft < 300 ? 'text-red-600 font-semibold' : ''}>
                {formatTime(timeLeft)}
              </span>
            </div>
          )}
          <Badge variant="outline">
            Question {currentQuestionIndex + 1} of {totalQuestions}
          </Badge>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Progress</span>
          <span>{answeredQuestions}/{totalQuestions} answered</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question */}
      <Card>
        <CardHeader>
          <CardTitle>Question {currentQuestionIndex + 1}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-lg">{currentQuestion.question}</p>
          
          {currentQuestion.type === 'multiple_choice' ? (
            <div className="space-y-2">
              {currentQuestion.options?.map((option, index) => (
                <label
                  key={index}
                  className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    answers[currentQuestion.id] === index
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${currentQuestion.id}`}
                    checked={answers[currentQuestion.id] === index}
                    onChange={() => handleAnswerSelect(currentQuestion.id, index)}
                    className="text-primary"
                  />
                  <span className="font-medium">{String.fromCharCode(65 + index)}.</span>
                  <span>{option}</span>
                </label>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <label htmlFor={`text-answer-${currentQuestion.id}`} className="block text-sm font-medium">
                Your Answer:
              </label>
              <textarea
                id={`text-answer-${currentQuestion.id}`}
                value={answers[currentQuestion.id] as string || ''}
                onChange={(e) => handleTextAnswer(currentQuestion.id, e.target.value)}
                placeholder="Type your answer here..."
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-vertical min-h-[120px]"
                rows={4}
              />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                This question will be manually graded by your teacher.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
        >
          Previous
        </Button>
         <div className="flex space-x-2">
           {currentQuestionIndex === totalQuestions - 1 ? (
             <Button
               onClick={handleSubmit}
               disabled={isSubmitted}
               className="bg-primary text-white hover:bg-primary-600"
             >
               {isSubmitted ? 'Submitting...' : 'Submit Quiz'}
             </Button>
           ) : (
             <Button
               onClick={handleNext}
               disabled={currentQuestionIndex === totalQuestions - 1}
             >
               Next
             </Button>
           )}
         </div>
      </div>

      {/* Warning for unanswered questions */}
      {answeredQuestions < totalQuestions && (
        <div className="flex items-center space-x-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <AlertCircle className="h-5 w-5 text-yellow-600" />
          <span className="text-sm text-yellow-800 dark:text-yellow-200">
            You have {totalQuestions - answeredQuestions} unanswered questions
          </span>
        </div>
      )}

    </div>
  );
}
