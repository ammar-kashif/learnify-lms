import { NextRequest, NextResponse } from 'next/server';
import AWS from 'aws-sdk';
import { createClient } from '@supabase/supabase-js';

// Configure AWS SDK
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// Create admin client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Bucket name for avatars
const AVATAR_BUCKET = process.env.AWS_S3_BUCKET_AVATARS!;

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ success: false, error: 'No user ID provided' }, { status: 400 });
    }

    // Get current user data to get avatar URL
    const { data: currentUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('avatar_url')
      .eq('id', userId)
      .single();

    if (fetchError) {
      console.error('Error fetching user:', fetchError);
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Delete avatar from S3 if it exists
    if (currentUser.avatar_url) {
      try {
        // Extract key from URL
        const urlParts = currentUser.avatar_url.split('/');
        const bucketIndex = urlParts.findIndex((part: string) => part.includes('s3.amazonaws.com'));
        
        if (bucketIndex !== -1) {
          const key = urlParts.slice(bucketIndex + 1).join('/');
          
          await s3.deleteObject({
            Bucket: AVATAR_BUCKET,
            Key: key,
          }).promise();
          
          console.log('Avatar deleted from S3:', key);
        }
      } catch (s3Error) {
        console.error('Error deleting avatar from S3:', s3Error);
        // Continue with database update even if S3 deletion fails
      }
    }

    // Update user record to remove avatar URL
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ 
        avatar_url: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating user avatar:', updateError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to update user profile' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Avatar deleted successfully'
    });

  } catch (error) {
    console.error('Avatar delete error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed',
    }, { status: 500 });
  }
}
