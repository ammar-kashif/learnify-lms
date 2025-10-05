import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import AWS from 'aws-sdk';
import { Database } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Configure AWS SDK
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// Submissions bucket name
const SUBMISSIONS_BUCKET = process.env.AWS_S3_BUCKET_SUBMISSIONS!;

// Allowed file types for submissions
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/gif',
  'text/plain'
];

// Generate unique file key for submission
function generateSubmissionKey(assignmentId: string, studentId: string, originalName: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  // const extension = originalName.split('.').pop();
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '-');
  return `assignments/${assignmentId}/submissions/${studentId}/${timestamp}-${randomString}-${sanitizedName}`;
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    // Get user role
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = userProfile?.role;

    // Only students can submit assignments
    if (userRole !== 'student') {
      return NextResponse.json(
        { error: 'Only students can submit assignments' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const assignmentId = formData.get('assignmentId') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!assignmentId) {
      return NextResponse.json(
        { error: 'No assignment ID provided' },
        { status: 400 }
      );
    }

    // Get the assignment
    const { data: assignment, error: assignmentError } = await supabase
      .from('assignments')
      .select('*')
      .eq('id', assignmentId)
      .single();

    if (assignmentError || !assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    // Check if assignment is published
    if (!assignment.is_published) {
      return NextResponse.json(
        { error: 'Assignment is not published' },
        { status: 403 }
      );
    }

    // Check if student is enrolled in the course
    const { data: enrollment } = await supabase
      .from('student_enrollments')
      .select('*')
      .eq('student_id', user.id)
      .eq('course_id', assignment.course_id)
      .single();

    if (!enrollment) {
      return NextResponse.json(
        { error: 'You are not enrolled in this course' },
        { status: 403 }
      );
    }

    // Check if due date has passed
    if (assignment.due_date && new Date(assignment.due_date) < new Date()) {
      return NextResponse.json(
        { error: 'Assignment due date has passed' },
        { status: 400 }
      );
    }

    // Get current submission count for this student
    const { data: existingSubmissions, error: submissionsError } = await supabase
      .from('assignment_submissions')
      .select('submission_number')
      .eq('assignment_id', assignmentId)
      .eq('student_id', user.id)
      .order('submission_number', { ascending: false });

    if (submissionsError) {
      console.error('Error checking existing submissions:', submissionsError);
      return NextResponse.json(
        { error: 'Failed to check existing submissions' },
        { status: 500 }
      );
    }

    const currentSubmissionCount = existingSubmissions.length;
    const nextSubmissionNumber = currentSubmissionCount + 1;

    // Check if student has reached max submissions
    if (currentSubmissionCount >= assignment.max_submissions) {
      return NextResponse.json(
        { error: `Maximum submissions (${assignment.max_submissions}) reached` },
        { status: 400 }
      );
    }

    // Validate file type
    const fileType = file.type;
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (!ALLOWED_FILE_TYPES.includes(fileType) || !fileExtension || !assignment.allowed_file_types.includes(fileExtension)) {
      return NextResponse.json(
        { error: `File type not allowed. Allowed types: ${assignment.allowed_file_types.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate file size
    const fileSizeMb = file.size / (1024 * 1024);
    if (fileSizeMb > assignment.max_file_size_mb) {
      return NextResponse.json(
        { error: `File size exceeds maximum allowed size of ${assignment.max_file_size_mb}MB` },
        { status: 400 }
      );
    }

    // Generate unique key
    const key = generateSubmissionKey(assignmentId, user.id, file.name);

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload parameters
    const uploadParams = {
      Bucket: SUBMISSIONS_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    };

    // Upload to S3
    const upload = s3.upload(uploadParams, {
      partSize: 10 * 1024 * 1024, // 10MB parts
      queueSize: 1, // Upload 1 part at a time
    });
    
    // Add progress tracking
    upload.on('httpUploadProgress', (progress) => {
      console.log(`Submission upload progress: ${Math.round((progress.loaded / (progress.total || progress.loaded)) * 100)}%`);
    });
    
    const result = await upload.promise();

    // Create submission record in database
    const { data: submission, error: submissionError } = await supabase
      .from('assignment_submissions')
      .insert({
        assignment_id: assignmentId,
        student_id: user.id,
        submission_number: nextSubmissionNumber,
        file_url: result.Location,
        file_key: result.Key,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        status: 'submitted'
      })
      .select()
      .single();

    if (submissionError) {
      console.error('Error creating submission record:', submissionError);
      // Try to delete the uploaded file from S3
      try {
        await s3.deleteObject({ Bucket: SUBMISSIONS_BUCKET, Key: result.Key }).promise();
      } catch (deleteError) {
        console.error('Error deleting uploaded file:', deleteError);
      }
      return NextResponse.json(
        { error: 'Failed to create submission record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      submission,
      fileUrl: result.Location,
      fileKey: result.Key
    });

  } catch (error) {
    console.error('S3 upload error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      },
      { status: 500 }
    );
  }
}
