'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';
import { Flag, AlertTriangle } from 'lucide-react';
import { trackAction } from '@/lib/tracking';

interface ContentFlagButtonProps {
  resourceType: 'lecture_recording' | 'course' | 'quiz' | 'assignment' | 'live_class' | 'chapter';
  resourceId: string;
  courseId?: string;
  trigger?: React.ReactNode;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export default function ContentFlagButton({
  resourceType,
  resourceId,
  courseId,
  trigger,
  variant = 'outline',
  size = 'sm',
}: ContentFlagButtonProps) {
  const { user, session } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    flagReason: '' as 'inappropriate' | 'spam' | 'copyright' | 'misinformation' | 'harassment' | 'other',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.flagReason) {
      toast.error('Please select a reason for flagging');
      return;
    }

    setLoading(true);

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/content-flags', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          resourceType,
          resourceId,
          courseId,
          flagReason: formData.flagReason,
          description: formData.description,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to flag content');
      }

      // Track content flagging
      if (session?.access_token) {
        trackAction({
          action_type: 'content_flag',
          resource_type: resourceType,
          resource_id: resourceId,
          course_id: courseId,
          metadata: { flag_reason: formData.flagReason },
          sessionToken: session.access_token,
        });
      }

      toast.success('Content flagged successfully', {
        description: 'Thank you for your report. We will review it soon.',
      });

      // Reset form
      setFormData({
        flagReason: '' as any,
        description: '',
      });

      setOpen(false);
    } catch (error) {
      console.error('Error flagging content:', error);
      toast.error('Failed to flag content', {
        description: error instanceof Error ? error.message : 'Please try again later.',
      });
    } finally {
      setLoading(false);
    }
  };

  const defaultTrigger = (
    <Button variant={variant} size={size}>
      <Flag className="mr-2 h-4 w-4" />
      Flag Content
    </Button>
  );

  const resourceTypeLabels: Record<string, string> = {
    lecture_recording: 'lecture',
    course: 'course',
    quiz: 'quiz',
    assignment: 'assignment',
    live_class: 'live class',
    chapter: 'chapter',
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Flag Content</DialogTitle>
          <DialogDescription>
            Report this {resourceTypeLabels[resourceType]} if it violates our community guidelines.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="flagReason">Reason for Flagging *</Label>
            <Select
              value={formData.flagReason}
              onValueChange={(value: any) => setFormData({ ...formData, flagReason: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inappropriate">Inappropriate Content</SelectItem>
                <SelectItem value="spam">Spam</SelectItem>
                <SelectItem value="copyright">Copyright Violation</SelectItem>
                <SelectItem value="misinformation">Misinformation</SelectItem>
                <SelectItem value="harassment">Harassment</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Additional Details (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Please provide any additional context that might help us review this content..."
              rows={4}
            />
          </div>

          <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                False reports may result in account restrictions. Please only flag content that genuinely violates our guidelines.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.flagReason}>
              {loading ? 'Submitting...' : 'Submit Report'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

