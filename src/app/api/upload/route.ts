import { NextRequest, NextResponse } from 'next/server';
import AWS from 'aws-sdk';

// Configure AWS SDK
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// Bucket names from environment variables
const BUCKETS = {
  COURSE_ASSETS: process.env.AWS_S3_BUCKET_COURSE_ASSETS!,
  LESSON_HLS: process.env.AWS_S3_BUCKET_LESSON_HLS!,
  SUBMISSIONS: process.env.AWS_S3_BUCKET_SUBMISSIONS!,
  AVATARS: process.env.AWS_S3_BUCKET_AVATARS!,
};

// File type validation
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

// Generate unique file key
function generateFileKey(prefix: string, originalName: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split('.').pop();
  return `${prefix}/${timestamp}-${randomString}.${extension}`;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const bucketType = formData.get('bucketType') as string;
    const prefix = formData.get('prefix') as string;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    if (!bucketType) {
      return NextResponse.json({ success: false, error: 'No bucket type provided' }, { status: 400 });
    }

    // Validate file type based on bucket
    const fileType = file.type;
    let isValidType = false;

    switch (bucketType) {
      case 'course-assets':
        isValidType = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES].includes(fileType);
        break;
      case 'lesson-hls':
        isValidType = ALLOWED_VIDEO_TYPES.includes(fileType);
        break;
      case 'submissions':
        isValidType = [...ALLOWED_DOCUMENT_TYPES, ...ALLOWED_IMAGE_TYPES].includes(fileType);
        break;
      case 'avatars':
        isValidType = ALLOWED_IMAGE_TYPES.includes(fileType);
        break;
    }

    if (!isValidType) {
      return NextResponse.json({ success: false, error: 'Invalid file type for this bucket' }, { status: 400 });
    }

    // Get bucket name
    const bucketName = BUCKETS[bucketType.toUpperCase().replace('-', '_') as keyof typeof BUCKETS];
    if (!bucketName) {
      return NextResponse.json({ success: false, error: 'Invalid bucket type' }, { status: 400 });
    }

    // Generate unique key
    const key = generateFileKey(prefix || 'uploads', file.name);

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload parameters
    const uploadParams = {
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: file.type,
      // Note: ACL removed as the bucket doesn't allow ACLs
      // Files will inherit bucket's default permissions
    };

    // Upload to S3 with multipart for larger files
    const upload = s3.upload(uploadParams, {
      partSize: 10 * 1024 * 1024, // 10MB parts
      queueSize: 1, // Upload 1 part at a time
    });
    
    // Add progress tracking
    upload.on('httpUploadProgress', (progress) => {
      console.log(`Upload progress: ${Math.round((progress.loaded / progress.total) * 100)}%`);
    });
    
    const result = await upload.promise();

    return NextResponse.json({
      success: true,
      url: result.Location,
      key: result.Key,
    });
  } catch (error) {
    console.error('S3 upload error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    }, { status: 500 });
  }
}
