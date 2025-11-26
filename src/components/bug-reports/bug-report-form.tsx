'use client';

import { useState, useEffect } from 'react';
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
import { Bug, Send, AlertCircle } from 'lucide-react';
import { trackAction } from '@/lib/tracking';

interface BugReportFormProps {
  trigger?: React.ReactNode;
  initialUrl?: string;
  initialError?: string;
}

export default function BugReportForm({ 
  trigger, 
  initialUrl,
  initialError 
}: BugReportFormProps) {
  const { user, session } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: user?.email || '',
    title: '',
    description: '',
    stepsToReproduce: '',
    expectedBehavior: '',
    actualBehavior: '',
    severity: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    url: initialUrl || (typeof window !== 'undefined' ? window.location.href : ''),
    browserInfo: '',
    deviceInfo: '',
  });

  useEffect(() => {
    // Auto-fill browser and device info
    if (typeof window !== 'undefined') {
      setFormData(prev => ({
        ...prev,
        browserInfo: `${navigator.userAgent} - ${navigator.language}`,
        deviceInfo: `${window.innerWidth}x${window.innerHeight}`,
        url: prev.url || window.location.href,
        description: initialError ? `Error: ${initialError}\n\n${prev.description}` : prev.description,
      }));
    }
  }, [initialError]);

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

      const response = await fetch('/api/bug-reports', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: formData.email,
          title: formData.title,
          description: formData.description,
          stepsToReproduce: formData.stepsToReproduce,
          expectedBehavior: formData.expectedBehavior,
          actualBehavior: formData.actualBehavior,
          browserInfo: formData.browserInfo,
          deviceInfo: formData.deviceInfo,
          url: formData.url,
          severity: formData.severity,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit bug report');
      }

      // Track bug report submission
      if (session?.access_token) {
        trackAction({
          action_type: 'bug_report_submit',
          resource_type: 'form',
          metadata: { severity: formData.severity },
          sessionToken: session.access_token,
        });
      }

      toast.success('Bug report submitted successfully!', {
        description: 'Thank you for reporting this issue. We will investigate it soon.',
      });

      // Reset form
      setFormData({
        email: user?.email || '',
        title: '',
        description: '',
        stepsToReproduce: '',
        expectedBehavior: '',
        actualBehavior: '',
        severity: 'medium',
        url: typeof window !== 'undefined' ? window.location.href : '',
        browserInfo: typeof window !== 'undefined' ? `${navigator.userAgent} - ${navigator.language}` : '',
        deviceInfo: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : '',
      });

      setOpen(false);
    } catch (error) {
      console.error('Error submitting bug report:', error);
      toast.error('Failed to submit bug report', {
        description: error instanceof Error ? error.message : 'Please try again later.',
      });
    } finally {
      setLoading(false);
    }
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Bug className="mr-2 h-4 w-4" />
      Report Bug
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Report a Bug</DialogTitle>
          <DialogDescription>
            Help us improve by reporting bugs you encounter. Please provide as much detail as possible.
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
              <Label htmlFor="severity">Severity *</Label>
              <Select
                value={formData.severity}
                onValueChange={(value: any) => setFormData({ ...formData, severity: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low - Minor issue</SelectItem>
                  <SelectItem value="medium">Medium - Moderate issue</SelectItem>
                  <SelectItem value="high">High - Significant issue</SelectItem>
                  <SelectItem value="critical">Critical - Blocks functionality</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Brief description of the bug"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what happened and what you were trying to do..."
              rows={4}
              required
            />
          </div>

          <div>
            <Label htmlFor="stepsToReproduce">Steps to Reproduce</Label>
            <Textarea
              id="stepsToReproduce"
              value={formData.stepsToReproduce}
              onChange={(e) => setFormData({ ...formData, stepsToReproduce: e.target.value })}
              placeholder="1. Go to...&#10;2. Click on...&#10;3. See error..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="expectedBehavior">Expected Behavior</Label>
              <Textarea
                id="expectedBehavior"
                value={formData.expectedBehavior}
                onChange={(e) => setFormData({ ...formData, expectedBehavior: e.target.value })}
                placeholder="What should have happened?"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="actualBehavior">Actual Behavior</Label>
              <Textarea
                id="actualBehavior"
                value={formData.actualBehavior}
                onChange={(e) => setFormData({ ...formData, actualBehavior: e.target.value })}
                placeholder="What actually happened?"
                rows={2}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="Page URL where the bug occurred"
            />
          </div>

          <div className="rounded-md bg-muted p-3 text-sm">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <div>
                <p className="font-medium mb-1">Technical Information (Auto-filled)</p>
                <p className="text-muted-foreground text-xs">
                  Browser: {formData.browserInfo || 'Collecting...'}<br />
                  Device: {formData.deviceInfo || 'Collecting...'}
                </p>
              </div>
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
            <Button type="submit" disabled={loading}>
              {loading ? (
                'Submitting...'
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Submit Bug Report
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

