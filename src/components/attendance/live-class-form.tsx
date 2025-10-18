'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Calendar, Video, Save, X, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';
import { Tables } from '@/lib/supabase';

type LiveClass = Tables<'live_classes'>;

interface Course {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
}

interface LiveClassFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  liveClass?: LiveClass | null;
  onSuccess?: (liveClass: LiveClass) => void;
  userRole?: string;
}

export default function LiveClassForm({ 
  open, 
  onOpenChange, 
  courseId, 
  liveClass, 
  onSuccess,
  userRole
}: LiveClassFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    scheduled_date: '',
    duration_minutes: 60,
    meeting_link: '',
    selected_course_id: courseId,
    is_demo: false
  });
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const { session } = useAuth();

  // Fetch courses for superadmin
  useEffect(() => {
    if (userRole === 'superadmin' && open) {
      fetchCourses();
    }
  }, [userRole, open]);

  // Initialize form data
  useEffect(() => {
    if (liveClass) {
      setFormData({
        title: liveClass.title,
        description: liveClass.description || '',
        scheduled_date: new Date(liveClass.scheduled_date).toISOString().slice(0, 16),
        duration_minutes: liveClass.duration_minutes,
        meeting_link: liveClass.meeting_id || '',
        selected_course_id: liveClass.course_id,
        is_demo: (liveClass as any).is_demo ?? false
      });
    } else {
      setFormData({
        title: '',
        description: '',
        scheduled_date: '',
        duration_minutes: 60,
        meeting_link: '',
        selected_course_id: courseId,
        is_demo: false
      });
    }
  }, [liveClass, open, courseId]);

  const fetchCourses = async () => {
    if (!session?.access_token) return;
    
    setLoadingCourses(true);
    try {
      const response = await fetch('/api/courses', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCourses(data.courses || []);
      } else {
        toast.error('Failed to fetch courses');
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to fetch courses');
    } finally {
      setLoadingCourses(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.scheduled_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      if (!session) {
        toast.error('Please log in to continue');
        return;
      }

      const requestData: any = {
        course_id: formData.selected_course_id,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        scheduled_date: new Date(formData.scheduled_date).toISOString(),
        duration_minutes: formData.duration_minutes,
        meeting_link: formData.meeting_link.trim() || null,
        is_demo: !!formData.is_demo
      };

      const url = liveClass 
        ? `/api/live-classes/${liveClass.id}`
        : '/api/live-classes';
      
      const method = liveClass ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save live class');
      }

      const data = await response.json();
      
      toast.success(
        liveClass 
          ? 'Live class updated successfully' 
          : 'Live class created successfully'
      );
      
      onSuccess?.(data.liveClass);
      onOpenChange(false);
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        scheduled_date: '',
        duration_minutes: 60,
        meeting_link: '',
        selected_course_id: courseId,
        is_demo: false
      });
    } catch (error) {
      console.error('Error saving live class:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save live class');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    setFormData({
      title: '',
      description: '',
      scheduled_date: '',
      duration_minutes: 60,
      meeting_link: '',
      selected_course_id: courseId,
      is_demo: false
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>{liveClass ? 'Edit Live Class' : 'Create Live Class'}</span>
          </DialogTitle>
          <DialogDescription>
            {liveClass ? 'Update the details of your live class.' : 'Fill in the details to schedule a new live class.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Enter class title"
              required
            />
          </div>

          {/* Course selection for superadmin */}
          {userRole === 'superadmin' && (
            <div className="space-y-2">
              <Label htmlFor="course">Course *</Label>
              <div className="relative">
                <select
                  id="course"
                  value={formData.selected_course_id}
                  onChange={(e) => handleInputChange('selected_course_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                  disabled={loadingCourses}
                >
                  {loadingCourses ? (
                    <option value="">Loading courses...</option>
                  ) : (
                    <>
                      <option value="">Select a course</option>
                      {courses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.title}
                        </option>
                      ))}
                    </>
                  )}
                </select>
                <BookOpen className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter class description (optional)"
              rows={3}
            />
          </div>

          {/* Demo toggle for admin/superadmin/teacher */}
          {(userRole === 'admin' || userRole === 'superadmin' || userRole === 'teacher') && (
            <div className="space-y-2">
              <Label htmlFor="is_demo">Is this a demo class?</Label>
              <div className="flex items-center gap-3">
                <input
                  id="is_demo"
                  type="checkbox"
                  checked={!!formData.is_demo}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_demo: e.target.checked }))}
                />
                <span className="text-sm text-gray-600">Only shown to students with live-class demo access</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scheduled_date">Date & Time *</Label>
              <Input
                id="scheduled_date"
                type="datetime-local"
                value={formData.scheduled_date}
                onChange={(e) => handleInputChange('scheduled_date', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration_minutes">Duration (minutes)</Label>
              <Input
                id="duration_minutes"
                type="number"
                min="15"
                max="480"
                value={formData.duration_minutes}
                onChange={(e) => handleInputChange('duration_minutes', parseInt(e.target.value) || 60)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="meeting_link">Meeting Link</Label>
            <div className="relative">
              <Video className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="meeting_link"
                value={formData.meeting_link}
                onChange={(e) => handleInputChange('meeting_link', e.target.value)}
                placeholder="https://zoom.us/j/..."
                className="pl-10"
              />
            </div>
            <p className="text-xs text-gray-500">
              Zoom, Google Meet, or other meeting platform URL
            </p>
          </div>

          <div className="flex space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="flex-1"
              disabled={loading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </div>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {liveClass ? 'Update' : 'Create'}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
