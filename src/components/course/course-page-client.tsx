'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import ThemeToggle from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import QuizSection from '@/components/quiz/quiz-section';
import FileUpload from '@/components/ui/file-upload';
import LectureRecordingsList from '@/components/course/lecture-recordings-list';
import LectureRecordingUpload from '@/components/course/lecture-recording-upload';
import DemoAccessRequest from '@/components/course/demo-access-request';
import ModernSubscriptionModal from '@/components/modern-subscription-modal';
// PaymentPopup is not currently used
import AssignmentManagement from '@/components/assignments/assignment-management';
import StudentLiveClassCalendar from '@/components/attendance/student-live-class-calendar';
import { uploadToS3 } from '@/lib/s3';
import { createChapterFromFile } from '@/lib/chapters';
import { formatDate } from '@/utils/date';
import { trackPageView, trackCourseView } from '@/lib/tracking';
import {
  BookOpen,
  ChevronLeft,
  Play,
  Eye,
  Trash2,
  Edit,
  Plus,
  FileText,
  Download,
  Calendar,
  X,
  Crown,
  Menu,
} from 'lucide-react';

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
}

export default function CoursePageClient({ course, chapters, courseId, activeTab }: CoursePageClientProps) {
  const { user, userRole, loading: authLoading } = useAuth();
  const [chaptersList, setChaptersList] = useState<ChapterItem[]>(chapters);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasRecordingDemo, setHasRecordingDemo] = useState(false);
  const [hasLiveDemo, setHasLiveDemo] = useState(false);
  const [demoAccessLoading, setDemoAccessLoading] = useState(false); // Start as false to show tabs immediately
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [quizResults] = useState<any[]>([]);
  const [showQuizResults, setShowQuizResults] = useState(false);
  const [selectedAttempt, setSelectedAttempt] = useState<any>(null);
  const [showAttemptDetails, setShowAttemptDetails] = useState(false);
  const [showRecordingUploadModal, setShowRecordingUploadModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [showChoiceModal, setShowChoiceModal] = useState(false);
  const [isUpgrade, setIsUpgrade] = useState(false);
  // Selected plan is handled via localStorage in signup flow; keep local state minimal
  const [subscriptionPlans, setSubscriptionPlans] = useState<any[]>([]);
  const [subscriptionPlansLoading, setSubscriptionPlansLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setIsAdmin(userRole === 'admin' || userRole === 'superadmin');
  }, [userRole]);

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
        
        // Use a reasonable timeout for the API call
        const startTime = Date.now();
        
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


  const handleViewAttempt = async (attempt: any) => {
    try {
      // Since we now have the answers in the attempt data, we can show detailed breakdown
      setSelectedAttempt(attempt);
      setShowAttemptDetails(true);
    } catch (error) {
      alert('Failed to load attempt details');
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-indigo-200 dark:border-indigo-800 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin"></div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{course.title}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading course content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Header bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Hamburger menu button for mobile */}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden p-2"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-sm font-semibold text-gray-900 dark:text-white">{course.title}</h1>
          <span className="hidden md:inline text-xs text-gray-500 dark:text-gray-400">Course</span>
          {isAdmin && (
            <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
              Admin View
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Upgrade button for demo users */}
          {(hasRecordingDemo || hasLiveDemo) && userRole === 'student' && !isAdmin && (
            <Button 
              size="sm" 
              onClick={() => {
                setIsUpgrade(true);
                setShowSubscriptionModal(true);
              }}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            >
              <Crown className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Upgrade Now</span>
              <span className="sm:hidden">Upgrade</span>
            </Button>
          )}
          
          <ThemeToggle />
        </div>
      </div>
      <div className="px-0 h-[calc(100vh-56px)] overflow-hidden flex gap-0 lg:gap-6">
        {/* Sidebar (non-scrollable) */}
        <aside 
          className={`${sidebarOpen ? 'fixed inset-0 z-50 bg-black/50 lg:relative lg:bg-transparent' : 'hidden'} lg:block lg:w-[260px] lg:flex-shrink-0`}
          onClick={(e) => {
            // Close sidebar when clicking on backdrop (but not on mobile sidebar content)
            if (e.target === e.currentTarget && sidebarOpen) {
              setSidebarOpen(false);
            }
          }}
        >
          <div className={`rounded-none border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0b1220] px-4 pt-3 pb-0 shadow-sm w-[260px] h-full flex flex-col text-gray-800 dark:text-slate-200 ${sidebarOpen ? 'relative' : ''}`}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h1 className="text-base font-semibold text-gray-900 dark:text-white">{course.title}</h1>
                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden"
                  onClick={() => setSidebarOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {course.description && (
                <p className="mt-1 line-clamp-2 text-xs text-gray-600 dark:text-slate-300">{course.description}</p>
              )}
            </div>

            {/* Course section */}
            <div className="pt-4">
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-700 dark:text-slate-400">This Course</p>
              <ul className="space-y-1 text-sm text-gray-800 dark:text-slate-200">
                <li>
                  <Link 
                    href={{ pathname: `/courses/${courseId}`, query: { tab: 'chapters' } }} 
                    onClick={() => setSidebarOpen(false)}
                    className={`group relative flex items-center gap-3 rounded-md px-3 py-2 transition ${activeTab==='chapters' ? 'bg-gray-100 dark:bg-slate-800/70 text-gray-900 dark:text-white' : 'hover:bg-gray-100 dark:hover:bg-slate-800/70'}`}
                  >
                    <span className={`absolute left-0 top-0 h-full w-1 rounded-l bg-indigo-500 transition ${activeTab==='chapters' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                    <BookOpen className="h-4 w-4" /> Chapters
                  </Link>
                </li>
                {!(userRole === 'student' && !isAdmin && hasLiveDemo) && (
                  <li>
                    <Link 
                      href={{ pathname: `/courses/${courseId}`, query: { tab: 'lectures' } }} 
                      onClick={() => setSidebarOpen(false)}
                      className={`group relative flex items-center gap-3 rounded-md px-3 py-2 transition ${activeTab==='lectures' ? 'bg-gray-100 dark:bg-slate-800/70 text-gray-900 dark:text-white' : 'hover:bg-gray-100 dark:hover:bg-slate-800/70'}`}
                    >
                      <span className={`absolute left-0 top-0 h-full w-1 rounded-l bg-indigo-500 transition ${activeTab==='lectures' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                      <Play className="h-4 w-4" /> Recorded Lectures
                      {demoAccessLoading && userRole === 'student' && !isAdmin && (
                        <div className="ml-auto">
                          <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </Link>
                  </li>
                )}
                <li>
                  <Link 
                    href={{ pathname: `/courses/${courseId}`, query: { tab: 'quizzes' } }} 
                    onClick={() => setSidebarOpen(false)}
                    className={`group relative flex items-center gap-3 rounded-md px-3 py-2 transition ${activeTab==='quizzes' ? 'bg-gray-100 dark:bg-slate-800/70 text-gray-900 dark:text-white' : 'hover:bg-gray-100 dark:hover:bg-slate-800/70'}`}
                  >
                    <span className={`absolute left-0 top-0 h-full w-1 rounded-l bg-indigo-500 transition ${activeTab==='quizzes' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                    <Eye className="h-4 w-4" /> Quizzes
                  </Link>
                </li>
                <li>
                  <Link 
                    href={{ pathname: `/courses/${courseId}`, query: { tab: 'assignments' } }} 
                    onClick={() => setSidebarOpen(false)}
                    className={`group relative flex items-center gap-3 rounded-md px-3 py-2 transition ${activeTab==='assignments' ? 'bg-gray-100 dark:bg-slate-800/70 text-gray-900 dark:text-white' : 'hover:bg-gray-100 dark:hover:bg-slate-800/70'}`}
                  >
                    <span className={`absolute left-0 top-0 h-full w-1 rounded-l bg-indigo-500 transition ${activeTab==='assignments' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                    <FileText className="h-4 w-4" /> Assignments
                  </Link>
                </li>
                {!(userRole === 'student' && !isAdmin && hasRecordingDemo) && (
                  <li>
                    <Link 
                      href={{ pathname: `/courses/${courseId}`, query: { tab: 'live-classes' } }} 
                      onClick={() => setSidebarOpen(false)}
                      className={`group relative flex items-center gap-3 rounded-md px-3 py-2 transition ${activeTab==='live-classes' ? 'bg-gray-100 dark:bg-slate-800/70 text-gray-900 dark:text-white' : 'hover:bg-gray-100 dark:hover:bg-slate-800/70'}`}
                    >
                      <span className={`absolute left-0 top-0 h-full w-1 rounded-l bg-indigo-500 transition ${activeTab==='live-classes' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                      <Calendar className="h-4 w-4" /> Live Classes
                      {demoAccessLoading && userRole === 'student' && !isAdmin && (
                        <div className="ml-auto">
                          <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </Link>
                  </li>
                )}
              </ul>
            </div>
            <div className="mt-auto pt-2 pb-3">
              <Link
                href="/dashboard"
                onClick={() => setSidebarOpen(false)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-800 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800/70"
              >
                <ChevronLeft className="h-4 w-4" /> Back to Dashboard
              </Link>
            </div>
          </div>
        </aside>

        {/* Main content (scrollable) */}
        <main className="flex-1 overflow-y-auto px-4 md:px-6 lg:pr-2 lg:pl-2 space-y-8" style={{height: 'calc(100vh - 56px)'}}>

          {/* Chapters */}
          {activeTab === 'chapters' && (
            <section id="chapters" className="space-y-5">
              <div className="flex items-center justify-between pl-0 pt-2">
                <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold text-gray-900 dark:text-white tracking-tight">Chapters</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{chaptersList.length} total</span>
                  {isAdmin && (
                    <button 
                      onClick={() => setShowUploadModal(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                      <Plus className="h-4 w-4" />
                      Add Chapter
                    </button>
                  )}
                </div>
              </div>
              {chaptersList.length === 0 ? (
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center shadow-sm">
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full">
                      <BookOpen className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No chapters yet</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {isAdmin ? "Start by adding the first chapter to this course" : "Chapters will appear here once they're added"}
                      </p>
                    </div>
                    {isAdmin && (
                      <button className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
                        <Plus className="h-4 w-4" />
                        Add First Chapter
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {chaptersList.map(ch => (
                    <div key={ch.id} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 transition-all">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                            <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white line-clamp-1">{ch.title}</p>
                            {ch.created_at && (
                              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                <Calendar className="h-3 w-3" />
                                {formatDate(ch.created_at)}
                              </div>
                            )}
                          </div>
                        </div>
                        {isAdmin && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleDeleteChapter(ch.id)}
                              className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition"
                              title="Delete chapter"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                            <button
                              className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition"
                              title="Edit chapter"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {ch.content && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-3">{ch.content}</p>
                      )}
                      
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        {ch.file_url ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <a 
                              href={ch.file_url} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="inline-flex items-center gap-1 text-xs sm:text-sm text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
                            >
                              <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                              View Resource
                            </a>
                            <button
                              onClick={() => handleDownloadFile(ch.file_url!, ch.title)}
                              className="inline-flex items-center gap-1 text-xs sm:text-sm text-green-600 hover:text-green-800 hover:underline transition-colors"
                            >
                              <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                              Download
                            </button>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <FileText className="h-4 w-4" />
                            No resource
                          </span>
                        )}
                        
                        {ch.file_size && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {(ch.file_size / 1024 / 1024).toFixed(1)} MB
                          </span>
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
            <section id="lectures" className="space-y-5">
              <div className="flex items-center justify-between pl-0 pt-2">
                <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white tracking-tight">Recorded Lectures</h2>
              </div>
              
              {isAdmin && (
                <div className="flex items-center justify-end">
                  <button 
                    onClick={() => setShowRecordingUploadModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Upload Lecture Recording
                  </button>
                </div>
              )}

              <LectureRecordingsList
                courseId={courseId}
                userRole={isAdmin ? (userRole === 'superadmin' ? "superadmin" : "admin") : (user ? "student" : "guest")}
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
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white tracking-tight">Quizzes</h2>
              </div>
              
              <QuizSection 
                courseId={courseId} 
                userRole={isAdmin ? (userRole === 'superadmin' ? "superadmin" : "admin") : "student"} 
                userId={user?.id || ""} 
              />

              {/* Quiz Results Modal */}
              {showQuizResults && isAdmin && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto">
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Quiz Attempts</h3>
                        <button
                          onClick={() => setShowQuizResults(false)}
                          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          <X className="h-6 w-6" />
                        </button>
                      </div>
                      
                      {quizResults.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400 text-center py-8">No quiz attempts found</p>
                      ) : (
                        <div className="space-y-3">
                          {quizResults.map((result, index) => (
                            <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h4 className="font-medium text-gray-900 dark:text-white">{result.quiz_title}</h4>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                      by {result.student_name}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                    <span>Score: <span className="font-medium">{result.percentage || 0}%</span></span>
                                    <span>Correct: <span className="font-medium">{result.correct_answers}/{result.total_questions}</span></span>
                                    <span>Points: <span className="font-medium">{result.score}/{result.max_score}</span></span>
                                    <span>Date: <span className="font-medium">{formatDate(result.completed_at)}</span></span>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleViewAttempt(result)}
                                  className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                                >
                                  View Attempt
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Attempt Details Modal */}
              {showAttemptDetails && selectedAttempt && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{selectedAttempt.quiz_title}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Attempt by {selectedAttempt.student_name}</p>
                        </div>
                        <button
                          onClick={() => {
                            setShowAttemptDetails(false);
                            setSelectedAttempt(null);
                          }}
                          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          <X className="h-6 w-6" />
                        </button>
                      </div>

                      {/* Attempt Summary */}
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Score:</span>
                            <span className="ml-2 font-medium text-lg">{selectedAttempt.percentage || 0}%</span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Correct:</span>
                            <span className="ml-2 font-medium">{selectedAttempt.correct_answers}/{selectedAttempt.total_questions}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Points:</span>
                            <span className="ml-2 font-medium">{selectedAttempt.score}/{selectedAttempt.max_score}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Date:</span>
                            <span className="ml-2 font-medium">{formatDate(selectedAttempt.completed_at)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Questions and Answers */}
                      <div className="space-y-4">
                        <h4 className="text-lg font-medium text-gray-900 dark:text-white">Questions & Answers</h4>
                        {selectedAttempt.answers && selectedAttempt.answers.length > 0 ? (
                          <div className="space-y-4">
                            {selectedAttempt.answers.map((answer: any, qIndex: number) => (
                              <div key={qIndex} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                <div className="flex items-start justify-between mb-3">
                                  <h5 className="font-medium text-gray-900 dark:text-white">
                                    Question {qIndex + 1}
                                  </h5>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    answer.is_correct 
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                  }`}>
                                    {answer.is_correct ? 'Correct' : 'Incorrect'}
                                  </span>
                                </div>
                                
                                <div className="space-y-2">
                                  <div>
                                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Question:</span>
                                    <p className="mt-1 text-gray-700 dark:text-gray-300">{answer.question_text || 'Question text not available'}</p>
                                  </div>
                                  
                                  <div>
                                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Student Answer:</span>
                                    <p className="mt-1 p-2 bg-gray-50 dark:bg-gray-700 rounded border">
                                      {answer.selected_answer || 'No answer provided'}
                                    </p>
                                  </div>
                                  
                                  <div>
                                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Correct Answer:</span>
                                    <p className="mt-1 p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-700">
                                      {answer.correct_answer || 'Correct answer not available'}
                                    </p>
                                  </div>
                                  
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500 dark:text-gray-400">
                                      Points: {answer.points_earned || 0} / {answer.points || 0}
                                    </span>
                                    <span className={`font-medium ${
                                      answer.is_correct ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                    }`}>
                                      {answer.is_correct ? '✓ Correct' : '✗ Incorrect'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                            <p className="text-sm text-blue-800 dark:text-blue-200">
                              <strong>Note:</strong> No detailed answer data available for this attempt.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Assignments */}
          {activeTab === 'assignments' && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white tracking-tight">Assignments</h2>
              </div>
              <AssignmentManagement
                courseId={courseId}
                userRole={isAdmin ? (userRole === 'superadmin' ? 'superadmin' : 'admin') : 'student'}
                chapters={[]}
              />
            </section>
          )}

          {/* Live Classes */}
          {activeTab === 'live-classes' && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white tracking-tight">Live Classes</h2>
              </div>
              <StudentLiveClassCalendar courseId={courseId} />
            </section>
          )}
        </main>
      </div>
      
      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Upload Chapter Files
                </h3>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <FileUpload
                onUpload={handleFileUpload}
                accept=".pdf,.doc,.docx,image/*,video/*"
                maxFiles={10}
                maxSize={50} // 50MB
              />
            </div>
          </div>
        </div>
      )}

      {/* Recording Upload Modal */}
      {showRecordingUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Upload Lecture Recording
                </h3>
                <button
                  onClick={() => setShowRecordingUploadModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <LectureRecordingUpload
                courseId={courseId}
                onUploadSuccess={() => {
                  setShowRecordingUploadModal(false);
                  window.location.reload();
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Subscription Plans Modal */}
      {showSubscriptionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {isUpgrade ? 'Upgrade to Full Access' : 'Choose Your Plan'}
                </h3>
                <button
                  onClick={() => {
                    setShowSubscriptionModal(false);
                    setIsUpgrade(false);
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              {isUpgrade && (
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-blue-800 dark:text-blue-200 text-sm">
                    <strong>Upgrade from Demo:</strong> You&apos;ve used your demo access. Choose a plan below to get full access to all content.
                  </p>
                </div>
              )}
              <ModernSubscriptionModal
                isOpen={showSubscriptionModal}
                onClose={() => {
                  setShowSubscriptionModal(false);
                  setIsUpgrade(false);
                }}
                course={{
                  id: courseId,
                  title: course.title,
                  subject: course.title
                }}
                onSelectPlan={handleSubscriptionPlanSelect}
                subscriptionPlans={subscriptionPlans}
                loading={subscriptionPlansLoading}
              />
            </div>
          </div>
        </div>
      )}

      {/* Demo Access Modal */}
      {showDemoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Try for Free
                </h3>
                <button
                  onClick={() => setShowDemoModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <DemoAccessRequest
                courseId={courseId}
                courseTitle={course.title}
                onAccessGranted={() => {
                  setShowDemoModal(false);
                  window.location.reload();
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Choice Modal - Demo or Direct Subscription */}
      {showChoiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">Choose Your Path</h3>
                <button onClick={() => setShowChoiceModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <button
                  className="rounded-lg border p-6 text-left hover:border-indigo-400"
                  onClick={() => {
                    // Open demo picker explicitly and ensure plans modal is closed
                    setShowSubscriptionModal(false);
                    setShowChoiceModal(false);
                    setShowDemoModal(true);
                  }}
                >
                  <div className="text-lg font-semibold mb-2">Try Demo First</div>
                  <div className="text-sm text-muted-foreground">Get 24-hour free access to experience the content before subscribing</div>
                </button>
                <button
                  className="rounded-lg border p-6 text-left hover:border-amber-400"
                  onClick={() => {
                    // Open plans explicitly and ensure demo modal is closed
                    setShowDemoModal(false);
                    setShowChoiceModal(false);
                    setShowSubscriptionModal(true);
                  }}
                >
                  <div className="text-lg font-semibold mb-2">Subscribe Now</div>
                  <div className="text-sm text-muted-foreground">Get immediate full access with our flexible subscription plans</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Upgrade Button for Demo Users */}
      {(hasRecordingDemo || hasLiveDemo) && userRole === 'student' && !isAdmin && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button 
            size="lg"
            onClick={() => {
              console.log('🔐 Floating upgrade button clicked - checking auth state:', { 
                user: !!user, 
                userRole, 
                isAdmin,
                hasRecordingDemo,
                hasLiveDemo 
              });
              setIsUpgrade(true);
              setShowSubscriptionModal(true);
            }}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            <Crown className="h-5 w-5 mr-2" />
            Upgrade to Full Access
          </Button>
        </div>
      )}
    </div>
  );
}
