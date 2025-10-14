'use client';

import { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Plus, Calendar, Clock, Users, Video } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';
import { Tables } from '@/lib/supabase';

type LiveClass = Tables<'live_classes'> & {
  courses: { title: string };
  users: { full_name: string; email: string } | null;
};

interface LiveClassCalendarProps {
  courseId?: string;
  onEventClick?: (liveClass: LiveClass) => void;
  onCreateClass?: () => void;
  onMarkAttendance?: (liveClass: LiveClass) => void;
}

export default function LiveClassCalendar({ 
  courseId, 
  onEventClick, 
  onCreateClass,
  onMarkAttendance
}: LiveClassCalendarProps) {
  const [liveClasses, setLiveClasses] = useState<LiveClass[]>([]);
  const [filteredClasses, setFilteredClasses] = useState<LiveClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<LiveClass | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'live' | 'ended'>('all');
  const calendarRef = useRef<FullCalendar>(null);
  const { session } = useAuth();

  // Fetch live classes
  const fetchLiveClasses = async () => {
    try {
      if (!session) return;

      const params = new URLSearchParams();
      if (courseId) params.append('course_id', courseId);

      const response = await fetch(`/api/live-classes?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch live classes');
      }

      const data = await response.json();
      setLiveClasses(data.liveClasses || []);
    } catch (error) {
      console.error('Error fetching live classes:', error);
      toast.error('Failed to load live classes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveClasses();
  }, [courseId]);

  // Filter classes based on status
  useEffect(() => {
    setFilteredClasses(liveClasses);
  }, [liveClasses, statusFilter]);

  // Format events for FullCalendar
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
        
        const color = '#3b82f6'; // Blue for scheduled

        return {
          id: liveClass.id,
          title: liveClass.title,
          start: start.toISOString(),
          end: end.toISOString(),
          color,
          extendedProps: {
            liveClass
          }
        };
      });
  };

  // Handle event click
  const handleEventClick = (clickInfo: { event: any }) => {
    const liveClass = clickInfo.event.extendedProps.liveClass;
    setSelectedEvent(liveClass);
    setShowEventModal(true);
    
    // Don't call onEventClick here - only call it when "Edit Class" button is clicked
  };

  // Handle date click (create new event)
  const handleDateClick = (_clickInfo: unknown) => {
    if (onCreateClass) {
      onCreateClass();
    }
  };

  // Handle event drop (reschedule)
  const handleEventDrop = async (dropInfo: any) => {
    const liveClass = dropInfo.event.extendedProps.liveClass;
    const newStart = dropInfo.event.start as Date;
    
    try {
      if (!session) return;
      if (!session) return;

      const response = await fetch(`/api/live-classes/${liveClass.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          scheduled_date: newStart.toISOString()
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reschedule live class');
      }

      toast.success('Live class rescheduled successfully');
      fetchLiveClasses();
    } catch (error) {
      console.error('Error rescheduling live class:', error);
      toast.error('Failed to reschedule live class');
      // Revert the change
      dropInfo.revert();
    }
  };

  // Handle delete class
  const handleDeleteClass = async (liveClass: LiveClass) => {
    if (!confirm(`Are you sure you want to delete "${liveClass.title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      if (!session) return;

      const response = await fetch(`/api/live-classes/${liveClass.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete live class');
      }

      toast.success('Live class deleted successfully');
      setShowEventModal(false);
      fetchLiveClasses(); // Refresh the calendar
    } catch (error) {
      console.error('Error deleting live class:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete live class');
    }
  };

  // Start live class
  const handleStartClass = async (liveClass: LiveClass) => {
    try {
      if (!session) return;
      if (!session) return;

      const response = await fetch(`/api/live-classes/${liveClass.id}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to start live class');
      }

      toast.success('Live class started successfully');
      fetchLiveClasses();
      setShowEventModal(false);
    } catch (error) {
      console.error('Error starting live class:', error);
      toast.error('Failed to start live class');
    }
  };

  // End live class
  const handleEndClass = async (liveClass: LiveClass) => {
    try {
      if (!session) return;
      if (!session) return;

      const response = await fetch(`/api/live-classes/${liveClass.id}/end`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to end live class');
      }

      toast.success('Live class ended successfully');
      fetchLiveClasses();
      setShowEventModal(false);
    } catch (error) {
      console.error('Error ending live class:', error);
      toast.error('Failed to end live class');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Calendar className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Live Classes Calendar</h2>
        </div>
        <div className="flex items-center space-x-4">
          {/* Filter Controls */}
          <div className="flex items-center space-x-2">
            <label htmlFor="statusFilter" className="text-sm font-medium">Filter:</label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Classes</option>
              <option value="scheduled">Scheduled</option>
              <option value="live">Live</option>
              <option value="ended">Ended</option>
            </select>
          </div>

          {/* Status Badges */}
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Scheduled</span>
            </Badge>
            <Badge variant="outline" className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Live</span>
            </Badge>
            <Badge variant="outline" className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
              <span>Ended</span>
            </Badge>
          </div>

          {onCreateClass && (
            <Button onClick={onCreateClass} className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Create Class</span>
            </Button>
          )}
        </div>
      </div>

      {/* FullCalendar */}
      <Card>
        <CardContent className="p-0">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
            }}
            events={formatEvents(filteredClasses)}
            eventClick={handleEventClick}
            dateClick={handleDateClick}
            eventDrop={handleEventDrop}
            editable={true}
            selectable={true}
            selectMirror={true}
            height="auto"
            eventDisplay="block"
            eventTimeFormat={{
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            }}
            slotMinTime="06:00:00"
            slotMaxTime="22:00:00"
            businessHours={{
              daysOfWeek: [1, 2, 3, 4, 5], // Monday to Friday
              startTime: '09:00',
              endTime: '17:00'
            }}
          />
        </CardContent>
      </Card>

      {/* Event Details Modal */}
      <Dialog open={showEventModal} onOpenChange={setShowEventModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Video className="h-5 w-5" />
              <span>Live Class Details</span>
            </DialogTitle>
            <DialogDescription>
              View details and manage the selected live class.
            </DialogDescription>
          </DialogHeader>
          
          {selectedEvent && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{selectedEvent.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {selectedEvent.courses.title}
                </p>
              </div>

              {selectedEvent.description && (
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {selectedEvent.description}
                </p>
              )}

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">
                    {new Date(selectedEvent.scheduled_at).toLocaleString()}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">
                    {selectedEvent.users?.full_name || 'Unknown Teacher'}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Duration:</span>
                  <span className="text-sm">{selectedEvent.duration_minutes} minutes</span>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Status:</span>
                  <Badge 
                    variant="outline"
                    className="bg-blue-500 text-white"
                  >
                    Live Class
                  </Badge>
                </div>
              </div>

              {selectedEvent.meeting_id && (
                <div className="pt-4 border-t">
                  <Button 
                    asChild 
                    className="w-full"
                  >
                    <a 
                      href={selectedEvent.meeting_id} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      Join Meeting
                    </a>
                  </Button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-2 pt-4 border-t">
                {(
                  <Button 
                    onClick={() => handleStartClass(selectedEvent)}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    Start Class
                  </Button>
                )}
                
                {(
                  <>
                    <Button 
                      onClick={() => handleEndClass(selectedEvent)}
                      variant="destructive"
                      className="flex-1"
                    >
                      End Class
                    </Button>
                    
                    {/* Mark Attendance button for live classes */}
                    {onMarkAttendance && (
                      <Button 
                        onClick={() => {
                          setShowEventModal(false);
                          onMarkAttendance(selectedEvent);
                        }}
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                      >
                        Mark Attendance
                      </Button>
                    )}
                  </>
                )}

                {/* Edit button for teachers */}
                {onEventClick && (
                  <Button 
                    onClick={() => {
                      setShowEventModal(false);
                      onEventClick(selectedEvent);
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Edit Class
                  </Button>
                )}

                {/* Delete button for ended classes */}
                {(
                  <Button 
                    onClick={() => handleDeleteClass(selectedEvent)}
                    variant="destructive"
                    className="flex-1"
                  >
                    Delete Class
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
