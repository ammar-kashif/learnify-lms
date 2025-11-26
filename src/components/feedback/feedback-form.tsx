'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { MessageSquare, Send } from 'lucide-react';
import { trackAction } from '@/lib/tracking';

interface FeedbackFormProps {
  trigger?: React.ReactNode;
  defaultType?: 'general' | 'feature_request' | 'support' | 'other';
}

export default function FeedbackForm({ trigger, defaultType = 'general' }: FeedbackFormProps) {
  const { user, session } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: user?.email || '',
    name: user?.user_metadata?.full_name || '',
    subject: '',
    message: '',
    messageType: defaultType,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: formData.email,
          name: formData.name,
          subject: formData.subject,
          message: formData.message,
          messageType: formData.messageType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit feedback');
      }

      // Track feedback submission
      if (session?.access_token) {
        trackAction({
          action_type: 'feedback_submit',
          resource_type: 'form',
          metadata: { message_type: formData.messageType },
          sessionToken: session.access_token,
        });
      }

      toast.success('Feedback submitted successfully!', {
        description: 'Thank you for your feedback. We will review it soon.',
      });

      // Reset form
      setFormData({
        email: user?.email || '',
        name: user?.user_metadata?.full_name || '',
        subject: '',
        message: '',
        messageType: defaultType,
      });

      setOpen(false);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback', {
        description: error instanceof Error ? error.message : 'Please try again later.',
      });
    } finally {
      setLoading(false);
    }
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <MessageSquare className="mr-2 h-4 w-4" />
      Send Feedback
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Feedback</DialogTitle>
          <DialogDescription>
            We'd love to hear from you! Share your thoughts, suggestions, or report issues.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={!!user}
              />
            </div>
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={!!user}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="messageType">Message Type</Label>
            <Select
              value={formData.messageType}
              onValueChange={(value: any) => setFormData({ ...formData, messageType: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General Feedback</SelectItem>
                <SelectItem value="feature_request">Feature Request</SelectItem>
                <SelectItem value="support">Support Request</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Brief description of your feedback"
              required
            />
          </div>

          <div>
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Please share your thoughts, suggestions, or describe any issues..."
              rows={6}
              required
            />
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
            <Button type="submit" disabled={loading}>
              {loading ? (
                'Submitting...'
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Submit Feedback
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

