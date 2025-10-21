'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { BookOpen, Clock, Users, Star, Loader2, X, CheckCircle, Crown } from 'lucide-react';
import { toast } from 'sonner';
import DemoAccessRequest from '@/components/course/demo-access-request';
import ModernSubscriptionModal from '@/components/modern-subscription-modal';

interface Course {
  id: string;
  title: string;
  description: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export default function CoursesPage() {
  const { user, session, loading: authLoading, userRole } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showChoiceModal, setShowChoiceModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [courseEnrollments, setCourseEnrollments] = useState<Record<string, any>>({});
  const [checkingEnrollment, setCheckingEnrollment] = useState<string | null>(null);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [subscriptionPlans, setSubscriptionPlans] = useState<any[]>([]);
  const [subscriptionPlansLoading, setSubscriptionPlansLoading] = useState(false);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/courses/all');
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch courses');
        }
        
        setCourses(data.courses || []);
      } catch (err) {
        console.error('Error fetching courses:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch courses');
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  // Debug auth state changes
  useEffect(() => {
    console.log('🔐 Auth state changed:', { 
      authLoading, 
      user: user ? { id: user.id, email: user.email } : null,
      userRole 
    });
  }, [authLoading, user, userRole]);

  // Check enrollment status for a course
  const checkEnrollmentStatus = async (courseId: string) => {
    if (!user || !session?.access_token) {
      return null;
    }

    try {
      const response = await fetch(`/api/enrollments?courseId=${courseId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data;
      }
      return null;
    } catch (error) {
      console.error('Error checking enrollment:', error);
      return null;
    }
  };

  // Fetch subscription plans
  const fetchSubscriptionPlans = async () => {
    try {
      setSubscriptionPlansLoading(true);
      const response = await fetch('/api/subscription-plans');
      const data = await response.json();
      
      if (response.ok) {
        setSubscriptionPlans(data.plans || []);
      } else {
        console.error('Failed to fetch subscription plans:', data.error);
      }
    } catch (error) {
      console.error('Error fetching subscription plans:', error);
    } finally {
      setSubscriptionPlansLoading(false);
    }
  };

  const handleEnroll = async (course: Course) => {
    // If user is authenticated, check if they already have access
    if (user && session?.access_token) {
      setCheckingEnrollment(course.id);
      
      try {
        const enrollmentData = await checkEnrollmentStatus(course.id);
        
        if (enrollmentData?.enrolled) {
          if (enrollmentData.isPaidEnrollment) {
            toast.info('You already have full access to this course!', {
              description: 'You can access this course from your dashboard.'
            });
            setCheckingEnrollment(null);
            return;
          } else if (enrollmentData.isDemoEnrollment) {
            toast.info('You already have demo access to this course!', {
              description: 'You can access this course from your dashboard or upgrade to full access.'
            });
            setCheckingEnrollment(null);
            return;
          }
        }
      } catch (error) {
        console.error('Error checking enrollment:', error);
        toast.error('Failed to check enrollment status');
        setCheckingEnrollment(null);
        return;
      } finally {
        setCheckingEnrollment(null);
      }
    }

    // Show choice modal for users without existing access
    setSelectedCourse(course);
    setShowChoiceModal(true);
  };

  const handleDemoChoice = () => {
    if (!selectedCourse) return;
    
    // Always show demo access modal first (for both authenticated and unauthenticated users)
    setShowChoiceModal(false);
    setShowDemoModal(true);
  };

  const handleSubscriptionChoice = () => {
    if (!selectedCourse) return;
    
    // Always show subscription plans modal first, regardless of authentication status
    setShowChoiceModal(false);
    fetchSubscriptionPlans();
    setShowSubscriptionModal(true);
  };

  const handleSubscriptionPlanSelect = async (planId: string, plan: any) => {
    if (!selectedCourse) return;
    
    // Store the selected course and plan in localStorage for after signup
    localStorage.setItem('selectedCourseForSubscription', JSON.stringify(selectedCourse));
    localStorage.setItem('selectedSubscriptionPlan', JSON.stringify(plan));
    
    // Close modal and redirect to signup
    setShowSubscriptionModal(false);
    window.location.href = '/auth/signup';
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
              Explore Our Courses
            </h1>
            <p className="mx-auto mt-4 max-w-3xl text-xl text-gray-600">
              Discover a wide range of Cambridge O Levels courses designed to
              help you excel in your academic journey.
            </p>
            {!authLoading && user && userRole && userRole !== 'student' && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800">
                  <strong>Note:</strong> Course enrollment is only available for students. 
                  Your current role is: <span className="font-semibold">{userRole}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Courses Grid */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {authLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
              <p className="mt-2 text-gray-600">Verifying authentication...</p>
            </div>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
              <p className="mt-2 text-gray-600">Loading courses...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="rounded-lg bg-red-50 border border-red-200 p-6">
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No courses available</h3>
            <p className="mt-2 text-gray-600">Check back later for new courses.</p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {courses.map(course => (
              <Card
                key={course.id}
                className="group border-gray-200 bg-white backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-2xl"
              >
                <CardHeader className="pb-4 text-center">
                  <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 transition-transform duration-300 group-hover:scale-110">
                    <BookOpen className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl font-bold text-gray-900">
                    {course.title}
                  </CardTitle>
                  <CardDescription className="text-gray-600 line-clamp-3">
                    {course.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-center">
                  <div className="space-y-2">
                    <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>Self-paced</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="h-4 w-4" />
                        <span>O Level</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-center space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${i < 4 ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`}
                        />
                      ))}
                      <span className="ml-2 text-sm text-gray-600">
                        (4.5)
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div className="mb-4 flex items-center justify-center">
                      <Badge
                        variant="secondary"
                        className="border-primary/20 bg-primary/10 text-primary-700"
                      >
                        O Level
                      </Badge>
                    </div>
                    <Button 
                      className="w-full bg-primary text-white hover:bg-primary-600"
                      onClick={() => handleEnroll(course)}
                      disabled={authLoading || checkingEnrollment === course.id}
                    >
                      <BookOpen className="mr-2 h-4 w-4" />
                      {authLoading ? 'Loading...' : 
                       checkingEnrollment === course.id ? 'Checking...' : 'Enroll Now'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

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
                  onClick={() => {
                    setShowChoiceModal(false);
                    setSelectedCourse(null);
                  }}
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
                  onClick={handleDemoChoice}
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
                  onClick={handleSubscriptionChoice}
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
                  // Check if user is authenticated
                  if (user) {
                    // User is authenticated, redirect to course page
                    window.location.href = `/courses/${selectedCourse.id}`;
                  } else {
                    // User is not authenticated, redirect to signup
                    window.location.href = '/auth/signup';
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Subscription Plans Modal */}
      {showSubscriptionModal && selectedCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Choose Your Plan for {selectedCourse.title}
                </h3>
                <button
                  onClick={() => setShowSubscriptionModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <ModernSubscriptionModal
                isOpen={showSubscriptionModal}
                onClose={() => setShowSubscriptionModal(false)}
                course={{
                  id: selectedCourse.id,
                  title: selectedCourse.title,
                  subject: selectedCourse.title
                }}
                onSelectPlan={handleSubscriptionPlanSelect}
                subscriptionPlans={subscriptionPlans}
                loading={subscriptionPlansLoading}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
