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
// Progress bar removed as per request
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
  X,
  Eye,
  Star,
  Crown,
} from 'lucide-react';
import { mockAssignments } from '@/data/mock-data';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';
import PaymentPopup from '@/components/payment-popup';
import DemoAccessRequest from '@/components/course/demo-access-request';
import CourseGradeCard from '@/components/course/course-grade-card';

export default function StudentDashboard() {
  const { user, session, loading: authLoading, userRole } = useAuth();
  const [loading, setLoading] = useState(false);
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
  const [availableCourses, setAvailableCourses] = useState<any[]>([]);
  const [paymentPopupOpen, setPaymentPopupOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentVerifications, setPaymentVerifications] = useState<any[]>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<any[]>([]);
  const [showSubscriptionPlans, setShowSubscriptionPlans] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [showChoiceModal, setShowChoiceModal] = useState(false);
  const [selectedSubscriptionPlan, setSelectedSubscriptionPlan] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      // Try cache first for faster paint
      const cached = sessionStorage.getItem(`dash:${user.id}:courses`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setEnrolledCourses(parsed.enrolled || []);
          setAvailableCourses(parsed.available || []);
        } catch {
          // Ignore cache errors
        }
      }

      setLoading(true);
      try {
        const [enrolledRes, availableRes, paymentsRes] = await Promise.all([
          fetch(`/api/dashboard/courses?userId=${user.id}&role=student`, { next: { revalidate: 60 } } as any).then(r => r.json()),
          fetch(`/api/courses/available?studentId=${user.id}`, { next: { revalidate: 60 } } as any).then(r => r.json()),
          fetch('/api/payment-verifications', {
            headers: { 'Authorization': `Bearer ${session?.access_token || ''}` },
          }).then(r => r.json()),
        ]);

        const enrolled = enrolledRes?.courses || [];
        const available = availableRes?.courses || [];
        setEnrolledCourses(enrolled);
        setAvailableCourses(available);
        setPaymentVerifications(paymentsRes?.paymentVerifications || []);

        // Cache for next mounts
        try {
          sessionStorage.setItem(`dash:${user.id}:courses`, JSON.stringify({
            enrolled,
            available,
            ts: Date.now(),
          }));
        } catch {
          // Ignore cache errors
        }

        console.log('🔍 Available courses loaded:', available);
        console.log('🔍 Payment verifications loaded:', paymentsRes?.paymentVerifications);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, session?.access_token]);

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

  const fetchSubscriptionPlans = async () => {
    try {
      const response = await fetch('/api/subscription-plans');
      const data = await response.json();
      if (response.ok) {
        setSubscriptionPlans(data.plans || []);
      }
    } catch (error) {
      console.error('Error fetching subscription plans:', error);
    }
  };

  const handleEnrollClick = async (course: any) => {
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

    // Show choice modal - demo or direct subscription
    setSelectedCourse(course);
    setShowChoiceModal(true);
  };

  const handleSubscriptionPlanSelect = (planId: string, plan: any) => {
    // Store the selected plan and close subscription modal
    setSelectedSubscriptionPlan(plan);
    setShowSubscriptionPlans(false);
    // Open payment popup directly with the selected plan
    setPaymentPopupOpen(true);
  };

  const handleCompletePayment = async (courseId: string, amount: number, subscriptionPlanId?: string) => {
    setPaymentLoading(true);
    try {
      console.log('🔍 Submitting payment for course:', { courseId, amount, subscriptionPlanId });
      
      if (subscriptionPlanId) {
        // Create subscription directly
        const res = await fetch('/api/user-subscriptions', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token || ''}`,
          },
          body: JSON.stringify({ courseId, subscriptionPlanId }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.requiresApproval) {
            toast.success('Payment verification request submitted!', {
              description: 'Please wait for admin approval. You will be notified once approved.'
            });
          } else {
            toast.success('Subscription created successfully!', {
              description: 'You now have access to the course content.'
            });
          }
          setPaymentPopupOpen(false);
          setSelectedCourse(null);
          // Refresh the courses list
          window.location.reload();
        } else {
          const data = await res.json();
          toast.error('Failed to create subscription', {
            description: data.error || 'Please try again later.'
          });
        }
      } else {
        // Legacy payment verification
        const res = await fetch('/api/payment-verifications', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token || ''}`,
          },
          body: JSON.stringify({ courseId, amount }),
        });

        if (res.ok) {
          toast.success('Payment verification request submitted!', {
            description: 'Your payment request has been sent for verification. You will be enrolled once approved.'
          });
          setPaymentPopupOpen(false);
          setSelectedCourse(null);
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
            toast.error('Failed to submit payment request', {
              description: data.error || 'Please try again later.'
            });
          }
        }
      }
    } catch (error) {
      console.error('Error submitting payment request:', error);
      toast.error('Failed to submit payment request', {
        description: 'An unexpected error occurred. Please try again.'
      });
    } finally {
      setPaymentLoading(false);
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
                          onClick={() => handleEnrollClick(course)}
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

      {/* Payment Status */}
      {paymentVerifications.length > 0 && (
        <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-gray-900 dark:text-white">Payment Status</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300">Track your payment verification requests.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {paymentVerifications.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 p-4"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                      <BookOpen className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {payment.courses?.title || 'Unknown Course'}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Amount: PKR {payment.amount} • Requested: {new Date(payment.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      payment.status === 'approved' ? 'default' :
                      payment.status === 'rejected' ? 'destructive' : 'secondary'
                    }
                    className={
                      payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                      payment.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }
                  >
                    {payment.status === 'pending' && 'Pending Review'}
                    {payment.status === 'approved' && 'Approved'}
                    {payment.status === 'rejected' && 'Rejected'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
              <div className="max-h-[600px] overflow-y-auto pr-2">
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
                      </div>
                      {/* Progress removed */}
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-primary text-white hover:bg-primary-600"
                          onClick={() => {
                            window.location.href = `/courses/${course.id}`;
                          }}
                        >
                          <Play className="mr-2 h-4 w-4" />
                          Continue
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                            className="flex-1 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                          onClick={() => {
                            window.location.href = `/courses/${course.id}`;
                          }}
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

          {/* Course Grades */}
          <Card className="border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg text-gray-900 dark:text-white">
                Course Grades
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-300">
                Track your progress across all courses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto pr-2 space-y-3">
                {enrolledCourses.length > 0 ? (
                  enrolledCourses.map(course => (
                    <div key={course.id}>
                      <h4 className="mb-2 text-base font-semibold text-gray-900 dark:text-white">
                        {course.title}
                      </h4>
                      <CourseGradeCard courseId={course.id} />
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center">
                    <AlertCircle className="mx-auto mb-2 h-8 w-8 text-gray-400 dark:text-gray-500" />
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      No enrolled courses yet
                    </p>
                  </div>
                )}
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

      {/* Payment Popup */}
      {selectedCourse && (
        <PaymentPopup
          isOpen={paymentPopupOpen}
          onClose={() => {
            setPaymentPopupOpen(false);
            setSelectedCourse(null);
            setSelectedSubscriptionPlan(null);
          }}
          course={selectedCourse}
          onCompletePayment={handleCompletePayment}
          loading={paymentLoading}
          isSubscription={!!selectedSubscriptionPlan}
          selectedSubscriptionPlan={selectedSubscriptionPlan}
        />
      )}

      {/* Subscription Plans Modal */}
      {selectedCourse && (
        <PaymentPopup
          isOpen={showSubscriptionPlans}
          onClose={() => {
            setShowSubscriptionPlans(false);
            setSelectedCourse(null);
          }}
          course={selectedCourse}
          onCompletePayment={handleCompletePayment}
          onSelectPlan={handleSubscriptionPlanSelect}
          loading={paymentLoading}
          isSubscription={true}
          subscriptionPlans={subscriptionPlans}
        />
      )}

      {/* Choice Modal - Demo or Direct Subscription */}
      {showChoiceModal && selectedCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Choose Your Path
                </h3>
                <button
                  onClick={() => setShowChoiceModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="text-center mb-8">
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  How would you like to access {selectedCourse.title}?
                </h4>
                <p className="text-gray-600 dark:text-gray-400">
                  Choose between trying our demo first or subscribing directly
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Demo Option */}
                <button 
                  type="button"
                  className="p-6 border-2 border-blue-200 rounded-lg cursor-pointer hover:border-blue-300 transition-all bg-blue-50 dark:bg-blue-950 dark:border-blue-800 w-full text-left"
                  onClick={() => {
                    setShowChoiceModal(false);
                    setShowDemoModal(true);
                  }}
                >
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Star className="h-6 w-6 text-white" />
                    </div>
                    <h5 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Try Demo First
                    </h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Get 24-hour free access to experience the content before subscribing
                    </p>
                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center justify-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>24-hour free access</span>
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>No commitment required</span>
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Full content preview</span>
                      </div>
                    </div>
                  </div>
                </button>

                {/* Direct Subscription Option */}
                <button 
                  type="button"
                  className="p-6 border-2 border-orange-200 rounded-lg cursor-pointer hover:border-orange-300 transition-all bg-orange-50 dark:bg-orange-950 dark:border-orange-800 w-full text-left"
                  onClick={() => {
                    setShowChoiceModal(false);
                    fetchSubscriptionPlans();
                    setShowSubscriptionPlans(true);
                  }}
                >
                  <div className="text-center">
                    <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Crown className="h-6 w-6 text-white" />
                    </div>
                    <h5 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Subscribe Now
                    </h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Get immediate full access with our flexible subscription plans
                    </p>
                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center justify-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Immediate access</span>
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>All content included</span>
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Cancel anytime</span>
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Demo Access Modal */}
      {showDemoModal && selectedCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Try {selectedCourse.title} for Free
                </h3>
                <button
                  onClick={() => setShowDemoModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <DemoAccessRequest
                courseId={selectedCourse.id}
                courseTitle={selectedCourse.title}
                onAccessGranted={() => {
                  setShowDemoModal(false);
                  // Keep old flow: close the modal; enrolled list will reflect after refresh
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
