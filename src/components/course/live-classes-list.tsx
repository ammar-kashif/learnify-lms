'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Video, 
  Calendar, 
  User, 
  Clock,
  ExternalLink,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
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

interface LiveClass {
  id: string;
  title: string;
  description?: string;
  meeting_url?: string;
  meeting_id?: string;
  scheduled_at: string;
  duration_minutes: number;
  max_participants?: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  users: {
    full_name: string;
  };
}

interface LiveClassesListProps {
  courseId: string;
  userRole: string;
  refreshKey?: number;
  showAccessControls?: boolean;
  onAccessRequired?: () => void;
  onCreateClass?: () => void;
}

export default function LiveClassesList({ 
  courseId, 
  userRole,
  refreshKey,
  showAccessControls = false,
  onAccessRequired,
  onCreateClass
}: LiveClassesListProps) {
  const { session } = useAuth();
  const [liveClasses, setLiveClasses] = useState<LiveClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [demoAccess, setDemoAccess] = useState<any>(null);
  const [hasUsedDemo, setHasUsedDemo] = useState(false);

  const fetchLiveClasses = async () => {
    if (!session?.access_token) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/live-classes?courseId=${courseId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch live classes');
      }

      setLiveClasses(result.liveClasses || []);
      setHasLoadedOnce(true);
    } catch (error) {
      console.error('Error fetching live classes:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch live classes');
    } finally {
      setLoading(false);
    }
  };

  const checkAccess = async () => {
    if (!session?.access_token || userRole !== 'student') return;

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
          return;
        } else if (enrollmentData.isDemoEnrollment) {
          // User has demo enrollment - limited access
          setHasAccess(true);
          return;
        }
      }

      // SECOND: Check demo access (only if not enrolled)
      const demoResponse = await fetch(`/api/demo-access?courseId=${courseId}&accessType=live_class`);
      const demoData = await demoResponse.json();
      
      if (demoData.hasAccess && demoData.demoAccess.length > 0) {
        setDemoAccess(demoData.demoAccess[0]);
        setHasAccess(true);
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
          sub.status === 'active' && 
          new Date(sub.expires_at) > new Date() &&
          (sub.subscription_plans?.[0]?.type === 'live_classes_only' || sub.subscription_plans?.[0]?.type === 'recordings_and_live')
        );
        
        if (activeSubscription) {
          setHasAccess(true);
          return;
        }
      }

      setHasAccess(false);
    } catch (error) {
      console.error('Error checking access:', error);
      setHasAccess(false);
    }
  };

  useEffect(() => {
    fetchLiveClasses();
    if (showAccessControls) {
      checkAccess();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, session?.access_token, refreshKey]);

  const handleTogglePublish = async (classId: string, currentStatus: boolean) => {
    if (!session?.access_token) return;

    try {
      const response = await fetch(`/api/live-classes/${classId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isPublished: !currentStatus
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to update live class');
      }

      toast.success(`Live class ${!currentStatus ? 'published' : 'unpublished'} successfully`);
      fetchLiveClasses();
    } catch (error) {
      console.error('Error updating live class:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update live class');
    }
  };

  const handleDelete = async (classId: string) => {
    if (!session?.access_token) return;

    try {
      const response = await fetch(`/api/live-classes/${classId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to delete live class');
      }

      toast.success('Live class deleted successfully');
      setLiveClasses(prev => prev.filter(cls => cls.id !== classId));
    } catch (error) {
      console.error('Error deleting live class:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete live class');
    }
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
          accessType: 'live_class'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setDemoAccess(data.demoAccess);
        setHasAccess(true);
        setHasUsedDemo(true);
        toast.success('Demo access granted! You now have 24 hours of access.');
        fetchLiveClasses();
      } else {
        if (data.error.includes('already used')) {
          setHasUsedDemo(true);
          toast.error('You have already used your demo access');
        } else {
          toast.error(data.error || 'Failed to grant demo access');
        }
      }
    } catch (error) {
      console.error('Error requesting demo access:', error);
      toast.error('Failed to request demo access');
    }
  };

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const isUpcoming = (scheduledAt: string): boolean => {
    return new Date(scheduledAt) > new Date();
  };

  if (loading && !hasLoadedOnce) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Video className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Live Classes</h3>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
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
          <h3 className="text-lg font-semibold">Live Classes</h3>
        </div>
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!loading && liveClasses.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Video className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Live Classes</h3>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Video className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">No live classes scheduled.</p>
            {(userRole === 'teacher' || userRole === 'admin' || userRole === 'superadmin') && (
              <Button 
                onClick={onCreateClass}
                className="mt-4"
              >
                <Plus className="h-4 w-4 mr-2" />
                Schedule Live Class
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Video className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Live Classes</h3>
          <Badge className="bg-muted text-foreground border border-border">{liveClasses.length}</Badge>
        </div>
        {(userRole === 'teacher' || userRole === 'admin' || userRole === 'superadmin') && (
          <Button onClick={onCreateClass}>
            <Plus className="h-4 w-4 mr-2" />
            Schedule Class
          </Button>
        )}
      </div>

      {/* Access Control for Students */}
      {showAccessControls && userRole === 'student' && (
        <div className="space-y-4">
          {hasAccess === false && !hasUsedDemo && (
            <Alert>
              <Lock className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span>You need a subscription or demo access to join live classes.</span>
                  <Button size="sm" onClick={handleRequestDemoAccess}>
                    <Star className="h-4 w-4 mr-2" />
                    Try Demo
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {hasAccess === false && hasUsedDemo && (
            <Alert variant="destructive">
              <Lock className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span>You have used your demo access. Subscribe to continue joining live classes.</span>
                  <Button size="sm" onClick={() => onAccessRequired?.()}>
                    <Crown className="h-4 w-4 mr-2" />
                    View Plans
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {demoAccess && (
            <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
              <Star className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                <div className="flex items-center justify-between">
                  <span>Demo access active! You have 24 hours to join live classes.</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Demo Active
                  </Badge>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      <div className="grid gap-4">
        {liveClasses.map((liveClass) => (
          <Card key={liveClass.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    {liveClass.title}
                    {liveClass.is_published ? (
                      <Badge variant="default" className="text-xs bg-primary text-white">
                        <Eye className="h-3 w-3 mr-1" />
                        Published
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        <EyeOff className="h-3 w-3 mr-1" />
                        Draft
                      </Badge>
                    )}
                    {isUpcoming(liveClass.scheduled_at) && (
                      <Badge variant="outline" className="text-xs">
                        Upcoming
                      </Badge>
                    )}
                  </CardTitle>
                  {liveClass.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {liveClass.description}
                    </p>
                  )}
                </div>

                {(userRole === 'teacher' || userRole === 'admin' || userRole === 'superadmin') && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleTogglePublish(liveClass.id, liveClass.is_published)}
                      >
                        {liveClass.is_published ? (
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
                        onClick={() => handleDelete(liveClass.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              {/* Class Details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground mb-4">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDateTime(liveClass.scheduled_at)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{formatDuration(liveClass.duration_minutes)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>{liveClass.users.full_name}</span>
                </div>
                {liveClass.max_participants && (
                  <div className="flex items-center gap-1">
                    <Video className="h-4 w-4" />
                    <span>Max {liveClass.max_participants}</span>
                  </div>
                )}
              </div>

              {/* Join Button */}
              {liveClass.is_published && liveClass.meeting_url && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => window.open(liveClass.meeting_url, '_blank')}
                    className="flex-1"
                    disabled={!hasAccess && userRole === 'student'}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {isUpcoming(liveClass.scheduled_at) ? 'Join When Live' : 'Join Now'}
                  </Button>
                </div>
              )}

              {!liveClass.meeting_url && (
                <Alert>
                  <AlertDescription>
                    Meeting link will be provided before the class starts.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

