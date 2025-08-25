'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
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

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [loading, user, router]);

  // Redirect superadmin to admin panel
  useEffect(() => {
    if (userRole === 'superadmin') {
      router.replace('/admin');
    }
  }, [userRole, router]);

  // Show loading state while auth is loading
  if (loading || !mounted) {
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

  // Redirect to signin if not authenticated
  if (!user) {
    // Don't render anything to prevent flash
    return null;
  }

  // Don't render anything for superadmin to prevent flash
  if (userRole === 'superadmin') {
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
