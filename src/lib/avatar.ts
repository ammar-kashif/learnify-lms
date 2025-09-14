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
