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

export async function POST(request: NextRequest) {
  try {
    const { key, bucketType } = await request.json();
    console.log('Delete API called with:', { key, bucketType });

    if (!key) {
      return NextResponse.json({ success: false, error: 'No key provided' }, { status: 400 });
    }

    if (!bucketType) {
      return NextResponse.json({ success: false, error: 'No bucket type provided' }, { status: 400 });
    }

    // Get bucket name
    const bucketName = BUCKETS[bucketType.toUpperCase().replace('-', '_') as keyof typeof BUCKETS];
    console.log('Bucket name:', bucketName);
    if (!bucketName) {
      return NextResponse.json({ success: false, error: 'Invalid bucket type' }, { status: 400 });
    }

    // Delete from S3
    console.log('Deleting from S3:', { Bucket: bucketName, Key: key });
    await s3.deleteObject({
      Bucket: bucketName,
      Key: key,
    }).promise();

    console.log('S3 delete successful');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('S3 delete error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed',
    }, { status: 500 });
  }
}
