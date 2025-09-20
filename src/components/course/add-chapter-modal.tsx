'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Upload, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface AddChapterModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  onChapterAdded: () => void;
}

export default function AddChapterModal({ isOpen, onClose, courseId, onChapterAdded }: AddChapterModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    file: null as File | null
  });
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({ ...prev, file }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Please enter a chapter title');
      return;
    }

    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No authentication token found');
      }

      let fileUrl = null;
      let fileType = null;
      let fileSize = null;

      // Upload file if provided
      if (formData.file) {
        const fileExt = formData.file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `chapters/${courseId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('course-files')
          .upload(filePath, formData.file);

        if (uploadError) {
          throw new Error(`File upload failed: ${uploadError.message}`);
        }

        const { data: { publicUrl } } = supabase.storage
          .from('course-files')
          .getPublicUrl(filePath);

        fileUrl = publicUrl;
        fileType = formData.file.type;
        fileSize = formData.file.size;
      }

      // Create chapter
      const { error: chapterError } = await supabase
        .from('chapters')
        .insert({
          course_id: courseId,
          title: formData.title.trim(),
          content: formData.content.trim() || null,
          file_url: fileUrl,
          file_type: fileType,
          file_size: fileSize
        });

      if (chapterError) {
        throw new Error(`Failed to create chapter: ${chapterError.message}`);
      }

      toast.success('Chapter added successfully!');
      setFormData({ title: '', content: '', file: null });
      onChapterAdded();
      onClose();
    } catch (error) {
      console.error('Error adding chapter:', error);
      toast.error(`Failed to add chapter: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Add New Chapter</CardTitle>
              <CardDescription>Add content to this course</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Chapter Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter chapter title"
                required
              />
            </div>

            <div>
              <Label htmlFor="content">Chapter Content</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Enter chapter description or content"
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="file">Upload File (Optional)</Label>
              <div className="mt-2">
                <Input
                  id="file"
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.txt,.mp4,.mp3,.jpg,.jpeg,.png,.zip"
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Supported formats: PDF, DOC, DOCX, TXT, MP4, MP3, JPG, PNG, ZIP
                </p>
              </div>
            </div>

            {formData.file && (
              <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <FileText className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {formData.file.name} ({(formData.file.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={uploading}>
                Cancel
              </Button>
              <Button type="submit" disabled={uploading}>
                {uploading ? (
                  <>
                    <Upload className="h-4 w-4 mr-2 animate-spin" />
                    Adding Chapter...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Add Chapter
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
