'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Play, 
  Video, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Star,
  Lock,
  Mail
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';
import { setGuestDemo, getGuestDemo } from '@/lib/guest-demo';

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
  const [guestEmail, setGuestEmail] = useState('');
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [emailError, setEmailError] = useState('');

  // Check if guest already has an active demo for this course
  useEffect(() => {
    if (!user && !session) {
      const lectureDemo = getGuestDemo(courseId, 'lecture_recording');
      const liveDemo = getGuestDemo(courseId, 'live_class');
      if (lectureDemo || liveDemo) {
        setHasUsedDemo(true);
        setCurrentAccess(lectureDemo || liveDemo);
      }
    }
  }, [user, session, courseId]);

  const accessTypes = [
    {
      type: 'lecture_recording' as AccessType,
      title: 'Watch a Lecture Recording',
      description: 'Get 24-hour access to any lecture recording — no signup needed',
      icon: Play,
      color: 'bg-blue-500',
      features: ['No signup required', '24-hour access', 'Any recording', 'Full video quality']
    },
    {
      type: 'live_class' as AccessType,
      title: 'Join a Live Class',
      description: 'Attend one live class session in this course — no signup needed',
      icon: Video,
      color: 'bg-green-500',
      features: ['No signup required', 'Real-time interaction', 'Ask questions', '24-hour access']
    }
  ];

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleRequestDemo = async (accessType: AccessType) => {
    if (!user || !session?.access_token) {
      // ===== GUEST PATH (no login required) =====
      
      // For lecture recordings: grant immediately (existing behavior)
      if (accessType === 'lecture_recording') {
        if (!showEmailInput) {
          setShowEmailInput(true);
          setSelectedAccessType(accessType);
          return;
        }

        if (!guestEmail || !validateEmail(guestEmail)) {
          setEmailError('Please enter a valid email address');
          return;
        }
        setEmailError('');
        setIsRequesting(true);

        try {
          // Record the lead in the backend
          const res = await fetch('/api/demo-access/guest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: guestEmail,
              courseId,
              accessType: 'lecture_recording',
            }),
          });

          const data = await res.json();

          if (!res.ok) {
            if (data.alreadyUsed) {
              toast.error('This email has already been used for a demo. Please sign up for full access.');
              setEmailError('This email has already used a demo.');
              return;
            }
            throw new Error(data.error || 'Failed to activate demo');
          }

          // Store demo in localStorage
          setGuestDemo(courseId, '', 'lecture_recording', guestEmail);
          toast.success('Demo activated! You have 24 hours of access.');
          // Redirect directly to preview page for lecture recordings
          window.location.href = `/courses/${courseId}/preview`;
        } catch (error) {
          console.error('Error creating guest demo:', error);
          toast.error(error instanceof Error ? error.message : 'Failed to activate demo');
        } finally {
          setIsRequesting(false);
        }
        return;
      }

      // For live classes: also allow without signup — just collect email
      if (accessType === 'live_class') {
        if (!showEmailInput) {
          setShowEmailInput(true);
          setSelectedAccessType(accessType);
          return;
        }

        if (!guestEmail || !validateEmail(guestEmail)) {
          setEmailError('Please enter a valid email address');
          return;
        }
        setEmailError('');
        setIsRequesting(true);

        try {
          // Record the lead in the backend
          const res = await fetch('/api/demo-access/guest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: guestEmail,
              courseId,
              accessType: 'live_class',
            }),
          });

          const data = await res.json();

          if (!res.ok) {
            if (data.alreadyUsed) {
              toast.error('This email has already been used for a demo. Please sign up for full access.');
              setEmailError('This email has already used a demo.');
              return;
            }
            throw new Error(data.error || 'Failed to activate demo');
          }

          // Store demo in localStorage
          setGuestDemo(courseId, '', 'live_class', guestEmail);
          toast.success('Demo activated! You can join one live class within 24 hours.');
          onAccessGranted?.();
        } catch (error) {
          console.error('Error creating guest demo:', error);
          toast.error(error instanceof Error ? error.message : 'Failed to activate demo');
        } finally {
          setIsRequesting(false);
        }
        return;
      }

      return;
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
                onClick={() => {
                  setSelectedAccessType(option.type);
                  // Reset email input state when switching type
                  setShowEmailInput(false);
                  setEmailError('');
                }}
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

        {/* Email input for guest users (no login) */}
        {showEmailInput && !user && !session && (
          <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-4">
            <Label htmlFor="guest-email" className="flex items-center gap-2 text-sm font-medium">
              <Mail className="h-4 w-4 text-primary" />
              Enter your email to get demo access
            </Label>
            <Input
              id="guest-email"
              type="email"
              placeholder="your.email@example.com"
              value={guestEmail}
              onChange={(e) => {
                setGuestEmail(e.target.value);
                if (emailError) setEmailError('');
              }}
              className={emailError ? 'border-red-500' : ''}
            />
            {emailError && (
              <p className="text-xs text-red-500">{emailError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              We&apos;ll use this to send you class details. No account needed!
            </p>
          </div>
        )}

        <Button
          onClick={() => selectedAccessType && handleRequestDemo(selectedAccessType)}
          disabled={!selectedAccessType || isRequesting}
          className="w-full"
        >
          {isRequesting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Activating Demo...
            </>
          ) : showEmailInput && !user && !session ? (
            <>
              <Star className="mr-2 h-4 w-4" />
              Activate Demo Access
            </>
          ) : (
            <>
              <Star className="mr-2 h-4 w-4" />
              {!user && !session ? 'Continue' : 'Get Demo Access'}
            </>
          )}
        </Button>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            {!user && !session
              ? 'No signup required! Demo access expires in 24 hours.'
              : 'Demo access expires in 24 hours'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

