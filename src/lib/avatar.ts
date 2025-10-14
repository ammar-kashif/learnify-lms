// Avatar management utilities

export interface AvatarUploadResult {
  success: boolean;
  avatar_url?: string;
  error?: string;
}

export interface AvatarDeleteResult {
  success: boolean;
  error?: string;
}

// Basic client-side image compression/resizing utility for avatars
export async function compressImage(
  file: File,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number; // 0..1
    convertToMimeType?: 'image/webp' | 'image/jpeg' | 'image/png';
  } = {}
): Promise<File> {
  const { maxWidth = 512, maxHeight = 512, quality = 0.8, convertToMimeType = 'image/webp' } = options;
  return new Promise((resolve, _reject) => {
    try {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Maintain aspect ratio within the target box
        if (width > maxWidth || height > maxHeight) {
          const widthRatio = maxWidth / width;
          const heightRatio = maxHeight / height;
          const ratio = Math.min(widthRatio, heightRatio);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const ext = convertToMimeType === 'image/webp' ? 'webp' : convertToMimeType === 'image/jpeg' ? 'jpg' : 'png';
            const compressed = new File([blob], file.name.replace(/\.[^.]+$/, `.${ext}`), {
              type: convertToMimeType,
              lastModified: Date.now(),
            });
            resolve(compressed.size < file.size ? compressed : file);
          },
          convertToMimeType,
          quality
        );
      };
      img.onerror = () => resolve(file);
      const reader = new FileReader();
      reader.onload = () => {
        img.src = reader.result as string;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    } catch (e) {
      resolve(file);
    }
  });
}

// Upload avatar for a user
export async function uploadAvatar(
  file: File,
  userId: string
): Promise<AvatarUploadResult> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);

    const response = await fetch('/api/avatar/upload', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error || 'Upload failed' };
    }

    return result;
  } catch (error) {
    console.error('Avatar upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

// Delete avatar for a user
export async function deleteAvatar(userId: string): Promise<AvatarDeleteResult> {
  try {
    const response = await fetch('/api/avatar/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error || 'Delete failed' };
    }

    return result;
  } catch (error) {
    console.error('Avatar delete error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed',
    };
  }
}

// Get avatar URL with fallback
export function getAvatarUrl(avatarUrl: string | null | undefined, fallback?: string): string {
  if (avatarUrl) {
    return avatarUrl;
  }
  
  // Default fallback based on user role or custom fallback
  return fallback || '/images/default-avatar.png';
}

// Validate avatar file
export function validateAvatarFile(file: File): { valid: boolean; error?: string } {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File too large. Maximum size is 5MB.'
    };
  }

  return { valid: true };
}

// Generate initials from name for fallback avatar
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
