import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import CoursePageClient from '@/components/course/course-page-client';

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
  const activeTab = (tabParam === 'lectures' || tabParam === 'quizzes' || tabParam === 'chapters' || tabParam === 'assignments' || tabParam === 'live-classes') ? tabParam : 'chapters';

  return (
    <CoursePageClient 
      course={course}
      chapters={chapters}
      courseId={courseId}
      activeTab={activeTab}
    />
  );
}