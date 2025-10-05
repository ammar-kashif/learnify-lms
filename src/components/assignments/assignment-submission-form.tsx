'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  File, 
  X, 
  CheckCircle, 
  AlertCircle,
  Clock,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';

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

interface AssignmentSubmissionFormProps {
  assignment: Assignment;
  onSubmissionComplete: () => void;
  onCancel: () => void;
}

export default function AssignmentSubmissionForm({
  assignment,
  onSubmissionComplete,
  onCancel
}: AssignmentSubmissionFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { session } = useAuth();

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    // Check file size
    const fileSizeMb = file.size / (1024 * 1024);
    if (fileSizeMb > assignment.max_file_size_mb) {
      return `File size (${formatFileSize(file.size)}) exceeds maximum allowed size of ${assignment.max_file_size_mb}MB`;
    }

    // Check file type
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!fileExtension || !assignment.allowed_file_types.includes(fileExtension)) {
      return `File type not allowed. Allowed types: ${assignment.allowed_file_types.join(', ')}`;
    }

    return null;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      toast.error(validationError);
      setUploadError(validationError);
      return;
    }

    setSelectedFile(file);
    setUploadError(null);
  };

  const handleFileDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      toast.error(validationError);
      setUploadError(validationError);
      return;
    }

    setSelectedFile(file);
    setUploadError(null);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const removeFile = () => {
    setSelectedFile(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('assignmentId', assignment.id);

      // Upload file to S3
      const response = await fetch('/api/assignments/submit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      toast.success('Assignment submitted successfully!');
      onSubmissionComplete();
    } catch (error) {
      console.error('Error submitting assignment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit assignment';
      setUploadError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const isOverdue = assignment.due_date && new Date(assignment.due_date) < new Date();

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Submit Assignment: {assignment.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Assignment Details */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">Assignment Details</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>Max Points: {assignment.max_points}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className={isOverdue ? 'text-red-600' : ''}>
                Due: {assignment.due_date ? new Date(assignment.due_date).toLocaleString() : 'No due date'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <File className="h-4 w-4" />
              <span>Allowed Types: {assignment.allowed_file_types.join(', ').toUpperCase()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              <span>Max Size: {assignment.max_file_size_mb}MB</span>
            </div>
          </div>
        </div>

        {/* Instructions */}
        {assignment.instructions && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">Instructions</h3>
            <p className="text-sm text-blue-800">{assignment.instructions}</p>
          </div>
        )}

        {/* Overdue Warning */}
        {isOverdue && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              This assignment is overdue. Late submissions may not be accepted.
            </AlertDescription>
          </Alert>
        )}

        {/* File Upload Area */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900">Upload Your Submission</h3>
          
          {!selectedFile ? (
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
              onDrop={handleFileDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              role="button"
              tabIndex={0}
            >
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">
                Click to upload or drag and drop
              </p>
              <p className="text-sm text-gray-600">
                {assignment.allowed_file_types.join(', ').toUpperCase()} files up to {assignment.max_file_size_mb}MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                accept={assignment.allowed_file_types.map(type => `.${type}`).join(',')}
                className="hidden"
              />
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <File className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-sm text-gray-600">{formatFileSize(selectedFile.size)}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={removeFile}
                  disabled={isUploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}

          {/* Upload Error */}
          {uploadError && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {uploadError}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedFile || isUploading}
            className="bg-primary hover:bg-primary-600"
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Submitting...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Submit Assignment
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
