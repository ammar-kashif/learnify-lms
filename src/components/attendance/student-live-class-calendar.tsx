'use client';

import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useAuth } from '@/contexts/auth-context';
import { getGuestDemo, hasGuestDemoExpired } from '@/lib/guest-demo';
import DemoCountdownTimer from '@/components/course/demo-countdown-timer';
import { format } from 'date-fns';
import { Calendar, Clock, Video, ExternalLink, AlertCircle, Users, Lock, Star, Crown } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface LiveClass {
  id: string;
  title: string;
  description: string | null;
  scheduled_date: string;
  duration_minutes: number;
  meeting_link: string | null;
  status: 'scheduled' | 'live' | 'ended';
  course_id: string;
  courses: {
    title: string;
  };
  users?: { full_name: string; email?: string } | null;
}

interface StudentLiveClassCalendarProps {
  courseId: string;
}

export default function StudentLiveClassCalendar({ courseId }: StudentLiveClassCalendarProps) {
  const { session, user } = useAuth();
  const [liveClasses, setLiveClasses] = useState<LiveClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<LiveClass | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoAccessChecked, setDemoAccessChecked] = useState(false);
  // Guest demo state
  const [isGuestDemo, setIsGuestDemo] = useState(false);
  const [guestDemoState, setGuestDemoState] = useState<ReturnType<typeof getGuestDemo>>(null);
  const [guestJoinedClassId, setGuestJoinedClassId] = useState<string | null>(null);

  // ===== GUEST DEMO: check localStorage on mount =====
  useEffect(() => {
    if (!session && !user) {
      const demo = getGuestDemo(courseId, 'live_class');
      console.log('🔍 Guest demo check:', { hasDemoInStorage: !!demo, expired: demo ? hasGuestDemoExpired(demo) : 'N/A' });
      if (demo && !hasGuestDemoExpired(demo)) {
        setGuestDemoState(demo);
        setIsGuestDemo(true);
        setIsDemoMode(true);
        setDemoAccessChecked(true);

        // Check if guest already joined a class (stored in localStorage)
        const joinedKey = `guest-demo-joined-${courseId}`;
        const joinedRaw = localStorage.getItem(joinedKey);
        if (joinedRaw) {
          // The joined value can be just an id or a JSON {id, timestamp}
          // For backwards compat, handle both
          try {
            const parsed = JSON.parse(joinedRaw);
            // If it's a JSON object with a joinedAt timestamp, validate it's from this demo session
            if (parsed && parsed.id && parsed.joinedAt) {
              const joinedAt = new Date(parsed.joinedAt);
              const demoGrantedAt = new Date(demo.grantedAt);
              if (joinedAt >= demoGrantedAt) {
                setGuestJoinedClassId(parsed.id);
              } else {
                // Stale joined data from a previous demo — clear it
                console.log('🧹 Clearing stale guest-demo-joined (from previous demo session)');
                localStorage.removeItem(joinedKey);
              }
            } else {
              // Old format (just an id string parsed as something) — clear it to be safe
              localStorage.removeItem(joinedKey);
            }
          } catch {
            // Plain string id (old format) — clear it since we can't verify the session
            console.log('🧹 Clearing old-format guest-demo-joined');
            localStorage.removeItem(joinedKey);
          }
        }
      } else {
        // No valid live class demo — clear any stale joined-class state
        const joinedKey = `guest-demo-joined-${courseId}`;
        localStorage.removeItem(joinedKey);
        setIsGuestDemo(false);
        setGuestJoinedClassId(null);
        setDemoAccessChecked(true);
      }
    }
  }, [session, user, courseId]);

  // ===== FETCH LIVE CLASSES =====
  const fetchLiveClasses = async () => {
    // ===== GUEST PATH: use public endpoint =====
    if (isGuestDemo && !session) {
      try {
        const response = await fetch(`/api/live-classes/guest-demo?course_id=${courseId}`);
        if (!response.ok) throw new Error('Failed to fetch live classes');
        const data = await response.json();
        setLiveClasses(data.liveClasses || []);
      } catch (err) {
        console.error('Error fetching guest demo live classes:', err);
        setError('Failed to load live classes');
      } finally {
        setLoading(false);
      }
      return;
    }

    // ===== AUTHENTICATED PATH =====
    if (!session?.access_token) {
      setError('Please log in to view live classes');
      setLoading(false);
      return;
    }

    // Wait for demo access check to complete
    if (!demoAccessChecked) {
      return;
    }

    try {
      const response = await fetch(`/api/live-classes?course_id=${courseId}${isDemoMode ? '&demo_only=1' : ''}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch live classes');
      }

      const data = await response.json();
      setLiveClasses(data.liveClasses || []);
    } catch (err) {
      console.error('Error fetching live classes:', err);
      setError('Failed to load live classes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (demoAccessChecked) {
      fetchLiveClasses();
    }
  }, [courseId, session, refreshKey, isDemoMode, demoAccessChecked]);

  // Determine if user has demo access for live classes on this course
  useEffect(() => {
    const checkDemoAccess = async () => {
      console.log('🔍 StudentLiveClassCalendar checking demo access:', { courseId, hasSession: !!session?.access_token });
      
      if (!session?.access_token) {
        console.log('❌ No session, setting demoAccessChecked to true');
        setDemoAccessChecked(true);
        setIsDemoMode(false);
        return;
      }
      try {
        // RUTHLESS CHECK: First check if they have demo enrollment
        const enrollmentRes = await fetch(`/api/enrollments?courseId=${courseId}`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        
        if (enrollmentRes.ok) {
          const enrollmentData = await enrollmentRes.json();
          
          // If they have demo enrollment, we MUST verify they have live_class access
          if (enrollmentData.isDemoEnrollment) {
            console.log('🚫 User has demo enrollment - checking if it is live_class type...');
            
            // Add cache-busting timestamp to ensure fresh data
            const res = await fetch(`/api/demo-access?courseId=${courseId}&accessType=live_class&_t=${Date.now()}`, {
              headers: { 
                'Authorization': `Bearer ${session.access_token}`,
                'Cache-Control': 'no-cache',
              }
            });
            const data = await res.json();
            console.log('📊 Demo access response for live_class:', data);
            
            // RUTHLESS: Only allow if they explicitly have live_class demo access
            if (data?.hasAccess && data?.demoAccess && data.demoAccess.length > 0) {
              const demoAccessRecord = data.demoAccess[0];
              if (demoAccessRecord.access_type === 'live_class') {
                console.log('✅ Demo user has live_class access - allowing live classes ONLY');
                setIsDemoMode(true);
              } else {
                console.log('🚫 Demo enrollment but NO live_class access - DENIED');
                setIsDemoMode(false);
              }
            } else {
              console.log('🚫 Demo enrollment but NO live_class access - DENIED');
              setIsDemoMode(false);
            }
            setDemoAccessChecked(true);
            return;
          }
          
          // If paid enrollment, allow full access
          if (enrollmentData.isPaidEnrollment) {
            console.log('✅ User has paid enrollment - full access to live classes');
            setIsDemoMode(false);
            setDemoAccessChecked(true);
            return;
          }
        }
        
        // If not enrolled, check standalone demo access
        console.log('📡 Checking standalone demo access for live_class...');
        // Add cache-busting timestamp to ensure fresh data
        const res = await fetch(`/api/demo-access?courseId=${courseId}&accessType=live_class&_t=${Date.now()}`, {
          headers: { 
            'Authorization': `Bearer ${session.access_token}`,
            'Cache-Control': 'no-cache',
          }
        });
        const data = await res.json();
        console.log('📊 Standalone demo access response:', data);
        const hasAccess = !!(data?.hasAccess && data?.demoAccess && data.demoAccess.length > 0);
        console.log('🎯 Setting isDemoMode to:', hasAccess);
        setIsDemoMode(hasAccess);
      } catch (e) {
        console.error('❌ Error checking demo access:', e);
        setIsDemoMode(false);
      } finally {
        console.log('✅ Demo access check complete');
        setDemoAccessChecked(true);
      }
    };
    checkDemoAccess();
  }, [courseId, session]);

  // Light auto-refresh: on window focus and every 10s
  useEffect(() => {
    const onFocus = () => setRefreshKey((k) => k + 1);
    window.addEventListener('focus', onFocus);
    const interval = setInterval(() => setRefreshKey((k) => k + 1), 10000);
    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(interval);
    };
  }, []);

  const formatEvents = (classes: LiveClass[]) => {
    // In demo mode (guest or authenticated), only show demo classes
    let filteredClasses = classes;
    if (isDemoMode) {
      console.log('🚫 Demo mode: Filtering demo classes');
      // For guests, show all demo classes but mark which ones are locked
      // For authenticated demo, only show 1
      if (!isGuestDemo) {
        filteredClasses = classes.slice(0, 1);
      }
    }
    
    return filteredClasses
      .filter(liveClass => {
        // Filter out classes with invalid dates
        if (!liveClass.scheduled_date) {
          console.warn('Live class missing scheduled_date:', liveClass.id, liveClass.title);
          return false;
        }
        const date = new Date(liveClass.scheduled_date);
        if (isNaN(date.getTime())) {
          console.warn('Live class has invalid scheduled_date:', liveClass.id, liveClass.title, liveClass.scheduled_date);
          return false;
        }
        return true;
      })
      .map(liveClass => {
        const start = new Date(liveClass.scheduled_date!);
        const end = new Date(start.getTime() + (liveClass.duration_minutes || 60) * 60000);
        
        // Determine if this class is locked for the guest
        const isLockedForGuest = isGuestDemo && guestJoinedClassId && guestJoinedClassId !== liveClass.id;
        
        let backgroundColor = '#3B82F6'; // Blue for scheduled
        let borderColor = '#2563EB';
        
        if (isLockedForGuest) {
          backgroundColor = '#9CA3AF'; // Gray for locked
          borderColor = '#6B7280';
        } else if (liveClass.status === 'live') {
          backgroundColor = '#10B981'; // Green for live
          borderColor = '#059669';
        } else if (liveClass.status === 'ended') {
          backgroundColor = '#6B7280'; // Gray for ended
          borderColor = '#4B5563';
        }

        return {
          id: liveClass.id,
          title: liveClass.title,
          start: start.toISOString(),
          end: end.toISOString(),
          backgroundColor,
          borderColor,
          extendedProps: {
            liveClass,
            courseTitle: liveClass.courses?.title,
            meetingLink: liveClass.meeting_link,
            status: liveClass.status,
            duration: liveClass.duration_minutes,
            description: liveClass.description
          }
        };
      });
  };

  const handleEventClick = (clickInfo: any) => {
    const { liveClass } = clickInfo.event.extendedProps;
    setSelectedClass(liveClass);
    setShowModal(true);
  };

  // Handle guest joining a class — lock all others
  const handleGuestJoinClass = (classId: string) => {
    setGuestJoinedClassId(classId);
    const joinedKey = `guest-demo-joined-${courseId}`;
    localStorage.setItem(joinedKey, JSON.stringify({ id: classId, joinedAt: new Date().toISOString() }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Guest Demo Banner */}
      {isGuestDemo && guestDemoState && (
        <div className="space-y-3">
          <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
            <Star className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <span className="font-semibold">Demo Mode Active!</span>
                  {' '}You can join <strong>one</strong> live class for free.
                  {guestJoinedClassId && ' You have already used your demo class — subscribe for full access!'}
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 whitespace-nowrap">
                  Demo Access
                </Badge>
              </div>
            </AlertDescription>
          </Alert>
          <DemoCountdownTimer demo={guestDemoState} compact />
          {guestJoinedClassId && (
            <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
              <Crown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                <div className="flex items-center justify-between">
                  <span>Want unlimited access to all live classes? Subscribe now!</span>
                  <Button size="sm" variant="outline" className="border-amber-400 text-amber-700 hover:bg-amber-100"
                    onClick={() => window.location.href = `/auth/signup?redirect=/courses/${courseId}`}
                  >
                    <Crown className="h-4 w-4 mr-1" /> Subscribe
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Live Classes Schedule</h3>
        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
            Scheduled
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            Live
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-gray-500 rounded-full mr-2"></div>
            Ended
          </div>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          events={formatEvents(liveClasses)}
          eventClick={handleEventClick}
          height="auto"
          eventDisplay="block"
          dayMaxEvents={3}
          moreLinkClick="popover"
          eventTimeFormat={{
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          }}
          slotLabelFormat={{
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          }}
          nowIndicator={true}
          selectable={false}
          selectMirror={false}
          editable={false}
          dayMaxEventRows={3}
          eventClassNames="cursor-pointer"
        />
        {liveClasses.length === 0 && (
          <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
            <Calendar className="w-5 h-5 inline-block mr-2 text-gray-400" />
            No live classes scheduled for this course
          </div>
        )}
      </div>

      {/* Details Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Video className="h-5 w-5" />
              <span>{selectedClass?.title || 'Live Class'}</span>
            </DialogTitle>
            <DialogDescription>
              View live class details and join if available.
            </DialogDescription>
          </DialogHeader>

          {selectedClass && (
            <div className="space-y-4">
              {selectedClass.description && (
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {selectedClass.description}
                </p>
              )}

              <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span>{format(new Date(selectedClass.scheduled_date), 'PPP p')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span>{selectedClass.duration_minutes} minutes</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  <span>{selectedClass.users?.full_name || 'Teacher'}</span>
                </div>
              </div>

              {/* Guest demo: check if this class is locked */}
              {isGuestDemo && guestJoinedClassId && guestJoinedClassId !== selectedClass.id ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2 rounded-md bg-gray-100 dark:bg-gray-700 px-4 py-3 text-gray-600 dark:text-gray-300">
                    <Lock className="h-4 w-4" />
                    <span className="text-sm font-medium">Locked — you&apos;ve already used your demo class</span>
                  </div>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => window.location.href = `/auth/signup?redirect=/courses/${courseId}`}
                  >
                    <Crown className="h-4 w-4 mr-2" /> Subscribe for Full Access
                  </Button>
                </div>
              ) : selectedClass.meeting_link ? (
                selectedClass.status === 'live' ? (
                  <a
                    href={selectedClass.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center px-4 py-2 rounded-md text-white bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      // If guest demo, mark this class as joined
                      if (isGuestDemo && !guestJoinedClassId) {
                        handleGuestJoinClass(selectedClass.id);
                      }
                    }}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Join Live Class
                  </a>
                ) : (
                  <button
                    type="button"
                    className="w-full inline-flex items-center justify-center px-4 py-2 rounded-md text-white bg-gray-500 cursor-not-allowed"
                    disabled
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {selectedClass.status === 'scheduled' ? 'Available at start time' : 'Class Ended'}
                  </button>
                )
              ) : (
                <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                  Meeting link not available
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
