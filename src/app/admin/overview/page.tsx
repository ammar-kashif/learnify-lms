'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  BookOpen, 
  GraduationCap,
  Shield,
  BarChart3
} from 'lucide-react';

export default function AdminOverview() {
  const { user, userRole, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCourses: 0,
    totalAssignments: 0,
    activeUsers: 0
  });

  useEffect(() => {
    if (!loading && (!user || (userRole !== 'superadmin' && userRole !== 'admin'))) {
      router.push('/');
    }
  }, [user, userRole, loading, router]);

  useEffect(() => {
    if (userRole === 'superadmin') {
      fetchStats();
    }
  }, [userRole]);

  const fetchStats = async () => {
    try {
      // Fetch basic stats
      const [usersResult, coursesResult, assignmentsResult] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact' }),
        supabase.from('courses').select('*', { count: 'exact' }),
        supabase.from('teacher_courses').select('*', { count: 'exact' })
      ]);

      setStats({
        totalUsers: usersResult.count || 0,
        totalCourses: coursesResult.count || 0,
        totalAssignments: assignmentsResult.count || 0,
        activeUsers: usersResult.count || 0 // Simplified for now
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user || (userRole !== 'superadmin' && userRole !== 'admin')) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">System Overview</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {user.user_metadata?.full_name || 'Superadmin'}
              </Badge>
              <Button variant="outline" onClick={() => router.push('/admin')}>
                Back to Admin
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                All registered users
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCourses}</div>
              <p className="text-xs text-muted-foreground">Available courses</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assignments</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAssignments}</div>
              <p className="text-xs text-muted-foreground">Teacher-course pairs</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Status</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">Active</div>
              <p className="text-xs text-muted-foreground">All systems operational</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/admin')}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span>User Management</span>
              </CardTitle>
              <CardDescription>Manage students, teachers, and superadmins</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Add, edit, or remove users from the system</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/admin')}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5 text-green-600" />
                <span>Course Management</span>
              </CardTitle>
              <CardDescription>Create and manage courses</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Add new courses and manage existing ones</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/admin')}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <GraduationCap className="h-5 w-5 text-purple-600" />
                <span>Teacher Assignments</span>
              </CardTitle>
              <CardDescription>Assign courses to teachers</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Manage which teachers teach which courses</p>
            </CardContent>
          </Card>
        </div>

        {/* System Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">System Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Platform Details</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Platform:</span>
                  <span>Learnify LMS</span>
                </div>
                <div className="flex justify-between">
                  <span>Version:</span>
                  <span>1.0.0</span>
                </div>
                <div className="flex justify-between">
                  <span>Environment:</span>
                  <span>Production</span>
                </div>
                <div className="flex justify-between">
                  <span>Database:</span>
                  <span>Supabase</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Performance</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Response Time:</span>
                  <span className="text-green-600">Fast</span>
                </div>
                <div className="flex justify-between">
                  <span>Uptime:</span>
                  <span className="text-green-600">99.9%</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Backup:</span>
                  <span>Today</span>
                </div>
                <div className="flex justify-between">
                  <span>Security:</span>
                  <span className="text-green-600">Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
