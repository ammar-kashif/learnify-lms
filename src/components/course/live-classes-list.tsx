'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Star, Crown, Users } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';
import LiveClassCalendar from '@/components/attendance/live-class-calendar';
import LiveClassForm from '@/components/attendance/live-class-form';
import AttendanceInterface from '@/components/attendance/attendance-interface';
import { Tables } from '@/lib/supabase';

type LiveClass = Tables<'live_classes'> & {
  courses: { title: string };
  users: { full_name: string; email: string };
};

interface LiveClassesListProps {
  courseId: string;
  userRole: string;
  // refreshKey?: number;
  showAccessControls?: boolean;
  onAccessRequired?: () => void;
  // onCreateClass?: () => void;
}

export default function LiveClassesList({ 
  courseId, 
  userRole,
  showAccessControls = false,
  onAccessRequired
}: LiveClassesListProps) {
  const { session } = useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0);
  const [selectedLiveClass, setSelectedLiveClass] = useState<LiveClass | null>(null);
  const [showAttendance, setShowAttendance] = useState(false);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [demoAccess, setDemoAccess] = useState<any>(null);
  const [hasUsedDemoForCourse, setHasUsedDemoForCourse] = useState(false);

  // Check if user has demo access for this course
  useEffect(() => {
    const checkDemoAccess = async () => {
      if (!session?.access_token) {
        setHasAccess(false);
        return;
      }

      try {
        const response = await fetch(`/api/demo-access?courseId=${courseId}&accessType=live_class`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });
        const data = await response.json();
        
        if (data.hasAccess && data.demoAccess && data.demoAccess.length > 0) {
          setHasUsedDemoForCourse(true);
          setDemoAccess(data.demoAccess[0]);
          setHasAccess(true);
        } else {
          setHasAccess(false);
        }
      } catch (error) {
        console.error('Error checking demo access:', error);
        setHasAccess(false);
      }
    };

    if (showAccessControls && userRole === 'student') {
      checkDemoAccess();
    }
  }, [courseId, showAccessControls, userRole, session?.access_token]);

  const handleCreateClass = () => {
    setShowCreateForm(true);
  };

  const handleEditClass = (_liveClass: LiveClass) => {
    setSelectedLiveClass(_liveClass);
    setShowCreateForm(true);
  };

  const handleMarkAttendance = (liveClass: LiveClass) => {
    setSelectedLiveClass(liveClass);
    setShowAttendance(true);
  };

  const handleClassSuccess = (_liveClass: any) => {
    setShowCreateForm(false);
    setSelectedLiveClass(null);
    // Refresh the calendar without full page reload
    setCalendarRefreshKey((k) => k + 1);
  };

  const handleRequestDemoAccess = async () => {
    if (!session?.access_token) {
      toast.error('Please log in to request demo access');
      return;
    }

    try {
      const response = await fetch('/api/demo-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
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
        setHasUsedDemoForCourse(true);
        toast.success('Demo access granted! You now have 24 hours to join live classes for this course.');
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

  return (
    <div className="space-y-6">
      {/* Access Control for Students */}
      {showAccessControls && userRole === 'student' && (
        <div className="space-y-4">
          {hasAccess === false && !hasUsedDemoForCourse && (
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

          {/* Show upgrade button for any demo user */}
          {hasUsedDemoForCourse && (
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

      {/* Calendar View */}
      <LiveClassCalendar
        key={calendarRefreshKey}
        courseId={courseId}
        onEventClick={(liveClass) => {
          // This will be called when "Edit Class" button is clicked in the details modal
          if (userRole === 'teacher' || userRole === 'admin' || userRole === 'superadmin') {
            handleEditClass(liveClass as any);
          }
        }}
        onMarkAttendance={(liveClass) => {
          // This will be called when "Mark Attendance" button is clicked in the details modal
          if (userRole === 'teacher' || userRole === 'admin' || userRole === 'superadmin') {
            handleMarkAttendance(liveClass as any);
          }
        }}
        onCreateClass={handleCreateClass}
      />

      {/* Create/Edit Form */}
      <LiveClassForm
        open={showCreateForm}
        onOpenChange={setShowCreateForm}
        courseId={courseId}
        liveClass={selectedLiveClass}
        onSuccess={handleClassSuccess}
        userRole={userRole}
      />

      {/* Attendance Interface */}
      {showAttendance && selectedLiveClass && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Mark Attendance - {selectedLiveClass.title}</span>
              </CardTitle>
              <Button
                variant="outline"
                onClick={() => setShowAttendance(false)}
              >
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <AttendanceInterface
              liveClass={selectedLiveClass}
              onClose={() => setShowAttendance(false)}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

