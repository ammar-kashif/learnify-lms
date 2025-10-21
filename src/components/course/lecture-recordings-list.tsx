'use client';

import { useState, useEffect } from 'react';
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
  Crown
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';
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
  video_url: string;
  video_key: string;
  duration?: number;
  file_size: number;
  thumbnail_url?: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  teacher_name: string;
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
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [openRecordingId, setOpenRecordingId] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [demoAccess, setDemoAccess] = useState<any>(null);
  const [hasUsedDemoForCourse, setHasUsedDemoForCourse] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [watchedVideos, setWatchedVideos] = useState<Set<string>>(new Set());
  const [demoVideoId, setDemoVideoId] = useState<string | null>(null);

  // Load demo video restriction state from localStorage on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedDemoState = localStorage.getItem(`demo-videos-${courseId}`);
      if (savedDemoState) {
        try {
          const { isDemoMode: savedIsDemoMode, watchedVideos: savedWatchedVideos } = JSON.parse(savedDemoState);
          setIsDemoMode(savedIsDemoMode);
          setWatchedVideos(new Set(savedWatchedVideos));
          console.log('🎬 Loaded demo state from localStorage:', { isDemoMode: savedIsDemoMode, watchedVideos: savedWatchedVideos });
        } catch (error) {
          console.error('Error parsing saved demo state:', error);
        }
      }
    }
  }, [courseId]);

  // Debug logging for demo mode state
  useEffect(() => {
    console.log('🎬 Demo mode state changed:', {
      isDemoMode,
      watchedVideosCount: watchedVideos.size,
      watchedVideosArray: Array.from(watchedVideos),
      demoAccess: !!demoAccess
    });
  }, [isDemoMode, watchedVideos, demoAccess]);

  // Check if user has demo access for this course
  useEffect(() => {
    const checkDemoAccess = async () => {
      try {
        if (!session?.access_token) return; // require auth token
        const response = await fetch(`/api/demo-access?courseId=${courseId}&accessType=lecture_recording`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
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

    if (showAccessControls && userRole === 'student') {
      checkDemoAccess();
    }
  }, [courseId, showAccessControls, userRole, recordings]);

  // Set demo video ID when demo mode is activated and recordings are loaded
  useEffect(() => {
    if (isDemoMode && recordings.length > 0 && !demoVideoId) {
      const sortedRecordings = [...recordings].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      setDemoVideoId(sortedRecordings[0].id);
      console.log('🎬 Demo video set to (via useEffect):', sortedRecordings[0].id, sortedRecordings[0].title);
    }
  }, [isDemoMode, recordings, demoVideoId]);

  const checkAccess = async () => {
    console.log('🔍 checkAccess called:', { 
      hasSession: !!session?.access_token, 
      userRole, 
      courseId,
      showAccessControls 
    });
    
    if (!session?.access_token || userRole !== 'student') {
      console.log('❌ checkAccess early return:', { 
        noSession: !session?.access_token, 
        notStudent: userRole !== 'student' 
      });
      return;
    }

    try {
      // FIRST: Check if user is enrolled in the course (regular enrollment)
      console.log('📞 Calling enrollment API for courseId:', courseId);
      const enrollmentResponse = await fetch(`/api/enrollments?courseId=${courseId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      const enrollmentData = await enrollmentResponse.json();
      console.log('📊 Enrollment API response:', enrollmentData);

      if (enrollmentData.enrolled) {
        // User is enrolled - check if it's paid or demo
        if (enrollmentData.isPaidEnrollment) {
          // User has paid enrollment - full access
          console.log('✅ User has paid enrollment - full access');
          setHasAccess(true);
          setIsDemoMode(false);
          return;
        } else if (enrollmentData.isDemoEnrollment) {
          // User has demo enrollment - limited access (1 video only)
          console.log('✅ User has demo enrollment - limited access');
          console.log('🎬 Setting demo mode to TRUE');
          setHasAccess(true);
          setIsDemoMode(true);
          // Set demoAccess to trigger UI elements
          setDemoAccess({ id: 'demo-enrollment', accessType: 'lecture_recording' });
          return;
        }
      }

      // SECOND: Check demo access (only if not enrolled)
      const demoResponse = await fetch(`/api/demo-access?courseId=${courseId}&accessType=lecture_recording`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
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
            console.log('🎬 Loaded watched videos from database:', videoUsageData.watchedVideos);
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

      setHasAccess(false);
    } catch (error) {
      console.error('Error checking access:', error);
      setHasAccess(false);
    }
  };

  const fetchRecordings = async (inDemoMode = false) => {
    if (!session?.access_token) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/lecture-recordings/list?courseId=${courseId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch recordings');
      }

      const recordingsList = result.lectureRecordings || [];
      setRecordings(recordingsList);
      setHasLoadedOnce(true);
      
      // Prefer explicit demo, else local override (superadmin), else oldest in demo mode
      if (recordingsList.length > 0) {
        // 1) Server-side explicit demo
        const explicitDemo = recordingsList.find((r: any) => r.is_demo);
        if (explicitDemo) {
          setDemoVideoId(explicitDemo.id);
          console.log('🎬 Demo video set to explicit is_demo:', explicitDemo.id, explicitDemo.title);
        } else {
          // 2) Local override (used by superadmin immediately after change, until DB column exists/propagates)
          if (typeof window !== 'undefined') {
            const overrideId = localStorage.getItem(`demo-override-${courseId}`);
            if (overrideId && recordingsList.some((r: any) => r.id === overrideId)) {
              setDemoVideoId(overrideId);
              console.log('🎬 Demo video set via local override:', overrideId);
              return;
            }
          }

          // 3) Fallback to oldest only if in demo mode
          if (!inDemoMode) {
            console.log('🚫 Not in demo mode and no explicit demo/override; leaving demoVideoId null');
            setDemoVideoId(null);
            return;
          }
          const sortedRecordings = [...recordingsList].sort((a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          setDemoVideoId(sortedRecordings[0].id);
          console.log('🎬 Demo video set to oldest (fallback):', sortedRecordings[0].id, sortedRecordings[0].title);
        }
      }
    } catch (error) {
      console.error('Error fetching recordings:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch recordings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🔄 useEffect triggered:', { 
      courseId, 
      hasSession: !!session?.access_token, 
      refreshKey, 
      showAccessControls, 
      userRole 
    });
    
    fetchRecordings(false);
    if (showAccessControls && userRole === 'student') {
      console.log('🚀 Calling checkAccess from useEffect');
      checkAccess();
    } else {
      console.log('⏭️ Skipping checkAccess:', { 
        showAccessControls, 
        userRole, 
        shouldCall: showAccessControls && userRole === 'student' 
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, session?.access_token, refreshKey, showAccessControls, userRole]);

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
    console.log('🎬 handleVideoPlay called:', {
      recordingId,
      isDemoMode,
      demoVideoId,
      watchedVideosCount: watchedVideos.size,
      hasWatchedThisVideo: watchedVideos.has(recordingId),
      watchedVideosArray: Array.from(watchedVideos)
    });

    // Superadmin/teacher/admin should never be locked by demo rules
    if (userRole !== 'student') {
      setOpenRecordingId(recordingId);
      return;
    }

    // Check if this is a demo user trying to watch a non-demo video
    if (isDemoMode && demoVideoId && recordingId !== demoVideoId) {
      console.log('🚫 Demo video restriction - blocking non-demo video');
      console.log('🚫 Demo video ID:', demoVideoId);
      console.log('🚫 Trying to watch:', recordingId);
      toast.error('Demo access allows only the first video. Subscribe for unlimited access.');
      return;
    }

    // If in demo mode but demoVideoId is not set yet, block all videos
    if (isDemoMode && !demoVideoId) {
      console.log('🚫 Demo mode active but demo video not set yet - blocking video');
      console.log('🚫 Trying to watch:', recordingId);
      toast.error('Demo access is being set up. Please wait a moment and try again.');
      return;
    }

    setOpenRecordingId(recordingId);
    
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
        console.log('💾 Saved demo state to localStorage:', demoState);
      }

      // Track demo video usage in database
      try {
        await fetch('/api/demo-access/track-video', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            courseId,
            recordingId,
            accessType: 'lecture_recording'
          }),
        });
        console.log('📊 Tracked demo video usage in database');
      } catch (error) {
        console.error('Error tracking demo video usage:', error);
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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Video className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Lecture Recordings</h3>
        <Badge className="bg-muted text-foreground border border-border">{recordings.length}</Badge>
      </div>

      {/* Access Control for Students */}
      {(() => {
        const shouldShow = showAccessControls && userRole === 'student' && session?.access_token && hasAccess !== null;
        console.log('🎯 Access control render check:', {
          showAccessControls,
          userRole,
          hasSession: !!session?.access_token,
          hasAccess,
          hasUsedDemoForCourse,
          isDemoMode,
          demoAccess: !!demoAccess,
          shouldShow
        });
        return shouldShow;
      })() && (
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
          {(isDemoMode || hasUsedDemoForCourse) && (
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

          {(() => {
            const shouldShowDemoAlert = isDemoMode && demoAccess;
            console.log('🎬 Demo alert check:', {
              isDemoMode,
              demoAccess: !!demoAccess,
              shouldShowDemoAlert
            });
            return shouldShowDemoAlert;
          })() && (
            <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
              <Star className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-blue-800 dark:text-blue-200">
                <div className="flex items-center justify-between">
                  <span>🎬 Demo Mode: You can watch 1 video. Subscribe for unlimited access.</span>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    Demo Active
                  </Badge>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      <div className="grid gap-4">
        {recordings.map((recording) => (
          <Card key={recording.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    {recording.title}
                    {recording.is_published ? (
                      <Badge variant="default" className="text-xs bg-primary text-white">
                        <Eye className="h-3 w-3 mr-1" />
                        Published
                      </Badge>
                    ) : null}
                    {(recording as any).is_demo || (isDemoMode && demoVideoId && demoVideoId === recording.id) ? (
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                        <Star className="h-3 w-3 mr-1" />
                        Demo Video
                      </Badge>
                    ) : null}
                    {isDemoMode && watchedVideos.has(recording.id) && (
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
                {/* Play button for students and teachers */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleVideoPlay(recording.id)}
                  className="ml-2"
                  disabled={userRole === 'student' && isDemoMode && (demoVideoId === null || recording.id !== demoVideoId)}
                >
                  {openRecordingId === recording.id ? 'Hide' : 
                   (userRole === 'student' && isDemoMode && (demoVideoId === null || recording.id !== demoVideoId) ? 'Locked' : 'Play')}
                </Button>
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
                <div className="mt-4 rounded-lg overflow-hidden bg-black">
                  <video
                    className="w-full h-64 object-contain bg-black"
                    controls
                    preload="auto"
                    autoPlay
                    muted
                    playsInline
                    controlsList="nodownload noremoteplayback"
                    disablePictureInPicture
                  >
                    <source src={`/api/lecture-recordings/stream?key=${encodeURIComponent(recording.video_key)}&token=${encodeURIComponent(session?.access_token || '')}`} />
                  </video>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
