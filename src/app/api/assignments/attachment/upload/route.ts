import { NextRequest, NextResponse } from 'next/server';
import AWS from 'aws-sdk';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
  signatureVersion: 'v4',
});

const ATTACHMENTS_BUCKET = process.env.AWS_COURSE_ASSETS_BUCKET || 'lms-course-assets';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['teacher', 'admin', 'superadmin'].includes(profile.role as string)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    if (!courseId) {
      return NextResponse.json({ error: 'Missing courseId' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: 'Only PDF/DOC/DOCX are allowed' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const sanitizedName = (file.name || 'attachment')
      .replace(/[^a-zA-Z0-9._-]/g, '-')
      .slice(-120);
    const key = `assignments/${courseId}/attachments/${Date.now()}-${Math.random().toString(36).slice(2)}-${sanitizedName}`;

    await s3
      .putObject({
        Bucket: ATTACHMENTS_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: file.type,
        // Some buckets block public ACLs; omit ACL for compatibility.
      })
      .promise();

    const url = `https://${ATTACHMENTS_BUCKET}.s3.amazonaws.com/${encodeURIComponent(key)}`;
    // Also provide a signed URL in case the bucket is private
    let signedUrl: string | null = null;
    try {
      signedUrl = s3.getSignedUrl('getObject', {
        Bucket: ATTACHMENTS_BUCKET,
        Key: key,
        Expires: 3600,
      });
    } catch (e) {
      // ignore; signed url is optional
    }

    return NextResponse.json({
      key,
      url,
      signedUrl,
      name: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    console.error('Error uploading assignment attachment:', error);
    return NextResponse.json({ error: 'Failed to upload attachment' }, { status: 500 });
  }
}


