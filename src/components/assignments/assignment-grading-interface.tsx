'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  File, 
  Download, 
  CheckCircle, 
  Clock, 
  User, 
  Star,
  MessageSquare,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
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
  users: {
    id: string;
    full_name: string;
    email: string;
  };
}

interface Assignment {
  id: string;
  title: string;
  max_points: number;
}

interface AssignmentGradingInterfaceProps {
  assignment: Assignment;
  onBack: () => void;
}

export default function AssignmentGradingInterface({
  assignment,
  onBack
}: AssignmentGradingInterfaceProps) {
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [gradingSubmissions, setGradingSubmissions] = useState<Set<string>>(new Set());
  const [grades, setGrades] = useState<Record<string, number>>({});
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>({});
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

      // Initialize grades and feedbacks from existing data
      const initialGrades: Record<string, number> = {};
      const initialFeedbacks: Record<string, string> = {};
      
      data.submissions.forEach((submission: AssignmentSubmission) => {
        if (submission.grade !== null) {
          initialGrades[submission.id] = submission.grade;
        }
        if (submission.feedback) {
          initialFeedbacks[submission.id] = submission.feedback;
        }
      });
      
      setGrades(initialGrades);
      setFeedbacks(initialFeedbacks);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast.error('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  }, [assignment.id, session?.access_token]);

  useEffect(() => {
    if (assignment.id && session?.access_token) {
      fetchSubmissions();
    }
  }, [assignment.id, session?.access_token, fetchSubmissions]);

  const handleGradeChange = (submissionId: string, grade: number) => {
    setGrades(prev => ({
      ...prev,
      [submissionId]: grade
    }));
  };

  const handleFeedbackChange = (submissionId: string, feedback: string) => {
    setFeedbacks(prev => ({
      ...prev,
      [submissionId]: feedback
    }));
  };

  const handleGradeSubmission = async (submissionId: string) => {
    const grade = grades[submissionId];
    const feedback = feedbacks[submissionId] || '';

    if (grade === undefined || grade === null) {
      toast.error('Please enter a grade');
      return;
    }

    if (grade < 0 || grade > assignment.max_points) {
      toast.error(`Grade must be between 0 and ${assignment.max_points}`);
      return;
    }

    setGradingSubmissions(prev => new Set(prev).add(submissionId));

    try {
      const response = await fetch(`/api/assignments/submissions/${submissionId}/grade`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          grade,
          feedback
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to grade submission');
      }

      toast.success('Submission graded successfully');
      
      // Update the submission in the list
      setSubmissions(prev => prev.map(submission => 
        submission.id === submissionId 
          ? { ...submission, grade, feedback, status: 'graded' as const }
          : submission
      ));
    } catch (error) {
      console.error('Error grading submission:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to grade submission');
    } finally {
      setGradingSubmissions(prev => {
        const newSet = new Set(prev);
        newSet.delete(submissionId);
        return newSet;
      });
    }
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2 text-gray-600">Loading submissions...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Assignments
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Grade Submissions</h2>
          <p className="text-gray-600">{assignment.title}</p>
        </div>
      </div>

      {/* Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{submissions.length}</div>
              <div className="text-sm text-gray-600">Total Submissions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {submissions.filter(s => s.status === 'graded').length}
              </div>
              <div className="text-sm text-gray-600">Graded</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {submissions.filter(s => s.status === 'submitted').length}
              </div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submissions List */}
      {submissions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <File className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Submissions</h3>
            <p className="text-gray-600">No students have submitted this assignment yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {submissions.map((submission) => (
            <Card key={submission.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" />
                      {submission.users.full_name}
                      {getStatusBadge(submission)}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      {submission.users.email}
                    </p>
                  </div>
                  <div className="text-right text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatDate(submission.submitted_at)}
                    </div>
                    <div>Submission #{submission.submission_number}</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* File Information */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <File className="h-8 w-8 text-primary" />
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
                        toast.error(e instanceof Error ? e.message : 'Download failed');
                      }
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>

                {/* Grading Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`grade-${submission.id}`} className="text-sm font-medium">
                      Grade (out of {assignment.max_points})
                    </Label>
                    <Input
                      id={`grade-${submission.id}`}
                      type="number"
                      min="0"
                      max={assignment.max_points}
                      step="0.1"
                      value={grades[submission.id] || ''}
                      onChange={(e) => handleGradeChange(submission.id, parseFloat(e.target.value) || 0)}
                      className="mt-1"
                      placeholder="Enter grade"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={() => handleGradeSubmission(submission.id)}
                      disabled={gradingSubmissions.has(submission.id)}
                      className="w-full bg-primary hover:bg-primary-600"
                    >
                      {gradingSubmissions.has(submission.id) ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Grading...
                        </>
                      ) : (
                        <>
                          <Star className="h-4 w-4 mr-2" />
                          {submission.status === 'graded' ? 'Update Grade' : 'Grade Submission'}
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Feedback */}
                <div>
                  <Label htmlFor={`feedback-${submission.id}`} className="text-sm font-medium">
                    Feedback
                  </Label>
                  <Textarea
                    id={`feedback-${submission.id}`}
                    value={feedbacks[submission.id] || ''}
                    onChange={(e) => handleFeedbackChange(submission.id, e.target.value)}
                    className="mt-1"
                    rows={3}
                    placeholder="Provide feedback for the student..."
                  />
                </div>

                {/* Current Grade Display */}
                {submission.grade !== null && (
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-900">
                        Current Grade: {submission.grade} / {assignment.max_points}
                      </span>
                    </div>
                    {submission.feedback && (
                      <div className="mt-2 p-2 bg-white rounded border">
                        <div className="flex items-center gap-2 mb-1">
                          <MessageSquare className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">Feedback:</span>
                        </div>
                        <p className="text-sm text-gray-600">{submission.feedback}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
