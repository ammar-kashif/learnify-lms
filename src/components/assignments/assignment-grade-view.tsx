'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  File, 
  Download, 
  CheckCircle, 
  Clock, 
  Star,
  MessageSquare,
  AlertCircle,
  FileText
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

interface AssignmentSubmission {
  id: string;
  submission_number: number;
  file_url: string;
  file_name: string;
  file_size: number;
  file_type: string;
  submitted_at: string;
  grade: number | null;
  feedback: string | null;
  status: 'submitted' | 'graded' | 'returned';
}

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  due_date: string | null;
  max_points: number;
  allowed_file_types: string[];
  max_file_size_mb: number;
  max_submissions: number;
  is_published: boolean;
  created_at: string;
}

interface AssignmentGradeViewProps {
  assignment: Assignment;
}

export default function AssignmentGradeView({ assignment }: AssignmentGradeViewProps) {
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const { session } = useAuth();

  const fetchSubmissions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/assignments/${assignment.id}/submissions`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch submissions');
      }

      const data = await response.json();
      setSubmissions(data.submissions || []);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  }, [assignment.id, session?.access_token]);

  useEffect(() => {
    if (assignment.id && session?.access_token) {
      fetchSubmissions();
    }
  }, [assignment.id, session?.access_token, fetchSubmissions]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (submission: AssignmentSubmission) => {
    switch (submission.status) {
      case 'submitted':
        return <Badge variant="default">Submitted</Badge>;
      case 'graded':
        return <Badge variant="outline">Graded</Badge>;
      case 'returned':
        return <Badge variant="secondary">Returned</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getGradeColor = (grade: number, maxPoints: number) => {
    const percentage = (grade / maxPoints) * 100;
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 80) return 'text-blue-600';
    if (percentage >= 70) return 'text-yellow-600';
    if (percentage >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const getGradeLetter = (grade: number, maxPoints: number) => {
    const percentage = (grade / maxPoints) * 100;
    if (percentage >= 97) return 'A+';
    if (percentage >= 93) return 'A';
    if (percentage >= 90) return 'A-';
    if (percentage >= 87) return 'B+';
    if (percentage >= 83) return 'B';
    if (percentage >= 80) return 'B-';
    if (percentage >= 77) return 'C+';
    if (percentage >= 73) return 'C';
    if (percentage >= 70) return 'C-';
    if (percentage >= 67) return 'D+';
    if (percentage >= 63) return 'D';
    if (percentage >= 60) return 'D-';
    return 'F';
  };

  const isOverdue = assignment.due_date && new Date(assignment.due_date) < new Date();
  const latestSubmission = submissions.length > 0 ? submissions[0] : null;
  const isGraded = latestSubmission?.status === 'graded';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2 text-gray-600">Loading assignment details...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Assignment Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {assignment.title}
            {getStatusBadge(latestSubmission || { status: 'submitted' } as AssignmentSubmission)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assignment.description && (
            <p className="text-gray-700 mb-4">{assignment.description}</p>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className={isOverdue ? 'text-red-600' : 'text-gray-600'}>
                Due: {assignment.due_date ? formatDate(assignment.due_date) : 'No due date'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">{assignment.max_points} points</span>
            </div>
            <div className="flex items-center gap-2">
              <File className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">
                {assignment.allowed_file_types.join(', ').toUpperCase()}
              </span>
            </div>
          </div>

          {assignment.instructions && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">Instructions</h3>
              <p className="text-sm text-blue-800">{assignment.instructions}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grade Display */}
      {isGraded && latestSubmission && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-900">
              <CheckCircle className="h-5 w-5" />
              Assignment Graded
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className={`text-3xl font-bold ${getGradeColor(latestSubmission.grade!, assignment.max_points)}`}>
                  {latestSubmission.grade}
                </div>
                <div className="text-sm text-gray-600">out of {assignment.max_points}</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${getGradeColor(latestSubmission.grade!, assignment.max_points)}`}>
                  {getGradeLetter(latestSubmission.grade!, assignment.max_points)}
                </div>
                <div className="text-sm text-gray-600">Letter Grade</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${getGradeColor(latestSubmission.grade!, assignment.max_points)}`}>
                  {Math.round((latestSubmission.grade! / assignment.max_points) * 100)}%
                </div>
                <div className="text-sm text-gray-600">Percentage</div>
              </div>
            </div>

            {latestSubmission.feedback && (
              <div className="mt-4 p-3 bg-white rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-gray-500" />
                  <span className="font-medium text-gray-700">Teacher Feedback</span>
                </div>
                <p className="text-gray-600">{latestSubmission.feedback}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Submission History */}
      <Card>
        <CardHeader>
          <CardTitle>Submission History</CardTitle>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Submissions</h3>
              <p className="text-gray-600">You haven&apos;t submitted this assignment yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.map((submission) => (
                <div key={submission.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        Submission #{submission.submission_number}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Submitted on {formatDate(submission.submitted_at)}
                      </p>
                    </div>
                    {getStatusBadge(submission)}
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-3">
                    <div className="flex items-center gap-3">
                      <File className="h-6 w-6 text-primary" />
                      <div>
                        <p className="font-medium text-gray-900">{submission.file_name}</p>
                        <p className="text-sm text-gray-600">{formatFileSize(submission.file_size)}</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/assignments/submissions/${submission.id}/download`, {
                            headers: { 'Authorization': `Bearer ${session?.access_token}` }
                          });
                          const data = await res.json();
                          if (!res.ok || !data.url) throw new Error(data.error || 'Failed to get download url');
                          window.location.href = data.url;
                        } catch (e) {
                          console.error(e);
                        }
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>

                  {submission.grade !== null && (
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Star className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-green-900">Grade: {submission.grade} / {assignment.max_points}</span>
                      </div>
                      {submission.feedback && (
                        <div className="mt-2">
                          <div className="flex items-center gap-2 mb-1">
                            <MessageSquare className="h-4 w-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">Feedback:</span>
                          </div>
                          <p className="text-sm text-gray-600">{submission.feedback}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
