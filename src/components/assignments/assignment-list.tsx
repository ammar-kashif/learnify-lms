'use client';

import { useState, useEffect, useCallback } from 'react';
import { SkeletonList } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  FileText, 
  Upload, 
  Edit, 
  Trash2, 
  Plus,
  Users,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';
import { EmptyState, panel } from '@/components/course/course-ui';
import { cn } from '@/lib/utils';

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
  due_date: string | null;
  max_points: number;
  allowed_file_types: string[];
  max_file_size_mb: number;
  max_submissions: number;
  is_published: boolean;
  created_at: string;
  chapters?: {
    id: string;
    title: string;
  } | null;
  users?: {
    id: string;
    full_name: string;
  };
  submissions?: AssignmentSubmission[];
  student_submission?: {
    assignment_id: string;
    grade: number | null;
    status: 'submitted' | 'graded' | 'returned';
    submitted_at: string;
  } | null;
}

interface AssignmentSubmission {
  id: string;
  submission_number: number;
  submitted_at: string;
  grade: number | null;
  feedback: string | null;
  status: 'submitted' | 'graded' | 'returned';
}

interface AssignmentListProps {
  courseId: string;
  userRole: string;
  onCreateAssignment?: () => void;
  onEditAssignment?: (assignment: Assignment) => void;
  onViewSubmissions?: (assignment: Assignment) => void;
  onSubmitAssignment?: (assignment: Assignment) => void;
  onViewGrade?: (assignment: Assignment) => void;
  /** Off when the page already renders its own section heading above the list. */
  showHeading?: boolean;
}

export default function AssignmentList({
  courseId,
  userRole,
  onCreateAssignment,
  onEditAssignment,
  onViewSubmissions,
  onSubmitAssignment,
  onViewGrade,
  showHeading = true
}: AssignmentListProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { session } = useAuth();

  const fetchAssignments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/assignments?courseId=${courseId}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch assignments');
      }

      const data = await response.json();
      setAssignments(data.assignments || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch assignments');
      toast.error('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  }, [courseId, session?.access_token]);

  useEffect(() => {
    if (courseId && session?.access_token) {
      fetchAssignments();
    }
  }, [courseId, session?.access_token, fetchAssignments]);

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to delete this assignment? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/assignments/${assignmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete assignment');
      }

      toast.success('Assignment deleted successfully');
      fetchAssignments();
    } catch (error) {
      console.error('Error deleting assignment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete assignment');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No due date';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const getSubmissionStatus = (assignment: Assignment) => {
    if (userRole !== 'student') return null;
    if (assignment.student_submission) {
      return assignment.student_submission.status === 'graded' ? 'graded' : 'submitted';
    }
    const submissions = assignment.submissions || [];
    if (submissions.length === 0) return 'not_submitted';
    const latestSubmission = submissions[0];
    if (latestSubmission.grade !== null) return 'graded';
    return 'submitted';
  };

  const getStatusBadge = (assignment: Assignment) => {
    const status = getSubmissionStatus(assignment);
    
    if (userRole === 'student') {
      switch (status) {
        case 'not_submitted':
          return isOverdue(assignment.due_date) ? (
            <Badge variant="destructive">Overdue</Badge>
          ) : (
            <Badge variant="secondary">Not Submitted</Badge>
          );
        case 'submitted':
          return <Badge variant="default">Submitted</Badge>;
        case 'graded':
          return <Badge variant="outline">Graded</Badge>;
        default:
          return null;
      }
    } else {
      return assignment.is_published ? (
        <Badge variant="default">Published</Badge>
      ) : (
        <Badge variant="secondary">Draft</Badge>
      );
    }
  };

  if (loading) {
    return (
      <div role="status" aria-live="polite" aria-busy="true" className="py-4">
        <span className="sr-only">Loading assignments…</span>
        <SkeletonList rows={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn(panel, 'flex flex-col items-center px-6 py-16 text-center')}>
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950/40">
          <AlertCircle className="h-7 w-7 text-red-500" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
          Couldn&apos;t load assignments
        </h3>
        <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400">{error}</p>
        <Button onClick={fetchAssignments} variant="outline" className="mt-5 rounded-xl">
          Try again
        </Button>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No assignments"
        description={
          userRole === 'student'
            ? 'No assignments have been published yet.'
            : 'No assignments have been created for this course.'
        }
        action={
          userRole !== 'student' && onCreateAssignment ? (
            <Button
              onClick={onCreateAssignment}
              className="rounded-xl bg-primary text-white shadow-sm shadow-primary/25 hover:bg-primary-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create first assignment
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      {(showHeading || (userRole !== 'student' && onCreateAssignment)) && (
        <div className="flex items-center justify-between gap-3">
          {showHeading ? (
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Assignments</h2>
          ) : (
            <span />
          )}
          {userRole !== 'student' && onCreateAssignment && (
            <Button
              onClick={onCreateAssignment}
              className="rounded-xl bg-primary text-white shadow-sm shadow-primary/25 hover:bg-primary-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create assignment
            </Button>
          )}
        </div>
      )}

      {/* Assignments List */}
      <div className="grid gap-4">
        {assignments.map((assignment) => (
          <Card
            key={assignment.id}
            className={cn(panel, 'transition-all duration-300 hover:border-primary/30 hover:shadow-depth-lg')}
          >
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  <CardTitle className="flex flex-wrap items-center gap-2 text-lg text-gray-900 dark:text-white">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 dark:bg-primary/15">
                      <FileText className="h-[18px] w-[18px] text-primary" />
                    </span>
                    {assignment.title}
                    {userRole === 'student' ? (
                      getSubmissionStatus(assignment) === 'graded' ? (
                        <Badge
                          variant="outline"
                          className="border-emerald-300 text-emerald-700 dark:border-emerald-900/60 dark:text-emerald-400"
                        >
                          Graded
                        </Badge>
                      ) : getSubmissionStatus(assignment) === 'submitted' ? (
                        <Badge
                          variant="outline"
                          className="border-amber-300 text-amber-700 dark:border-amber-900/60 dark:text-amber-400"
                        >
                          Submitted
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Not submitted</Badge>
                      )
                    ) : (
                      getStatusBadge(assignment)
                    )}
                  </CardTitle>
                  {assignment.chapters && (
                    <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400">
                      Chapter: {assignment.chapters.title}
                    </p>
                  )}
                </div>
                {userRole !== 'student' && (
                  <div className="flex gap-2">
                    {onViewSubmissions && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewSubmissions(assignment)}
                      >
                        <Users className="h-4 w-4 mr-1" />
                        Submissions
                      </Button>
                    )}
                    {onEditAssignment && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEditAssignment(assignment)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteAssignment(assignment.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {assignment.description && (
                <p className="mb-3 leading-relaxed text-gray-700 dark:text-gray-300">
                  {assignment.description}
                </p>
              )}

              {/* Removed inline banner; status now shown via badge next to title */}

              <div className="grid grid-cols-1 gap-3 rounded-xl bg-gray-50 p-3 text-sm md:grid-cols-3 dark:bg-gray-800/50">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 flex-shrink-0 text-primary" />
                  <span
                    className={
                      isOverdue(assignment.due_date)
                        ? 'font-medium text-red-600 dark:text-red-400'
                        : 'text-gray-700 dark:text-gray-300'
                    }
                  >
                    {formatDate(assignment.due_date)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 flex-shrink-0 text-primary" />
                  <span className="text-gray-700 dark:text-gray-300">
                    {assignment.max_points} points
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4 flex-shrink-0 text-primary" />
                  <span className="truncate text-gray-700 dark:text-gray-300">
                    {assignment.allowed_file_types.join(', ').toUpperCase()}
                  </span>
                </div>
              </div>

              {assignment.instructions && (
                <div className="mt-3 rounded-xl border border-gray-100 p-3 dark:border-gray-800">
                  <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                    <strong className="font-semibold text-gray-900 dark:text-white">
                      Instructions:
                    </strong>{' '}
                    {assignment.instructions}
                  </p>
                  {assignment.attachment_url && (
                    <div className="mt-2">
                      <a
                        href={assignment.attachment_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center text-sm text-primary underline"
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        {assignment.attachment_name || 'View attachment'}
                      </a>
                    </div>
                  )}
                </div>
              )}

              {userRole === 'student' && (
                <div className="mt-4 flex justify-end gap-2">
                  {getSubmissionStatus(assignment) === 'graded' && onViewGrade && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewGrade(assignment)}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      View Grade
                    </Button>
                  )}
                  {getSubmissionStatus(assignment) !== 'graded' && onSubmitAssignment && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSubmitAssignment(assignment)}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {getSubmissionStatus(assignment) === 'not_submitted' ? 'Submit Assignment' : 'Resubmit'}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
