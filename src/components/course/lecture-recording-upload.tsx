'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2, Youtube } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';

import { parseYouTubeId, youtubeThumbnail } from '@/lib/youtube';

/**
 * Add a lecture recording.
 *
 * Lectures are hosted on YouTube now, so this is a URL field rather than a
 * file upload. The whole S3 pipeline this replaced — drag-and-drop, a 500 MB
 * cap, a client-side duration probe, an XMLHttpRequest for browser→server
 * progress, and a server-sent-events channel for server→S3 progress — is gone.
 */

interface LectureRecordingUploadProps {
  courseId: string;
  onUploadSuccess?: () => void;
}

export default function LectureRecordingUpload({
  courseId,
  onUploadSuccess,
}: LectureRecordingUploadProps) {
  const { session } = useAuth();
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');

  // Parsed live so the teacher sees the thumbnail of the video they pasted and
  // can tell immediately if it is the wrong one.
  const videoId = url.trim() ? parseYouTubeId(url) : null;
  const urlLooksWrong = url.trim().length > 0 && !videoId;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;

    if (!session?.access_token) {
      toast.error('Please sign in again.');
      return;
    }
    if (!title.trim()) {
      toast.error('Give the lecture a title.');
      return;
    }
    if (!videoId) {
      toast.error('Paste a valid YouTube link.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/lecture-recordings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          courseId,
          title: title.trim(),
          description: description.trim() || null,
          youtubeVideoId: videoId,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data?.error ?? 'Could not add the lecture.');
        return;
      }

      toast.success('Lecture added. Publish it when you are ready.');
      setTitle('');
      setDescription('');
      setUrl('');
      onUploadSuccess?.();
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Youtube className="h-5 w-5 text-red-600" aria-hidden="true" />
          Add a lecture
        </CardTitle>
        <CardDescription>
          Upload the video to YouTube first, then paste its link here.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lecture-title">Title *</Label>
            <Input
              id="lecture-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Chapter 3 — Electric Circuits"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lecture-url">YouTube link *</Label>
            <Input
              id="lecture-url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=…"
              required
              aria-invalid={urlLooksWrong}
              className={urlLooksWrong ? 'border-red-500' : ''}
            />
            {urlLooksWrong && (
              <p className="text-xs text-red-600">
                That doesn&apos;t look like a YouTube link. Paste the full URL
                from the address bar, or the video ID.
              </p>
            )}
          </div>

          {videoId && (
            <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-800">
              {/* Plain <img>, not next/image: there is no root next.config.js in
                  this project, so i.ytimg.com cannot be allowlisted. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={youtubeThumbnail(videoId, 'medium')}
                alt=""
                className="h-16 w-28 flex-shrink-0 rounded object-cover"
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Video found
                </p>
                <p className="truncate font-mono text-xs text-gray-500">{videoId}</p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="lecture-description">Description</Label>
            <Textarea
              id="lecture-description"
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional — what this lecture covers"
            />
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <AlertDescription className="text-xs">
              New lectures are unpublished until you publish them, so you can
              check the video plays before students see it.
            </AlertDescription>
          </Alert>

          <Button type="submit" className="w-full" disabled={saving || !videoId}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Adding…
              </>
            ) : (
              'Add lecture'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
