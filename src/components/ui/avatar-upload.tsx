'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Upload, 
  X, 
  Loader2, 
  User, 
  Camera
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { uploadAvatar, deleteAvatar, validateAvatarFile, compressImage } from '@/lib/avatar';

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl?: string | null;
  userName?: string;
  onAvatarChange?: (avatarUrl: string | null) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function AvatarUpload({
  userId,
  currentAvatarUrl,
  userName = 'User',
  onAvatarChange,
  size = 'md',
  className
}: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: 'h-16 w-16',
    md: 'h-24 w-24',
    lg: 'h-32 w-32'
  };

  const iconSizes = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  const handleFileSelect = async (file: File) => {
    // Validate file
    const validation = validateAvatarFile(file);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    setIsUploading(true);
    try {
      // Compress/resize on client for faster uploads and lower storage
      const compressed = await compressImage(file, {
        maxWidth: 512,
        maxHeight: 512,
        quality: 0.8,
        convertToMimeType: 'image/webp',
      });
      const result = await uploadAvatar(compressed, userId);
      
      if (result.success && result.avatar_url) {
        onAvatarChange?.(result.avatar_url);
      } else {
        alert(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDelete = async () => {
    if (!currentAvatarUrl) return;
    
    setIsDeleting(true);
    try {
      const result = await deleteAvatar(userId);
      
      if (result.success) {
        onAvatarChange?.(null);
      } else {
        alert(result.error || 'Delete failed');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Delete failed');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={cn('flex flex-col items-center space-y-4', className)}>
      {/* Avatar Display */}
      <div className="relative group">
        <div
          className={cn(
            'rounded-full border-2 border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer transition-all duration-200',
            sizeClasses[size],
            dragOver && 'border-primary bg-primary/10',
            'hover:border-primary/50'
          )}
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onKeyDown={(e) => e.key === 'Enter' && handleClick()}
          role="button"
          tabIndex={0}
          aria-label="Upload avatar"
        >
          {currentAvatarUrl ? (
            <img
              src={currentAvatarUrl}
              alt={`${userName}'s avatar`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-primary/10 flex items-center justify-center">
              <User className={cn('text-primary', iconSizes[size])} />
            </div>
          )}
          
          {/* Upload overlay */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
            <Camera className={cn('text-white', iconSizes[size])} />
          </div>
          
          {/* Loading overlay */}
          {(isUploading || isDeleting) && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className={cn('text-white animate-spin', iconSizes[size])} />
            </div>
          )}
        </div>
        
        {/* Delete button */}
        {currentAvatarUrl && !isUploading && !isDeleting && (
          <Button
            variant="destructive"
            size="sm"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Upload Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={isUploading || isDeleting}
        className="text-sm"
      >
        {isUploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : isDeleting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Deleting...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            {currentAvatarUrl ? 'Change Avatar' : 'Upload Avatar'}
          </>
        )}
      </Button>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={isUploading || isDeleting}
      />

      {/* Instructions */}
      <p className="text-xs text-gray-500 dark:text-gray-400 text-center max-w-48">
        Drag and drop an image or click to upload. Max 5MB. JPEG, PNG, GIF, WebP supported.
      </p>
    </div>
  );
}
