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

// Allowed image types for avatars
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Generate unique avatar key
function generateAvatarKey(userId: string, originalName: string): string {
  const timestamp = Date.now();
  const extension = originalName.split('.').pop();
  return `avatars/${userId}/${timestamp}.${extension}`;
}

// Delete old avatar from S3
async function deleteOldAvatar(oldAvatarUrl: string): Promise<void> {
  try {
    if (!oldAvatarUrl) return;
    
    // Extract key from URL
    const urlParts = oldAvatarUrl.split('/');
    const bucketIndex = urlParts.findIndex(part => part.includes('s3.amazonaws.com'));
    if (bucketIndex === -1) return;
    
    const key = urlParts.slice(bucketIndex + 1).join('/');
    
    await s3.deleteObject({
      Bucket: AVATAR_BUCKET,
      Key: key,
    }).promise();
    
    console.log('Old avatar deleted:', key);
  } catch (error) {
    console.error('Error deleting old avatar:', error);
    // Don't throw error - continue with upload even if old avatar deletion fails
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ success: false, error: 'No user ID provided' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.' 
      }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        success: false, 
        error: 'File too large. Maximum size is 5MB.' 
      }, { status: 400 });
    }

    // Get current user data to check for existing avatar
    const { data: currentUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('avatar_url')
      .eq('id', userId)
      .single();

    if (fetchError) {
      console.error('Error fetching user:', fetchError);
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Delete old avatar if it exists
    if (currentUser.avatar_url) {
      await deleteOldAvatar(currentUser.avatar_url);
    }

    // Generate unique key for new avatar
    const key = generateAvatarKey(userId, file.name);

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload parameters
    const uploadParams = {
      Bucket: AVATAR_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    };

    // Upload to S3
    const result = await s3.upload(uploadParams).promise();

    // Update user record with new avatar URL
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ 
        avatar_url: result.Location,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating user avatar:', updateError);
      // Try to delete the uploaded file since database update failed
      try {
        await s3.deleteObject({
          Bucket: AVATAR_BUCKET,
          Key: key,
        }).promise();
      } catch (deleteError) {
        console.error('Error cleaning up uploaded file:', deleteError);
      }
      
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to update user profile' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      avatar_url: result.Location,
      message: 'Avatar uploaded successfully'
    });

  } catch (error) {
    console.error('Avatar upload error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    }, { status: 500 });
  }
}
