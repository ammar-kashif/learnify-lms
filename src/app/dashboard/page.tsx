'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/dashboard/dashboard-layout';
import TeacherDashboard from '@/components/dashboard/teacher-dashboard';
import StudentDashboard from '@/components/dashboard/student-dashboard';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const { user, userRole, roleStatus, loading, refreshRole } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const redirectAttempted = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Double-check session directly from Supabase before redirecting
  useEffect(() => {
    const checkAuth = async () => {
      if (!loading && !user && !redirectAttempted.current) {
        // Before redirecting, double-check with Supabase directly
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          // Only redirect if Supabase also confirms no session
          redirectAttempted.current = true;
      router.replace('/');
    }
        // If session exists, the auth context will catch up
      }
      setAuthChecked(true);
    };
    
    if (mounted) {
      checkAuth();
    }
  }, [loading, user, router, mounted]);

  // Redirect superadmin to admin panel
  useEffect(() => {
    if (userRole === 'superadmin' || userRole === 'admin') {
      router.replace('/admin');
    }
  }, [userRole, router]);

  const loadingScreen = (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-96">
        <CardHeader>
          <CardTitle className="text-center">Loading Dashboard</CardTitle>
          <CardDescription className="text-center">
            Please wait while we load your dashboard...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    </div>
  );

  // Show loading state while auth is loading or checking
  if (loading || !mounted || (!authChecked && !user)) {
    return loadingScreen;
  }

  // Redirect to signin if not authenticated (after auth check completed)
  if (!user && authChecked) {
    // Don't render anything to prevent flash
    return null;
  }

  // Don't render anything for admin/superadmin to prevent flash
  if (userRole === 'superadmin' || userRole === 'admin') {
    return null;
  }

  // The role lookup is still in flight. Waiting is the only correct thing to
  // do here: picking a dashboard now means guessing.
  if (roleStatus === 'loading') {
    return loadingScreen;
  }

  // The lookup failed. userRole may hold a stale value from earlier in the
  // session, so it is not safe to render a role-specific dashboard from it.
  if (roleStatus === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">
              Could not load your dashboard
            </CardTitle>
            <CardDescription className="text-center">
              We could not confirm your account details. Check your connection
              and try again.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => refreshRole()}>Try again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Role is known but is not one we have a dashboard for — an account with no
  // profile row, which a superadmin has to set up.
  if (userRole !== 'teacher' && userRole !== 'student') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Account not set up</CardTitle>
            <CardDescription className="text-center">
              Your account does not have a role assigned yet, so there is no
              dashboard to show. Please contact support to finish setting it up.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Render dashboard based on user role
  return (
    <DashboardLayout>
      {userRole === 'teacher' ? <TeacherDashboard /> : <StudentDashboard />}
    </DashboardLayout>
  );
}
