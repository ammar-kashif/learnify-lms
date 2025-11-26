'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { Lock, ArrowLeft } from 'lucide-react';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Supabase sends access_token and type=recovery in URL; we just need to allow update
  useEffect(() => {
    // No-op; presence of params indicates user arrived via recovery link
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateErr } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateErr) {
        setError(updateErr.message);
      } else {
        setSuccess('Password updated successfully. Redirecting to sign in...');
        setTimeout(() => router.push('/auth/signin'), 1500);
      }
    } catch (e) {
      setError('Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 via-white to-primary-50 dark:from-gray-900 dark:via-gray-950 dark:to-black p-4">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>

        <Card className="border-charcoal-200 dark:border-gray-700 shadow-lg bg-white dark:bg-gray-800">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-charcoal-900 dark:text-white">Set a new password</CardTitle>
            <CardDescription className="text-charcoal-600 dark:text-gray-300">
              Enter and confirm your new password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 p-3">
                  <p className="text-sm text-red-600 dark:text-red-200">{error}</p>
                </div>
              )}
              {success && (
                <div className="rounded-md border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/30 p-3">
                  <p className="text-sm text-green-600 dark:text-green-200">{success}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password" className="text-charcoal-700 dark:text-gray-300">New password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-charcoal-400 dark:text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="border-charcoal-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white pl-10 focus:border-primary focus:ring-primary"
                    required
                    minLength={8}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm" className="text-charcoal-700 dark:text-gray-300">Confirm password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-charcoal-400 dark:text-gray-400" />
                  <Input
                    id="confirm"
                    type="password"
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="border-charcoal-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white pl-10 focus:border-primary focus:ring-primary"
                    required
                    minLength={8}
                  />
                </div>
              </div>

              <Button type="submit" className="h-11 w-full bg-primary text-white hover:bg-primary-600" disabled={loading}>
                {loading ? 'Updating...' : 'Update Password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}



