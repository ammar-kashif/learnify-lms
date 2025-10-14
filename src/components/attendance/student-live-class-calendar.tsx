'use client';

import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useAuth } from '@/contexts/auth-context';
import { format } from 'date-fns';
import { Calendar, Clock, Video, ExternalLink, AlertCircle, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
  const { session } = useAuth();
  const [liveClasses, setLiveClasses] = useState<LiveClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<LiveClass | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchLiveClasses = async () => {
    if (!session?.access_token) {
      setError('Please log in to view live classes');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/live-classes?course_id=${courseId}`, {
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
    fetchLiveClasses();
  }, [courseId, session, refreshKey]);

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
    return classes
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
        
        let backgroundColor = '#3B82F6'; // Blue for scheduled
        let borderColor = '#2563EB';
        
        if (liveClass.status === 'live') {
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

              {selectedClass.meeting_link ? (
                selectedClass.status === 'live' ? (
                  <a
                    href={selectedClass.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center px-4 py-2 rounded-md text-white bg-green-600 hover:bg-green-700"
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
