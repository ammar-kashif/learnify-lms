'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  Copy, 
  Eye, 
  EyeOff,
  Download,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';

interface TwoFactorSetupProps {
  onComplete: () => void;
  onCancel: () => void;
}

interface TwoFactorData {
  secret: string;
  qr_code: string;
  backup_codes: string[];
}

export default function TwoFactorSetup({ onComplete, onCancel }: TwoFactorSetupProps) {
  const { session } = useAuth();
  const [step, setStep] = useState<'setup' | 'verify' | 'backup'>('setup');
  const [twoFactorData, setTwoFactorData] = useState<TwoFactorData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  // Initialize 2FA setup
  const initializeTwoFactor = async () => {
    if (!session?.access_token) {
      toast.error('Please sign in to setup 2FA');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to initialize 2FA setup');
      }

      const data = await response.json();
      setTwoFactorData(data);

      // Use server-provided QR code data URL directly
      if (data.qr_code) {
        setQrCodeDataUrl(data.qr_code);
      }
    } catch (error) {
      console.error('Error initializing 2FA:', error);
      toast.error('Failed to initialize 2FA setup');
    } finally {
      setLoading(false);
    }
  };

  // Verify 2FA setup
  const verifyTwoFactor = async () => {
    if (!session?.access_token) {
      toast.error('Please sign in to verify 2FA');
      return;
    }

    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/auth/2fa/verify-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ code: verificationCode }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Verification failed');
      }

      const data = await response.json();
      setTwoFactorData(prev => prev ? { ...prev, ...data } : null);
      setStep('backup');
      toast.success('2FA setup verified successfully!');
    } catch (error: any) {
      console.error('Error verifying 2FA:', error);
      toast.error(error.message || 'Failed to verify 2FA setup');
    } finally {
      setLoading(false);
    }
  };

  // Complete 2FA setup
  const completeSetup = async () => {
    if (!session?.access_token) {
      toast.error('Please sign in to complete 2FA setup');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/auth/2fa/complete-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to complete 2FA setup');
      }

      toast.success('2FA enabled successfully!');
      onComplete();
    } catch (error) {
      console.error('Error completing 2FA setup:', error);
      toast.error('Failed to complete 2FA setup');
    } finally {
      setLoading(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  // Download backup codes
  const downloadBackupCodes = () => {
    if (!twoFactorData?.backup_codes) return;

    const content = `Learnify LMS - Backup Codes\n\n` +
      `Generated: ${new Date().toLocaleString()}\n\n` +
      `IMPORTANT: Store these codes in a safe place. Each code can only be used once.\n\n` +
      twoFactorData.backup_codes.map((code, index) => `${index + 1}. ${code}`).join('\n') +
      `\n\nIf you lose access to your authenticator app, you can use these codes to sign in.`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'learnify-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (step === 'setup') {
      initializeTwoFactor();
    }
  }, [step]);

  if (loading && step === 'setup') {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Setting up 2FA...</span>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Setup Step */}
      {step === 'setup' && twoFactorData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Setup Two-Factor Authentication
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Scan the QR code below with your authenticator app (Google Authenticator, Authy, etc.) 
                or manually enter the secret key.
              </AlertDescription>
            </Alert>

            <div className="text-center space-y-4">
              {/* QR Code */}
              {qrCodeDataUrl && (
                <div className="flex justify-center">
                  <div className="p-4 bg-white rounded-lg border">
                    <img src={qrCodeDataUrl} alt="2FA QR Code" className="w-48 h-48" />
                  </div>
                </div>
              )}

              {/* Secret Key */}
              <div className="space-y-2">
                <Label>Secret Key (if you can&apos;t scan QR code):</Label>
                <div className="flex gap-2">
                  <Input
                    value={twoFactorData.secret}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(twoFactorData.secret, 'Secret key')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Button onClick={() => setStep('verify')} className="w-full">
                I&apos;ve added the account to my authenticator app
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Verification Step */}
      {step === 'verify' && (
        <Card>
          <CardHeader>
            <CardTitle>Verify Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Enter the 6-digit code from your authenticator app to verify the setup.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <Label>Verification Code</Label>
              <Input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="text-center text-2xl font-mono tracking-widest"
                maxLength={6}
              />

              <div className="flex gap-2">
                <Button onClick={verifyTwoFactor} disabled={loading || verificationCode.length !== 6}>
                  {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Verify'}
                </Button>
                <Button variant="outline" onClick={() => setStep('setup')}>
                  Back
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Backup Codes Step */}
      {step === 'backup' && twoFactorData?.backup_codes && (
        <Card>
          <CardHeader>
            <CardTitle>Save Your Backup Codes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> Save these backup codes in a safe place. 
                Each code can only be used once. You can use them to sign in if you lose access to your authenticator app.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {twoFactorData.backup_codes.map((code, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
                    <span className="font-mono text-sm text-gray-900 dark:text-gray-100">{code}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(code, 'Backup code')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button onClick={downloadBackupCodes} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download Codes
                </Button>
                <Button onClick={() => setShowBackupCodes(!showBackupCodes)} variant="outline">
                  {showBackupCodes ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {showBackupCodes ? 'Hide' : 'Show'} Codes
                </Button>
              </div>

              <div className="flex gap-2">
                <Button onClick={completeSetup} disabled={loading}>
                  {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Complete Setup'}
                </Button>
                <Button variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
