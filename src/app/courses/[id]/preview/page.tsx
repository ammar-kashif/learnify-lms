import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import CoursePreviewClient from '@/components/course/course-preview-client';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getCourse(courseId: string) {
  console.log('🔍 Fetching course for preview:', courseId);
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

export default async function CoursePreviewPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const courseId = params.id;
  console.log('🚀 CoursePreviewPage started for courseId:', courseId);

  const course = await getCourse(courseId);

  if (!course) {
    notFound();
  }

  return (
    <CoursePreviewClient 
      course={course}
      courseId={courseId}
    />
  );
}

