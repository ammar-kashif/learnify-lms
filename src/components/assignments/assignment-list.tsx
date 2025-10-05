'use client';

import { useState, useEffect, useCallback } from 'react';
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
}

export default function AssignmentList({
  courseId,
  userRole,
  onCreateAssignment,
  onEditAssignment,
  onViewSubmissions,
  onSubmitAssignment,
  onViewGrade
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
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2 text-gray-600">Loading assignments...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Assignments</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={fetchAssignments} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Assignments</h3>
        <p className="text-gray-600 mb-4">
          {userRole === 'student' 
            ? 'No assignments have been published yet.' 
            : 'No assignments have been created for this course.'}
        </p>
        {userRole !== 'student' && onCreateAssignment && (
          <Button onClick={onCreateAssignment} className="bg-primary hover:bg-primary-600">
            <Plus className="h-4 w-4 mr-2" />
            Create First Assignment
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Assignments</h2>
        {userRole !== 'student' && onCreateAssignment && (
          <Button onClick={onCreateAssignment} className="bg-primary hover:bg-primary-600">
            <Plus className="h-4 w-4 mr-2" />
            Create Assignment
          </Button>
        )}
      </div>

      {/* Assignments List */}
      <div className="grid gap-4">
        {assignments.map((assignment) => (
          <Card key={assignment.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    {assignment.title}
                    {userRole === 'student' ? (
                      getSubmissionStatus(assignment) === 'graded' ? (
                        <Badge variant="outline" className="border-green-300 text-green-800">Submitted</Badge>
                      ) : getSubmissionStatus(assignment) === 'submitted' ? (
                        <Badge variant="outline" className="border-yellow-300 text-yellow-800">Submitted</Badge>
                      ) : (
                        <Badge variant="secondary">Not Submitted</Badge>
                      )
                    ) : (
                      getStatusBadge(assignment)
                    )}
                  </CardTitle>
                  {assignment.chapters && (
                    <p className="text-sm text-gray-600 mt-1">
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
                <p className="text-gray-700 mb-3">{assignment.description}</p>
              )}

              {/* Removed inline banner; status now shown via badge next to title */}
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className={isOverdue(assignment.due_date) ? 'text-red-600' : 'text-gray-600'}>
                    {formatDate(assignment.due_date)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">{assignment.max_points} points</span>
                </div>
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">
                    {assignment.allowed_file_types.join(', ').toUpperCase()}
                  </span>
                </div>
              </div>

              {assignment.instructions && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <strong>Instructions:</strong> {assignment.instructions}
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
