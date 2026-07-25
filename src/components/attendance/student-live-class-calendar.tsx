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
import { panel, TabSpinner } from '@/components/course/course-ui';
import { cn } from '@/lib/utils';

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
        
        // Brand orange for scheduled, green for live, muted grey for ended or
        // locked — the three states in the legend below the calendar.
        let backgroundColor = '#DF6639'; // primary
        let borderColor = '#D14A1F';     // primary-600

        if (isLockedForGuest) {
          backgroundColor = '#9CA3AF'; // Gray for locked
          borderColor = '#6B7280';
        } else if (liveClass.status === 'live') {
          backgroundColor = '#10B981'; // Green for live
          borderColor = '#059669';
        } else if (liveClass.status === 'ended') {
          backgroundColor = '#9CA3AF'; // Gray for ended
          borderColor = '#6B7280';
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
    return <TabSpinner label="Loading schedule…" />;
  }

  if (error) {
    return (
      <div className={cn(panel, 'flex flex-col items-center justify-center px-6 py-16 text-center')}>
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950/40">
          <AlertCircle className="h-7 w-7 text-red-500" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
          Couldn&apos;t load live classes
        </h3>
        <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400">{error}</p>
      </div>
    );
  }

  const events = formatEvents(liveClasses);
  const nextClass = liveClasses
    .filter((c) => c.scheduled_date && new Date(c.scheduled_date) >= new Date() && c.status !== 'ended')
    .sort((a, b) => +new Date(a.scheduled_date) - +new Date(b.scheduled_date))[0];

  return (
    <div className="space-y-5">
      {/* Guest Demo Banner */}
      {isGuestDemo && guestDemoState && (
        <div className="space-y-3">
          <Alert className="rounded-2xl border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/40">
            <Star className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <AlertDescription className="text-emerald-800 dark:text-emerald-200">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="font-semibold">Demo mode active.</span>{' '}
                  You can join <strong>one</strong> live class for free.
                  {guestJoinedClassId && ' You have already used your demo class — subscribe for full access.'}
                </div>
                <Badge
                  variant="secondary"
                  className="whitespace-nowrap bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                >
                  Demo access
                </Badge>
              </div>
            </AlertDescription>
          </Alert>
          <DemoCountdownTimer demo={guestDemoState} compact />
          {guestJoinedClassId && (
            <Alert className="rounded-2xl border-primary/25 bg-primary/5 dark:bg-primary/10">
              <Crown className="h-4 w-4 text-primary" />
              <AlertDescription className="text-gray-700 dark:text-gray-300">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span>Want unlimited access to every live class?</span>
                  <Button
                    size="sm"
                    className="rounded-full bg-primary text-white hover:bg-primary-600"
                    onClick={() => (window.location.href = `/auth/signup?redirect=/courses/${courseId}`)}
                  >
                    <Crown className="mr-1.5 h-4 w-4" /> Subscribe
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Next up. The calendar alone made you hunt the grid for the one thing
          you actually came to find. */}
      {nextClass && (
        <button
          type="button"
          onClick={() => {
            setSelectedClass(nextClass);
            setShowModal(true);
          }}
          className={cn(
            panel,
            'flex w-full items-center gap-4 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-depth-lg'
          )}
        >
          <div
            className={cn(
              'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl',
              nextClass.status === 'live'
                ? 'bg-emerald-100 dark:bg-emerald-950/60'
                : 'bg-primary/10 dark:bg-primary/15'
            )}
          >
            <Video
              className={cn(
                'h-5 w-5',
                nextClass.status === 'live' ? 'text-emerald-600 dark:text-emerald-400' : 'text-primary'
              )}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                {nextClass.status === 'live' ? 'Happening now' : 'Next class'}
              </p>
              {nextClass.status === 'live' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  Live
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate font-semibold text-gray-900 dark:text-white">
              {nextClass.title}
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-gray-500 dark:text-gray-400">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(nextClass.scheduled_date), 'EEE d MMM, h:mm a')}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {nextClass.duration_minutes} min
              </span>
            </p>
          </div>
        </button>
      )}

      <div className={cn(panel, 'p-4 sm:p-5')}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Schedule</h3>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
            {[
              { label: 'Scheduled', className: 'bg-primary' },
              { label: 'Live', className: 'bg-emerald-500' },
              { label: 'Ended', className: 'bg-gray-400' },
            ].map((item) => (
              <span key={item.label} className="inline-flex items-center gap-1.5">
                <span className={cn('h-2.5 w-2.5 rounded-full', item.className)} />
                {item.label}
              </span>
            ))}
          </div>
        </div>

        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          events={events}
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
          <div className="flex flex-col items-center border-t border-gray-100 px-6 py-10 text-center dark:border-gray-800">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 dark:bg-primary/15">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              No live classes scheduled yet
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              New sessions will show up here as soon as your tutor schedules them.
            </p>
          </div>
        )}
      </div>

      {/* Details Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 dark:bg-primary/15">
              <Video className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-left text-lg leading-snug">
              {selectedClass?.title || 'Live Class'}
            </DialogTitle>
            <DialogDescription className="text-left">
              {selectedClass?.status === 'live'
                ? 'This class is running now.'
                : selectedClass?.status === 'ended'
                  ? 'This class has finished.'
                  : 'The join link unlocks at the start time.'}
            </DialogDescription>
          </DialogHeader>

          {selectedClass && (
            <div className="space-y-4">
              {selectedClass.description && (
                <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                  {selectedClass.description}
                </p>
              )}

              <dl className="space-y-2.5 rounded-xl bg-gray-50 p-4 text-sm dark:bg-gray-800/60">
                {[
                  {
                    icon: Calendar,
                    label: 'When',
                    value: format(new Date(selectedClass.scheduled_date), 'PPP p'),
                  },
                  {
                    icon: Clock,
                    label: 'Duration',
                    value: `${selectedClass.duration_minutes} minutes`,
                  },
                  {
                    icon: Users,
                    label: 'Tutor',
                    value: selectedClass.users?.full_name || 'Teacher',
                  },
                ].map((row) => (
                  <div key={row.label} className="flex items-center gap-3">
                    <row.icon className="h-4 w-4 flex-shrink-0 text-primary" />
                    <dt className="sr-only">{row.label}</dt>
                    <dd className="text-gray-700 dark:text-gray-300">{row.value}</dd>
                  </div>
                ))}
              </dl>

              {/* Guest demo: check if this class is locked */}
              {isGuestDemo && guestJoinedClassId && guestJoinedClassId !== selectedClass.id ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2 rounded-xl bg-gray-100 px-4 py-3 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    <Lock className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm font-medium">
                      Locked — you&apos;ve already used your demo class
                    </span>
                  </div>
                  <Button
                    className="w-full rounded-xl bg-primary text-white hover:bg-primary-600"
                    onClick={() => (window.location.href = `/auth/signup?redirect=/courses/${courseId}`)}
                  >
                    <Crown className="mr-2 h-4 w-4" /> Subscribe for full access
                  </Button>
                </div>
              ) : selectedClass.meeting_link ? (
                selectedClass.status === 'live' ? (
                  <a
                    href={selectedClass.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700"
                    onClick={() => {
                      // If guest demo, mark this class as joined
                      if (isGuestDemo && !guestJoinedClassId) {
                        handleGuestJoinClass(selectedClass.id);
                      }
                    }}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Join live class
                  </a>
                ) : (
                  <button
                    type="button"
                    className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                    disabled
                  >
                    <Lock className="mr-2 h-4 w-4" />
                    {selectedClass.status === 'scheduled' ? 'Available at start time' : 'Class ended'}
                  </button>
                )
              ) : (
                <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                  Meeting link not available
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
