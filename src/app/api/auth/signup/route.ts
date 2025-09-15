import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client with service role key (server-side only)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: NextRequest) {
  try {
    // Get the request body
    const { email, password, fullName, role } = await request.json();

    // Validate input
    if (!email || !password || !fullName || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate role
    if (!['student', 'teacher', 'admin', 'superadmin'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    console.log('🚀 Creating user via signup API:', { email, fullName, role });

    // Create auth user using service role
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: role
      }
    });

    if (authError) {
      console.error('❌ Auth user creation failed:', authError);
      return NextResponse.json(
        { error: `Failed to create auth user: ${authError.message}` },
        { status: 400 }
      );
    }

    console.log('✅ Auth user created successfully:', authData.user?.id);

    // Create user profile in the users table
    if (authData.user) {
      const userProfile = {
        id: authData.user.id,
        email,
        full_name: fullName,
        role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log('📝 Creating user profile:', userProfile);

      const { error: profileError } = await supabaseAdmin
        .from('users')
        .insert([userProfile]);

      if (profileError) {
        console.error('❌ Profile creation failed:', profileError);
        
        // Try to clean up the auth user if profile creation fails
        try {
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
          console.log('🧹 Cleaned up auth user after profile creation failure');
        } catch (cleanupError) {
          console.error('❌ Failed to cleanup auth user:', cleanupError);
        }
        
        return NextResponse.json(
          { error: `Failed to create user profile: ${profileError.message}` },
          { status: 400 }
        );
      }

      console.log('✅ User profile created successfully');
    }

    // Return success
    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      user: {
        id: authData.user?.id,
        email,
        full_name: fullName,
        role
      }
    });

  } catch (error) {
    console.error('💥 Unexpected error creating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
