import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase';
import AWS from 'aws-sdk';

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

const SUBMISSIONS_BUCKET = process.env.AWS_SUBMISSIONS_BUCKET || 'lms-submissions';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: auth, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !auth?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = auth.user.id;

    // Load submission
    const { data: submission, error: subErr } = await supabase
      .from('assignment_submissions')
      .select('id, assignment_id, student_id, file_key, file_name')
      .eq('id', params.id)
      .single();
    if (subErr || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // Load assignment for permission context
    const { data: assignment } = await supabase
      .from('assignments')
      .select('id, course_id, teacher_id')
      .eq('id', submission.assignment_id)
      .single();
    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Get requester role
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();
    const role = profile?.role;

    // Authorization: student owner; teacher assigned/owner; admin/superadmin
    let allowed = false;
    if (role === 'student' && submission.student_id === userId) allowed = true;
    if (role === 'teacher') {
      if (assignment.teacher_id === userId) allowed = true;
      if (!allowed) {
        const { data: tc } = await supabase
          .from('teacher_courses')
          .select('teacher_id')
          .eq('course_id', assignment.course_id)
          .eq('teacher_id', userId)
          .maybeSingle();
        if (tc) allowed = true;
      }
    }
    if (role === 'admin' || role === 'superadmin') allowed = true;

    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Create signed URL for download
    const safeName = (submission.file_name || 'submission')
      .replace(/[^a-zA-Z0-9._ -]/g, '-')
      .slice(-140);

    const signedUrl = s3.getSignedUrl('getObject', {
      Bucket: SUBMISSIONS_BUCKET,
      Key: submission.file_key,
      Expires: 60, // 1 minute
      ResponseContentDisposition: `attachment; filename="${safeName}"`
    });

    return NextResponse.json({ url: signedUrl });
  } catch (e) {
    console.error('Error generating signed URL for submission:', e);
    return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 });
  }
}


