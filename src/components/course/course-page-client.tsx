'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import ThemeToggle from '@/components/theme-toggle';
import QuizSection from '@/components/quiz/quiz-section';
import FileUpload from '@/components/ui/file-upload';
import LectureRecordingsList from '@/components/course/lecture-recordings-list';
import LectureRecordingUpload from '@/components/course/lecture-recording-upload';
import DemoAccessRequest from '@/components/course/demo-access-request';
import SubscriptionPlans from '@/components/course/subscription-plans';
import AssignmentManagement from '@/components/assignments/assignment-management';
import StudentLiveClassCalendar from '@/components/attendance/student-live-class-calendar';
import { uploadToS3 } from '@/lib/s3';
import { createChapterFromFile } from '@/lib/chapters';
import { formatDate } from '@/utils/date';
import {
  BookOpen,
  ChevronLeft,
  Play,
  Eye,
  Trash2,
  Edit,
  Plus,
  FileText,
  Download,
  Calendar,
  X,
  Video,
} from 'lucide-react';

type ChapterItem = {
  id: string;
  title: string;
  file_url: string | null;
  file_type?: string | null;
  file_size?: number | null;
  created_at?: string;
  content?: string | null;
};

type Course = {
  id: string;
  title: string;
  description: string;
  created_at: string;
};

interface CoursePageClientProps {
  course: Course;
  chapters: ChapterItem[];
  courseId: string;
  activeTab: string;
}

export default function CoursePageClient({ course, chapters, courseId, activeTab }: CoursePageClientProps) {
  const { user, userRole } = useAuth();
  const [chaptersList, setChaptersList] = useState<ChapterItem[]>(chapters);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [quizResults] = useState<any[]>([]);
  const [showQuizResults, setShowQuizResults] = useState(false);
  const [selectedAttempt, setSelectedAttempt] = useState<any>(null);
  const [showAttemptDetails, setShowAttemptDetails] = useState(false);
  const [showRecordingUploadModal, setShowRecordingUploadModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);

  useEffect(() => {
    setIsAdmin(userRole === 'admin' || userRole === 'superadmin');
  }, [userRole]);

  // Debug logging for LectureRecordingsList props
  useEffect(() => {
    console.log('📋 LectureRecordingsList props:', {
      courseId,
      finalUserRole: isAdmin ? (userRole === 'superadmin' ? "superadmin" : "admin") : "student",
      showAccessControls: userRole === 'student' && !!user,
      isAdmin,
      originalUserRole: userRole,
      hasUser: !!user
    });
  }, [courseId, isAdmin, userRole, user]);

  const handleDeleteChapter = async (chapterId: string) => {
    if (!isAdmin) return;
    
    if (confirm('Are you sure you want to delete this chapter? This action cannot be undone.')) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error('No authentication token found');
        }

        const response = await fetch('/api/chapters/delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ chapterId }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete chapter');
        }

        // Remove chapter from local state
        setChaptersList(prev => prev.filter(ch => ch.id !== chapterId));
        alert('Chapter deleted successfully!');
      } catch (error) {
        console.error('Error deleting chapter:', error);
        alert(`Failed to delete chapter: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  const handleDownloadFile = async (fileUrl: string, fileName: string) => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Failed to download file');
    }
  };

  const handleFileUpload = async (files: File[]) => {
    try {
      // Create optimistic chapter entries immediately
      const optimisticChapters = files.map(file => ({
        id: `temp-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        course_id: courseId,
        title: file.name.replace(/\.[^/.]+$/, ""),
        file_url: null,
        file_type: file.type,
        file_size: file.size,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        isUploading: true
      }));
      
      // Add optimistic chapters to UI immediately
      setChaptersList(prev => [...prev, ...optimisticChapters]);
      setShowUploadModal(false);
      
      // Process uploads in parallel
      const uploadPromises = files.map(async (file, index) => {
        try {
          // Upload to S3
          const uploadResult = await uploadToS3(file, 'course-assets', `courses/${courseId}/chapters/`);
          
          if (uploadResult.success && uploadResult.url && uploadResult.key) {
            // Create chapter in Supabase
            const chapterResult = await createChapterFromFile(
              courseId,
              file.name.replace(/\.[^/.]+$/, ""),
              uploadResult.url,
              file.type,
              file.size
            );
            
            if (chapterResult.success && chapterResult.chapter) {
              // Update the optimistic chapter with real data
              setChaptersList(prev => prev.map(chapter => 
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
          setChaptersList(prev => prev.filter(chapter => chapter.id !== optimisticChapters[index].id));
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          return { uploadResult: { success: false, error: errorMessage }, chapterResult: { success: false, error: errorMessage } };
        }
      });
      
      // Wait for all uploads to complete
      await Promise.all(uploadPromises);
      
      // Final refresh to ensure consistency
      window.location.reload();
    } catch (error) {
      console.error('Error uploading files:', error);
      // Refresh to get actual state on error
      window.location.reload();
    }
  };


  const handleViewAttempt = async (attempt: any) => {
    try {
      // Since we now have the answers in the attempt data, we can show detailed breakdown
      setSelectedAttempt(attempt);
      setShowAttemptDetails(true);
    } catch (error) {
      alert('Failed to load attempt details');
    }
  };

  return (
    <div className="space-y-0">
      {/* Header bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-gray-900 dark:text-white">{course.title}</h1>
          <span className="hidden md:inline text-xs text-gray-500 dark:text-gray-400">Course</span>
          {isAdmin && (
            <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
              Admin View
            </span>
          )}
        </div>
        <ThemeToggle />
      </div>
      <div className="px-0 h-[calc(100vh-56px)] overflow-hidden flex gap-6">
        {/* Sidebar (non-scrollable) */}
        <aside className="w-[260px] flex-shrink-0">
          <div className="rounded-none border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0b1220] px-4 pt-3 pb-0 shadow-sm w-[260px] h-full flex flex-col text-gray-800 dark:text-slate-200">
            <div className="space-y-3">
              <h1 className="text-base font-semibold text-gray-900 dark:text-white">{course.title}</h1>
              {course.description && (
                <p className="mt-1 line-clamp-2 text-xs text-gray-600 dark:text-slate-300">{course.description}</p>
              )}
            </div>

            {/* Course section */}
            <div className="pt-4">
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-700 dark:text-slate-400">This Course</p>
              <ul className="space-y-1 text-sm text-gray-800 dark:text-slate-200">
                <li>
                  <Link href={{ pathname: `/courses/${courseId}`, query: { tab: 'chapters' } }} className={`group relative flex items-center gap-3 rounded-md px-3 py-2 transition ${activeTab==='chapters' ? 'bg-gray-100 dark:bg-slate-800/70 text-gray-900 dark:text-white' : 'hover:bg-gray-100 dark:hover:bg-slate-800/70'}`}>
                    <span className={`absolute left-0 top-0 h-full w-1 rounded-l bg-indigo-500 transition ${activeTab==='chapters' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                    <BookOpen className="h-4 w-4" /> Chapters
                  </Link>
                </li>
                <li>
                  <Link href={{ pathname: `/courses/${courseId}`, query: { tab: 'lectures' } }} className={`group relative flex items-center gap-3 rounded-md px-3 py-2 transition ${activeTab==='lectures' ? 'bg-gray-100 dark:bg-slate-800/70 text-gray-900 dark:text-white' : 'hover:bg-gray-100 dark:hover:bg-slate-800/70'}`}>
                    <span className={`absolute left-0 top-0 h-full w-1 rounded-l bg-indigo-500 transition ${activeTab==='lectures' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                    <Play className="h-4 w-4" /> Recorded Lectures
                  </Link>
                </li>
                <li>
                  <Link href={{ pathname: `/courses/${courseId}`, query: { tab: 'quizzes' } }} className={`group relative flex items-center gap-3 rounded-md px-3 py-2 transition ${activeTab==='quizzes' ? 'bg-gray-100 dark:bg-slate-800/70 text-gray-900 dark:text-white' : 'hover:bg-gray-100 dark:hover:bg-slate-800/70'}`}>
                    <span className={`absolute left-0 top-0 h-full w-1 rounded-l bg-indigo-500 transition ${activeTab==='quizzes' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                    <Eye className="h-4 w-4" /> Quizzes
                  </Link>
                </li>
                <li>
                  <Link href={{ pathname: `/courses/${courseId}`, query: { tab: 'assignments' } }} className={`group relative flex items-center gap-3 rounded-md px-3 py-2 transition ${activeTab==='assignments' ? 'bg-gray-100 dark:bg-slate-800/70 text-gray-900 dark:text-white' : 'hover:bg-gray-100 dark:hover:bg-slate-800/70'}`}>
                    <span className={`absolute left-0 top-0 h-full w-1 rounded-l bg-indigo-500 transition ${activeTab==='assignments' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                    <FileText className="h-4 w-4" /> Assignments
                  </Link>
                </li>
                <li>
                  <Link href={{ pathname: `/courses/${courseId}`, query: { tab: 'live-classes' } }} className={`group relative flex items-center gap-3 rounded-md px-3 py-2 transition ${activeTab==='live-classes' ? 'bg-gray-100 dark:bg-slate-800/70 text-gray-900 dark:text-white' : 'hover:bg-gray-100 dark:hover:bg-slate-800/70'}`}>
                    <span className={`absolute left-0 top-0 h-full w-1 rounded-l bg-indigo-500 transition ${activeTab==='live-classes' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                    <Calendar className="h-4 w-4" /> Live Classes
                  </Link>
                </li>
              </ul>
            </div>
            <div className="mt-auto pt-2 pb-3">
              <Link
                href="/dashboard"
                className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-800 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800/70"
              >
                <ChevronLeft className="h-4 w-4" /> Back to Dashboard
              </Link>
            </div>
          </div>
        </aside>

        {/* Main content (scrollable) */}
        <main className="flex-1 overflow-y-auto pr-2 pl-2 space-y-8" style={{height: 'calc(100vh - 56px)'}}>

          {/* Chapters */}
          {activeTab === 'chapters' && (
            <section id="chapters" className="space-y-5">
              <div className="flex items-center justify-between pl-0 pt-2">
                <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white tracking-tight">Chapters</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{chaptersList.length} total</span>
                  {isAdmin && (
                    <button 
                      onClick={() => setShowUploadModal(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                      <Plus className="h-4 w-4" />
                      Add Chapter
                    </button>
                  )}
                </div>
              </div>
              {chaptersList.length === 0 ? (
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center shadow-sm">
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full">
                      <BookOpen className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No chapters yet</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {isAdmin ? "Start by adding the first chapter to this course" : "Chapters will appear here once they're added"}
                      </p>
                    </div>
                    {isAdmin && (
                      <button className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
                        <Plus className="h-4 w-4" />
                        Add First Chapter
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {chaptersList.map(ch => (
                    <div key={ch.id} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 transition-all">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                            <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white line-clamp-1">{ch.title}</p>
                            {ch.created_at && (
                              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                <Calendar className="h-3 w-3" />
                                {formatDate(ch.created_at)}
                              </div>
                            )}
                          </div>
                        </div>
                        {isAdmin && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleDeleteChapter(ch.id)}
                              className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition"
                              title="Delete chapter"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                            <button
                              className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition"
                              title="Edit chapter"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {ch.content && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-3">{ch.content}</p>
                      )}
                      
                      <div className="flex items-center justify-between">
                        {ch.file_url ? (
                          <div className="flex items-center gap-2">
                            <a 
                              href={ch.file_url} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
                            >
                              <Eye className="h-4 w-4" />
                              View Resource
                            </a>
                            <button
                              onClick={() => handleDownloadFile(ch.file_url!, ch.title)}
                              className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-800 hover:underline transition-colors"
                            >
                              <Download className="h-4 w-4" />
                              Download
                            </button>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <FileText className="h-4 w-4" />
                            No resource
                          </span>
                        )}
                        
                        {ch.file_size && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {(ch.file_size / 1024 / 1024).toFixed(1)} MB
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Recorded Lectures */}
          {activeTab === 'lectures' && (
            <section id="lectures" className="space-y-5">
              <div className="flex items-center justify-between pl-0 pt-2">
                <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white tracking-tight">Recorded Lectures</h2>
              </div>
              
              {isAdmin && (
                <div className="flex items-center justify-end">
                  <button 
                    onClick={() => setShowRecordingUploadModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Upload Lecture Recording
                  </button>
                </div>
              )}

              <LectureRecordingsList
                courseId={courseId}
                userRole={isAdmin ? (userRole === 'superadmin' ? "superadmin" : "admin") : "student"}
                showAccessControls={userRole === 'student' && !!user}
                onAccessRequired={() => setShowSubscriptionModal(true)}
              />
            </section>
          )}


          {/* Quizzes */}
          {activeTab === 'quizzes' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white tracking-tight">Quizzes</h2>
              </div>
              
              <QuizSection 
                courseId={courseId} 
                userRole={isAdmin ? (userRole === 'superadmin' ? "superadmin" : "admin") : "student"} 
                userId={user?.id || ""} 
              />

              {/* Quiz Results Modal */}
              {showQuizResults && isAdmin && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto">
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Quiz Attempts</h3>
                        <button
                          onClick={() => setShowQuizResults(false)}
                          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          <X className="h-6 w-6" />
                        </button>
                      </div>
                      
                      {quizResults.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400 text-center py-8">No quiz attempts found</p>
                      ) : (
                        <div className="space-y-3">
                          {quizResults.map((result, index) => (
                            <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h4 className="font-medium text-gray-900 dark:text-white">{result.quiz_title}</h4>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                      by {result.student_name}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                    <span>Score: <span className="font-medium">{result.percentage || 0}%</span></span>
                                    <span>Correct: <span className="font-medium">{result.correct_answers}/{result.total_questions}</span></span>
                                    <span>Points: <span className="font-medium">{result.score}/{result.max_score}</span></span>
                                    <span>Date: <span className="font-medium">{formatDate(result.completed_at)}</span></span>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleViewAttempt(result)}
                                  className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                                >
                                  View Attempt
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Attempt Details Modal */}
              {showAttemptDetails && selectedAttempt && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{selectedAttempt.quiz_title}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Attempt by {selectedAttempt.student_name}</p>
                        </div>
                        <button
                          onClick={() => {
                            setShowAttemptDetails(false);
                            setSelectedAttempt(null);
                          }}
                          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          <X className="h-6 w-6" />
                        </button>
                      </div>

                      {/* Attempt Summary */}
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Score:</span>
                            <span className="ml-2 font-medium text-lg">{selectedAttempt.percentage || 0}%</span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Correct:</span>
                            <span className="ml-2 font-medium">{selectedAttempt.correct_answers}/{selectedAttempt.total_questions}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Points:</span>
                            <span className="ml-2 font-medium">{selectedAttempt.score}/{selectedAttempt.max_score}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Date:</span>
                            <span className="ml-2 font-medium">{formatDate(selectedAttempt.completed_at)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Questions and Answers */}
                      <div className="space-y-4">
                        <h4 className="text-lg font-medium text-gray-900 dark:text-white">Questions & Answers</h4>
                        {selectedAttempt.answers && selectedAttempt.answers.length > 0 ? (
                          <div className="space-y-4">
                            {selectedAttempt.answers.map((answer: any, qIndex: number) => (
                              <div key={qIndex} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                <div className="flex items-start justify-between mb-3">
                                  <h5 className="font-medium text-gray-900 dark:text-white">
                                    Question {qIndex + 1}
                                  </h5>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    answer.is_correct 
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                  }`}>
                                    {answer.is_correct ? 'Correct' : 'Incorrect'}
                                  </span>
                                </div>
                                
                                <div className="space-y-2">
                                  <div>
                                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Question:</span>
                                    <p className="mt-1 text-gray-700 dark:text-gray-300">{answer.question_text || 'Question text not available'}</p>
                                  </div>
                                  
                                  <div>
                                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Student Answer:</span>
                                    <p className="mt-1 p-2 bg-gray-50 dark:bg-gray-700 rounded border">
                                      {answer.selected_answer || 'No answer provided'}
                                    </p>
                                  </div>
                                  
                                  <div>
                                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Correct Answer:</span>
                                    <p className="mt-1 p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-700">
                                      {answer.correct_answer || 'Correct answer not available'}
                                    </p>
                                  </div>
                                  
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500 dark:text-gray-400">
                                      Points: {answer.points_earned || 0} / {answer.points || 0}
                                    </span>
                                    <span className={`font-medium ${
                                      answer.is_correct ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                    }`}>
                                      {answer.is_correct ? '✓ Correct' : '✗ Incorrect'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                            <p className="text-sm text-blue-800 dark:text-blue-200">
                              <strong>Note:</strong> No detailed answer data available for this attempt.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Assignments */}
          {activeTab === 'assignments' && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white tracking-tight">Assignments</h2>
              </div>
              <AssignmentManagement
                courseId={courseId}
                userRole={isAdmin ? (userRole === 'superadmin' ? 'superadmin' : 'admin') : 'student'}
                chapters={[]}
              />
            </section>
          )}

          {/* Live Classes */}
          {activeTab === 'live-classes' && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white tracking-tight">Live Classes</h2>
              </div>
              <StudentLiveClassCalendar courseId={courseId} />
            </section>
          )}
        </main>
      </div>
      
      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Upload Chapter Files
                </h3>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <FileUpload
                onUpload={handleFileUpload}
                accept=".pdf,.doc,.docx,image/*,video/*"
                maxFiles={10}
                maxSize={50} // 50MB
              />
            </div>
          </div>
        </div>
      )}

      {/* Recording Upload Modal */}
      {showRecordingUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Upload Lecture Recording
                </h3>
                <button
                  onClick={() => setShowRecordingUploadModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <LectureRecordingUpload
                courseId={courseId}
                onUploadSuccess={() => {
                  setShowRecordingUploadModal(false);
                  window.location.reload();
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Subscription Plans Modal */}
      {showSubscriptionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Choose Your Plan
                </h3>
                <button
                  onClick={() => setShowSubscriptionModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <SubscriptionPlans
                courseId={courseId}
                courseTitle={course.title}
                onSubscriptionCreated={() => {
                  setShowSubscriptionModal(false);
                  window.location.reload();
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Demo Access Modal */}
      {showDemoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Try for Free
                </h3>
                <button
                  onClick={() => setShowDemoModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <DemoAccessRequest
                courseId={courseId}
                courseTitle={course.title}
                onAccessGranted={() => {
                  setShowDemoModal(false);
                  window.location.reload();
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
