'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Clock, Award, CheckCircle, XCircle } from 'lucide-react';
import { QuizAttempt, Quiz } from '@/types/quiz';

interface QuizAttemptsProps {
  quiz: Quiz;
  attempts: QuizAttempt[];
  onBack: () => void;
  loading?: boolean;
}

export default function QuizAttempts({ quiz, attempts, onBack, loading = false }: QuizAttemptsProps) {
  const [selectedAttempt, setSelectedAttempt] = useState<QuizAttempt | null>(null);

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

  const formatDuration = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.round(diffMs / (1000 * 60));
    return `${diffMins} minutes`;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse"></div>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            </CardHeader>
            <CardContent>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }


  if (attempts.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h2 className="text-xl font-semibold">Quiz Attempts</h2>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No attempts yet
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-center">
              Students haven&apos;t taken this quiz yet
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h2 className="text-xl font-semibold">Quiz Attempts</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">{quiz.title}</p>
        </div>
      </div>

      <div className="grid gap-4">
        {attempts.map((attempt) => {
          const percentage = Math.round((attempt.score / attempt.max_score) * 100);
          const grade = getGradeText(percentage);
          const passed = percentage >= 60;

          return (
            <Card 
              key={attempt.id} 
              className={`cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
                selectedAttempt?.id === attempt.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedAttempt(attempt)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{attempt.student_name || 'Student Attempt'}</CardTitle>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {new Date(attempt.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getGradeColor(percentage)}>
                      {grade} ({percentage}%)
                    </Badge>
                    {passed ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center space-x-2 text-sm">
                    <Award className="h-4 w-4 text-gray-500" />
                    <span>{attempt.score}/{attempt.max_score} points</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span>
                      {attempt.completed_at 
                        ? formatDuration(attempt.created_at, attempt.completed_at)
                        : 'In progress'
                      }
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="text-gray-500">Correct:</span>
                    <span>{attempt.answers.filter(a => a.is_correct).length}/{attempt.answers.length}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="text-gray-500">Status:</span>
                    <Badge variant={attempt.completed_at ? 'default' : 'secondary'}>
                      {attempt.completed_at ? 'Completed' : 'In Progress'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed View */}
      {selectedAttempt && (
        <Card>
          <CardHeader>
            <CardTitle>Attempt Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedAttempt.answers.map((answer, index) => {
              const question = quiz.questions.find(q => q.id === answer.question_id);
              if (!question) return null;

              return (
                <div key={answer.question_id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium">Question {index + 1}</h4>
                    <div className="flex items-center space-x-2">
                      {answer.is_correct ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <span className="text-sm font-medium">
                        {answer.points_earned}/{question.points} points
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 mb-3">{question.question}</p>
                  <div className="space-y-2">
                    {question.options.map((option, optionIndex) => {
                      const isSelected = answer.selected_answer === optionIndex;
                      const isCorrect = question.correct_answer === optionIndex;
                      
                      return (
                        <div
                          key={optionIndex}
                          className={`p-2 rounded border ${
                            isSelected && isCorrect
                              ? 'bg-green-100 border-green-500 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : isSelected && !isCorrect
                              ? 'bg-red-100 border-red-500 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : isCorrect
                              ? 'bg-green-50 border-green-300 text-green-700 dark:bg-green-800 dark:text-green-300'
                              : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{String.fromCharCode(65 + optionIndex)}.</span>
                            <span>{option}</span>
                            {isCorrect && (
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                Correct
                              </Badge>
                            )}
                            {isSelected && !isCorrect && (
                              <Badge variant="outline" className="text-red-600 border-red-600">
                                Selected
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
