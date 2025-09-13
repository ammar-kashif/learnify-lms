'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Eye, Users, Clock, Award } from 'lucide-react';
import { toast } from 'sonner';
import { Quiz } from '@/types/quiz';

interface QuizListProps {
  quizzes: Quiz[];
  onEdit: (quiz: Quiz) => void;
  onDelete: (quizId: string) => void;
  onViewAttempts: (quizId: string) => void;
  onCreateNew: () => void;
  loading?: boolean;
}

export default function QuizList({ 
  quizzes, 
  onEdit, 
  onDelete, 
  onViewAttempts, 
  onCreateNew, 
  loading = false 
}: QuizListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (quizId: string) => {
    if (window.confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
      setDeletingId(quizId);
      try {
        await onDelete(quizId);
        toast.success('Quiz deleted successfully');
      } catch (error) {
        toast.error('Failed to delete quiz');
      } finally {
        setDeletingId(null);
      }
    }
  };

  const getTotalPoints = (quiz: Quiz) => {
    return quiz.questions.reduce((sum, q) => sum + q.points, 0);
  };

  const getTimeLimitText = (settings: any) => {
    const timeLimit = settings?.time_limit;
    if (!timeLimit) return 'No time limit';
    return `${timeLimit} min`;
  };

  if (loading) {
    return (
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
    );
  }

  if (quizzes.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Award className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No quizzes yet
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4 text-center">
            Create your first quiz to start assessing your students
          </p>
          <Button onClick={onCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            Create Quiz
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Quizzes ({quizzes.length})</h3>
        <Button onClick={onCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          Create Quiz
        </Button>
      </div>

      <div className="grid gap-4">
        {quizzes.map((quiz) => (
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
                  <Badge variant="secondary">
                    {quiz.questions.length} questions
                  </Badge>
                  <Badge variant="outline">
                    {getTotalPoints(quiz)} points
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                  <Clock className="h-4 w-4" />
                  <span>{getTimeLimitText(quiz.settings)}</span>
                </div>
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

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewAttempts(quiz.id)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Attempts
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(quiz)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(quiz.id)}
                  disabled={deletingId === quiz.id}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {deletingId === quiz.id ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
