'use client';

import { useState, useEffect, useCallback } from 'react';
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
  LogOut,
  Image,
  Video,
  Download,
  Trash2,
  Bug
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import QuizSection from '@/components/quiz/quiz-section';
import ThemeToggle from '@/components/theme-toggle';
import FileUpload from '@/components/ui/file-upload';
import LectureRecordingUpload from '@/components/course/lecture-recording-upload';
import LectureRecordingsList from '@/components/course/lecture-recordings-list';
import EnrollmentStatus from '@/components/course/enrollment-status';
import AssignmentManagement from '@/components/assignments/assignment-management';
import LiveClassesList from '@/components/course/live-classes-list';
import CourseDemoManagement from '@/components/course/course-demo-management';
import { uploadToS3, deleteFromS3, formatFileSize } from '@/lib/s3';
import { getChapters, createChapterFromFile, deleteChapter, type Chapter } from '@/lib/chapters';
import { supabase } from '@/lib/supabase';
import Avatar from '@/components/ui/avatar';
import BugReportForm from '@/components/bug-reports/bug-report-form';

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
  const { user, userProfile, signOut } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [quizCount, setQuizCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'quizzes' | 'content' | 'students' | 'recordings' | 'enrollments' | 'assignments' | 'live-classes' | 'demo-access'>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Content management state
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [contentLoading, setContentLoading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [recordingsRefreshKey, setRecordingsRefreshKey] = useState(0);
  const [showRecordingUploadModal, setShowRecordingUploadModal] = useState(false);

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

  // Fetch course details and students
  useEffect(() => {
    const fetchCourseAndStudents = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        
        if (userProfile?.role === 'student') {
          // Students: fetch course directly by ID
          const { data: courseData, error: courseErr } = await supabase
            .from('courses')
            .select('id,title,description,subject,created_at,updated_at,current_students,price')
            .eq('id', params.id)
            .single();
          if (courseErr || !courseData) {
            throw new Error('Course not found');
          }
          setCourse(courseData as unknown as Course);
        } else {
          // Teachers/Admins: use teacher-scoped APIs
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

          // Fetch students for this course (teacher/admin views)
          const studentsResponse = await fetch(`/api/teacher/students?teacherId=${user.id}`);
          if (studentsResponse.ok) {
            const studentsData = await studentsResponse.json();
            const courseStudents = studentsData.students?.filter((s: any) => s.course_id === params.id) || [];
            setStudents(courseStudents);
          }
        }

        // Fetch quiz count for this course
        const { data: { session } } = await import('@/lib/supabase').then(m => m.supabase.auth.getSession());
        if (session && userProfile?.role !== 'student') {
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
  }, [user?.id, params.id, userProfile?.role]);

  // Fetch chapters from Supabase
  const fetchChapters = useCallback(async () => {
    try {
      setContentLoading(true);
      console.log('Fetching chapters for course:', params.id);
      const chaptersData = await getChapters(params.id);
      console.log('Fetched chapters data:', chaptersData);
      console.log('Number of chapters:', chaptersData.length);
      if (chaptersData.length > 0) {
        console.log('First chapter details:', chaptersData[0]);
      }
      setChapters(chaptersData);
      
    } catch (error) {
      console.error('Error fetching chapters:', error);
    } finally {
      setContentLoading(false);
    }
  }, [params.id]);

  // Fetch chapters when content tab is active
  useEffect(() => {
    if (activeTab === 'content') {
      fetchChapters();
    }
  }, [activeTab, params.id, fetchChapters]);

  // Handle file upload with optimistic UI
  const handleFileUpload = async (files: File[]) => {
    try {
      // Create optimistic chapter entries immediately
      const optimisticChapters = files.map(file => ({
        id: `temp-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        course_id: params.id,
        title: file.name.replace(/\.[^/.]+$/, ""),
        file_url: null,
        file_type: file.type,
        file_size: file.size,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        isUploading: true
      }));
      
      // Add optimistic chapters to UI immediately
      setChapters(prev => [...prev, ...optimisticChapters]);
      setShowUploadModal(false);
      
      // Process uploads in parallel
      const uploadPromises = files.map(async (file, index) => {
        try {
          // Upload to S3
          const uploadResult = await uploadToS3(file, 'course-assets', `courses/${params.id}/chapters/`);
          
          if (uploadResult.success && uploadResult.url && uploadResult.key) {
            // Create chapter in Supabase
            const chapterResult = await createChapterFromFile(
              params.id,
              file.name.replace(/\.[^/.]+$/, ""),
              uploadResult.url,
              file.type,
              file.size
            );
            
            if (chapterResult.success && chapterResult.chapter) {
              // Update the optimistic chapter with real data
              setChapters(prev => prev.map(chapter => 
                chapter.id === optimisticChapters[index].id 
                  ? { ...chapter, ...chapterResult.chapter, isUploading: false }
                  : chapter
              ));
            }
            
            return { uploadResult, chapterResult };
          }
          
          return { uploadResult, chapterResult: { success: false, error: 'Upload failed' } };
        } catch (error) {
          console.error(`Error uploading file ${file.name}:`, error);
          // Remove failed optimistic chapter
          setChapters(prev => prev.filter(chapter => chapter.id !== optimisticChapters[index].id));
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          return { uploadResult: { success: false, error: errorMessage }, chapterResult: { success: false, error: errorMessage } };
        }
      });
      
      // Wait for all uploads to complete
      await Promise.all(uploadPromises);
      
      // Final refresh to ensure consistency
      await fetchChapters();
    } catch (error) {
      console.error('Error uploading files:', error);
      // Refresh to get actual state on error
      await fetchChapters();
    }
  };

  // Handle chapter deletion with optimistic UI
  const handleChapterDelete = async (chapterId: string, fileUrl: string) => {
    console.log('handleChapterDelete called with:', { chapterId, fileUrl });
    
    // Optimistic UI update - remove from UI immediately
    setChapters(prev => prev.filter(chapter => chapter.id !== chapterId));
    
    try {
      // Extract the S3 key from the full URL
      const urlParts = fileUrl.split('/');
      const bucketIndex = urlParts.findIndex(part => part.includes('s3.amazonaws.com'));
      const s3Key = urlParts.slice(bucketIndex + 1).join('/');
      
      // Run S3 and Supabase deletions in parallel
      const [s3Result, chapterResult] = await Promise.all([
        deleteFromS3(s3Key, 'course-assets'),
        deleteChapter(chapterId)
      ]);
      
      console.log('S3 delete result:', s3Result);
      console.log('Chapter delete result:', chapterResult);
      
      // If either operation failed, revert the optimistic update
      if (!s3Result.success || !chapterResult.success) {
        console.error('Deletion failed, reverting UI update');
        await fetchChapters(); // Refresh to get actual state
      }
    } catch (error) {
      console.error('Error deleting chapter:', error);
      // Revert optimistic update on error
      await fetchChapters();
    }
  };



  const tabs = [
    { id: 'overview', label: 'Overview', icon: BookOpen },
    { id: 'quizzes', label: 'Quizzes', icon: ClipboardList },
    { id: 'content', label: 'Content', icon: FileText },
    { id: 'recordings', label: 'Recordings', icon: Video },
    { id: 'live-classes', label: 'Live Classes', icon: Video },
    { id: 'assignments', label: 'Assignments', icon: FileText },
    { id: 'students', label: 'Students', icon: Users },
    ...(userProfile?.role === 'admin' || userProfile?.role === 'superadmin' 
      ? [{ id: 'demo-access', label: 'Demo Access', icon: Users }] 
      : []),
    ...((userProfile?.role === 'admin' || userProfile?.role === 'superadmin') ? [{ id: 'enrollments', label: 'Enrollments', icon: Users } as const] : []),
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
            <div className="space-y-2">
            <div className="flex items-center justify-between">
              <ThemeToggle />
                <BugReportForm
                  trigger={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                      title="Report Bug"
                    >
                      <Bug className="h-4 w-4" />
                    </Button>
                  }
                />
              </div>
              <div className="flex items-center justify-end">
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
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
            {/* Course Header */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6">
              <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                <div className="flex-1 w-full md:w-auto">
                  <div className="flex items-center space-x-3 mb-2">
                    <Badge variant="secondary" className="bg-primary/10 text-primary text-xs md:text-sm">
                      {course.subject}
                    </Badge>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2 break-words">
                    {course.title}
                  </h1>
                  <p className="text-gray-600 dark:text-gray-300 text-sm md:text-base lg:text-lg">
                    {course.description}
                  </p>
                </div>
                <Button className="bg-primary text-white hover:bg-primary-600 w-full md:w-auto">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Button>
              </div>
            </div>

            {/* Course Stats */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
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
                         {chapters.length}
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

                {activeTab === 'demo-access' && (
                  <CourseDemoManagement
                    courseId={params.id}
                    courseTitle={course?.title || ''}
                  />
                )}

                {activeTab === 'content' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                       <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                         Course Content ({chapters.length} chapters)
                       </h3>
                      {(userProfile?.role === 'teacher' || userProfile?.role === 'superadmin' || userProfile?.role === 'admin') && (
                        <Button 
                          onClick={() => setShowUploadModal(true)}
                          className="bg-primary text-white hover:bg-primary-600"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Upload Content
                        </Button>
                      )}
                    </div>

                    {/* Upload Modal */}
                    {showUploadModal && (
                      <Card className="border-primary/20 bg-primary/5">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                             <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                               Upload Chapter Files
                             </h4>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowUploadModal(false)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <FileUpload
                            onUpload={handleFileUpload}
                            accept=".pdf,.doc,.docx,image/*,video/*"
                            maxFiles={10}
                            maxSize={50} // 50MB
                          />
                        </CardContent>
                      </Card>
                    )}

                     {/* Chapters List */}
                     {contentLoading ? (
                       <div className="flex items-center justify-center py-12">
                         <Loader2 className="h-8 w-8 animate-spin text-primary" />
                       </div>
                     ) : chapters.length > 0 ? (
                       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                         {chapters.map((chapter) => {
                           const fileSize = chapter.file_size ? formatFileSize(chapter.file_size) : 'Unknown size';
                           const fileExtension = chapter.file_type?.split('/').pop()?.toLowerCase() || '';
                           
                           // Determine icon based on file type
                           const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension);
                           const isVideo = ['mp4', 'webm', 'mov', 'avi'].includes(fileExtension);
                           const isDocument = ['pdf', 'doc', 'docx', 'txt'].includes(fileExtension);
                           
                           return (
                             <Card key={chapter.id} className={`border-gray-200 dark:border-gray-700 ${(chapter as any).isUploading ? 'opacity-60' : ''}`}>
                               <CardContent className="p-4">
                                 <div className="flex items-start space-x-3">
                                   <div className="flex-shrink-0">
                                     <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                       {(chapter as any).isUploading ? (
                                         <Loader2 className="h-5 w-5 text-primary animate-spin" />
                                       ) : isImage ? (
                                         // eslint-disable-next-line jsx-a11y/alt-text
                                         <Image className="h-5 w-5 text-primary" />
                                       ) : isVideo ? (
                                         <Video className="h-5 w-5 text-primary" />
                                       ) : isDocument ? (
                                         <FileText className="h-5 w-5 text-primary" />
                                       ) : (
                                         <FileText className="h-5 w-5 text-primary" />
                                       )}
                                     </div>
                                   </div>
                                   <div className="flex-1 min-w-0">
                                     <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                       {chapter.title}
                                       {(chapter as any).isUploading && (
                                         <span className="ml-2 text-xs text-blue-600">Uploading...</span>
                                       )}
                                     </p>
                                     <p className="text-xs text-gray-500 dark:text-gray-400">
                                       {fileSize}
                                     </p>
                                     <p className="text-xs text-gray-500 dark:text-gray-400">
                                       {new Date(chapter.created_at).toLocaleDateString()}
                                     </p>
                                   </div>
                                   <div className="flex items-center space-x-1">
                                     {chapter.file_url && !(chapter as any).isUploading && (
                                       <Button
                                         variant="ghost"
                                         size="sm"
                                         onClick={() => window.open(chapter.file_url!, '_blank')}
                                       >
                                         <Download className="h-4 w-4" />
                                       </Button>
                                     )}
                                    {!(chapter as any).isUploading && (userProfile?.role === 'teacher' || userProfile?.role === 'superadmin' || userProfile?.role === 'admin') && (
                                       <Button
                                         variant="ghost"
                                         size="sm"
                                         onClick={() => handleChapterDelete(chapter.id, chapter.file_url!)}
                                         className="text-red-600 hover:text-red-700"
                                       >
                                         <Trash2 className="h-4 w-4" />
                                       </Button>
                                     )}
                                   </div>
                                 </div>
                               </CardContent>
                             </Card>
                           );
                         })}
                       </div>
                    ) : (
                      <div className="py-12 text-center">
                        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                          <FileText className="h-8 w-8 text-primary" />
                        </div>
                         <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                           No chapters yet
                         </h3>
                         <p className="text-gray-600 dark:text-gray-300 mb-4">
                           Upload files to create chapters for your course.
                         </p>
                        {(userProfile?.role === 'teacher' || userProfile?.role === 'superadmin' || userProfile?.role === 'admin') && (
                          <Button 
                            onClick={() => setShowUploadModal(true)}
                            className="bg-primary text-white hover:bg-primary-600"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Upload Content
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'recordings' && (
                  <div className="space-y-6">
                    {(userProfile?.role === 'teacher' || userProfile?.role === 'superadmin' || userProfile?.role === 'admin') && (
                      <div className="flex items-center justify-end">
                        <Button
                          onClick={() => setShowRecordingUploadModal(true)}
                          className="bg-primary text-white hover:bg-primary-600"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Upload Lecture Recording
                        </Button>
                      </div>
                    )}

                    <LectureRecordingsList
                      courseId={params.id}
                      userRole={userProfile?.role || 'student'}
                      refreshKey={recordingsRefreshKey}
                    />

                    {showRecordingUploadModal && (
                      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-800">
                          <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Upload Lecture Recording</h3>
                              <Button
                                variant="ghost"
                                onClick={() => setShowRecordingUploadModal(false)}
                                className="text-gray-600 dark:text-gray-300"
                              >
                                <X className="h-5 w-5" />
                              </Button>
                            </div>
                            <LectureRecordingUpload
                              courseId={params.id}
                              onUploadSuccess={() => {
                                setShowRecordingUploadModal(false);
                                setRecordingsRefreshKey((k) => k + 1);
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
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
                              <Avatar
                                src={student.avatar_url}
                                name={student.full_name}
                                size="md"
                              />
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

                {activeTab === 'assignments' && (
                  <div className="space-y-6">
                    <AssignmentManagement 
                      courseId={params.id} 
                      userRole={userProfile?.role || 'teacher'} 
                      chapters={chapters}
                    />
                  </div>
                )}

                {activeTab === 'live-classes' && (
                  <div className="space-y-6">
                    <LiveClassesList
                      courseId={params.id}
                      userRole={userProfile?.role || 'teacher'}
                      showAccessControls={false}
                    />
                  </div>
                )}

                {activeTab === 'enrollments' && (
                  <div className="space-y-6">
                    <EnrollmentStatus 
                      courseId={params.id} 
                      userRole={userProfile?.role || 'teacher'} 
                    />
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