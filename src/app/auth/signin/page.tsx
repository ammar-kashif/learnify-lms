'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock, ArrowLeft } from 'lucide-react';
import TwoFactorVerify from '@/components/auth/two-factor-verify';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'login' | '2fa' | 'backup'>('login');
  const [backupCode, setBackupCode] = useState('');
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupError, setBackupError] = useState('');

  const { signIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error.message);
      } else {
        // Always fetch a fresh session/token after sign-in
        const { data } = await supabase.auth.getSession();
        const freshToken = data.session?.access_token;

        // Check 2FA status; if the check fails for any reason, default to requiring 2FA
        const res = freshToken ? await fetch('/api/auth/2fa/status', {
          headers: { 'Authorization': `Bearer ${freshToken}` }
        }).catch(() => null) : null;

        let has2FA = true; // secure default
        if (res && res.ok) {
          try {
            const json = await res.json();
            has2FA = !!json.enabled;
          } catch (_) {
            has2FA = true;
          }
        }

        if (has2FA) {
          setStep('2fa');
        } else {
          router.push('/dashboard');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handle2FASuccess = () => {
    router.push('/dashboard');
  };

  // backup code flow removed

  const handleBackToLogin = () => {
    setStep('login');
    setError('');
  };

  // backup code flow removed

  // Render 2FA verification step
  if (step === '2fa') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 via-white to-primary-50 p-4 dark:from-gray-900 dark:via-gray-950 dark:to-black">
        <TwoFactorVerify
          onSuccess={handle2FASuccess}
          onBack={handleBackToLogin}
          onUseBackupCode={() => {
            setBackupCode('');
            setBackupError('');
            setStep('backup');
          }}
        />
      </div>
    );
  }

  // Backup code verification step
  if (step === 'backup') {
    const submitBackup = async (e: React.FormEvent) => {
      e.preventDefault();
      setBackupError('');
      if (!backupCode || backupCode.trim().length < 8) {
        setBackupError('Enter a valid backup code');
        return;
      }
      try {
        setBackupLoading(true);
        // Ensure fresh token
        const { data } = await supabase.auth.getSession();
        const freshToken = data.session?.access_token;
        if (!freshToken) {
          setBackupError('You need to sign in again');
          return;
        }
        const res = await fetch('/api/auth/2fa/backup-verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${freshToken}`,
          },
          body: JSON.stringify({ code: backupCode.trim() })
        }).catch(() => null);

        if (!res || !res.ok) {
          let msg = 'Backup code verification failed';
          try { 
            msg = (await res!.json()).error || msg; 
          } catch (parseError) {
            console.error('Error parsing backup response:', parseError);
          }
          setBackupError(msg);
          return;
        }

        router.push('/dashboard');
      } finally {
        setBackupLoading(false);
      }
    };

    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 via-white to-primary-50 p-4 dark:from-gray-900 dark:via-gray-950 dark:to-black">
        <div className="w-full max-w-md">
          <Card className="border-charcoal-200 shadow-lg dark:border-gray-800 dark:bg-gray-900">
            <CardHeader className="text-center">
              <CardTitle className="text-xl text-charcoal-900 dark:text-gray-100">Use a backup code</CardTitle>
              <CardDescription className="text-charcoal-600 dark:text-gray-300">Enter one of your unused backup codes</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitBackup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="backup">Backup Code</Label>
                  <Input
                    id="backup"
                    type="text"
                    value={backupCode}
                    onChange={(e) => { setBackupCode(e.target.value.toUpperCase()); setBackupError(''); }}
                    placeholder="XXXXXXXX"
                    className="text-center tracking-widest font-mono"
                    autoComplete="one-time-code"
                  />
                  {backupError && (
                    <p className="text-sm text-red-600">{backupError}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1" disabled={backupLoading || backupCode.trim().length < 8}>
                    {backupLoading ? 'Verifying…' : 'Verify'}
                  </Button>
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setStep('2fa')}>
                    Back to 2FA
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 via-white to-primary-50 p-4 dark:from-gray-900 dark:via-gray-950 dark:to-black">
      <div className="w-full max-w-md">
        {/* Back to home link */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center text-charcoal-600 transition-colors hover:text-charcoal-800 dark:text-gray-300 dark:hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </div>

        {/* Logo and title */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex items-center justify-center">
            <img
              src="/images/Logo.PNG"
              alt="Learnify Logo"
              className="h-12 w-12"
            />
          </div>
          <h1 className="text-2xl font-bold text-charcoal-900 dark:text-gray-100">
            Welcome back
          </h1>
          <p className="mt-2 text-charcoal-600 dark:text-gray-300">
            Sign in to your Learnify account
          </p>
        </div>

        <Card className="border-charcoal-200 shadow-lg dark:border-gray-800 dark:bg-gray-900">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-charcoal-900 dark:text-gray-100">
              Sign In
            </CardTitle>
            <CardDescription className="text-charcoal-600 dark:text-gray-300">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/30">
                  <p className="text-sm text-red-600 dark:text-red-300">
                    {error}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-charcoal-700 dark:text-gray-200"
                >
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-charcoal-400 dark:text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="border-charcoal-300 bg-white pl-10 text-gray-900 placeholder:text-gray-500 focus:border-primary focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-400"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-charcoal-700 dark:text-gray-200"
                >
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-charcoal-400 dark:text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="border-charcoal-300 bg-white pl-10 pr-10 text-gray-900 placeholder:text-gray-500 focus:border-primary focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-400"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 text-charcoal-400 hover:text-charcoal-600 dark:text-gray-400 dark:hover:text-gray-200"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <input
                    id="remember"
                    type="checkbox"
                    className="rounded border-charcoal-300 text-primary focus:ring-primary dark:border-gray-700"
                  />
                  <Label
                    htmlFor="remember"
                    className="text-sm text-charcoal-600 dark:text-gray-300"
                  >
                    Remember me
                  </Label>
                </div>
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-primary transition-colors hover:text-primary-600"
                >
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                className="h-11 w-full bg-primary text-white hover:bg-primary-600"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-charcoal-600 dark:text-gray-300">
                Don&apos;t have an account?{' '}
                <Link
                  href="/auth/signup"
                  className="font-medium text-primary transition-colors hover:text-primary-600"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
