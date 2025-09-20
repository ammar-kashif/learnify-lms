import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import ThemeToggle from '@/components/theme-toggle';
import QuizSection from '@/components/quiz/quiz-section';
import { cookies } from 'next/headers';
import {
  BookOpen,
  ChevronLeft,
  Play,
  Eye,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

type ChapterItem = {
  id: string;
  title: string;
  file_url: string | null;
  file_type?: string | null;
  file_size?: number | null;
  created_at?: string;
  content?: string | null;
};

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function getCourse(courseId: string) {
  console.log('🔍 Fetching course:', courseId);
  const { data: course, error } = await supabaseAdmin
    .from('courses')
    .select('id, title, description, created_at')
    .eq('id', courseId)
    .single();

  if (error || !course) {
    console.log('❌ Course not found:', error?.message);
    return null;
  }
  console.log('✅ Course found:', course.title);
  return course;
}


export default async function CoursePage({ params, searchParams }: { params: { id: string }, searchParams: { [key: string]: string | string[] | undefined } }) {
  const courseId = params.id;
  console.log('🚀 CoursePage started for courseId:', courseId);

  const course = await getCourse(courseId);
  console.log('📚 Course found:', !!course);

  // Fetch chapters directly - this is a public course page
  const { data: chaptersData, error: chaptersError } = await supabaseAdmin
    .from('chapters')
    .select('*')
    .eq('course_id', courseId)
    .order('created_at', { ascending: true });
  
  if (chaptersError) {
    console.log('❌ Chapters fetch error:', chaptersError.message);
  }
  
  const chapters = (chaptersData || []) as ChapterItem[];
  console.log('📖 Chapters result:', chapters.length, 'chapters');

  if (!course) {
    notFound();
  }

  const tabParam = typeof searchParams?.tab === 'string' ? searchParams.tab : Array.isArray(searchParams?.tab) ? searchParams?.tab[0] : undefined;
  const activeTab = (tabParam === 'lectures' || tabParam === 'quizzes' || tabParam === 'chapters') ? tabParam : 'chapters';

  return (
    <div className="space-y-0">
      {/* Header bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-gray-900 dark:text-white">{course.title}</h1>
          <span className="hidden md:inline text-xs text-gray-500 dark:text-gray-400">Course</span>
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
            <span className="text-xs text-gray-500 dark:text-gray-400">{chapters.length} total</span>
          </div>
          {chapters.length === 0 ? (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 text-sm text-gray-600 dark:text-gray-300 shadow-sm">
              No chapters yet.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {chapters.map(ch => (
                <div key={ch.id} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
                  <p className="font-medium text-gray-900 dark:text-white">{ch.title}</p>
                  {ch.content && (
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{ch.content}</p>
                  )}
                  <div className="mt-3">
                    {ch.file_url ? (
                      <a href={ch.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center text-sm text-indigo-600 hover:underline">
                        Open Resource
                      </a>
                    ) : (
                      <span className="text-sm text-gray-500 dark:text-gray-400">No resource</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        )}

        {/* Recorded Lectures (placeholder) */}
        {activeTab === 'lectures' && (
        <section id="lectures" className="space-y-5">
          <div className="flex items-center justify-between pl-0 pt-2">
            <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white tracking-tight">Recorded Lectures</h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">0 items</span>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
            <p className="text-sm text-gray-600 dark:text-gray-300">Coming soon. Recorded lectures for this course will appear here.</p>
          </div>
        </section>
        )}

        {/* Quizzes */}
        {activeTab === 'quizzes' && (
          <QuizSection 
            courseId={courseId} 
            userRole="student" 
            userId="" 
          />
        )}
      </main>
      </div>
    </div>
  );
}