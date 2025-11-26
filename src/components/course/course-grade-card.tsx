'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/auth-context';
import { FileText, CheckCircle, Clock } from 'lucide-react';

interface CourseGradeCardProps {
  courseId: string;
}

export default function CourseGradeCard({ courseId }: CourseGradeCardProps) {
  const { user, session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [gradeData, setGradeData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGrade = async () => {
      if (!user || !session?.access_token) return;

      try {
        setLoading(true);
        const response = await fetch(`/api/courses/${courseId}/grade`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to fetch course grade');
        }

        const data = await response.json();
        setGradeData(data.courseGrade);
      } catch (err) {
        console.error('Error fetching course grade:', err);
        setError(err instanceof Error ? err.message : 'Failed to load grade');
      } finally {
        setLoading(false);
      }
    };

    fetchGrade();
  }, [courseId, user, session?.access_token]);

  if (loading) {
    return (
      <Card className="border-gray-200 dark:border-gray-700">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 dark:border-red-900">
        <CardContent className="p-6">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!gradeData) {
    return (
      <Card className="border-gray-200 dark:border-gray-700">
        <CardContent className="p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No grade data available for this course yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { overallPercentage, letterGrade, assignmentAverage, quizAverage, statistics, breakdown } = gradeData;

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600 dark:text-green-400';
    if (percentage >= 80) return 'text-blue-600 dark:text-blue-400';
    if (percentage >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getGradeBadgeVariant = (percentage: number): 'default' | 'secondary' | 'destructive' => {
    if (percentage >= 90) return 'default';
    if (percentage >= 70) return 'secondary';
    return 'destructive';
  };

  return (
    <Card className="border-gray-200 dark:border-gray-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl text-gray-900 dark:text-white">
            Course Grade
          </CardTitle>
          <Badge variant={getGradeBadgeVariant(overallPercentage)} className="text-lg px-3 py-1">
            {letterGrade}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Grade */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Overall Grade
            </span>
            <span className={`text-2xl font-bold ${getGradeColor(overallPercentage)}`}>
              {overallPercentage.toFixed(1)}%
            </span>
          </div>
          <Progress value={overallPercentage} className="h-3" />
        </div>

        {/* Averages */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <FileText className="h-4 w-4" />
              <span>Assignment Avg</span>
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {assignmentAverage.toFixed(1)}%
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <CheckCircle className="h-4 w-4" />
              <span>Quiz Avg</span>
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {quizAverage.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {statistics.gradedAssignments}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Graded Assignments
            </div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {statistics.completedQuizzes}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Completed Quizzes
            </div>
          </div>
        </div>

        {/* Missing/Pending Items */}
        {(statistics.missingAssignments > 0 || statistics.pendingQuizzes > 0) && (
          <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-sm font-medium text-yellow-700 dark:text-yellow-400">
              <Clock className="h-4 w-4" />
              <span>Pending Items</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {statistics.missingAssignments > 0 && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {statistics.missingAssignments} assignments not graded
                </div>
              )}
              {statistics.pendingQuizzes > 0 && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {statistics.pendingQuizzes} quizzes incomplete
                </div>
              )}
            </div>
          </div>
        )}

        {/* Detailed Breakdown */}
        {(breakdown.assignments.length > 0 || breakdown.quizzes.length > 0) && (
          <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              Grade Breakdown
            </h4>

            {/* Assignments */}
            {breakdown.assignments.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Assignments
                </div>
                <div className="space-y-1">
                  {breakdown.assignments.map((item: any) => (
                    <div key={item.assignment_id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 dark:text-gray-300 truncate flex-1">
                        {item.assignment_title}
                      </span>
                      <span className={`font-medium ml-2 ${getGradeColor(parseFloat(item.percentage))}`}>
                        {item.percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quizzes */}
            {breakdown.quizzes.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Quizzes
                </div>
                <div className="space-y-1">
                  {breakdown.quizzes.map((item: any) => (
                    <div key={item.quiz_id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 dark:text-gray-300 truncate flex-1">
                        {item.quiz_title}
                      </span>
                      <span className={`font-medium ml-2 ${getGradeColor(parseFloat(item.percentage))}`}>
                        {item.percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

