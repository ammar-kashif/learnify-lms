'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  BookOpen,
  Eye,
  MoreHorizontal,
  Loader2,
  ArrowLeft,
  LayoutDashboard,
  Users,
  Settings,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import ThemeToggle from '@/components/theme-toggle';
import Avatar from '@/components/ui/avatar';

interface Course {
  id: string;
  title: string;
  description: string;
  subject: string;
  created_at: string;
  updated_at: string;
  current_students: number;
  price: number;
}

export default function TeacherCoursesPage() {
  const { user, userProfile, signOut } = useAuth();
  const [teacherCourses, setTeacherCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Navigation items based on user role
  const getNavigationItems = (userRole: string) => {
    const baseItems = [
      {
        title: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
      },
      {
        title: 'Settings',
        href: '/dashboard/settings',
        icon: Settings,
      },
    ];

    // Add teacher-specific items
    if (userRole === 'teacher' || userRole === 'superadmin') {
      baseItems.splice(1, 0, 
        {
          title: 'My Courses',
          href: '/dashboard/courses',
          icon: BookOpen,
        },
        {
          title: 'Students',
          href: '/dashboard/students',
          icon: Users,
        }
      );
    }

    return baseItems;
  };

  const navigationItems = getNavigationItems(user?.role || 'student');

  // Fetch teacher's assigned courses
  useEffect(() => {
    const fetchTeacherCourses = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        const response = await fetch(`/api/teacher/courses?teacherId=${user.id}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch courses');
        }

        const data = await response.json();
        setTeacherCourses(data.courses || []);
      } catch (err) {
        console.error('Error fetching teacher courses:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch courses');
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherCourses();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-gray-400 dark:text-gray-500" />
          <p className="text-gray-600 dark:text-gray-300">Loading courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && setSidebarOpen(false)}
          role="button"
          tabIndex={0}
        />
      )}

      {/* Left Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex h-full flex-col">
          {/* Sidebar Header */}
          <div className="flex h-16 items-center justify-between px-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">Learnify</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.href === '/dashboard/courses';
              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary border-r-2 border-primary'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.title}</span>
                </Link>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center space-x-3 mb-4">
              <Avatar
                src={userProfile?.avatar_url}
                name={userProfile?.full_name || user?.email || 'Teacher'}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {userProfile?.full_name || user?.email || 'Teacher'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                  {userProfile?.role || 'Teacher'}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className="text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="flex h-16 items-center justify-between px-6">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <Link href="/dashboard">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Page Header */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    My Courses
                  </h1>
                  <p className="text-gray-600 dark:text-gray-300 mt-1">
                    Manage and monitor your assigned courses
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge variant="secondary" className="bg-primary/10 text-primary px-3 py-1">
                    {teacherCourses.length} Course{teacherCourses.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Courses Grid */}
            {error ? (
              <Card className="border-red-200 dark:border-red-800">
                <CardContent className="p-6 text-center">
                  <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Error loading courses
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
                  <Button 
                    onClick={() => window.location.reload()}
                    className="bg-primary text-white hover:bg-primary-600"
                  >
                    Try Again
                  </Button>
                </CardContent>
              </Card>
            ) : teacherCourses.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {teacherCourses.map((course) => (
                  <Card 
                    key={course.id} 
                    className="group hover:shadow-lg transition-all duration-200 border-gray-200 dark:border-gray-700 hover:border-primary/20 dark:hover:border-primary/30"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <Badge variant="secondary" className="bg-primary/10 text-primary mb-2">
                            {course.subject}
                          </Badge>
                          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                            {course.title}
                          </CardTitle>
                        </div>
                        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <CardDescription className="text-gray-600 dark:text-gray-300 line-clamp-3">
                        {course.description}
                      </CardDescription>
                      
                      <Separator className="bg-gray-200 dark:bg-gray-700" />
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-300">
                          <div className="flex items-center space-x-1">
                            <Users className="h-4 w-4" />
                            <span>{course.current_students} students</span>
                          </div>
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Created {new Date(course.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Link href={`/dashboard/courses/${course.id}`} className="flex-1">
                          <Button className="w-full bg-primary text-white hover:bg-primary-600 group">
                            <Eye className="mr-2 h-4 w-4" />
                            View Course
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-gray-200 dark:border-gray-700">
                <CardContent className="p-12 text-center">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No courses assigned
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-6">
                    You haven&apos;t been assigned to any courses yet. Contact your administrator to get started.
                  </p>
                  <Button 
                    onClick={() => window.location.reload()}
                    variant="outline"
                    className="border-primary text-primary hover:bg-primary/10"
                  >
                    Refresh
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}