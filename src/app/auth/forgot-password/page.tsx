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

import Link from 'next/link';
import { Mail, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const { error } = await resetPassword(email);
      if (error) {
        setError(error.message);
      } else {
        setSuccess('Password reset email sent! Please check your inbox.');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 via-white to-primary-50 p-4">
      <div className="w-full max-w-md">
        {/* Back to home link */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center text-charcoal-600 transition-colors hover:text-charcoal-800"
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
          <h1 className="text-2xl font-bold text-charcoal-900">
            Reset your password
          </h1>
          <p className="mt-2 text-charcoal-600">
            Enter your email to receive a reset link
          </p>
        </div>

        <Card className="border-charcoal-200 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-charcoal-900">
              Forgot Password
            </CardTitle>
            <CardDescription className="text-charcoal-600">
                              We&apos;ll send you a link to reset your password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {success && (
                <div className="rounded-md border border-green-200 bg-green-50 p-3">
                  <p className="text-sm text-green-600">{success}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-charcoal-700">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-charcoal-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="border-charcoal-300 pl-10 focus:border-primary focus:ring-primary"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="h-11 w-full bg-primary text-white hover:bg-primary-600"
                disabled={isLoading}
              >
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-charcoal-600">
                Remember your password?{' '}
                <Link
                  href="/auth/signin"
                  className="font-medium text-primary transition-colors hover:text-primary-600"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
