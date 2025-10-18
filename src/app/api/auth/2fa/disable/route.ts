import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Get the current user from the session
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Disable 2FA by setting enabled to false and clearing the secret
    const { error: disableError } = await supabase
      .from('user_2fa_settings')
      .update({ 
        enabled: false,
        secret: '', // Use empty string instead of null due to NOT NULL constraint
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (disableError) {
      console.error('Error disabling 2FA:', disableError);
      return NextResponse.json(
        { error: 'Failed to disable 2FA' },
        { status: 500 }
      );
    }

    // Invalidate all backup codes by marking them as used
    const { error: backupError } = await supabase
      .from('user_backup_codes')
      .update({ used: true })
      .eq('user_id', user.id)
      .eq('used', false);

    if (backupError) {
      console.error('Error invalidating backup codes:', backupError);
      // Don't fail the request if backup code cleanup fails
    }

    return NextResponse.json({
      success: true,
      message: '2FA disabled successfully'
    });

  } catch (error) {
    console.error('2FA disable error:', error);
    return NextResponse.json(
      { error: 'Failed to disable 2FA' },
      { status: 500 }
    );
  }
}

