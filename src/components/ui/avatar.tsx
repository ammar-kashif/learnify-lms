'use client';

import { cn } from '@/lib/utils';
import { getInitials, getAvatarUrl } from '@/lib/avatar';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  fallback?: string;
}

const sizeClasses = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-12 w-12 text-lg',
  xl: 'h-16 w-16 text-xl',
};

export default function Avatar({
  src,
  alt = 'Avatar',
  name = 'User',
  size = 'md',
  className,
  fallback
}: AvatarProps) {
  const avatarUrl = getAvatarUrl(src, fallback);
  const initials = getInitials(name);

  return (
    <div
      className={cn(
        'rounded-full bg-primary/10 flex items-center justify-center overflow-hidden',
        sizeClasses[size],
        className
      )}
    >
      {avatarUrl && !avatarUrl.includes('default-avatar') ? (
        <img
          src={avatarUrl}
          alt={alt}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback to initials if image fails to load
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent) {
              parent.innerHTML = `<span class="font-medium text-primary">${initials}</span>`;
            }
          }}
        />
      ) : (
        <span className="font-medium text-primary">
          {initials}
        </span>
      )}
    </div>
  );
}
