'use client';

import { useState, useEffect, MouseEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Video, 
  Calendar, 
  User, 
  MoreVertical,
  Trash2,
  Eye,
  EyeOff,
  Clock,
  FileVideo,
  Lock,
  Star,
  Crown,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { trackVideoPlay, trackVideoComplete } from '@/lib/tracking';
import { getGuestDemo, setGuestDemo, hasGuestDemoExpired } from '@/lib/guest-demo';
import DemoCountdownTimer from './demo-countdown-timer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface LectureRecording {
  id: string;
  title: string;
  description?: string;
  video_url: string | null;
  video_key: string | null;
  duration?: number;
  file_size: number;
  thumbnail_url?: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  teacher_name: string;
  is_accessible?: boolean; // true if user can play this lecture, false if locked
}

interface LectureRecordingsListProps {
  courseId: string;
  userRole: string;
  refreshKey?: number;
  showAccessControls?: boolean;
  onAccessRequired?: () => void;
}

export default function LectureRecordingsList({ 
  courseId, 
  userRole,
  refreshKey,
  showAccessControls = false,
  onAccessRequired
}: LectureRecordingsListProps) {
  const { session } = useAuth();
  const [recordings, setRecordings] = useState<LectureRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingEnrollment, setCheckingEnrollment] = useState(true);
  const [isPaidUser, setIsPaidUser] = useState(false);
  const [enrollmentChecked, setEnrollmentChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [openRecordingId, setOpenRecordingId] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [demoAccess, setDemoAccess] = useState<any>(null);
  const [hasUsedDemoForCourse, setHasUsedDemoForCourse] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [watchedVideos, setWatchedVideos] = useState<Set<string>>(new Set());
  const [demoVideoId, setDemoVideoId] = useState<string | null>(null);
  const [videoTokens, setVideoTokens] = useState<Record<string, string>>({});
  const [guestDemo, setGuestDemoState] = useState<ReturnType<typeof getGuestDemo>>(null);
  const [showGuestDemoExpiredModal, setShowGuestDemoExpiredModal] = useState(false);

  // Check for guest demo on mount
  useEffect(() => {
    if (!session) {
      const demo = getGuestDemo(courseId);
      if (demo && !hasGuestDemoExpired(demo)) {
        setGuestDemoState(demo);
        setIsDemoMode(true);
        // If videoId is set in guest demo, use it
        if (demo.videoId) {
          setDemoVideoId(demo.videoId);
        }
      } else if (demo && hasGuestDemoExpired(demo)) {
        setShowGuestDemoExpiredModal(true);
      }
    }
  }, [session, courseId]);

  // Prevent right-click on video
  const handleContextMenu = (e: MouseEvent<HTMLElement>) => {
    e.preventDefault();
    return false;
  };

  // Block keyboard shortcuts for downloading/saving videos
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block Ctrl+S / Cmd+S (Save)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        return false;
      }
      // Block Ctrl+P / Cmd+P (Print)
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        return false;
      }
      // Block F12 (Dev Tools)
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }
      // Block Ctrl+Shift+I / Cmd+Option+I (Dev Tools)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        return false;
      }
      // Block Ctrl+Shift+J / Cmd+Option+J (Console)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'J') {
        e.preventDefault();
        return false;
      }
      // Block Ctrl+U / Cmd+U (View Source)
      if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Check enrollment status immediately for authenticated users, or load demo state for guests
  useEffect(() => {
    // Prevent multiple checks - only run once per user session
    if (enrollmentChecked) return;
    
    const checkEnrollmentAndSetDemoState = async () => {
      // Non-students (admin, teacher, superadmin) get full access immediately
      if (session?.access_token && userRole && userRole !== 'student') {
        setHasAccess(true);
        setIsPaidUser(true);
        setIsDemoMode(false);
        setCheckingEnrollment(false);
        setEnrollmentChecked(true);
        return;
      }
      
      if (session?.access_token && userRole === 'student') {
        // Authenticated user - check enrollment from database immediately
        try {
          const enrollmentResponse = await fetch(`/api/enrollments?courseId=${courseId}`, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            },
          });
          const enrollmentData = await enrollmentResponse.json();
          
          if (enrollmentData.enrolled && enrollmentData.isPaidEnrollment) {
            // Paid user - clear all demo state immediately and grant access
            setHasAccess(true);
            setIsPaidUser(true); // Mark as paid user to prevent demo mode from being re-enabled
            setIsDemoMode(false);
            setWatchedVideos(new Set());
            setDemoVideoId(null); // Clear any demo video selection
    if (typeof window !== 'undefined') {
              localStorage.removeItem(`demo-videos-${courseId}`);
              localStorage.removeItem(`demo-override-${courseId}`); // Clear admin override
            }
            setCheckingEnrollment(false);
            setEnrollmentChecked(true); // Mark as checked
            return; // Exit early, don't load any demo state
          }
        } catch (error) {
          console.error('Error checking enrollment:', error);
        }
      }
      
      // Only load demo state if not authenticated or not a paid user
      if (typeof window !== 'undefined' && !session) {
      const savedDemoState = localStorage.getItem(`demo-videos-${courseId}`);
      if (savedDemoState) {
        try {
          const { isDemoMode: savedIsDemoMode, watchedVideos: savedWatchedVideos } = JSON.parse(savedDemoState);
          setIsDemoMode(savedIsDemoMode);
          setWatchedVideos(new Set(savedWatchedVideos));
        } catch (error) {
          console.error('Error parsing saved demo state:', error);
        }
      }
    }
      
      // Mark enrollment check as complete
      setCheckingEnrollment(false);
      setEnrollmentChecked(true);
    };
    
    // Only run this check once per course/session combination
    if (!enrollmentChecked) {
      if (session?.access_token && userRole) {
        // Authenticated user with role loaded - check enrollment
        checkEnrollmentAndSetDemoState();
      } else if (!session) {
        // Guest user - mark as checked immediately and grant basic access
        setHasAccess(true); // Guests can see the first lecture
        setCheckingEnrollment(false);
        setEnrollmentChecked(true);
      }
      // If session exists but userRole not yet loaded, wait for next render
    }
  }, [courseId, session?.access_token, userRole, enrollmentChecked]);

  // Demo mode state tracking (removed console logs for production)

  // Check if user has demo access for this course
  useEffect(() => {
    const checkDemoAccess = async () => {
      try {
        if (!session?.access_token) return; // require auth token
        // Add cache-busting timestamp to ensure fresh data
        const response = await fetch(`/api/demo-access?courseId=${courseId}&accessType=lecture_recording&_t=${Date.now()}`, {
          headers: { 
            'Authorization': `Bearer ${session.access_token}`,
            'Cache-Control': 'no-cache',
          },
        });
        const data = await response.json();
        
        if (data.hasAccess && data.demoAccess && data.demoAccess.length > 0) {
          setHasUsedDemoForCourse(true);
          setDemoAccess(data.demoAccess[0]);
          setHasAccess(true);
          setIsDemoMode(true);
          
          // Set demo video ID if recordings are already loaded
          if (recordings.length > 0) {
            const sortedRecordings = [...recordings].sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
            setDemoVideoId(sortedRecordings[0].id);
          }
        }
      } catch (error) {
        console.error('Error checking demo access:', error);
      }
    };

    // Only check demo access for non-paid students
    if (showAccessControls && userRole === 'student' && !isPaidUser) {
      checkDemoAccess();
    }
  }, [courseId, showAccessControls, userRole, recordings, isPaidUser]);

  // Set demo video ID when demo mode is activated and recordings are loaded
  // BUT: Never run this for paid users OR while still checking enrollment
  useEffect(() => {
    // Wait until enrollment check is complete
    if (checkingEnrollment) return;
    
    if (!isPaidUser && isDemoMode && recordings.length > 0 && !demoVideoId) {
      const sortedRecordings = [...recordings].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      setDemoVideoId(sortedRecordings[0].id);
    }
  }, [checkingEnrollment, isPaidUser, isDemoMode, recordings, demoVideoId]);

  const checkAccess = async () => {
    if (!session?.access_token || userRole !== 'student') {
      return;
    }

    try {
      // FIRST: Check if user is enrolled in the course (regular enrollment)
      const enrollmentResponse = await fetch(`/api/enrollments?courseId=${courseId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      const enrollmentData = await enrollmentResponse.json();

      if (enrollmentData.enrolled) {
        // User is enrolled - check if it's paid or demo
        if (enrollmentData.isPaidEnrollment) {
          // User has paid enrollment - full access
          setHasAccess(true);
          setIsPaidUser(true); // Mark as paid user to prevent demo mode from being re-enabled
          setIsDemoMode(false);
          setWatchedVideos(new Set());
          setDemoVideoId(null); // Clear any demo video selection
          // Clear demo state from localStorage (all possible keys)
          if (typeof window !== 'undefined') {
            localStorage.removeItem(`demo-videos-${courseId}`);
            localStorage.removeItem(`demoState_${courseId}`);
            localStorage.removeItem(`demo-override-${courseId}`); // Clear admin override
          }
          return;
        } else if (enrollmentData.isDemoEnrollment) {
          // User has demo enrollment - check what type of demo access they have
          // RUTHLESS CHECK: Only allow recordings if they have lecture_recording demo access
          // Add cache-busting timestamp to ensure fresh data
          const demoResponse = await fetch(`/api/demo-access?courseId=${courseId}&accessType=lecture_recording&_t=${Date.now()}`, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Cache-Control': 'no-cache',
            },
          });
          const demoData = await demoResponse.json();
          
          if (demoData.hasAccess && demoData.demoAccess && demoData.demoAccess.length > 0) {
            const demoAccessRecord = demoData.demoAccess[0];
            if (demoAccessRecord.access_type === 'lecture_recording') {
              setHasAccess(true);
              setIsDemoMode(true);
              setDemoAccess(demoAccessRecord);
              
              // Load watched videos
              try {
                const videoUsageResponse = await fetch(`/api/demo-access/video-usage?courseId=${courseId}`, {
                  headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                  },
                });
                if (videoUsageResponse.ok) {
                  const videoUsageData = await videoUsageResponse.json();
                  if (videoUsageData.watchedVideos && videoUsageData.watchedVideos.length > 0) {
                    setWatchedVideos(new Set(videoUsageData.watchedVideos));
                  }
                }
              } catch (e) {
                console.error('Error loading video usage:', e);
              }
              return;
            }
          }
          
          // If demo enrollment exists but no lecture_recording access, DENY access
          setHasAccess(false);
          setIsDemoMode(false);
          // Clear any stale localStorage data
          try {
            localStorage.removeItem(`demo-videos-${courseId}`);
            localStorage.removeItem(`demo-override-${courseId}`);
          } catch (e) {
            console.error('Error clearing localStorage:', e);
          }
          return;
        }
      }

      // SECOND: Check demo access (only if not enrolled)
      // Add cache-busting timestamp to ensure fresh data
      const demoResponse = await fetch(`/api/demo-access?courseId=${courseId}&accessType=lecture_recording&_t=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Cache-Control': 'no-cache',
        },
      });
      const demoData = await demoResponse.json();

      if (demoData.hasAccess && demoData.demoAccess.length > 0) {
        setDemoAccess(demoData.demoAccess[0]);
        setHasAccess(true);
        setIsDemoMode(true);
        
        // Check if user has already watched videos in demo mode
        const videoUsageResponse = await fetch(`/api/demo-access/video-usage?courseId=${courseId}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });
        
        if (videoUsageResponse.ok) {
          const videoUsageData = await videoUsageResponse.json();
          if (videoUsageData.watchedVideos && videoUsageData.watchedVideos.length > 0) {
            setWatchedVideos(new Set(videoUsageData.watchedVideos));
          }
        }
        
        return;
      }

      // THIRD: Check subscription access (only if not enrolled)
      const subResponse = await fetch(`/api/user-subscriptions?courseId=${courseId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      const subData = await subResponse.json();
      
      if (subData.subscriptions && subData.subscriptions.length > 0) {
        const activeSubscription = subData.subscriptions.find((sub: any) => 
          sub.status === 'active' && new Date(sub.expires_at) > new Date()
        );
        
        if (activeSubscription) {
          setHasAccess(true);
          setIsDemoMode(false);
          return;
        }
      }

      // No access found - clear any stale localStorage
      console.log('🚫 No access found - clearing localStorage');
      try {
        localStorage.removeItem(`demo-videos-${courseId}`);
        localStorage.removeItem(`demo-override-${courseId}`);
      } catch (e) {
        console.error('Error clearing localStorage:', e);
      }
      setHasAccess(false);
    } catch (error) {
      console.error('Error checking access:', error);
      setHasAccess(false);
    }
  };

  const fetchRecordings = async (inDemoMode = false) => {
    try {
      setLoading(true);
      setError(null);

      // Build headers - auth is optional for guests
      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/lecture-recordings/list?courseId=${courseId}`, {
        headers,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch recordings');
      }

      const recordingsList = result.lectureRecordings || [];
      setRecordings(recordingsList);
      setHasLoadedOnce(true);
      
      // For guests, set hasAccess based on API response
      // BUT: Only if user is not already confirmed as paid
      if (result.isGuest && !isPaidUser) {
        setHasAccess(true); // Guests have access to first lecture
        setIsDemoMode(true); // Treat guests like demo users
        // Set first accessible lecture as demo video
        const firstAccessible = recordingsList.find((r: any) => r.is_accessible !== false);
        if (firstAccessible) {
          setDemoVideoId(firstAccessible.id);
        }
      }
      
      // Prefer explicit demo, else local override (superadmin), else oldest in demo mode
      // BUT: Only do this if user is in demo mode, guest, or admin (not paid users)
      const shouldSetDemoVideo = !isPaidUser && (inDemoMode || result.isGuest || userRole === 'admin' || userRole === 'superadmin');
      
      if (recordingsList.length > 0 && shouldSetDemoVideo && !isPaidUser) {
        // 1) Server-side explicit demo
        const explicitDemo = recordingsList.find((r: any) => r.is_demo);
        if (explicitDemo) {
          setDemoVideoId(explicitDemo.id);
        } else {
          // 2) Local override (used by superadmin immediately after change, until DB column exists/propagates)
          if (typeof window !== 'undefined') {
            const overrideId = localStorage.getItem(`demo-override-${courseId}`);
            if (overrideId && recordingsList.some((r: any) => r.id === overrideId)) {
              setDemoVideoId(overrideId);
              return;
            }
          }

          // 3) Fallback to oldest only if in demo mode
          if (!inDemoMode) {
            setDemoVideoId(null);
            return;
          }
          const sortedRecordings = [...recordingsList].sort((a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          setDemoVideoId(sortedRecordings[0].id);
        }
      } else if (!shouldSetDemoVideo) {
        // Paid users or users not in demo mode: clear demo video
        setDemoVideoId(null);
      }
    } catch (error) {
      console.error('Error fetching recordings:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch recordings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Wait for enrollment check to complete before fetching recordings
    if (checkingEnrollment && session?.access_token) {
      return; // Don't fetch until we know if user is paid
    }
    
    // Always fetch recordings (works for guests too)
    fetchRecordings(false);
    
    // Only check access for authenticated students who aren't already confirmed as paid
    if (showAccessControls && userRole === 'student' && session?.access_token && !isPaidUser) {
      checkAccess();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, session?.access_token, refreshKey, showAccessControls, userRole, checkingEnrollment, isPaidUser]);

  const handleTogglePublish = async (recordingId: string, currentStatus: boolean) => {
    if (!session?.access_token) return;

    try {
      const response = await fetch(`/api/lecture-recordings/${recordingId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_published: !currentStatus,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update recording');
      }

      toast.success(`Recording ${!currentStatus ? 'published' : 'unpublished'} successfully`);
      
      // Update local state
      setRecordings(prev => 
        prev.map(recording => 
          recording.id === recordingId 
            ? { ...recording, is_published: !currentStatus }
            : recording
        )
      );

      // no-op
    } catch (error) {
      console.error('Error updating recording:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update recording');
    }
  };

  const handleDelete = async (recordingId: string) => {
    if (!session?.access_token) return;

    if (!confirm('Are you sure you want to delete this lecture recording? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/lecture-recordings/${recordingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete recording');
      }

      toast.success('Recording deleted successfully');
      
      // Update local state
      setRecordings(prev => prev.filter(recording => recording.id !== recordingId));

      // no-op
    } catch (error) {
      console.error('Error deleting recording:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete recording');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return 'Unknown';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleRequestDemoAccess = async () => {
    try {
      const response = await fetch('/api/demo-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId,
          accessType: 'lecture_recording'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setDemoAccess(data.demoAccess);
        setHasAccess(true);
        setHasUsedDemoForCourse(true);
        setIsDemoMode(true);
        toast.success('Demo access granted! You now have 24 hours of access for this course.');
        fetchRecordings(true);
      } else {
        if (data.error.includes('already used')) {
          setHasUsedDemoForCourse(true);
          toast.error('You have already used your demo access for this course');
        } else {
          toast.error(data.error || 'Failed to grant demo access');
        }
      }
    } catch (error) {
      console.error('Error requesting demo access:', error);
      toast.error('Failed to request demo access');
    }
  };

  const handleVideoPlay = async (recordingId: string) => {
    // Check if lecture is locked (for guests or non-enrolled users)
    const recording = recordings.find(r => r.id === recordingId);
    if (recording && recording.is_accessible === false) {
      console.log('🚫 Lecture is locked - redirecting to signup');
      if (!session) {
        window.location.href = `/auth/signup?redirect=/courses/${courseId}`;
      } else {
        onAccessRequired?.();
      }
      return;
    }

    // Superadmin/teacher/admin should never be locked by demo rules
    if (userRole !== 'student' && userRole !== 'guest') {
      setOpenRecordingId(recordingId);
      return;
    }

    // For guest demo users
    if (guestDemo && !session) {
      // Check if demo expired
      if (hasGuestDemoExpired(guestDemo)) {
        setShowGuestDemoExpiredModal(true);
        return;
      }

      // Update guest demo with the video ID if not set
      if (!guestDemo.videoId) {
        const updatedDemo = setGuestDemo(courseId, recordingId);
        setGuestDemoState(updatedDemo);
        setDemoVideoId(recordingId);
      }

      // Only allow the demo video
      const allowedVideoId = guestDemo.videoId || recordingId;
      if (recordingId !== allowedVideoId) {
        toast.error('Guest demo allows only one video. Sign up to unlock all lectures!');
        setShowGuestDemoExpiredModal(true);
        return;
      }

      setOpenRecordingId(recordingId);
      return;
    }

    // Check if this is a demo user trying to watch a non-demo video
    if (isDemoMode && demoVideoId && recordingId !== demoVideoId) {
      if (!session) {
        toast.error('Sign up to unlock all lectures!');
        window.location.href = `/auth/signup?redirect=/courses/${courseId}`;
      } else {
        toast.error('Demo access allows only the first video. Subscribe for unlimited access.');
        onAccessRequired?.();
      }
      return;
    }

    // If in demo mode but demoVideoId is not set yet, block all videos
    if (isDemoMode && !demoVideoId) {
      toast.error('Demo access is being set up. Please wait a moment and try again.');
      return;
    }

    // Ensure we have a short‑lived access token for this recording before opening
    try {
      if (!videoTokens[recordingId]) {
        // Try to get fresh session if not available
        let accessToken = session?.access_token;
        if (!accessToken) {
          console.log('🔄 No session in context, trying to get fresh session...');
          try {
            const { data: { session: freshSession } } = await supabase.auth.getSession();
            if (freshSession?.access_token) {
              accessToken = freshSession.access_token;
              console.log('✅ Fresh session obtained');
            } else {
              console.error('No auth session for video access');
              toast.error('You need to be signed in to play this video. Please sign in and try again.');
              return;
            }
          } catch (error) {
            console.error('Error getting session:', error);
            toast.error('Authentication error. Please sign in again.');
            return;
          }
        }

        const res = await fetch('/api/lecture-recordings/access-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ recordingId }),
        });

        const data = await res.json();
        if (!res.ok) {
          console.error('Failed to get video access token:', data);
          toast.error(data.error || 'Unable to start video stream.');
          return;
        }

        setVideoTokens((prev) => ({ ...prev, [recordingId]: data.token }));
      }
    } catch (e) {
      console.error('Error requesting video access token:', e);
      toast.error('Unable to start video stream.');
      return;
    }

    setOpenRecordingId(recordingId);
    
    // Track video play
    if (recording) {
      trackVideoPlay(recordingId, courseId, {
        title: recording.title,
        duration: recording.duration,
      }, session?.access_token || null);
    }
    
    if (isDemoMode && !watchedVideos.has(recordingId)) {
      console.log('✅ Adding video to watched list');
      const newWatchedVideos = new Set(Array.from(watchedVideos).concat(recordingId));
      setWatchedVideos(newWatchedVideos);
      
      // Save to localStorage
      if (typeof window !== 'undefined') {
        const demoState = {
          isDemoMode: true,
          watchedVideos: Array.from(newWatchedVideos),
          courseId: courseId,
          timestamp: Date.now()
        };
        localStorage.setItem(`demo-videos-${courseId}`, JSON.stringify(demoState));
      }

      // Track demo video usage in database (only if authenticated)
      if (session?.access_token) {
        try {
          await fetch('/api/demo-access/track-video', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              courseId,
              recordingId,
              accessType: 'lecture_recording'
            }),
          });
        } catch (error) {
          console.error('Error tracking demo video usage:', error);
        }
      }
    }
  };

  if (loading && !hasLoadedOnce) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Video className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Lecture Recordings</h3>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Video className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Lecture Recordings</h3>
        </div>
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!loading && recordings.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Video className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Lecture Recordings</h3>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileVideo className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">No lecture recordings available.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading screen during initial load and enrollment check
  // This prevents any flashing of demo mode UI for paid users
  const isInitializing = checkingEnrollment || !hasLoadedOnce || (session && hasAccess === null);
  
  if (isInitializing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Video className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Lecture Recordings</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading your course content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Video className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Lecture Recordings</h3>
        <Badge className="bg-muted text-foreground border border-border">
          {isDemoMode && demoVideoId ? 1 : recordings.length}
        </Badge>
      </div>

      {/* Guest Demo Countdown Timer */}
      {guestDemo && !session && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100">Guest Demo Active</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">You can watch 1 video</p>
                </div>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  <Star className="h-3 w-3 mr-1" />
                  Demo
                </Badge>
              </div>
              <DemoCountdownTimer 
                demo={guestDemo} 
                onExpire={() => setShowGuestDemoExpiredModal(true)}
                showProgress={true}
              />
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  window.location.href = `/auth/signup?redirect=/courses/${courseId}`;
                }}
                className="w-full"
              >
                Sign Up for Full Access
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Access Control for Students */}
      {showAccessControls && userRole === 'student' && session?.access_token && hasAccess !== null && (
        <div className="space-y-4">
          {hasAccess === false && !hasUsedDemoForCourse && (
            <Alert>
              <Lock className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span>You need a subscription or demo access to view lecture recordings.</span>
                  <Button size="sm" onClick={handleRequestDemoAccess}>
                    <Star className="h-4 w-4 mr-2" />
                    Try Demo
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Show upgrade button for any demo user */}
          {!checkingEnrollment && !isPaidUser && (isDemoMode || hasUsedDemoForCourse) && (
            <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
              <Crown className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-blue-800 dark:text-blue-200">
                <div className="flex items-center justify-between">
                  <span>Want unlimited access? Upgrade to full subscription now!</span>
                  <Button size="sm" onClick={() => onAccessRequired?.()}>
                    <Crown className="h-4 w-4 mr-2" />
                    Upgrade Now
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {isDemoMode && demoAccess && (
            <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
              <Star className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-blue-800 dark:text-blue-200">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span>🎬 Demo Mode: You can watch 1 video. Subscribe for unlimited access.</span>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      Demo Active
                    </Badge>
                  </div>
                  <DemoCountdownTimer 
                    demo={demoAccess} 
                    compact={true}
                  />
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      <div className="grid gap-4">
        {(isDemoMode && demoVideoId 
          ? recordings.filter(r => r.id === demoVideoId)
          : recordings
        ).map((recording) => (
          <Card key={recording.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    {recording.title}
                    {!checkingEnrollment && recording.is_accessible === false && (
                      <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 bg-amber-50">
                        <Lock className="h-3 w-3 mr-1" />
                        Locked
                      </Badge>
                    )}
                    {recording.is_published ? (
                      <Badge variant="default" className="text-xs bg-primary text-white">
                        <Eye className="h-3 w-3 mr-1" />
                        Published
                      </Badge>
                    ) : null}
                    {!checkingEnrollment && ((recording as any).is_demo || (isDemoMode && demoVideoId && demoVideoId === recording.id)) ? (
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                        <Star className="h-3 w-3 mr-1" />
                        Demo Video
                      </Badge>
                    ) : null}
                    {!checkingEnrollment && isDemoMode && watchedVideos.has(recording.id) && (
                      <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                        <Star className="h-3 w-3 mr-1" />
                        Demo Watched
                      </Badge>
                    )}
                  </CardTitle>
                  {recording.description && (
                    <CardDescription className="line-clamp-2">
                      {recording.description}
                    </CardDescription>
                  )}
                </div>

                {(userRole === 'teacher' || userRole === 'admin' || userRole === 'superadmin') && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {userRole === 'superadmin' && (
                        <DropdownMenuItem
                          onClick={async () => {
                            try {
                              const res = await fetch('/api/lecture-recordings/set-demo', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${session?.access_token}`,
                                },
                                body: JSON.stringify({ courseId, recordingId: recording.id }),
                              });
                              const data = await res.json();
                              if (!res.ok) throw new Error(data.error || 'Failed to set demo');
                              // Immediately reflect change locally
                              setDemoVideoId(recording.id);
                              setRecordings(prev => prev.map(r => ({ ...r, is_demo: r.id === recording.id })));
                              if (typeof window !== 'undefined') {
                                localStorage.setItem(`demo-override-${courseId}`, recording.id);
                              }
                              // Force refresh from server to avoid any stale data
                              await fetchRecordings(isDemoMode);
                              toast.success('Set as demo video');
                            } catch (e) {
                              console.error(e);
                              toast.error('Failed to set demo video');
                            }
                          }}
                        >
                          <Star className="h-4 w-4 mr-2" />
                          {recording.id === demoVideoId ? 'Demo Selected' : 'Set as Demo'}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => handleTogglePublish(recording.id, recording.is_published)}
                      >
                        {recording.is_published ? (
                          <>
                            <EyeOff className="h-4 w-4 mr-2" />
                            Unpublish
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4 mr-2" />
                            Publish
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(recording.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                {/* Play button - handle guest, student, and teacher states */}
                {checkingEnrollment ? (
                  // Loading state - don't show any button until enrollment check completes
                  <div className="ml-2 h-9 w-20" />
                ) : recording.is_accessible === false ? (
                  <div className="ml-2 flex items-center gap-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Redirect to signup if guest, or show upgrade prompt if student
                        if (!session) {
                          window.location.href = `/auth/signup?redirect=/courses/${courseId}`;
                        } else {
                          onAccessRequired?.();
                        }
                      }}
                    >
                      {!session ? 'Sign Up to Unlock' : 'Upgrade to Unlock'}
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleVideoPlay(recording.id)}
                    className="ml-2"
                    disabled={
                      (userRole === 'student' && isDemoMode && (demoVideoId === null || recording.id !== demoVideoId)) ||
                      recording.is_accessible !== true
                    }
                  >
                    {openRecordingId === recording.id ? 'Hide' : 
                     (userRole === 'student' && isDemoMode && (demoVideoId === null || recording.id !== demoVideoId) ? 'Locked' : 'Play')}
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              {/* Recording Details Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{formatDuration(recording.duration)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <FileVideo className="h-4 w-4" />
                  <span>{formatFileSize(recording.file_size)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>{recording.teacher_name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(recording.created_at)}</span>
                </div>
              </div>

              {openRecordingId === recording.id && (
                <div 
                  className="mt-4 rounded-lg overflow-hidden bg-black select-none" 
                  onContextMenu={handleContextMenu}
                  style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                >
                  <video
                    ref={(el) => {
                      if (el && videoTokens[recording.id]) {
                        // Force play when video loads
                        const playPromise = el.play();
                        if (playPromise !== undefined) {
                          playPromise.catch(() => {
                            // Auto-play was prevented, unmute might help
                            el.muted = true;
                            el.play().catch(() => {
                              // Still failed, user needs to click play
                            });
                          });
                        }
                      }
                    }}
                    className="w-full h-64 object-contain bg-black"
                    controls
                    preload="auto"
                    playsInline
                    controlsList="nodownload noremoteplayback"
                    disablePictureInPicture
                    onContextMenu={handleContextMenu}
                    onLoadedMetadata={(e) => {
                      const video = e.currentTarget;
                      // Set buffer size for smoother playback
                      if ('buffered' in video) {
                        video.volume = 1.0;
                      }
                    }}
                    onCanPlay={(e) => {
                      const video = e.currentTarget;
                      // Auto-play when enough data is buffered
                      if (video.paused) {
                        const playPromise = video.play();
                        if (playPromise !== undefined) {
                          playPromise.catch(() => {
                            // Auto-play prevented by browser
                            video.muted = true;
                            video.play();
                          });
                        }
                      }
                    }}
                    onEnded={() => {
                      // Track video completion
                      trackVideoComplete(recording.id, courseId, {
                        title: recording.title,
                        duration: recording.duration,
                      }, session?.access_token || null);
                    }}
                  >
                    {videoTokens[recording.id] && (
                      <source
                        src={`/api/lecture-recordings/stream?key=${encodeURIComponent(
                          recording.video_key || ''
                        )}&accessToken=${encodeURIComponent(
                          videoTokens[recording.id]
                        )}`}
                        type="video/mp4"
                      />
                    )}
                    <track kind="captions" />
                  </video>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Guest Demo Expired Modal */}
      {showGuestDemoExpiredModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-red-600" />
                Demo Expired
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700 dark:text-gray-300">
                Your 24-hour guest demo has expired. Sign up to get full access to all lecture recordings!
              </p>
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg space-y-2">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100">Premium Features:</h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>✓ Unlimited lecture recordings</li>
                  <li>✓ Live classes with teachers</li>
                  <li>✓ Quizzes and assignments</li>
                  <li>✓ Course certificates</li>
                </ul>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowGuestDemoExpiredModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    window.location.href = `/auth/signup?redirect=/courses/${courseId}`;
                  }}
                  className="flex-1"
                >
                  Sign Up Now
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
