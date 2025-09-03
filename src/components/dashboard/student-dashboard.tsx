'use client';


import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useEffect, useState } from 'react';
import {
  BookOpen,
  Clock,
  CheckCircle,
  Play,
  Award,
  TrendingUp,
  Calendar,
  AlertCircle,
  FileText,
  Users,

  Eye,
} from 'lucide-react';
import { mockAssignments } from '@/data/mock-data';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';

export default function StudentDashboard() {
  const { user, session, loading: authLoading, userRole } = useAuth();
  const [loading, setLoading] = useState(false);
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
  const [availableCourses, setAvailableCourses] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const [enrolledRes, availableRes] = await Promise.all([
          fetch(`/api/dashboard/courses?userId=${user.id}&role=student`).then(r => r.json()),
          fetch(`/api/courses/available?studentId=${user.id}`).then(r => r.json()),
        ]);
        setEnrolledCourses(enrolledRes?.courses || []);
        setAvailableCourses(availableRes?.courses || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  // Calculate dashboard stats
  const totalCourses = enrolledCourses.length;
  const averageProgress =
    enrolledCourses.reduce(
      (sum, c) => sum + (c.enrollment?.progress_percentage ?? 0),
      0
    ) / (enrolledCourses.length || 1);
  const completedChapters = enrolledCourses.reduce((sum, c) => {
    const progress = c.enrollment?.progress_percentage ?? 0;
    return sum + Math.floor((progress / 100) * (c.duration_weeks || 0));
  }, 0);

  // Get upcoming assignments
  const upcomingAssignments = mockAssignments
    .filter(assignment => {
      const dueDate = new Date(assignment.due_date);
      const now = new Date();
      return dueDate > now;
    })
    .sort(
      (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    )
    .slice(0, 5);

  // Get recent activities
  const recentActivities = [
    {
      id: 1,
      type: 'progress',
      message: 'Completed Chapter 2 in Mathematics',
      time: '2 hours ago',
      status: 'success',
    },
    {
      id: 2,
      type: 'assignment',
      message: 'Submitted Physics Lab Report',
      time: '1 day ago',
      status: 'success',
    },
    {
      id: 3,
      type: 'enrollment',
      message: 'Enrolled in Chemistry course',
      time: '3 days ago',
      status: 'info',
    },
    {
      id: 4,
      type: 'achievement',
      message: 'Earned "Math Master" badge',
      time: '1 week ago',
      status: 'success',
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <BookOpen className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-charcoal-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'info':
        return 'text-blue-600';
      default:
        return 'text-charcoal-600';
    }
  };

  // Show access denied if user is not a student
  if (!authLoading && user && userRole && userRole !== 'student') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            This dashboard is only available for students.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Student Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Welcome back, {user?.user_metadata?.full_name || user?.email}.
            Continue your learning journey.
          </p>
        </div>

      </div>

      {/* Available O Levels Courses (Enroll) */}
      <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm" data-section="available-courses">
        <CardHeader>
          <CardTitle className="text-xl text-gray-900 dark:text-white">Available Cambridge O Levels Courses</CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-300">Enroll into new courses.</CardDescription>
        </CardHeader>
        <CardContent>
          {availableCourses.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-300">No available courses right now.</p>
          ) : (
            <div className="max-h-96 overflow-y-auto pr-2">
              <div className="grid gap-4 md:grid-cols-2">
                {availableCourses.map(course => (
                  <Card key={course.id} className="border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                    <CardHeader className="pb-3">
                      <div className="mb-2 flex items-center justify-between">
                        <Badge variant="secondary" className="border-primary/20 bg-primary/10 text-xs text-primary-700 dark:text-primary-300">
                          O Levels
                        </Badge>
                      </div>
                      <CardTitle className="text-base leading-tight text-gray-900 dark:text-white">{course.title}</CardTitle>
                      <CardDescription className="text-gray-600 dark:text-gray-300">{course.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      <div className="flex items-center justify-between text-sm">
                        <div className="text-gray-700 dark:text-gray-300">Created: {new Date(course.created_at).toLocaleDateString()}</div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-gray-900 dark:text-white">Course</div>
                        <Button
                          size="sm"
                          disabled={loading || authLoading}
                          onClick={async () => {
                            // Check if auth is still loading
                            if (authLoading) {
                              toast.info('Please wait...', {
                                description: 'Authentication is being verified.'
                              });
                              return;
                            }

                            // Check if user is not authenticated
                            if (!user) {
                              toast.error('Please sign in to register into the course', {
                                description: 'You need to be logged in to enroll in courses.',
                                action: {
                                  label: 'Sign In',
                                  onClick: () => window.location.href = '/auth/signin'
                                }
                              });
                              return;
                            }

                            // Check if user has a valid student role (strict validation)
                            if (!userRole || userRole !== 'student') {
                              toast.error('Access denied', {
                                description: userRole ? 
                                  'Only students can enroll in courses.' : 
                                  'Your account role is not verified. Please contact support.'
                              });
                              return;
                            }
                            
                            setLoading(true);
                            try {
                              const res = await fetch('/api/enrollments', {
                                method: 'POST',
                                headers: { 
                                  'Content-Type': 'application/json',
                                  Authorization: `Bearer ${session?.access_token || ''}`,
                                },
                                body: JSON.stringify({ courseId: course.id }),
                              });
                              if (res.ok) {
                                toast.success('Successfully enrolled in the course!', {
                                  description: 'You can now access the course from your dashboard.'
                                });
                                const [enrolledRes, availableRes] = await Promise.all([
                                  fetch(`/api/dashboard/courses?userId=${user.id}&role=student`).then(r => r.json()),
                                  fetch(`/api/courses/available?studentId=${user.id}`).then(r => r.json()),
                                ]);
                                setEnrolledCourses(enrolledRes?.courses || []);
                                setAvailableCourses(availableRes?.courses || []);
                              } else {
                                const data = await res.json();
                                if (res.status === 401 && data?.action?.url) {
                                  toast.error('You are not signed in. Please sign in to continue.', {
                                    action: {
                                      label: data.action.label || 'Sign In',
                                      onClick: () => (window.location.href = data.action.url),
                                    },
                                  });
                                } else {
                                  toast.error('Failed to enroll in course', {
                                    description: data.error || 'Please try again later.'
                                  });
                                }
                              }
                            } catch (error) {
                              console.error('Error enrolling in course:', error);
                              toast.error('Failed to enroll in course', {
                                description: 'An unexpected error occurred. Please try again.'
                              });
                            } finally {
                              setLoading(false);
                            }
                          }}
                        >
                          {authLoading ? 'Loading...' : 'Enroll'}
        </Button>
      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Enrolled Courses
            </CardTitle>
            <BookOpen className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {loading ? '—' : totalCourses}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Active courses
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-800 dark:to-gray-700 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary-600 dark:text-primary-400">
              Average Progress
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary-900 dark:text-white">
              {averageProgress.toFixed(1)}%
            </div>
            <p className="text-xs text-primary-600 dark:text-primary-400">
              Across all courses
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Completed Chapters
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {completedChapters}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Total completed
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-800 dark:to-gray-700 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary-600 dark:text-primary-400">
              Study Streak
            </CardTitle>
            <Award className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary-900 dark:text-white">
              7 days
            </div>
            <p className="text-xs text-primary-600 dark:text-primary-400">
              Current streak
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-7">
        {/* Course Progress */}
        <Card className="col-span-4 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-xl text-gray-900 dark:text-white">
              My Courses Progress
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300">
              Track your progress across all enrolled courses
            </CardDescription>
          </CardHeader>
          <CardContent>
            {enrolledCourses.length > 0 ? (
              <div className="max-h-96 overflow-y-auto pr-2">
              <div className="space-y-6">
                  {enrolledCourses.map(course => {
                    const progress = course.enrollment?.progress_percentage ?? 0;
                  return (
                    <div
                        key={course.id}
                        className="space-y-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
                            <BookOpen className="h-6 w-6 text-white" />
                          </div>
                          <div>
                              <h4 className="font-medium text-gray-900 dark:text-white">
                              {course.title}
                            </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                              {course.subject}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="secondary"
                            className="border-primary/20 bg-primary/10 text-primary-700 dark:text-primary-300"
                        >
                            {progress}%
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">
                            Progress
                          </span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {progress}%
                          </span>
                        </div>
                        <Progress
                            value={progress}
                          className="h-2"
                        />
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-primary text-white hover:bg-primary-600"
                        >
                          <Play className="mr-2 h-4 w-4" />
                          Continue
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                            className="flex-1 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Course
                        </Button>
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
            ) : (
              <div className="py-12 text-center">
                <BookOpen className="mx-auto mb-4 h-12 w-12 text-gray-400 dark:text-gray-500" />
                <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
                  No enrolled courses
                </h3>
                <p className="mb-4 text-gray-600 dark:text-gray-300">
                  Start your learning journey by enrolling in courses
                </p>
                <Button
                  className="bg-primary text-white hover:bg-primary-600"
                  onClick={() => {
                    // Scroll to available courses section
                    const availableSection = document.querySelector('[data-section="available-courses"]');
                    availableSection?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                    <BookOpen className="mr-2 h-4 w-4" />
                  Browse Available Courses
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Sidebar */}
        <div className="col-span-3 space-y-6">
          {/* Upcoming Assignments */}
          <Card className="border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg text-gray-900 dark:text-white">
                Upcoming Assignments
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-300">
                Stay on top of your deadlines
              </CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingAssignments.length > 0 ? (
                <div className="max-h-64 overflow-y-auto pr-2">
                <div className="space-y-3">
                  {upcomingAssignments.map(assignment => {
                    const dueDate = new Date(assignment.due_date);
                    const daysUntilDue = Math.ceil(
                      (dueDate.getTime() - new Date().getTime()) /
                        (1000 * 60 * 60 * 24)
                    );

                    return (
                      <div
                        key={assignment.id}
                          className="flex items-start space-x-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 p-3"
                      >
                        <div className="mt-1">
                          <AlertCircle className="h-4 w-4 text-yellow-500" />
                        </div>
                        <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {assignment.title}
                          </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                            Due in {daysUntilDue} day
                            {daysUntilDue !== 1 ? 's' : ''}
                          </p>
                          <Badge
                            variant="outline"
                              className="border-primary/20 text-xs text-primary-700 dark:text-primary-300"
                          >
                            {assignment.total_points} points
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <AlertCircle className="mx-auto mb-2 h-8 w-8 text-gray-400 dark:text-gray-500" />
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    No upcoming assignments
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activities */}
          <Card className="border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg text-gray-900 dark:text-white">
                Recent Activities
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-300">
                Your latest learning milestones
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-64 overflow-y-auto pr-2">
              <div className="space-y-3">
                {recentActivities.map(activity => (
                  <div
                    key={activity.id}
                      className="flex items-start space-x-3 rounded-lg p-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div className="mt-1">{getStatusIcon(activity.status)}</div>
                    <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none text-gray-900 dark:text-white">
                        {activity.message}
                      </p>
                      <p
                        className={`text-xs ${getStatusColor(activity.status)}`}
                      >
                        {activity.time}
                      </p>
                    </div>
                  </div>
                ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <Card className="border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-xl text-gray-900 dark:text-white">
            Quick Actions
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-300">
            Common tasks and shortcuts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button
              variant="outline"
              className="h-16 flex-col space-y-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-primary hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <Play className="h-5 w-5" />
              <span className="text-sm">Continue Learning</span>
            </Button>
            <Button
              variant="outline"
              className="h-16 flex-col space-y-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-primary hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <FileText className="h-5 w-5" />
              <span className="text-sm">View Resources</span>
            </Button>
            <Button
              variant="outline"
              className="h-16 flex-col space-y-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-primary hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <Users className="h-5 w-5" />
              <span className="text-sm">Join Study Group</span>
            </Button>
            <Button
              variant="outline"
              className="h-16 flex-col space-y-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-primary hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <Calendar className="h-5 w-5" />
              <span className="text-sm">Schedule Study</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
