'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText, Upload, Paperclip, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';

interface Chapter {
  id: string;
  title: string;
}

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  due_date: string | null;
  max_points: number;
  allowed_file_types: string[];
  max_file_size_mb: number;
  max_submissions: number;
  is_published: boolean;
}

interface AssignmentCreationFormProps {
  courseId: string;
  chapters: Chapter[];
  onAssignmentCreated: () => void;
  onCancel: () => void;
  editingAssignment?: Assignment;
}

export default function AssignmentCreationForm({
  courseId,
  chapters,
  onAssignmentCreated,
  onCancel,
  editingAssignment
}: AssignmentCreationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const { session } = useAuth();
  const [formData, setFormData] = useState({
    title: editingAssignment?.title || '',
    description: editingAssignment?.description || '',
    instructions: editingAssignment?.instructions || '',
    chapterId: '',
    dueDate: editingAssignment?.due_date ? new Date(editingAssignment.due_date).toISOString().slice(0, 16) : '',
    maxPoints: editingAssignment?.max_points || 100,
    maxFileSizeMb: editingAssignment?.max_file_size_mb || 10,
    maxSubmissions: editingAssignment?.max_submissions || 1,
    isPublished: editingAssignment?.is_published || false,
    allowedFileTypes: editingAssignment?.allowed_file_types || ['pdf', 'doc', 'docx'],
    attachmentName: '',
    attachmentUrl: '',
    attachmentKey: '',
    stopAfterDue: true,
  });

  const fileTypeOptions = [
    { value: 'pdf', label: 'PDF' },
    { value: 'doc', label: 'DOC' },
    { value: 'docx', label: 'DOCX' },
    { value: 'jpg', label: 'JPG' },
    { value: 'jpeg', label: 'JPEG' },
    { value: 'png', label: 'PNG' },
    { value: 'gif', label: 'GIF' },
    { value: 'txt', label: 'TXT' }
  ];

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileTypeToggle = (fileType: string) => {
    setFormData(prev => ({
      ...prev,
      allowedFileTypes: prev.allowedFileTypes.includes(fileType)
        ? prev.allowedFileTypes.filter(type => type !== fileType)
        : [...prev.allowedFileTypes, fileType]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('Assignment title is required');
      return;
    }

    if (formData.allowedFileTypes.length === 0) {
      toast.error('At least one file type must be selected');
      return;
    }

    setIsSubmitting(true);

    try {
      const isEditing = !!editingAssignment;
      const url = isEditing ? `/api/assignments/${editingAssignment.id}` : '/api/assignments';
      const method = isEditing ? 'PUT' : 'POST';
      
      const requestBody = isEditing ? {
        title: formData.title,
        description: formData.description,
        instructions: formData.instructions,
        dueDate: formData.dueDate || null,
        stop_submissions_after_due: formData.stopAfterDue,
        maxPoints: formData.maxPoints,
        allowedFileTypes: formData.allowedFileTypes,
        maxFileSizeMb: formData.maxFileSizeMb,
        maxSubmissions: formData.maxSubmissions,
        isPublished: formData.isPublished
      } : {
        courseId,
        chapterId: (formData.chapterId === 'none' || !formData.chapterId) ? null : formData.chapterId,
        chapterId: (formData.chapterId === 'none' || !formData.chapterId) ? null : formData.chapterId,
        title: formData.title,
        description: formData.description,
        instructions: formData.instructions,
        dueDate: formData.dueDate || null,
        stop_submissions_after_due: formData.stopAfterDue,
        maxPoints: formData.maxPoints,
        allowedFileTypes: formData.allowedFileTypes,
        maxFileSizeMb: formData.maxFileSizeMb,
        maxSubmissions: formData.maxSubmissions,
        isPublished: formData.isPublished
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Failed to ${isEditing ? 'update' : 'create'} assignment`);
      }

      toast.success(`Assignment ${isEditing ? 'updated' : 'created'} successfully!`);
      onAssignmentCreated();
    } catch (error) {
      console.error('Error creating assignment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create assignment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {editingAssignment ? 'Edit Assignment' : 'Create New Assignment'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <Label htmlFor="title" className="text-sm font-medium">
              Assignment Title *
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Enter assignment title"
              className="mt-1"
              required
            />
          </div>

          {/* Chapter Selection */}
          <div>
            <Label htmlFor="chapter" className="text-sm font-medium">
              Chapter (Optional)
            </Label>
            <Select value={formData.chapterId} onValueChange={(value) => handleInputChange('chapterId', value)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select a chapter (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No specific chapter</SelectItem>
                {chapters.map((chapter) => (
                  <SelectItem key={chapter.id} value={chapter.id}>
                    {chapter.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="text-sm font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe the assignment..."
              className="mt-1"
              rows={3}
            />
          </div>

          {/* Instructions */}
          <div>
            <Label htmlFor="instructions" className="text-sm font-medium">
              Instructions
            </Label>
            <Textarea
              id="instructions"
              value={formData.instructions}
              onChange={(e) => handleInputChange('instructions', e.target.value)}
              placeholder="Provide detailed instructions for students..."
              className="mt-1"
              rows={4}
            />
          </div>

          {/* Due Date and Points */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dueDate" className="text-sm font-medium">
                Due Date
              </Label>
              <Input
                id="dueDate"
                type="datetime-local"
                value={formData.dueDate}
                onChange={(e) => handleInputChange('dueDate', e.target.value)}
                className="mt-1"
              />
              <div className="mt-2 flex items-center gap-2">
                <Checkbox
                  id="stopAfterDue"
                  checked={formData.stopAfterDue}
                  onCheckedChange={(checked) => handleInputChange('stopAfterDue', !!checked)}
                />
                <Label htmlFor="stopAfterDue" className="text-sm">Stop submissions after the deadline</Label>
              </div>
            </div>
            <div>
              <Label htmlFor="maxPoints" className="text-sm font-medium">
                Maximum Points
              </Label>
              <Input
                id="maxPoints"
                type="number"
                min="1"
                value={formData.maxPoints}
                onChange={(e) => handleInputChange('maxPoints', parseInt(e.target.value) || 100)}
                className="mt-1"
              />
            </div>
          </div>

          {/* File Restrictions */}
          <div className="space-y-4">
        {/* Optional Attachment Upload (PDF/DOC/DOCX) */}
        <div>
          <Label className="text-sm font-medium">Attachment (optional)</Label>
          <div className="mt-2">
            {!formData.attachmentUrl ? (
              <div
                className="relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-6 text-center transition-colors hover:border-primary"
                onClick={() => attachmentInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    attachmentInputRef.current?.click();
                  }
                }}
              >
                <Upload className="mb-2 h-6 w-6 text-gray-500" />
                <p className="text-sm text-gray-700">Click to upload PDF/DOC/DOCX</p>
                <p className="text-xs text-gray-500">Max 10MB</p>
                <input
                  ref={attachmentInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setAttachmentError(null);
                    if (file.size > 10 * 1024 * 1024) {
                      setAttachmentError('File is larger than 10MB');
                      return;
                    }
                    setIsUploadingAttachment(true);
                    try {
                      const form = new FormData();
                      form.append('file', file);
                      const res = await fetch(`/api/assignments/attachment/upload?courseId=${courseId}`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${session?.access_token}` },
                        body: form,
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error || 'Upload failed');
                      setFormData(prev => ({ ...prev, attachmentName: data.name, attachmentUrl: data.url, attachmentKey: data.key }));
                      toast.success('Attachment uploaded');
                    } catch (err) {
                      console.error('Attachment upload error:', err);
                      toast.error(err instanceof Error ? err.message : 'Failed to upload attachment');
                    } finally {
                      setIsUploadingAttachment(false);
                    }
                  }}
                />
                {isUploadingAttachment && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/60 dark:bg-gray-900/60">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-md border bg-gray-50 p-3">
                <div className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-primary" />
                  <a href={formData.attachmentUrl} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
                    {formData.attachmentName || 'View attachment'}
                  </a>
                </div>
                <button
                  type="button"
                  className="rounded p-1 text-gray-500 hover:text-red-600"
                  onClick={() => setFormData(prev => ({ ...prev, attachmentName: '', attachmentUrl: '', attachmentKey: '' }))}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            {attachmentError && <p className="mt-1 text-xs text-red-600">{attachmentError}</p>}
            {!attachmentError && <p className="mt-1 text-xs text-gray-500">Attach instructions/specification as PDF/DOC/DOCX.</p>}
          </div>
        </div>

            <div>
              <Label className="text-sm font-medium">Allowed File Types *</Label>
              <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                {fileTypeOptions.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={option.value}
                      checked={formData.allowedFileTypes.includes(option.value)}
                      onCheckedChange={() => handleFileTypeToggle(option.value)}
                    />
                    <Label htmlFor={option.value} className="text-sm">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="maxFileSize" className="text-sm font-medium">
                  Max File Size (MB)
                </Label>
                <Input
                  id="maxFileSize"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.maxFileSizeMb}
                  onChange={(e) => handleInputChange('maxFileSizeMb', parseInt(e.target.value) || 10)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="maxSubmissions" className="text-sm font-medium">
                  Max Submissions
                </Label>
                <Input
                  id="maxSubmissions"
                  type="number"
                  min="1"
                  max="10"
                  value={formData.maxSubmissions}
                  onChange={(e) => handleInputChange('maxSubmissions', parseInt(e.target.value) || 1)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Publish Option */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isPublished"
              checked={formData.isPublished}
              onCheckedChange={(checked) => handleInputChange('isPublished', checked)}
            />
            <Label htmlFor="isPublished" className="text-sm font-medium">
              Publish immediately (make visible to students)
            </Label>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary-600"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {editingAssignment ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  {editingAssignment ? 'Update Assignment' : 'Create Assignment'}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
