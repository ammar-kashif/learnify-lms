'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Play, 
  Video, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Star,
  Lock
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';
import { setGuestDemo } from '@/lib/guest-demo';

interface DemoAccessRequestProps {
  courseId: string;
  courseTitle: string;
  onAccessGranted?: () => void;
}

type AccessType = 'lecture_recording' | 'live_class';

export default function DemoAccessRequest({ 
  courseId, 
  courseTitle,
  onAccessGranted 
}: DemoAccessRequestProps) {
  const { user, session } = useAuth();
  const [selectedAccessType, setSelectedAccessType] = useState<AccessType | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [hasUsedDemo, setHasUsedDemo] = useState(false);
  const [currentAccess, setCurrentAccess] = useState<any>(null);

  const accessTypes = [
    {
      type: 'lecture_recording' as AccessType,
      title: 'Watch a Lecture Recording',
      description: 'Get 24-hour access to any lecture recording in this course',
      icon: Play,
      color: 'bg-blue-500',
      features: ['24-hour access', 'Any recording', 'Full video quality']
    },
    {
      type: 'live_class' as AccessType,
      title: 'Join a Live Class',
      description: 'Attend one live class session in this course',
      icon: Video,
      color: 'bg-green-500',
      features: ['Real-time interaction', 'Ask questions', 'Interactive learning']
    }
  ];

  const handleRequestDemo = async (accessType: AccessType) => {
    if (!user || !session?.access_token) {
      // For guests: Create guest demo immediately (only for lecture recordings)
      if (accessType === 'lecture_recording') {
        try {
          // We'll set the videoId to empty string for now
          // It will be determined by the lecture-recordings-list component
          setGuestDemo(courseId, '');
          toast.success('Demo activated! You have 24 hours of access.');
          onAccessGranted?.();
          return;
        } catch (error) {
          console.error('Error creating guest demo:', error);
          toast.error('Failed to activate demo');
          return;
        }
      } else {
        // Live classes require authentication
        localStorage.setItem('selectedCourseForDemo', JSON.stringify({
          id: courseId,
          title: courseTitle
        }));
        localStorage.setItem('selectedDemoType', accessType);
        toast.success('Please sign up to access live classes demo.');
        window.location.href = `/auth/signup?redirect=/courses/${courseId}`;
        return;
      }
    }

    setIsRequesting(true);
    try {
      const response = await fetch('/api/demo-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          courseId,
          accessType
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setCurrentAccess(data.demoAccess);
        setHasUsedDemo(true);
        toast.success('Demo access granted! You now have 24 hours of access.');
        onAccessGranted?.();
      } else {
        if (data.error.includes('already used')) {
          setHasUsedDemo(true);
          toast.error('You have already used your demo access');
        } else {
          toast.error(data.error || 'Failed to grant demo access');
        }
      }
    } catch (error) {
      console.error('Error requesting demo access:', error);
      toast.error('Failed to request demo access');
    } finally {
      setIsRequesting(false);
    }
  };

  const checkCurrentAccess = async () => {
    if (!session?.access_token) return;
    
    try {
      const response = await fetch(`/api/demo-access?courseId=${courseId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      const data = await response.json();
      
      if (data.hasAccess && data.demoAccess.length > 0) {
        setCurrentAccess(data.demoAccess[0]);
        setHasUsedDemo(true);
        // Do not auto-close; let user press Get Demo or continue
      }
    } catch (error) {
      console.error('Error checking current access:', error);
    }
  };

  // Check access on component mount
  useEffect(() => {
    checkCurrentAccess();
  }, [session?.access_token, courseId]);

  if (hasUsedDemo && !currentAccess) {
    return (
      <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <XCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            <div>
              <h3 className="font-semibold text-amber-900 dark:text-amber-100">
                Demo Access Used
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                You have already used your demo access. Subscribe to continue learning!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show the request UI even if access exists; POST handler will succeed quickly

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-amber-500" />
          Try {courseTitle} for Free
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Get a taste of our premium content with our demo access
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertDescription>
            You can choose one demo access option. Once used, you&apos;ll need to subscribe to continue.
          </AlertDescription>
        </Alert>

        <div className="grid gap-3">
          {accessTypes.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.type}
                type="button"
                className={`w-full p-4 rounded-lg border-2 transition-all cursor-pointer text-left ${
                  selectedAccessType === option.type
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setSelectedAccessType(option.type)}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${option.color} text-white`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold">{option.title}</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      {option.description}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {option.features.map((feature, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center">
                    {selectedAccessType === option.type ? (
                      <CheckCircle className="h-5 w-5 text-primary" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <Button
          onClick={() => selectedAccessType && handleRequestDemo(selectedAccessType)}
          disabled={!selectedAccessType || isRequesting}
          className="w-full"
        >
          {isRequesting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Requesting Demo Access...
            </>
          ) : (
            <>
              <Star className="mr-2 h-4 w-4" />
              Get Demo Access
            </>
          )}
        </Button>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Demo access expires in 24 hours
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

