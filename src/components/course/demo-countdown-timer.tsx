'use client';

import { useState, useEffect } from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { GuestDemoState, formatTimeRemaining, getDemoProgress, hasGuestDemoExpired } from '@/lib/guest-demo';

interface DemoCountdownTimerProps {
  demo: GuestDemoState | { expires_at: string; used_at: string };
  onExpire?: () => void;
  className?: string;
  showProgress?: boolean;
  compact?: boolean;
}

export default function DemoCountdownTimer({
  demo,
  onExpire,
  className = '',
  showProgress = true,
  compact = false,
}: DemoCountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState('');
  const [progress, setProgress] = useState(0);
  const [isExpired, setIsExpired] = useState(false);
  const [warningLevel, setWarningLevel] = useState<'safe' | 'warning' | 'critical'>('safe');

  useEffect(() => {
    const updateTimer = () => {
      let expiresAt: string;
      let grantedAt: string;

      // Handle both GuestDemoState and authenticated demo formats
      if ('expiresAt' in demo) {
        expiresAt = demo.expiresAt;
        grantedAt = demo.grantedAt;
      } else {
        expiresAt = demo.expires_at;
        grantedAt = demo.used_at;
      }

      const now = new Date();
      const expiry = new Date(expiresAt);
      const granted = new Date(grantedAt);
      const diff = expiry.getTime() - now.getTime();

      if (diff <= 0) {
        setIsExpired(true);
        setTimeRemaining('00:00:00');
        setProgress(100);
        onExpire?.();
        return;
      }

      // Calculate time remaining
      const seconds = Math.floor(diff / 1000);
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;

      const formatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      setTimeRemaining(formatted);

      // Calculate progress
      const total = expiry.getTime() - granted.getTime();
      const elapsed = now.getTime() - granted.getTime();
      const progressPercent = (elapsed / total) * 100;
      setProgress(Math.min(100, Math.max(0, progressPercent)));

      // Set warning level
      const hoursRemaining = diff / (1000 * 60 * 60);
      if (hoursRemaining <= 1) {
        setWarningLevel('critical');
      } else if (hoursRemaining <= 4) {
        setWarningLevel('warning');
      } else {
        setWarningLevel('safe');
      }
    };

    // Initial update
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [demo, onExpire]);

  if (isExpired) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Demo Expired
        </Badge>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Clock className={`h-4 w-4 ${
          warningLevel === 'critical' ? 'text-red-600' :
          warningLevel === 'warning' ? 'text-yellow-600' :
          'text-green-600'
        }`} />
        <span className={`font-mono font-semibold ${
          warningLevel === 'critical' ? 'text-red-600' :
          warningLevel === 'warning' ? 'text-yellow-600' :
          'text-green-600'
        }`}>
          {timeRemaining}
        </span>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className={`h-4 w-4 ${
            warningLevel === 'critical' ? 'text-red-600' :
            warningLevel === 'warning' ? 'text-yellow-600' :
            'text-green-600'
          }`} />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Demo Time Remaining
          </span>
        </div>
        <span className={`font-mono text-lg font-bold ${
          warningLevel === 'critical' ? 'text-red-600' :
          warningLevel === 'warning' ? 'text-yellow-600' :
          'text-green-600'
        }`}>
          {timeRemaining}
        </span>
      </div>
      
      {showProgress && (
        <div className="space-y-1">
          <Progress 
            value={progress} 
            className={`h-2 ${
              warningLevel === 'critical' ? 'bg-red-100' :
              warningLevel === 'warning' ? 'bg-yellow-100' :
              'bg-green-100'
            }`}
          />
          {warningLevel === 'critical' && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Less than 1 hour remaining!
            </p>
          )}
          {warningLevel === 'warning' && (
            <p className="text-xs text-yellow-600">
              Demo expires soon. Subscribe to continue.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
