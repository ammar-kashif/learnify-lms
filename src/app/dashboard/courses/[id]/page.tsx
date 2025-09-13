'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  BookOpen, 
  Users, 
  ArrowLeft, 
  Plus, 
  FileText, 
  ClipboardList, 
  Settings, 
  Loader2,
  LayoutDashboard,
  Menu,
  X,
  LogOut
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import QuizSection from '@/components/quiz/quiz-section';
import ThemeToggle from '@/components/theme-toggle';

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

export default function CourseDetailPage({ params }: { params: { id: string } }) {
  const { user, signOut } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [quizCount, setQuizCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'quizzes' | 'content' | 'students'>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Navigation items
  const navigationItems = [
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      title: 'My Courses',
      href: '/dashboard/courses',
      icon: BookOpen,
    },
    {
      title: 'Students',
      href: '/dashboard/students',
      icon: Users,
    },
    {
      title: 'Settings',
      href: '/dashboard/settings',
      icon: Settings,
    },
  ];

  // Fetch course details and students
  useEffect(() => {
    const fetchCourseAndStudents = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        
        // Fetch course details
        const courseResponse = await fetch(`/api/teacher/courses?teacherId=${user.id}`);
        if (!courseResponse.ok) {
          throw new Error('Failed to fetch courses');
        }
        const courseData = await courseResponse.json();
        const courseInfo = courseData.courses?.find((c: Course) => c.id === params.id);
        
        if (!courseInfo) {
          throw new Error('Course not found');
        }
        setCourse(courseInfo);

        // Fetch students for this course
        const studentsResponse = await fetch(`/api/teacher/students?teacherId=${user.id}`);
        if (studentsResponse.ok) {
          const studentsData = await studentsResponse.json();
          const courseStudents = studentsData.students?.filter((s: any) => s.course_id === params.id) || [];
          setStudents(courseStudents);
        }

        // Fetch quiz count for this course
        const { data: { session } } = await import('@/lib/supabase').then(m => m.supabase.auth.getSession());
        if (session) {
          const quizResponse = await fetch(`/api/quizzes?courseId=${params.id}&userId=${user.id}`, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            },
          });
          if (quizResponse.ok) {
            const quizData = await quizResponse.json();
            setQuizCount(quizData.quizzes?.length || 0);
          }
        }
      } catch (err) {
        console.error('Error fetching course:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch course');
      } finally {
        setLoading(false);
      }
    };

    fetchCourseAndStudents();
  }, [user?.id, params.id]);


  const tabs = [
    { id: 'overview', label: 'Overview', icon: BookOpen },
    { id: 'quizzes', label: 'Quizzes', icon: ClipboardList },
    { id: 'content', label: 'Content', icon: FileText },
    { id: 'students', label: 'Students', icon: Users },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-gray-400 dark:text-gray-500" />
          <p className="text-gray-600 dark:text-gray-300">Loading course...</p>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <BookOpen className="mx-auto mb-4 h-12 w-12 text-red-400 dark:text-red-500" />
          <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
            Error loading course
          </h3>
          <p className="mb-4 text-gray-600 dark:text-gray-300">{error}</p>
          <Link href="/dashboard/courses">
            <Button className="bg-primary text-white hover:bg-primary-600">
              Back to Courses
            </Button>
          </Link>
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
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user?.email || 'Teacher'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Teacher</p>
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
              <Link href="/dashboard/courses">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Courses
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
            {/* Course Header */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      {course.subject}
                    </Badge>
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    {course.title}
                  </h1>
                  <p className="text-gray-600 dark:text-gray-300 text-lg">
                    {course.description}
                  </p>
                </div>
                <Button className="bg-primary text-white hover:bg-primary-600">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Button>
              </div>
            </div>

            {/* Course Stats */}
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="border-gray-200 dark:border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        Students Enrolled
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {course.current_students}
                      </p>
                    </div>
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-gray-200 dark:border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        Quizzes Created
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {quizCount}
                      </p>
                    </div>
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <ClipboardList className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-gray-200 dark:border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        Content Items
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        0
                      </p>
                    </div>
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs and Content */}
            <Card className="border-gray-200 dark:border-gray-700">
              <CardHeader className="pb-0">
                <div className="flex space-x-1">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <Button
                        key={tab.id}
                        variant={activeTab === tab.id ? 'default' : 'ghost'}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center space-x-2 ${
                          activeTab === tab.id
                            ? 'bg-primary text-white hover:bg-primary-600'
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{tab.label}</span>
                      </Button>
                    );
                  })}
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="p-6">
                {/* Tab Content */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                          Course Information
                        </h3>
                        <div className="space-y-3">
                          <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Title</span>
                            <span className="text-sm text-gray-900 dark:text-white">{course.title}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Subject</span>
                            <span className="text-sm text-gray-900 dark:text-white">{course.subject}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Students</span>
                            <span className="text-sm text-gray-900 dark:text-white">{course.current_students}</span>
                          </div>
                          <div className="flex justify-between py-2">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Created</span>
                            <span className="text-sm text-gray-900 dark:text-white">
                              {new Date(course.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                          Description
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                          {course.description}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'quizzes' && (
                  <QuizSection
                    courseId={params.id}
                    userRole="teacher"
                    userId={user?.id || ''}
                  />
                )}

                {activeTab === 'content' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Course Content
                      </h3>
                      <Button className="bg-primary text-white hover:bg-primary-600">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Content
                      </Button>
                    </div>
                    <div className="py-12 text-center">
                      <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <FileText className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        No content yet
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300 mb-4">
                        Add lessons, videos, and materials to your course.
                      </p>
                    </div>
                  </div>
                )}

                {activeTab === 'students' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Enrolled Students ({students.length})
                      </h3>
                    </div>
                    
                    {students.length > 0 ? (
                      <div className="space-y-3">
                        {students.map((student) => (
                          <div
                            key={student.id}
                            className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <Users className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {student.full_name}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                  {student.email}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                                Enrolled: {new Date(student.enrolled_at).toLocaleDateString()}
                              </p>
                              <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-900/20 dark:text-green-300">
                                {student.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-12 text-center">
                        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                          <Users className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                          No students enrolled
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">
                          Students will appear here once they enroll in your course.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}