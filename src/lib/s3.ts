// Upload file to S3 via API route
export async function uploadToS3(
  file: File,
  bucketType: 'course-assets' | 'lesson-hls' | 'submissions' | 'avatars',
  prefix: string = 'uploads'
): Promise<{ success: boolean; url?: string; key?: string; error?: string }> {
  console.log('uploadToS3 called with:', { fileName: file.name, fileSize: file.size, fileType: file.type, bucketType, prefix });
  
  try {
    // Create FormData for the API request
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucketType', bucketType);
    formData.append('prefix', prefix);

    // Call the API route
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    console.log('Upload API response:', result);

    if (!response.ok) {
      return { success: false, error: result.error || 'Upload failed' };
    }

    return result;
  } catch (error) {
    console.error('S3 upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

// Delete file from S3 via API route
export async function deleteFromS3(
  key: string,
  bucketType: 'course-assets' | 'lesson-hls' | 'submissions' | 'avatars'
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ key, bucketType }),
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error || 'Delete failed' };
    }

    return result;
  } catch (error) {
    console.error('S3 delete error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed',
    };
  }
}

// Get file size in human readable format
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Get file type category
export function getFileTypeCategory(fileType: string): 'image' | 'document' | 'video' | 'other' {
  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const allowedDocumentTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
  
  if (allowedImageTypes.includes(fileType)) return 'image';
  if (allowedDocumentTypes.includes(fileType)) return 'document';
  if (allowedVideoTypes.includes(fileType)) return 'video';
  return 'other';
}
