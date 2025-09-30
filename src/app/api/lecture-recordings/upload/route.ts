import { NextRequest, NextResponse } from 'next/server';
import AWS from 'aws-sdk';
import { createClient } from '@supabase/supabase-js';
import { getProgressEmitter } from '@/lib/upload-progress';

export const dynamic = 'force-dynamic';

// Configure AWS SDK
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// Configure Supabase
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Video bucket name
const VIDEO_BUCKET = process.env.AWS_S3_BUCKET_LESSON_HLS!;

// Allowed video types
const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo', // .avi
  'video/x-ms-wmv', // .wmv
];

// Generate unique video key
function generateVideoKey(courseId: string, title: string, originalName: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split('.').pop();
  const sanitizedTitle = title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  return `lecture-recordings/${courseId}/${sanitizedTitle}-${timestamp}-${randomString}.${extension}`;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const courseId = formData.get('courseId') as string;
    const progressId = (formData.get('progressId') as string) || null;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const durationFromClient = formData.get('duration') as string | null;
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!courseId || !title) {
      return NextResponse.json({ error: 'Course ID and title are required' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only MP4, WebM, QuickTime, AVI, and WMV files are allowed.' 
      }, { status: 400 });
    }

    // Validate file size (max 500MB)
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 500MB.' 
      }, { status: 400 });
    }

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Fetch user role
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isAdmin = ['admin', 'superadmin'].includes(userProfile.role);

    // Verify user is a teacher assigned to this course unless admin/superadmin
    if (!isAdmin) {
      const { data: teacherCourse, error: teacherError } = await supabaseAdmin
        .from('teacher_courses')
        .select('course_id')
        .eq('teacher_id', user.id)
        .eq('course_id', courseId)
        .single();

      if (teacherError || !teacherCourse) {
        return NextResponse.json({ 
          error: 'You are not assigned to this course' 
        }, { status: 403 });
      }
    }

    // Generate unique key for video
    const key = generateVideoKey(courseId, title, file.name);

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload parameters
    const uploadParams = {
      Bucket: VIDEO_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    };

    // Upload to S3 with multipart for larger files
    const upload = s3.upload(uploadParams, {
      partSize: 10 * 1024 * 1024, // 10MB parts
      queueSize: 1, // Upload 1 part at a time
    });
    
    // Add progress tracking
    upload.on('httpUploadProgress', (progress) => {
      const pct = Math.round((progress.loaded / (progress.total || progress.loaded)) * 100);
      console.log(`Video upload progress: ${pct}%`);
      if (progressId) {
        try { getProgressEmitter(progressId).emit('progress', pct); } catch (e) {}
      }
    });
    
    const result = await upload.promise();
    if (progressId) {
      try { getProgressEmitter(progressId).emit('done'); } catch (e) {}
    }

    // Save lecture recording to database
    const { data: lectureRecording, error: dbError } = await supabaseAdmin
      .from('lecture_recordings')
      .insert({
        course_id: courseId,
        teacher_id: user.id,
        title: title.trim(),
        description: description?.trim() || null,
        video_url: result.Location,
        video_key: result.Key,
        file_size: file.size,
        duration: durationFromClient ? parseInt(durationFromClient, 10) : null,
        is_published: false, // Default to unpublished
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      // Try to delete the uploaded file if database insert fails
      try {
        await s3.deleteObject({ Bucket: VIDEO_BUCKET, Key: result.Key }).promise();
      } catch (deleteError) {
        console.error('Failed to delete uploaded file:', deleteError);
      }
      return NextResponse.json({ 
        error: 'Failed to save lecture recording' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      lectureRecording: {
        id: lectureRecording.id,
        title: lectureRecording.title,
        description: lectureRecording.description,
        video_url: lectureRecording.video_url,
        file_size: lectureRecording.file_size,
        is_published: lectureRecording.is_published,
        created_at: lectureRecording.created_at,
      },
    });

  } catch (error) {
    console.error('Lecture recording upload error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Upload failed',
    }, { status: 500 });
  }
}
