'use client';

import { useState, useEffect } from 'react';
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
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  ArrowLeft,
  Phone,
} from 'lucide-react';

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { signUp } = useAuth();
  const router = useRouter();

  // Check for stored course data on component mount
  useEffect(() => {
    const checkStoredCourse = () => {
      const demoCourse = localStorage.getItem('selectedCourseForDemo');
      const subscriptionCourse = localStorage.getItem('selectedCourseForSubscription');
      
      if (demoCourse || subscriptionCourse) {
        console.log('📚 Found stored course data:', { demoCourse, subscriptionCourse });
      }
    };

    checkStoredCourse();
  }, []);

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

    // Validate phone number format (E.164 international format)
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(formData.phoneNumber)) {
      setError('Phone number must be in international format (e.g., +1234567890)');
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await signUp(
        formData.email,
        formData.password,
        formData.fullName,
        formData.phoneNumber
      );

      if (error) {
        setError(error.message);
      } else {
        // Check for stored course data and redirect accordingly
        const demoCourse = localStorage.getItem('selectedCourseForDemo');
        const subscriptionCourse = localStorage.getItem('selectedCourseForSubscription');
        
        if (demoCourse) {
          // Clear the stored course data
          localStorage.removeItem('selectedCourseForDemo');
          
          // Get the selected demo type
          const selectedDemoType = localStorage.getItem('selectedDemoType');
          localStorage.removeItem('selectedDemoType');
          
          // Parse the course data
          const course = JSON.parse(demoCourse);
          console.log('🎯 Redirecting to course page for demo:', course, 'type:', selectedDemoType);
          
          // If there's a demo type, create the demo access immediately after signup
          if (selectedDemoType) {
            console.log('🔐 Creating demo access immediately after signup...');
            // Wait a bit for session to be established after signup
            await new Promise(resolve => setTimeout(resolve, 500));
            
            try {
              // Try to get session with retries
              let session = null;
              for (let i = 0; i < 3; i++) {
                const { data } = await supabase.auth.getSession();
                if (data?.session?.access_token) {
                  session = data.session;
                  break;
                }
                await new Promise(resolve => setTimeout(resolve, 300));
              }
              
              if (session?.access_token) {
                console.log('✅ Session found, creating demo access...');
                const response = await fetch('/api/demo-access', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                  },
                  body: JSON.stringify({
                    courseId: course.id,
                    accessType: selectedDemoType
                  }),
                });

                const responseData = await response.json();
                console.log('📡 Demo access API response:', { status: response.status, data: responseData });

                if (response.ok) {
                  console.log('✅ Demo access created successfully during signup');
                } else {
                  console.error('❌ Failed to create demo access during signup:', responseData);
                  // Store for fallback
                  localStorage.setItem('pendingDemoType', selectedDemoType);
                }
              } else {
                console.error('❌ No session found during signup, storing for fallback');
                // Store for fallback
                localStorage.setItem('pendingDemoType', selectedDemoType);
              }
            } catch (error) {
              console.error('❌ Error creating demo access during signup:', error);
              // Store for fallback
              localStorage.setItem('pendingDemoType', selectedDemoType);
            }
          }
          
          router.push(`/courses/${course.id}`);
        } else if (subscriptionCourse) {
          // Clear the stored course data
          localStorage.removeItem('selectedCourseForSubscription');
          
          // Check if there's a selected subscription plan
          const selectedPlan = localStorage.getItem('selectedSubscriptionPlan');
          if (selectedPlan) {
            // Clear the stored plan data
            localStorage.removeItem('selectedSubscriptionPlan');
            
            // Parse the plan data and redirect to dashboard with plan info
            const plan = JSON.parse(selectedPlan);
            console.log('🎯 Redirecting to dashboard with selected plan:', plan);
            // Store plan info for the dashboard to use
            localStorage.setItem('pendingSubscriptionPlan', JSON.stringify(plan));
          }
          
          // Redirect to dashboard for normal subscription flow
          console.log('🎯 Redirecting to dashboard for subscription');
          router.push('/dashboard');
        } else {
          // Default redirect to dashboard
          router.push('/dashboard');
        }
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
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
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
                <Label htmlFor="phoneNumber" className="text-charcoal-700 dark:text-gray-300">
                  Phone Number
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-charcoal-400 dark:text-gray-400" />
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="+1234567890"
                    value={formData.phoneNumber}
                    onChange={e => handleInputChange('phoneNumber', e.target.value)}
                    className="border-charcoal-300 dark:border-gray-600 pl-10 focus:border-primary focus:ring-primary bg-white dark:bg-gray-800 text-charcoal-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-400"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Enter phone number in international format (e.g., +1234567890)
                </p>
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
