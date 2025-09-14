'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Upload, 
  File, 
  Image, 
  FileText, 
  Video, 
  X, 
  CheckCircle, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Format file size utility
const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

interface FileUploadProps {
  onUpload: (files: File[]) => Promise<void>;
  accept?: string;
  maxFiles?: number;
  maxSize?: number; // in MB
  className?: string;
  disabled?: boolean;
}

interface FileWithPreview extends File {
  id: string;
  preview?: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export default function FileUpload({
  onUpload,
  accept = '*/*',
  maxFiles = 10,
  maxSize = 10, // 10MB default
  className,
  disabled = false
}: FileUploadProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles: FileWithPreview[] = Array.from(selectedFiles).map(file => {
      // Create a FileWithPreview by extending the original File
      const fileWithPreview = file as FileWithPreview;
      fileWithPreview.id = Math.random().toString(36).substring(7);
      fileWithPreview.status = 'pending' as const;
      fileWithPreview.preview = undefined;
      
      // Explicitly preserve the size property
      Object.defineProperty(fileWithPreview, 'size', {
        value: file.size,
        writable: false,
        enumerable: true,
        configurable: false
      });

      // Create preview for images
      if (file.type && file.type.startsWith('image/')) {
        fileWithPreview.preview = URL.createObjectURL(file);
      }

      return fileWithPreview;
    });

    // Validate files
    const validFiles = newFiles.filter(file => {
      // Check file size
      if (file.size > maxSize * 1024 * 1024) {
        file.status = 'error';
        file.error = `File size exceeds ${maxSize}MB limit`;
        return false;
      }
      return true;
    });

    setFiles(prev => [...prev, ...validFiles].slice(0, maxFiles));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (disabled) return;
    
    const droppedFiles = e.dataTransfer.files;
    handleFileSelect(droppedFiles);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === fileId);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== fileId);
    });
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    
    // Update file statuses to uploading
    setFiles(prev => prev.map(f => ({ ...f, status: 'uploading' as const })));

    try {
      const fileList = files.map(f => f as File);
      await onUpload(fileList);
      
      // Update file statuses to success
      setFiles(prev => prev.map(f => ({ ...f, status: 'success' as const })));
      
      // Clear files after successful upload
      setTimeout(() => {
        setFiles([]);
      }, 2000);
    } catch (error) {
      // Update file statuses to error
      setFiles(prev => prev.map(f => ({ 
        ...f, 
        status: 'error' as const,
        error: error instanceof Error ? error.message : 'Upload failed'
      })));
    } finally {
      setIsUploading(false);
    }
  };

const getFileIcon = (file: FileWithPreview) => {
  if (!file.type) return File;
  if (file.type.startsWith('image/')) return Image;
  if (file.type.startsWith('video/')) return Video;
  if (file.type.includes('pdf') || file.type.includes('document')) return FileText;
  return File;
};

  const getStatusIcon = (status: FileWithPreview['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'uploading':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      default:
        return null;
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!disabled) fileInputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Upload files by clicking or dragging and dropping"
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
          isDragOver && !disabled
            ? 'border-primary bg-primary/5'
            : 'border-gray-300 dark:border-gray-600',
          disabled && 'opacity-50 cursor-not-allowed',
          !disabled && 'cursor-pointer hover:border-primary hover:bg-primary/5'
        )}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={accept}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          disabled={disabled}
        />
        
        <div className="space-y-2">
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <div>
            <p className="text-lg font-medium text-gray-900 dark:text-white">
              Drop files here or click to browse
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Max {maxFiles} files, up to {maxSize}MB each
            </p>
          </div>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              {files.map((file) => {
                const FileIcon = getFileIcon(file);
                return (
                  <div
                    key={file.id}
                    className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    {/* File Preview/Icon */}
                    <div className="flex-shrink-0">
                      {file.preview ? (
                        <img
                          src={file.preview}
                          alt={`Preview of ${file.name}`}
                          className="h-10 w-10 rounded object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                          <FileIcon className="h-5 w-5 text-gray-500" />
                        </div>
                      )}
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatFileSize(file.size)}
                      </p>
                      {file.error && (
                        <p className="text-xs text-red-500">{file.error}</p>
                      )}
                    </div>

                    {/* Status */}
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(file.status)}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(file.id)}
                        disabled={file.status === 'uploading'}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Upload Button */}
            <div className="mt-4 flex justify-end">
              <Button
                onClick={handleUpload}
                disabled={isUploading || files.length === 0 || files.some(f => f.status === 'error')}
                className="bg-primary text-white hover:bg-primary-600"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload {files.length} file{files.length !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
