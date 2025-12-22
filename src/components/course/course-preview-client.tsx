'use client';

import { useState, useEffect, MouseEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Video, Loader2, ArrowLeft, User, Clock, FileVideo, Calendar } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface Course {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
}

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
  is_accessible?: boolean;
}

interface CoursePreviewClientProps {
  course: Course;
  courseId: string;
}

export default function CoursePreviewClient({ course, courseId }: CoursePreviewClientProps) {
  const [recording, setRecording] = useState<LectureRecording | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoToken, setVideoToken] = useState<string | null>(null);
  const [fetchingToken, setFetchingToken] = useState(false);
  const router = useRouter();

  // Prevent right-click on video
  const handleContextMenu = (e: MouseEvent<HTMLDivElement>) => {
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

  useEffect(() => {
    fetchRecording();
  }, [courseId]);

  const fetchRecording = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch first lecture (guest access)
      const response = await fetch(`/api/lecture-recordings/list?courseId=${courseId}`);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch recording');
      }

      const recordingsList = result.lectureRecordings || [];
      
      if (recordingsList.length === 0) {
        setError('No lecture recordings available for this course.');
        setLoading(false);
        return;
      }

      const firstRecording = recordingsList[0];
      setRecording(firstRecording);

      // Automatically fetch access token for the first recording
      if (firstRecording.id) {
        fetchAccessToken(firstRecording.id);
      }
    } catch (err) {
      console.error('Error fetching recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to load preview');
    } finally {
      setLoading(false);
    }
  };

  const fetchAccessToken = async (recordingId: string) => {
    try {
      setFetchingToken(true);
      
      // For guest preview, we don't send an auth header
      const response = await fetch('/api/lecture-recordings/access-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recordingId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get video access');
      }

      setVideoToken(data.token);
    } catch (err) {
      console.error('Error fetching access token:', err);
      toast.error('Failed to load video. Please try again.');
    } finally {
      setFetchingToken(false);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleRegister = () => {
    router.push(`/auth/signup?redirect=/courses/${courseId}/preview`);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-center">Loading Preview</CardTitle>
            <CardDescription className="text-center">
              Please wait while we load the course preview...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Link href="/courses" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to Courses
        </Link>
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="mt-6">
          <Link href="/courses">
            <Button variant="outline">Browse All Courses</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <Link href="/courses" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Courses
          </Link>
          <h1 className="text-3xl font-bold mb-2">{course.title}</h1>
          {course.description && (
            <p className="text-muted-foreground">{course.description}</p>
          )}
        </div>

        {/* Video Preview Section */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Video Player - Takes 2/3 of the width on large screens */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  Course Preview
                </CardTitle>
                <CardDescription>
                  Watch the first lecture to get a taste of this course
                </CardDescription>
              </CardHeader>
              <CardContent>
                {fetchingToken && !videoToken ? (
                  <div className="flex items-center justify-center h-64 bg-black rounded-lg">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                  </div>
                ) : recording && videoToken ? (
                  <div className="space-y-4">
                    <div 
                      className="rounded-lg overflow-hidden bg-black select-none" 
                      onContextMenu={handleContextMenu}
                      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                    >
                      <video
                        ref={(el) => {
                          if (el && videoToken) {
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
                        className="w-full h-auto max-h-[500px] object-contain bg-black"
                        controls
                        preload="auto"
                        playsInline
                        controlsList="nodownload noremoteplayback"
                        disablePictureInPicture
                        onContextMenu={handleContextMenu}
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
                      >
                        <source
                          src={`/api/lecture-recordings/stream?key=${encodeURIComponent(
                            recording.video_key || ''
                          )}&accessToken=${encodeURIComponent(videoToken)}`}
                          type="video/mp4"
                        />
                      </video>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">{recording.title}</h3>
                      {recording.description && (
                        <p className="text-sm text-muted-foreground mb-4">{recording.description}</p>
                      )}
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
                    </div>
                  </div>
                ) : (
                  <Alert>
                    <AlertDescription>
                      Unable to load video. Please try refreshing the page.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Registration CTA - Takes 1/3 of the width on large screens */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle>Ready to Start Learning?</CardTitle>
                <CardDescription>
                  Get full access to all course content, assignments, and more!
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={handleRegister}
                  className="w-full bg-primary text-white hover:bg-primary-600 text-lg py-6"
                  size="lg"
                >
                  Register Now
                </Button>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p className="font-medium">What you&apos;ll get:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Full access to all lectures</li>
                    <li>Assignments and quizzes</li>
                    <li>Live class sessions</li>
                    <li>Progress tracking</li>
                    <li>Certificate of completion</li>
                  </ul>
                </div>
                <Link href="/courses" className="block">
                  <Button variant="outline" className="w-full">
                    Browse More Courses
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

