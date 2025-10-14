'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, User } from 'lucide-react';
import { Quiz, QuizAttempt } from '@/types/quiz';
import { toast } from 'sonner';

interface QuizGradingProps {
  quiz: Quiz;
  attempts: QuizAttempt[];
  onGradingComplete?: () => void;
}

export default function QuizGrading({ quiz, attempts, onGradingComplete }: QuizGradingProps) {
  const [currentAttemptIndex, setCurrentAttemptIndex] = useState(0);
  const [gradingData, setGradingData] = useState<{ [attemptId: string]: { [questionId: string]: { points: number; feedback: string } } }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentAttempt = attempts[currentAttemptIndex];
  const textQuestions = quiz.questions.filter(q => q.type === 'text');
  const textAnswers = currentAttempt?.answers.filter(a => 
    textQuestions.some(q => q.id === a.question_id)
  ) || [];

  const updateGrading = (questionId: string, points: number, feedback: string) => {
    setGradingData(prev => ({
      ...prev,
      [currentAttempt.id]: {
        ...prev[currentAttempt.id],
        [questionId]: { points, feedback }
      }
    }));
  };

  const getGradingForQuestion = (questionId: string) => {
    return gradingData[currentAttempt.id]?.[questionId] || { points: 0, feedback: '' };
  };

  const submitGrading = async () => {
    if (!currentAttempt) return;

    setIsSubmitting(true);
    try {
      // Get session properly
      const { data: { session } } = await import('@/lib/supabase').then(m => m.supabase.auth.getSession());
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/quizzes/${quiz.id}/grade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          attemptId: currentAttempt.id,
          grading: gradingData[currentAttempt.id] || {}
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit grading');
      }

      toast.success('Grading submitted successfully!');
      onGradingComplete?.();
    } catch (error) {
      console.error('Error submitting grading:', error);
      toast.error('Failed to submit grading');
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextAttempt = () => {
    if (currentAttemptIndex < attempts.length - 1) {
      setCurrentAttemptIndex(currentAttemptIndex + 1);
    }
  };

  const prevAttempt = () => {
    if (currentAttemptIndex > 0) {
      setCurrentAttemptIndex(currentAttemptIndex - 1);
    }
  };

  if (!currentAttempt) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">No attempts to grade</p>
        </CardContent>
      </Card>
    );
  }

  const totalPoints = textAnswers.reduce((sum, answer) => {
    const question = textQuestions.find(q => q.id === answer.question_id);
    return sum + (question?.points || 0);
  }, 0);

  const gradedPoints = textAnswers.reduce((sum, answer) => {
    const grading = getGradingForQuestion(answer.question_id);
    return sum + grading.points;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Grade Quiz: {quiz.title}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Attempt {currentAttemptIndex + 1} of {attempts.length}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant="outline">
            {gradedPoints}/{totalPoints} points graded
          </Badge>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={prevAttempt}
              disabled={currentAttemptIndex === 0}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={nextAttempt}
              disabled={currentAttemptIndex === attempts.length - 1}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Student Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Student: {currentAttempt.student_name || 'Unknown'}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Submitted:</span> {new Date(currentAttempt.created_at).toLocaleString()}
            </div>
            <div>
              <span className="font-medium">Current Score:</span> {currentAttempt.score}/{currentAttempt.max_score}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Text Questions to Grade */}
      <div className="space-y-4">
        {textAnswers.map((answer) => {
          const question = textQuestions.find(q => q.id === answer.question_id);
          if (!question) return null;

          const grading = getGradingForQuestion(question.id);
          const isGraded = grading.points > 0 || grading.feedback.trim() !== '';

          return (
            <Card key={question.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Question: {question.question}</CardTitle>
                  <div className="flex items-center space-x-2">
                    {isGraded ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <Clock className="h-5 w-5 text-yellow-500" />
                    )}
                    <Badge variant={isGraded ? "default" : "outline"}>
                      {isGraded ? 'Graded' : 'Pending'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Student's Answer */}
                <div>
                  <Label className="text-sm font-medium">Student&apos;s Answer:</Label>
                  <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                    <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                      {answer.text_answer || answer.selected_answer || 'No answer provided'}
                    </p>
                  </div>
                </div>

                {/* Expected Answer (if provided) */}
                {question.correct_text_answer && (
                  <div>
                    <Label className="text-sm font-medium">Expected Answer:</Label>
                    <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <p className="text-green-900 dark:text-green-100 whitespace-pre-wrap">
                        {question.correct_text_answer}
                      </p>
                    </div>
                  </div>
                )}

                {/* Grading Interface */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`points-${question.id}`}>
                      Points (0-{question.points})
                    </Label>
                    <Input
                      id={`points-${question.id}`}
                      type="number"
                      min="0"
                      max={question.points}
                      value={grading.points}
                      onChange={(e) => updateGrading(question.id, parseInt(e.target.value) || 0, grading.feedback)}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`feedback-${question.id}`}>
                      Feedback (Optional)
                    </Label>
                    <Textarea
                      id={`feedback-${question.id}`}
                      value={grading.feedback}
                      onChange={(e) => updateGrading(question.id, grading.points, e.target.value)}
                      placeholder="Provide feedback to the student..."
                      rows={3}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end space-x-4">
        <Button
          onClick={submitGrading}
          disabled={isSubmitting || textAnswers.length === 0}
          className="bg-green-600 hover:bg-green-700"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Grading'}
        </Button>
      </div>
    </div>
  );
}
