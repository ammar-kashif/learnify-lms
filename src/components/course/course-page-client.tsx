'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import ThemeToggle from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import QuizSection from '@/components/quiz/quiz-section';
import FileUpload from '@/components/ui/file-upload';
import LectureRecordingsList from '@/components/course/lecture-recordings-list';
import LectureRecordingUpload from '@/components/course/lecture-recording-upload';
import DemoAccessRequest from '@/components/course/demo-access-request';
import { getGuestDemo } from '@/lib/guest-demo';
import ModernSubscriptionModal from '@/components/modern-subscription-modal';
// PaymentPopup is not currently used
import AssignmentManagement from '@/components/assignments/assignment-management';
import StudentLiveClassCalendar from '@/components/attendance/student-live-class-calendar';
import { uploadToS3 } from '@/lib/s3';
import { createChapterFromFile } from '@/lib/chapters';
import { formatDate } from '@/utils/date';
import { trackPageView, trackCourseView } from '@/lib/tracking';
import {
  EmptyState,
  Meta,
  PageHeader,
  SectionHeader,
  StatusDot,
  plural,
  primaryButton,
  quietButton,
  row,
  rowGroup,
} from '@/components/course/course-ui';
import { cn } from '@/lib/utils';
import {
  BookOpen,
  Play,
  Eye,
  Trash2,
  Plus,
  FileText,
  Download,
  Calendar,
  Menu,
  X,
  Crown,
} from 'lucide-react';
import CourseSidebar, {
  useSidebarCollapsed,
  type CourseNavItem,
} from '@/components/course/course-sidebar';

type ChapterItem = {
  id: string;
  title: string;
  file_url: string | null;
  file_type?: string | null;
  file_size?: number | null;
  created_at?: string;
  content?: string | null;
};

type Course = {
  id: string;
  title: string;
  description: string;
  created_at: string;
};

interface CoursePageClientProps {
  course: Course;
  chapters: ChapterItem[];
  courseId: string;
  activeTab: string;
  /** Published recordings on this course — counted server-side for the header. */
  lectureCount?: number;
  /** Live classes still ahead of now and not ended. */
  upcomingClassCount?: number;
}

export default function CoursePageClient({
  course,
  chapters,
  courseId,
  activeTab,
  lectureCount = 0,
  upcomingClassCount = 0,
}: CoursePageClientProps) {
  const { user, userRole, loading: authLoading } = useAuth();
  const [chaptersList, setChaptersList] = useState<ChapterItem[]>(chapters);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasRecordingDemo, setHasRecordingDemo] = useState(false);
  const [hasLiveDemo, setHasLiveDemo] = useState(false);
  const [demoAccessLoading, setDemoAccessLoading] = useState(false); // Start as false to show tabs immediately
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showRecordingUploadModal, setShowRecordingUploadModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [showChoiceModal, setShowChoiceModal] = useState(false);
  const [isUpgrade, setIsUpgrade] = useState(false);
  // Selected plan is handled via localStorage in signup flow; keep local state minimal
  const [subscriptionPlans, setSubscriptionPlans] = useState<any[]>([]);
  const [subscriptionPlansLoading, setSubscriptionPlansLoading] = useState(false);
  const [isGuestLiveDemo, setIsGuestLiveDemo] = useState(false);

  const { collapsed, toggle: toggleSidebar } = useSidebarCollapsed();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Once the course header scrolls past, the slim bar picks up the title so you
  // never lose track of which course you're in.
  const heroRef = useRef<HTMLElement>(null);
  const [condensed, setCondensed] = useState(false);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setCondensed(!entry.isIntersecting),
      { rootMargin: '-56px 0px 0px 0px', threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setIsAdmin(userRole === 'admin' || userRole === 'superadmin');
  }, [userRole]);

  // Detect guest demo mode (live class demo without signup)
  useEffect(() => {
    if (!user) {
      const guestDemo = getGuestDemo(courseId, 'live_class');
      setIsGuestLiveDemo(!!guestDemo);
    } else {
      setIsGuestLiveDemo(false);
    }
  }, [user, courseId]);

  // Track page view and course view
  useEffect(() => {
    const trackViews = async () => {
      if (typeof window !== 'undefined') {
        const { data: { session } } = await supabase.auth.getSession();
        trackPageView(window.location.pathname, {
          course_id: courseId,
          course_title: course.title,
        }, session?.access_token || null);
        
        trackCourseView(courseId, {
          course_title: course.title,
        }, session?.access_token || null);
      }
    };
    trackViews();
  }, [courseId, course.title]);

  // Fetch subscription plans when modal opens
  useEffect(() => {
    if (showSubscriptionModal) {
      fetchSubscriptionPlans();
    }
  }, [showSubscriptionModal]);

  // Handle pending demo type after signup
  useEffect(() => {
    const handlePendingDemo = async () => {
      const pendingDemoType = localStorage.getItem('pendingDemoType');
      
      // Wait for auth to finish loading and user to be available
      if (pendingDemoType && !authLoading && user && userRole === 'student') {
        // Clear the pending demo type
        localStorage.removeItem('pendingDemoType');
        
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            // Create the demo access
            const response = await fetch('/api/demo-access', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                courseId,
                accessType: pendingDemoType
              }),
            });

            const responseData = await response.json();

            if (response.ok) {
              // Refresh the page to show the demo access
              window.location.reload();
            } else {
              console.error('❌ Failed to create demo access after signup:', responseData);
            }
          } else {
            console.error('❌ No session found for demo access creation');
          }
        } catch (error) {
          console.error('Error creating demo access after signup:', error);
        }
      }
    };

    handlePendingDemo();
  }, [user, userRole, courseId, authLoading]);

  // Fallback: Try to create demo access after a delay if user still isn't loaded
  useEffect(() => {
    const pendingDemoType = localStorage.getItem('pendingDemoType');
    
    if (pendingDemoType && !authLoading) {
      const timeoutId = setTimeout(async () => {
        try {
          // Try multiple ways to get the session
          console.log('🔍 Fallback: Trying to get session...');
          
          // Method 1: Get current session
          let { data: { session } } = await supabase.auth.getSession();
          console.log('🔍 Method 1 - getSession:', { hasSession: !!session, hasToken: !!session?.access_token });
          
          // Method 2: If no session, try to refresh
          if (!session?.access_token) {
            console.log('🔄 Method 2 - Trying to refresh session...');
            const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
            session = refreshedSession;
            console.log('🔍 Method 2 - refreshSession:', { hasSession: !!session, hasToken: !!session?.access_token });
          }
          
          // Method 3: If still no session, try to get from storage
          if (!session?.access_token) {
            console.log('🔄 Method 3 - Checking localStorage for session...');
            const storedSession = localStorage.getItem('sb-' + process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0] + '-auth-token');
            if (storedSession) {
              try {
                const parsedSession = JSON.parse(storedSession);
                session = parsedSession;
                console.log('🔍 Method 3 - localStorage session:', { hasSession: !!session, hasToken: !!session?.access_token });
              } catch (e) {
                console.log('❌ Method 3 - Failed to parse stored session');
              }
            }
          }
          
          if (session?.access_token) {
            console.log('🔐 Fallback: Session found, creating demo access...');
            const response = await fetch('/api/demo-access', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                courseId,
                accessType: pendingDemoType
              }),
            });

            const responseData = await response.json();
            console.log('📡 Fallback: Demo access API response:', { status: response.status, data: responseData });

            if (response.ok) {
              console.log('✅ Fallback: Demo access created successfully');
              localStorage.removeItem('pendingDemoType');
              window.location.reload();
            } else {
              console.error('❌ Fallback: Failed to create demo access:', responseData);
            }
          } else {
            console.error('❌ Fallback: No session found after trying all methods');
            // As a last resort, try to create demo access without auth (this might work if the API allows it)
            console.log('🔄 Last resort: Trying to create demo access without auth...');
            const response = await fetch('/api/demo-access', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                courseId,
                accessType: pendingDemoType
              }),
            });

            const responseData = await response.json();
            console.log('📡 Last resort: Demo access API response:', { status: response.status, data: responseData });

            if (response.ok) {
              console.log('✅ Last resort: Demo access created successfully');
              localStorage.removeItem('pendingDemoType');
              window.location.reload();
            } else {
              console.error('❌ Last resort: Failed to create demo access:', responseData);
            }
          }
        } catch (error) {
          console.error('❌ Fallback: Error creating demo access:', error);
        }
      }, 3000); // Wait 3 seconds

      return () => clearTimeout(timeoutId);
    }
  }, [courseId, authLoading]);

  // Load per-course demo access to toggle sidebar options
  useEffect(() => {
    const run = async () => {
      // Skip demo check for non-students entirely
      if (userRole !== 'student') {
        setDemoAccessLoading(false);
        
        return;
      }
      
      setDemoAccessLoading(true);
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setDemoAccessLoading(false);
          
          return;
        }
        
        // Add cache-busting timestamp to ensure fresh data
        const fetchPromise = fetch(`/api/demo-access?courseId=${courseId}&_t=${Date.now()}`, {
          headers: { 
            'Authorization': `Bearer ${session.access_token}`,
            'Cache-Control': 'no-cache',
          },
        });
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 4000) // Increased to avoid premature timeout
        );
        
        const res = await Promise.race([fetchPromise, timeoutPromise]) as Response;
        
        if (!res.ok) {
          // On error, assume no demo access
          setHasRecordingDemo(false);
          setHasLiveDemo(false);
          setDemoAccessLoading(false);
          return;
        }
        
        const json = await res.json();
        const list = (json?.demoAccess ?? []) as any[];
        setHasRecordingDemo(list.some(a => a.access_type === 'lecture_recording'));
        setHasLiveDemo(list.some(a => a.access_type === 'live_class'));
      } catch (error) {
        console.error('Demo access check failed:', error);
        // Set defaults on error - assume no demo access
        setHasRecordingDemo(false);
        setHasLiveDemo(false);
        
        // If it's a timeout, try a simpler approach
        if (error instanceof Error && error.message === 'Timeout') {
          console.log('⏰ Demo access check timed out, using fallback');
          // Set a timeout to try again later
          setTimeout(() => {
            console.log('🔄 Retrying demo access check...');
            run();
          }, 2000);
        }
      } finally {
        setDemoAccessLoading(false);
      }
    };
    
    // Run immediately without delay
    run();
  }, [courseId, userRole, user]);


  // Debug auth state changes
  useEffect(() => {
    console.log('🔐 Auth state debug:', {
      user: !!user,
      userRole,
      authLoading,
      userId: user?.id,
      userEmail: user?.email
    });
  }, [user, userRole, authLoading]);

  const handleDeleteChapter = async (chapterId: string) => {
    if (!isAdmin) return;
    
    if (confirm('Are you sure you want to delete this chapter? This action cannot be undone.')) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error('No authentication token found');
        }

        const response = await fetch('/api/chapters/delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ chapterId }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete chapter');
        }

        // Remove chapter from local state
        setChaptersList(prev => prev.filter(ch => ch.id !== chapterId));
        alert('Chapter deleted successfully!');
      } catch (error) {
        console.error('Error deleting chapter:', error);
        alert(`Failed to delete chapter: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  const handleDownloadFile = async (fileUrl: string, fileName: string) => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Failed to download file');
    }
  };

  const handleFileUpload = async (files: File[]) => {
    try {
      // Create optimistic chapter entries immediately
      const optimisticChapters = files.map(file => ({
        id: `temp-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        course_id: courseId,
        title: file.name.replace(/\.[^/.]+$/, ""),
        file_url: null,
        file_type: file.type,
        file_size: file.size,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        isUploading: true
      }));
      
      // Add optimistic chapters to UI immediately
      setChaptersList(prev => [...prev, ...optimisticChapters]);
      setShowUploadModal(false);
      
      // Process uploads in parallel
      const uploadPromises = files.map(async (file, index) => {
        try {
          // Upload to S3
          const uploadResult = await uploadToS3(file, 'course-assets', `courses/${courseId}/chapters/`);
          
          if (uploadResult.success && uploadResult.url && uploadResult.key) {
            // Create chapter in Supabase
            const chapterResult = await createChapterFromFile(
              courseId,
              file.name.replace(/\.[^/.]+$/, ""),
              uploadResult.url,
              file.type,
              file.size
            );
            
            if (chapterResult.success && chapterResult.chapter) {
              // Update the optimistic chapter with real data
              setChaptersList(prev => prev.map(chapter => 
                chapter.id === optimisticChapters[index].id 
                  ? { ...chapter, ...chapterResult.chapter, isUploading: false }
                  : chapter
              ));
            }
            
            return { uploadResult, chapterResult };
          }
          
          return { uploadResult, chapterResult: { success: false, error: 'Upload failed' } };
        } catch (error) {
          console.error(`Error uploading file ${file.name}:`, error);
          // Remove failed optimistic chapter
          setChaptersList(prev => prev.filter(chapter => chapter.id !== optimisticChapters[index].id));
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          return { uploadResult: { success: false, error: errorMessage }, chapterResult: { success: false, error: errorMessage } };
        }
      });
      
      // Wait for all uploads to complete
      await Promise.all(uploadPromises);
      
      // Final refresh to ensure consistency
      window.location.reload();
    } catch (error) {
      console.error('Error uploading files:', error);
      // Refresh to get actual state on error
      window.location.reload();
    }
  };


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

  const handleSubscriptionPlanSelect = async (planId: string, _plan: any) => {
    setShowSubscriptionModal(false);
    // Open payment popup with selected plan
    // For now, we'll use the direct API approach like the old subscription plans
    try {
      console.log('🔐 Checking authentication for subscription...');
      const { data: { session } } = await supabase.auth.getSession();
      console.log('🔐 Session data:', { hasSession: !!session, hasToken: !!session?.access_token });
      
      if (!session?.access_token) {
        console.error('❌ No authentication token found');
        alert('Please log in to subscribe');
        return;
      }

      console.log('📤 Making subscription request:', { courseId, subscriptionPlanId: planId });
      
      const response = await fetch('/api/user-subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          courseId,
          subscriptionPlanId: planId
        }),
      });

      console.log('📥 Subscription response status:', response.status);
      const data = await response.json();
      console.log('📥 Subscription response data:', data);

      if (response.ok) {
        if (data.requiresApproval) {
          alert('Payment verification request submitted! Please wait for admin approval. You will be notified once approved.');
        } else {
          alert('Subscription created successfully!');
        }
        window.location.reload();
      } else {
        if (data.error.includes('already has an active subscription')) {
          alert('You already have an active subscription for this course');
        } else {
          alert(data.error || 'Failed to create subscription');
        }
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
      alert('Failed to create subscription');
    }
  };

  // Show loading screen while auth is initializing to prevent flashing
  if (authLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <span className="h-12 w-12 animate-spin rounded-full border-[3px] border-primary/25 border-t-primary" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{course.title}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading course content…</p>
        </div>
      </div>
    );
  }

  // The five entries used to be five near-identical copies of the same markup.
  // Only the `show` flags differ, and they are the original conditions.
  const resolvingAccess = demoAccessLoading && userRole === 'student' && !isAdmin;
  const navItems: CourseNavItem[] = [
    { key: 'chapters', label: 'Chapters', icon: BookOpen, show: !isGuestLiveDemo },
    {
      key: 'lectures',
      label: 'Recorded Lectures',
      icon: Play,
      show: !isGuestLiveDemo && !(userRole === 'student' && !isAdmin && hasLiveDemo && !hasRecordingDemo),
      busy: resolvingAccess,
    },
    { key: 'quizzes', label: 'Quizzes', icon: Eye, show: !isGuestLiveDemo },
    { key: 'assignments', label: 'Assignments', icon: FileText, show: !isGuestLiveDemo },
    {
      key: 'live-classes',
      label: 'Live Classes',
      icon: Calendar,
      show: !(userRole === 'student' && !isAdmin && hasRecordingDemo && !hasLiveDemo),
      busy: resolvingAccess,
    },
  ].filter((item) => item.show);

  const showUpgradeCta =
    ((hasRecordingDemo || hasLiveDemo) && userRole === 'student' && !isAdmin) || isGuestLiveDemo;

  return (
    <div className="flex min-h-[100dvh] bg-gray-50 dark:bg-gray-950">
      <CourseSidebar
        items={navItems}
        activeKey={activeTab}
        courseId={courseId}
        collapsed={collapsed}
        onToggle={toggleSidebar}
        mobileOpen={mobileNavOpen}
        onMobileOpenChange={setMobileNavOpen}
        courseTitle={course.title}
        showBackLink={!isGuestLiveDemo}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Slim command bar */}
        <header className="sticky top-0 z-30 bg-gray-50/85 backdrop-blur-xl dark:bg-gray-950/85">
          <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open course menu"
                className="-ml-1.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-900/[0.04] hover:text-gray-900 lg:hidden dark:text-gray-400 dark:hover:bg-white/[0.05] dark:hover:text-white"
              >
                <Menu className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </button>
              {/* Course name appears here only once the header has scrolled away. */}
              <span
                className={`min-w-0 truncate text-sm font-medium text-gray-900 transition-opacity duration-200 dark:text-white ${
                  condensed ? 'opacity-100' : 'pointer-events-none opacity-0'
                }`}
              >
                {course.title}
              </span>
            </div>

            <div className="flex flex-shrink-0 items-center gap-1">
              {showUpgradeCta && (
                <Button
                  size="sm"
                  onClick={() => {
                    if (isGuestLiveDemo) {
                      window.location.href = `/auth/signup?redirect=/courses/${courseId}`;
                    } else {
                      setIsUpgrade(true);
                      setShowSubscriptionModal(true);
                    }
                  }}
                  className={cn(primaryButton, 'h-8 px-3 text-[13px]')}
                >
                  {isGuestLiveDemo ? 'Sign up' : 'Upgrade'}
                </Button>
              )}
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6 lg:px-8">
            {/* Course header. Sits on the page background and is carried by the
                title — the gradient band version read as a marketing hero
                bolted onto an app. */}
            <section ref={heroRef} className="pb-6 pt-1">
              <PageHeader
                eyebrow={
                  <>
                    <span className="uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500">
                      Course
                    </span>
                    {isAdmin && (
                      <>
                        <span aria-hidden="true" className="text-gray-300 dark:text-gray-700">
                          ·
                        </span>
                        <span>Admin view</span>
                      </>
                    )}
                  </>
                }
                title={course.title}
                description={course.description}
                meta={
                  <Meta
                    items={[
                      plural(chaptersList.length, 'chapter'),
                      plural(lectureCount, 'lecture'),
                      upcomingClassCount > 0 ? (
                        <>
                          <StatusDot tone="green" />
                          {`${plural(upcomingClassCount, 'class', 'classes')} upcoming`}
                        </>
                      ) : (
                        'No upcoming classes'
                      ),
                    ]}
                  />
                }
              />
            </section>

            <div className="pt-1">
            {/* Guest demo banner. Lived in the sidebar before the tabs moved up. */}
            {isGuestLiveDemo && (
              <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/60 dark:bg-amber-950/40">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                  Guest demo mode
                </p>
                <p className="mt-0.5 text-sm leading-relaxed text-amber-700 dark:text-amber-400/90">
                  Only Live Classes are available in demo mode. Sign up to unlock the rest of the
                  course.
                </p>
              </div>
            )}

            {/* Chapters */}
            {activeTab === 'chapters' && (
              <section id="chapters" className="space-y-4">
                <SectionHeader
                  title="Chapters"
                  count={chaptersList.length || undefined}
                  description="Notes, worksheets and reference material."
                  actions={
                    isAdmin && (
                      <Button
                        onClick={() => setShowUploadModal(true)}
                        size="sm"
                        className={cn(primaryButton, 'h-9')}
                      >
                        <Plus className="mr-1.5 h-4 w-4" />
                        Add chapter
                      </Button>
                    )
                  }
                />

                {chaptersList.length === 0 ? (
                  <EmptyState
                    icon={BookOpen}
                    title="No chapters yet"
                    description={
                      isAdmin
                        ? 'Upload a file to create the first chapter for this course.'
                        : 'Chapters will appear here once your teacher adds them.'
                    }
                    action={
                      isAdmin && (
                        <Button
                          onClick={() => setShowUploadModal(true)}
                          size="sm"
                          className={cn(primaryButton, 'h-9')}
                        >
                          <Plus className="mr-1.5 h-4 w-4" />
                          Add chapter
                        </Button>
                      )
                    }
                  />
                ) : (
                  /* A list, not a card grid. A file listing is a list, and one
                     card stranded in a three-column grid is what made this page
                     look unfinished. */
                  <div className={rowGroup}>
                    {chaptersList.map((ch) => (
                      <div key={ch.id} className={cn(row, 'group')}>
                        <FileText
                          className="hidden h-[18px] w-[18px] flex-shrink-0 text-gray-400 dark:text-gray-500 sm:block"
                          strokeWidth={1.75}
                        />

                        <div className="min-w-0 flex-1">
                          <p
                            className="truncate text-sm font-medium text-gray-900 dark:text-white"
                            title={ch.title}
                          >
                            {ch.title}
                          </p>
                          <Meta
                            className="mt-0.5 text-[13px]"
                            items={[
                              ch.created_at ? formatDate(ch.created_at) : null,
                              ch.file_size
                                ? `${(ch.file_size / 1024 / 1024).toFixed(1)} MB`
                                : null,
                              !ch.file_url ? 'No resource' : null,
                            ]}
                          />
                          {ch.content && (
                            <p className="mt-1 line-clamp-1 text-[13px] text-gray-500 dark:text-gray-400">
                              {ch.content}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-shrink-0 items-center gap-1.5">
                          {ch.file_url && (
                            <>
                              <a
                                href={ch.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className={cn(
                                  quietButton,
                                  'inline-flex h-8 items-center gap-1.5 px-2.5 text-[13px] font-medium'
                                )}
                              >
                                <Eye className="h-3.5 w-3.5" />
                                View
                              </a>
                              <button
                                onClick={() => handleDownloadFile(ch.file_url!, ch.title)}
                                className={cn(
                                  quietButton,
                                  'inline-flex h-8 items-center gap-1.5 px-2.5 text-[13px] font-medium'
                                )}
                              >
                                <Download className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Download</span>
                              </button>
                            </>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteChapter(ch.id)}
                              className="rounded-lg p-2 text-gray-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 focus-visible:opacity-100 group-hover:opacity-100 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                              title="Delete chapter"
                              aria-label={`Delete ${ch.title}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Recorded Lectures */}
            {activeTab === 'lectures' && (
              <section id="lectures" className="space-y-6">
                <SectionHeader
                  title="Recorded Lectures"
                  description="Every session is recorded — rewatch as many times as you like."
                  actions={
                    isAdmin && (
                      <Button
                        onClick={() => setShowRecordingUploadModal(true)}
                        className="rounded-xl bg-primary text-white shadow-sm shadow-primary/25 hover:bg-primary-600"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Upload recording
                      </Button>
                    )
                  }
                />

                <LectureRecordingsList
                  courseId={courseId}
                  userRole={isAdmin ? (userRole === 'superadmin' ? 'superadmin' : 'admin') : (user ? 'student' : 'guest')}
                  showHeading={false}
                  showAccessControls={!authLoading && userRole === 'student' && !!user}
                  onAccessRequired={() => {
                    if (!user) {
                      // Guest - redirect to signup
                      window.location.href = `/auth/signup?redirect=/courses/${courseId}`;
                    } else {
                      // Student - show upgrade modal
                      setIsUpgrade(true);
                      setShowSubscriptionModal(true);
                    }
                  }}
                />
              </section>
            )}

            {/* Quizzes */}
            {activeTab === 'quizzes' && (
              <section id="quizzes" className="space-y-6">
                <SectionHeader
                  title="Quizzes"
                  description="Check what's stuck and what still needs work."
                />
                <QuizSection
                  courseId={courseId}
                  userRole={isAdmin ? (userRole === 'superadmin' ? 'superadmin' : 'admin') : 'student'}
                  userId={user?.id || ''}
                  showHeading={false}
                />
              </section>
            )}

            {/* Assignments */}
            {activeTab === 'assignments' && (
              <section id="assignments" className="space-y-6">
                <SectionHeader
                  title="Assignments"
                  description="Submit your work and pick up your teacher's feedback."
                />
                <AssignmentManagement
                  courseId={courseId}
                  userRole={isAdmin ? (userRole === 'superadmin' ? 'superadmin' : 'admin') : 'student'}
                  chapters={[]}
                  showHeading={false}
                />
              </section>
            )}

            {/* Live Classes */}
            {activeTab === 'live-classes' && (
              <section id="live-classes" className="space-y-6">
                <SectionHeader
                  title="Live Classes"
                  description="Scheduled sessions with your tutor. Join straight from the calendar."
                />
                <StudentLiveClassCalendar courseId={courseId} />
              </section>
            )}
            </div>
          </div>
        </main>
      </div>

      {/* Chapter upload */}
      <Modal
        open={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Upload chapter files"
        size="md"
      >
        <FileUpload
          onUpload={handleFileUpload}
          accept=".pdf,.doc,.docx,image/*,video/*"
          maxFiles={10}
          maxSize={50} // 50MB
        />
      </Modal>

      {/* Recording upload */}
      <Modal
        open={showRecordingUploadModal}
        onClose={() => setShowRecordingUploadModal(false)}
        title="Upload lecture recording"
        size="lg"
      >
        <LectureRecordingUpload
          courseId={courseId}
          onUploadSuccess={() => {
            setShowRecordingUploadModal(false);
            window.location.reload();
          }}
        />
      </Modal>

      {/* Subscription plans. ModernSubscriptionModal brings its own overlay,
          backdrop-close and header — wrapping it in a second one stacked two
          dimmed layers and two close buttons on top of each other. */}
      <ModernSubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => {
          setShowSubscriptionModal(false);
          setIsUpgrade(false);
        }}
        course={{
          id: courseId,
          title: course.title,
          subject: course.title,
        }}
        onSelectPlan={handleSubscriptionPlanSelect}
        subscriptionPlans={subscriptionPlans}
        loading={subscriptionPlansLoading}
        notice={
          isUpgrade ? (
            <>
              <strong className="font-semibold">Upgrade from demo:</strong> you&apos;ve used your
              demo access. Choose a plan below to unlock all content.
            </>
          ) : undefined
        }
      />

      {/* Demo access */}
      <Modal open={showDemoModal} onClose={() => setShowDemoModal(false)} title="Try for free" size="md">
        <DemoAccessRequest
          courseId={courseId}
          courseTitle={course.title}
          onAccessGranted={() => {
            setShowDemoModal(false);
            // Navigate to the appropriate page based on demo type
            const liveDemo = localStorage.getItem(`guest-demo-${courseId}-live_class`);
            const recordingDemo = localStorage.getItem(`guest-demo-${courseId}-lecture_recording`);
            if (liveDemo) {
              window.location.href = `/courses/${courseId}?tab=live-classes`;
            } else if (recordingDemo) {
              window.location.href = `/courses/${courseId}/preview`;
            } else {
              window.location.reload();
            }
          }}
        />
      </Modal>

      {/* Choice Modal - Demo or Direct Subscription */}
      <Modal
        open={showChoiceModal}
        onClose={() => setShowChoiceModal(false)}
        title="Choose your path"
        size="md"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <button
            className="group rounded-2xl border border-gray-200 p-6 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 hover:shadow-depth dark:border-gray-800 dark:hover:bg-primary/10"
            onClick={() => {
              // Open demo picker explicitly and ensure plans modal is closed
              setShowSubscriptionModal(false);
              setShowChoiceModal(false);
              setShowDemoModal(true);
            }}
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 dark:bg-primary/15">
              <Play className="h-5 w-5 text-primary" />
            </div>
            <div className="mb-1.5 font-semibold text-gray-900 dark:text-white">Try demo first</div>
            <div className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              Get 24-hour free access to experience the content before subscribing
            </div>
          </button>
          <button
            className="group rounded-2xl border border-gray-200 p-6 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 hover:shadow-depth dark:border-gray-800 dark:hover:bg-primary/10"
            onClick={() => {
              // Open plans explicitly and ensure demo modal is closed
              setShowDemoModal(false);
              setShowChoiceModal(false);
              setShowSubscriptionModal(true);
            }}
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 dark:bg-primary/15">
              <Crown className="h-5 w-5 text-primary" />
            </div>
            <div className="mb-1.5 font-semibold text-gray-900 dark:text-white">Subscribe now</div>
            <div className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              Get immediate full access with our flexible subscription plans
            </div>
          </button>
        </div>
      </Modal>

      {/* Floating Upgrade Button for Demo Users */}
      {(hasRecordingDemo || hasLiveDemo) && userRole === 'student' && !isAdmin && (
        <div className="fixed bottom-6 right-6 z-40">
          <Button
            size="lg"
            onClick={() => {
              setIsUpgrade(true);
              setShowSubscriptionModal(true);
            }}
            className="rounded-full bg-primary text-white shadow-depth-lg transition-all duration-300 hover:scale-105 hover:bg-primary-600"
          >
            <Crown className="mr-2 h-5 w-5" />
            Upgrade to Full Access
          </Button>
        </div>
      )}
    </div>
  );
}

const MODAL_SIZES = {
  md: 'max-w-2xl',
  lg: 'max-w-3xl',
} as const;

/**
 * Modal chrome.
 *
 * The page had five hand-rolled overlays that each differed slightly — some
 * `bg-opacity-50`, some not, three different corner radii, close buttons in
 * three styles. This is the one shell they all use.
 */
function Modal({
  open,
  onClose,
  title,
  size = 'md',
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  size?: keyof typeof MODAL_SIZES;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-charcoal-900/50 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative z-10 max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-depth-lg dark:border-gray-800 dark:bg-gray-900',
          MODAL_SIZES[size]
        )}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-gray-100 bg-white/90 px-6 py-4 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/90">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
