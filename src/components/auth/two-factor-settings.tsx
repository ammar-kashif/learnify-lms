'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  ShieldCheck, 
  ShieldX, 
  Settings,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import TwoFactorSetup from './two-factor-setup';
import { useAuth } from '@/contexts/auth-context';

interface TwoFactorSettingsProps {
  onClose: () => void;
}

export default function TwoFactorSettings({ onClose }: TwoFactorSettingsProps) {
  const { session } = useAuth();
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);

  // Check 2FA status
  const check2FAStatus = async () => {
    if (!session?.access_token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/auth/2fa/status', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsEnabled(data.enabled);
      }
    } catch (error) {
      console.error('Error checking 2FA status:', error);
    } finally {
      setLoading(false);
    }
  };

  // Disable 2FA
  const disable2FA = async () => {
    if (!session?.access_token) {
      toast.error('Please sign in to disable 2FA');
      return;
    }

    if (!confirm('Are you sure you want to disable 2FA? This will make your account less secure.')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to disable 2FA');
      }

      setIsEnabled(false);
      toast.success('2FA disabled successfully');
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      toast.error('Failed to disable 2FA');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    check2FAStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading 2FA settings...</span>
      </div>
    );
  }

  if (showSetup) {
    return (
      <TwoFactorSetup
        onComplete={() => {
          setShowSetup(false);
          setIsEnabled(true);
          check2FAStatus();
        }}
        onCancel={() => setShowSetup(false)}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Two-Factor Authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="font-medium">Security Status</h3>
              <p className="text-sm text-gray-600">
                {isEnabled 
                  ? 'Your account is protected with 2FA' 
                  : 'Your account is not protected with 2FA'
                }
              </p>
            </div>
            <Badge variant={isEnabled ? 'default' : 'destructive'}>
              {isEnabled ? (
                <>
                  <ShieldCheck className="h-3 w-3 mr-1" />
                  Enabled
                </>
              ) : (
                <>
                  <ShieldX className="h-3 w-3 mr-1" />
                  Disabled
                </>
              )}
            </Badge>
          </div>

          {isEnabled ? (
            <Alert>
              <ShieldCheck className="h-4 w-4" />
              <AlertDescription>
                Two-factor authentication is enabled. Your account is protected with an additional layer of security.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <ShieldX className="h-4 w-4" />
              <AlertDescription>
                Two-factor authentication is not enabled. We recommend enabling it to protect your account.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            {!isEnabled ? (
              <Button onClick={() => setShowSetup(true)}>
                <Shield className="h-4 w-4 mr-2" />
                Enable 2FA
              </Button>
            ) : (
              <Button 
                variant="destructive" 
                onClick={disable2FA}
                disabled={loading}
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ShieldX className="h-4 w-4 mr-2" />
                )}
                Disable 2FA
              </Button>
            )}
            
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </CardContent>
      </Card>

      {isEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Additional Options
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-600">
              <p>• Use an authenticator app like Google Authenticator or Authy</p>
              <p>• Keep your backup codes in a safe place</p>
              <p>• Contact support if you lose access to your authenticator</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
