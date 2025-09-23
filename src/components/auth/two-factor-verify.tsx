'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, RefreshCw, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';

interface TwoFactorVerifyProps {
  onSuccess: () => void;
  onBack: () => void;
  onUseBackupCode?: () => void;
}

export default function TwoFactorVerify({ onSuccess, onBack, onUseBackupCode }: TwoFactorVerifyProps) {
  const { session } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session?.access_token) {
      setError('Please sign in to verify 2FA');
      return;
    }
    
    if (!code || code.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Verification failed');
      }

      toast.success('2FA verification successful!');
      onSuccess();
    } catch (error: any) {
      console.error('2FA verification error:', error);
      setError(error.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleBackupCode = () => {
    setCode('');
    setError('');
    onUseBackupCode?.();
  };

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Two-Factor Authentication
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Please enter the 6-digit code from your authenticator app to continue.
            </AlertDescription>
          </Alert>

          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <Label>Verification Code</Label>
              <Input
                type="text"
                value={code}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setCode(value);
                  setError('');
                }}
                placeholder="000000"
                className="text-center text-2xl font-mono tracking-widest"
                maxLength={6}
                autoComplete="one-time-code"
                // autoFocus
              />
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
            </div>

            <div className="space-y-2">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || code.length !== 6}
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    Verifying...
                  </>
                ) : (
                  'Verify Code'
                )}
              </Button>

              <div className="flex gap-2">
                {onUseBackupCode && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleBackupCode}
                    className="flex-1"
                  >
                    Use Backup Code
                  </Button>
                )}
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onBack}
                  className="flex-1"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
