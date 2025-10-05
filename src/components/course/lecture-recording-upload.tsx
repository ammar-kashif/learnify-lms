'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Video, X, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';

interface LectureRecordingUploadProps {
  courseId: string;
  onUploadSuccess?: () => void;
}

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export default function LectureRecordingUpload({ 
  courseId, 
  onUploadSuccess 
}: LectureRecordingUploadProps) {
  const { session } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  // track lifecycle if needed later
  // const [uploadPhase, setUploadPhase] = useState<'idle' | 'to_api' | 'to_s3' | 'done'>('idle');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoDurationSec, setVideoDurationSec] = useState<number | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // const [progressId, setProgressId] = useState<string | null>(null);
  const sseRef = useRef<EventSource | null>(null);

  const handleFileSelect = (file: File) => {
    // Validate file type
    const allowedTypes = [
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-ms-wmv',
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please select a video file (MP4, WebM, QuickTime, AVI, or WMV).');
      return;
    }

    // Validate file size (max 500MB)
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      toast.error('File too large. Maximum size is 500MB.');
      return;
    }

    setSelectedFile(file);

    // Probe video duration using a temporary HTMLVideoElement
    try {
      const url = URL.createObjectURL(file);
      const videoEl = document.createElement('video');
      videoEl.preload = 'metadata';
      videoEl.onloadedmetadata = () => {
        const dur = isFinite(videoEl.duration) ? Math.round(videoEl.duration) : null;
        setVideoDurationSec(dur);
        URL.revokeObjectURL(url);
      };
      videoEl.onerror = () => {
        setVideoDurationSec(null);
        URL.revokeObjectURL(url);
      };
      videoEl.src = url;
    } catch {
      setVideoDurationSec(null);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile || !formData.title.trim()) {
      toast.error('Please select a video file and enter a title.');
      return;
    }

    if (!session?.access_token) {
      toast.error('You must be logged in to upload videos.');
      return;
    }

    setIsUploading(true);
    setUploadProgress({ loaded: 0, total: selectedFile.size, percentage: 0 });
    // setUploadPhase('to_api');

    try {
      const id = crypto.randomUUID();
      // setProgressId(id);

      // Start SSE subscription to mirror server S3 progress
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
      const sse = new EventSource(`/api/lecture-recordings/progress?id=${id}`);
      sseRef.current = sse;
      sse.addEventListener('progress', (e: MessageEvent) => {
        const pct = Math.max(0, Math.min(100, Number(e.data)));
        setUploadProgress(p => p ? { ...p, percentage: pct } : { loaded: 0, total: selectedFile.size, percentage: pct });
      });
      sse.addEventListener('done', () => {
        setUploadProgress(p => p ? { ...p, percentage: 100 } : { loaded: 0, total: selectedFile.size, percentage: 100 });
        sse.close();
      });

      const form = new FormData();
      form.append('file', selectedFile);
      form.append('courseId', courseId);
      form.append('title', formData.title.trim());
      form.append('description', formData.description.trim());
      if (videoDurationSec != null) {
        form.append('duration', String(videoDurationSec));
      }
      form.append('progressId', id);

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/lecture-recordings/upload');
        xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);

        // We rely on SSE for true progress; keep minimal visual change here
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const loaded = event.loaded;
            const total = event.total || selectedFile.size;
            const raw = (loaded / total) * 100;
            // Reflect small progress until SSE starts reporting
            setUploadProgress(prev => prev ?? { loaded, total, percentage: Math.min(5, raw) });
          }
        };

        xhr.onreadystatechange = () => {
          if (xhr.readyState === XMLHttpRequest.LOADING) {
            // Request finished sending; server is handling S3 transfer
            // setUploadPhase('to_s3');
          }
          if (xhr.readyState === XMLHttpRequest.DONE) {
            try {
              const data = JSON.parse(xhr.responseText || '{}');
              if (xhr.status >= 200 && xhr.status < 300) {
                toast.success('Lecture recording uploaded successfully!');
                setUploadProgress(p => p ? { ...p, percentage: 100 } : null);
                // setUploadPhase('done');
                resolve();
              } else {
                reject(new Error(data.error || 'Upload failed'));
              }
            } catch (err) {
              reject(err instanceof Error ? err : new Error('Upload failed'));
            }
          }
        };

        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(form);
      });

      // Reset form
      setFormData({ title: '', description: '' });
      setSelectedFile(null);
      setVideoDurationSec(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Notify parent to refresh list without page reload
      onUploadSuccess?.();

    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      // setUploadPhase('idle');
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
      // setProgressId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5" />
          Upload Lecture Recording
        </CardTitle>
        <CardDescription>
          Upload a video recording of your lecture. Maximum file size is 500MB.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title Input */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter lecture title"
              required
              disabled={isUploading}
            />
          </div>

          {/* Description Input */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter lecture description (optional)"
              rows={3}
              disabled={isUploading}
            />
          </div>

          {/* File Upload Area */}
          <div className="space-y-2">
            <Label>Video File *</Label>
            <div
              className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileInputChange}
                className={`absolute inset-0 w-full h-full opacity-0 cursor-pointer ${selectedFile ? 'pointer-events-none' : ''}`}
                disabled={isUploading}
              />
              
              {selectedFile ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <Video className="h-8 w-8 text-primary" />
                    <div className="text-left">
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removeFile}
                      disabled={isUploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      Drop your video file here, or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground">
                      MP4, WebM, QuickTime, AVI, WMV up to 500MB
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Upload Progress */}
          {uploadProgress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Uploading...</span>
                <span>{uploadProgress.percentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress.percentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Upload Button */}
          <Button
            type="submit"
            disabled={!selectedFile || !formData.title.trim() || isUploading}
            variant={isUploading ? 'secondary' : 'default'}
            className={`w-full ${isUploading ? 'text-muted-foreground bg-muted hover:bg-muted' : 'bg-primary text-white hover:bg-primary/90'}`}
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 mr-2 border-current" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Lecture Recording
              </>
            )}
          </Button>
        </form>

        {/* Info Alert */}
        <Alert className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            The video will be uploaded to S3 and will be available for students once published. 
            You can manage the recording from the lecture recordings section.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
