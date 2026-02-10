/**
 * Guest Demo Management - No Signup Required
 * 
 * Allows guest users to access demo content without creating an account.
 * Demo state is stored in browser localStorage with 24-hour expiration.
 */

export interface GuestDemoState {
  courseId: string;
  videoId: string;
  accessType: 'lecture_recording';
  grantedAt: string;
  expiresAt: string;
}

const STORAGE_KEY_PREFIX = 'guest-demo-';
const DEMO_DURATION_HOURS = 24;

/**
 * Get guest demo state for a specific course
 */
export function getGuestDemo(courseId: string): GuestDemoState | null {
  if (typeof window === 'undefined') return null;

  try {
    const key = `${STORAGE_KEY_PREFIX}${courseId}`;
    const stored = localStorage.getItem(key);
    
    if (!stored) return null;

    const demo: GuestDemoState = JSON.parse(stored);
    
    // Validate demo structure
    if (!demo.courseId || !demo.videoId || !demo.grantedAt || !demo.expiresAt) {
      clearGuestDemo(courseId);
      return null;
    }

    // Check if expired
    if (hasGuestDemoExpired(demo)) {
      clearGuestDemo(courseId);
      return null;
    }

    return demo;
  } catch (error) {
    console.error('Error reading guest demo:', error);
    return null;
  }
}

/**
 * Create/update guest demo for a course
 */
export function setGuestDemo(courseId: string, videoId: string): GuestDemoState {
  if (typeof window === 'undefined') {
    throw new Error('Cannot set guest demo on server side');
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + DEMO_DURATION_HOURS * 60 * 60 * 1000);

  const demo: GuestDemoState = {
    courseId,
    videoId,
    accessType: 'lecture_recording',
    grantedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  try {
    const key = `${STORAGE_KEY_PREFIX}${courseId}`;
    localStorage.setItem(key, JSON.stringify(demo));
    return demo;
  } catch (error) {
    console.error('Error setting guest demo:', error);
    throw new Error('Failed to activate guest demo');
  }
}

/**
 * Check if a guest demo has expired
 */
export function hasGuestDemoExpired(demo: GuestDemoState): boolean {
  const now = new Date();
  const expiry = new Date(demo.expiresAt);
  return expiry <= now;
}

/**
 * Clear guest demo for a specific course
 */
export function clearGuestDemo(courseId: string): void {
  if (typeof window === 'undefined') return;

  try {
    const key = `${STORAGE_KEY_PREFIX}${courseId}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error clearing guest demo:', error);
  }
}

/**
 * Get all guest demos (for migration on signup)
 */
export function getAllGuestDemos(): GuestDemoState[] {
  if (typeof window === 'undefined') return [];

  const demos: GuestDemoState[] = [];

  try {
    // Iterate through localStorage to find all guest demos
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(STORAGE_KEY_PREFIX)) continue;

      const stored = localStorage.getItem(key);
      if (!stored) continue;

      try {
        const demo: GuestDemoState = JSON.parse(stored);
        
        // Only include non-expired demos
        if (!hasGuestDemoExpired(demo)) {
          demos.push(demo);
        } else {
          // Clean up expired demo
          localStorage.removeItem(key);
        }
      } catch (parseError) {
        // Invalid demo data, remove it
        localStorage.removeItem(key);
      }
    }
  } catch (error) {
    console.error('Error getting all guest demos:', error);
  }

  return demos;
}

/**
 * Clear all guest demos (used after migration to authenticated account)
 */
export function clearAllGuestDemos(): void {
  if (typeof window === 'undefined') return;

  try {
    const keysToRemove: string[] = [];
    
    // Collect all guest demo keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        keysToRemove.push(key);
      }
    }

    // Remove all guest demo keys
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.error('Error clearing all guest demos:', error);
  }
}

/**
 * Get time remaining for a guest demo (in milliseconds)
 */
export function getTimeRemaining(demo: GuestDemoState): number {
  const now = new Date();
  const expiry = new Date(demo.expiresAt);
  const diff = expiry.getTime() - now.getTime();
  return Math.max(0, diff);
}

/**
 * Format time remaining as HH:MM:SS
 */
export function formatTimeRemaining(demo: GuestDemoState): string {
  const ms = getTimeRemaining(demo);
  
  if (ms <= 0) return '00:00:00';

  const seconds = Math.floor(ms / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get progress percentage (0-100) for demo expiration
 */
export function getDemoProgress(demo: GuestDemoState): number {
  const granted = new Date(demo.grantedAt);
  const expires = new Date(demo.expiresAt);
  const now = new Date();

  const total = expires.getTime() - granted.getTime();
  const elapsed = now.getTime() - granted.getTime();
  const progress = (elapsed / total) * 100;

  return Math.min(100, Math.max(0, progress));
}
