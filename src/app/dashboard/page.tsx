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
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const { user, userRole, loading } = useAuth();
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

  // Show loading state while auth is loading or checking
  if (loading || !mounted || (!authChecked && !user)) {
    return (
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

  // Render dashboard based on user role
  return (
    <DashboardLayout>
      {userRole === 'teacher' ? (
        <TeacherDashboard />
      ) : (
        <StudentDashboard />
      )}
    </DashboardLayout>
  );
}
