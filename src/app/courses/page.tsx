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
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { BookOpen, Clock, Star, X, CheckCircle, Crown, Video, ArrowLeft, Search } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import DemoAccessRequest from '@/components/course/demo-access-request';
import ModernSubscriptionModal from '@/components/modern-subscription-modal';
import { Skeleton, SkeletonCourseGrid } from '@/components/ui/skeleton';
import {
  parseCourseTitle,
  subjectIcon,
  groupByLevel,
  LEVEL_ORDER,
  type CourseLevel,
} from '@/lib/course-taxonomy';

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
  // Removed unused courseEnrollments state to satisfy build
  const [checkingEnrollment, setCheckingEnrollment] = useState<string | null>(null);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [subscriptionPlans, setSubscriptionPlans] = useState<any[]>([]);
  const [subscriptionPlansLoading, setSubscriptionPlansLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [activeLevel, setActiveLevel] = useState<CourseLevel | 'All'>('All');

  // Which level tabs to offer — only those with courses behind them.
  const availableLevels = useMemo(() => {
    const present = new Set(courses.map(c => parseCourseTitle(c.title).level));
    return LEVEL_ORDER.filter(level => present.has(level));
  }, [courses]);

  // Search matches subject or description, so "bio" and "genetics" both work.
  const filteredCourses = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return courses.filter(course => {
      const { level, subject } = parseCourseTitle(course.title);
      if (activeLevel !== 'All' && level !== activeLevel) return false;
      if (!needle) return true;
      return (
        subject.toLowerCase().includes(needle) ||
        course.title.toLowerCase().includes(needle) ||
        (course.description ?? '').toLowerCase().includes(needle)
      );
    });
  }, [courses, query, activeLevel]);

  const groupedCourses = useMemo(
    () => groupByLevel(filteredCourses),
    [filteredCourses]
  );

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-6">
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-5xl lg:text-6xl">
              Explore Our Courses
            </h1>
            <p className="mx-auto mt-4 max-w-3xl text-xl text-gray-600 dark:text-gray-300">
              Discover a wide range of O Level and IGCSE courses designed to
              help you excel in your academic journey.
            </p>
            {!authLoading && user && userRole && userRole !== 'student' && (
              <div className="mt-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950/40">
                <p className="text-yellow-800 dark:text-yellow-200">
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
        {authLoading || loading ? (
          <div role="status" aria-live="polite" aria-busy="true">
            <span className="sr-only">Loading courses…</span>
            {/* Mirrors the filter bar and grid so the layout doesn't jump */}
            <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <Skeleton className="h-11 w-full rounded-full lg:max-w-sm" />
              <div className="flex gap-2">
                {[64, 84, 76, 72].map((w, i) => (
                  <Skeleton key={i} className="h-10 rounded-full" style={{ width: w }} />
                ))}
              </div>
            </div>
            <div className="mb-6 flex items-center gap-4">
              <Skeleton className="h-7 w-28" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
            </div>
            <SkeletonCourseGrid count={6} />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/40">
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">No courses available</h3>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Check back later for new courses.</p>
          </div>
        ) : (
          <>
            {/* Search + level filter */}
            <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search subjects…"
                  aria-label="Search courses"
                  className="h-11 w-full rounded-full border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 shadow-sm outline-none transition-colors placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
                />
              </div>

              <div
                role="tablist"
                aria-label="Filter by qualification"
                className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:overflow-visible lg:px-0 lg:pb-0"
              >
                {(['All', ...availableLevels] as const).map(level => {
                  const isActive = activeLevel === level;
                  const count =
                    level === 'All'
                      ? courses.length
                      : courses.filter(
                          c => parseCourseTitle(c.title).level === level
                        ).length;
                  return (
                    <button
                      key={level}
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setActiveLevel(level)}
                      className={`flex-shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'border-primary bg-primary text-white shadow-sm'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-primary/40 hover:text-primary dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:text-primary'
                      }`}
                    >
                      {level}
                      <span
                        className={`ml-2 text-xs ${isActive ? 'text-white/70' : 'text-gray-400'}`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {filteredCourses.length === 0 ? (
              <div className="py-16 text-center">
                <Search className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
                  No courses match &ldquo;{query}&rdquo;
                </h3>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  Try a different subject, or clear the filters.
                </p>
                <Button
                  variant="outline"
                  className="mt-5"
                  onClick={() => {
                    setQuery('');
                    setActiveLevel('All');
                  }}
                >
                  Clear filters
                </Button>
              </div>
            ) : (
              <div className="space-y-14">
                {groupedCourses.map(group => (
                  <section key={group.level} aria-labelledby={`level-${group.level}`}>
                    <div className="mb-6 flex items-center gap-4">
                      <h2
                        id={`level-${group.level}`}
                        className="text-2xl font-bold text-gray-900 dark:text-gray-100"
                      >
                        {group.level}
                      </h2>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        {group.courses.length}{' '}
                        {group.courses.length === 1 ? 'course' : 'courses'}
                      </span>
                      <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {group.courses.map(course => {
                        const { level, subject } = parseCourseTitle(course.title);
                        const Icon = subjectIcon(subject);
                        return (
                          <Card
                            key={course.id}
                            className="group flex h-full flex-col border-gray-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl dark:border-gray-800 dark:bg-gray-900"
                          >
                            <CardHeader className="pb-4">
                              <div className="mb-4 flex items-start justify-between gap-3">
                                <div className="inline-flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 transition-transform duration-300 group-hover:scale-110">
                                  <Icon className="h-6 w-6 text-primary" />
                                </div>
                                <Badge
                                  variant="secondary"
                                  className="border-primary/20 bg-primary/10 text-primary-700"
                                >
                                  {level}
                                </Badge>
                              </div>
                              <CardTitle className="text-lg font-bold leading-snug text-gray-900 dark:text-gray-100">
                                {subject}
                              </CardTitle>
                              <CardDescription className="line-clamp-3 text-gray-600 dark:text-gray-400">
                                {course.description}
                              </CardDescription>
                            </CardHeader>

                            <CardContent className="mt-auto flex flex-col p-6 pt-0">
                              <div className="mb-4 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                                <Clock className="h-4 w-4" />
                                <span>Self-paced</span>
                              </div>

                              <div className="flex flex-col gap-2 border-t border-gray-200 pt-4 dark:border-gray-800">
                                <Button
                                  className="h-10 w-full bg-primary text-white transition-colors hover:bg-primary-600"
                                  onClick={() => handleEnroll(course)}
                                  disabled={
                                    authLoading || checkingEnrollment === course.id
                                  }
                                >
                                  <BookOpen className="mr-2 h-4 w-4 flex-shrink-0" />
                                  <span className="truncate">
                                    {authLoading
                                      ? 'Loading…'
                                      : checkingEnrollment === course.id
                                        ? 'Checking…'
                                        : 'Enroll Now'}
                                  </span>
                                </Button>
                                <Link
                                  href={`/courses/${course.id}/preview`}
                                  className="block w-full"
                                >
                                  <Button className="h-10 w-full bg-blue-700 text-white transition-colors hover:bg-blue-800">
                                    <Video className="mr-2 h-4 w-4 flex-shrink-0" />
                                    <span className="truncate">Watch a Video</span>
                                  </Button>
                                </Link>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </>
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
                  // Navigate to the appropriate page based on demo type
                  const liveDemo = localStorage.getItem(`guest-demo-${selectedCourse.id}-live_class`);
                  const recordingDemo = localStorage.getItem(`guest-demo-${selectedCourse.id}-lecture_recording`);
                  if (liveDemo) {
                    window.location.href = `/courses/${selectedCourse.id}?tab=live-classes`;
                  } else if (recordingDemo) {
                    window.location.href = `/courses/${selectedCourse.id}/preview`;
                  } else {
                    window.location.href = `/courses/${selectedCourse.id}`;
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
