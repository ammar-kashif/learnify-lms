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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  ArrowLeft,
  BookOpen,
} from 'lucide-react';

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student' as 'student' | 'teacher',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { signUp } = useAuth();
  const router = useRouter();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await signUp(
        formData.email,
        formData.password,
        formData.fullName,
        formData.role
      );

      if (error) {
        setError(error.message);
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 via-white to-primary-50 dark:from-gray-900 dark:via-gray-950 dark:to-black p-4">
      <div className="w-full max-w-md">
        {/* Back to home link */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center text-charcoal-600 dark:text-gray-300 transition-colors hover:text-charcoal-800 dark:hover:text-white"
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
          <h1 className="text-2xl font-bold text-charcoal-900 dark:text-white">
            Create your account
          </h1>
          <p className="mt-2 text-charcoal-600 dark:text-gray-400">
            Join Learnify and start your learning journey
          </p>
        </div>

        <Card className="border-charcoal-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-charcoal-900 dark:text-white">Sign Up</CardTitle>
            <CardDescription className="text-charcoal-600 dark:text-gray-400">
              Fill in your details to create your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 p-3">
                  <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-charcoal-700 dark:text-gray-300">
                  Full Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-charcoal-400 dark:text-gray-400" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Enter your full name"
                    value={formData.fullName}
                    onChange={e =>
                      handleInputChange('fullName', e.target.value)
                    }
                    className="border-charcoal-300 dark:border-gray-600 pl-10 focus:border-primary focus:ring-primary bg-white dark:bg-gray-800 text-charcoal-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-400"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-charcoal-700 dark:text-gray-300">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-charcoal-400 dark:text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={e => handleInputChange('email', e.target.value)}
                    className="border-charcoal-300 dark:border-gray-600 pl-10 focus:border-primary focus:ring-primary bg-white dark:bg-gray-800 text-charcoal-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-400"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="text-charcoal-700 dark:text-gray-300">
                  Role
                </Label>
                <div className="relative">
                  <BookOpen className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-charcoal-400 dark:text-gray-400" />
                  <Select
                    value={formData.role}
                    onValueChange={(value: 'student' | 'teacher') =>
                      handleInputChange('role', value)
                    }
                  >
                    <SelectTrigger className="border-charcoal-300 dark:border-gray-600 bg-white dark:bg-gray-800 pl-10 transition-colors hover:border-charcoal-400 dark:hover:border-gray-500 hover:bg-charcoal-50 dark:hover:bg-gray-700 focus:border-primary focus:ring-primary text-charcoal-900 dark:text-gray-100">
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent className="border-charcoal-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-charcoal-900 dark:text-gray-100">
                      <SelectItem
                        value="student"
                        className="cursor-pointer text-charcoal-900 dark:text-gray-100 transition-colors hover:bg-primary/10 dark:hover:bg-primary/20 hover:text-primary"
                      >
                        Student
                      </SelectItem>
                      <SelectItem
                        value="teacher"
                        className="cursor-pointer text-charcoal-900 dark:text-gray-100 transition-colors hover:bg-primary/10 dark:hover:bg-primary/20 hover:text-primary"
                      >
                        Teacher
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-charcoal-700 dark:text-gray-300">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-charcoal-400 dark:text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a password"
                    value={formData.password}
                    onChange={e =>
                      handleInputChange('password', e.target.value)
                    }
                    className="border-charcoal-300 dark:border-gray-600 pl-10 pr-10 focus:border-primary focus:ring-primary bg-white dark:bg-gray-800 text-charcoal-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-400"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 text-charcoal-400 dark:text-gray-400 hover:text-charcoal-600 dark:hover:text-gray-200"
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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-charcoal-700 dark:text-gray-300">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-charcoal-400 dark:text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={e =>
                      handleInputChange('confirmPassword', e.target.value)
                    }
                    className="border-charcoal-300 dark:border-gray-600 pl-10 pr-10 focus:border-primary focus:ring-primary bg-white dark:bg-gray-800 text-charcoal-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-400"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 text-charcoal-400 dark:text-gray-400 hover:text-charcoal-600 dark:hover:text-gray-200"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="h-11 w-full bg-primary text-white hover:bg-primary-600"
                disabled={isLoading}
              >
                {isLoading ? 'Creating account...' : 'Create Account'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-charcoal-600 dark:text-gray-400">
                Already have an account?{' '}
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
