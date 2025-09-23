import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code || code.length < 8) {
      return NextResponse.json(
        { error: 'Invalid backup code' },
        { status: 400 }
      );
    }

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

    // Check against hashed backup codes
    const crypto = await import('crypto');
    const hash = crypto.createHash('sha256').update(code).digest('hex');
    const { data: found } = await supabase
      .from('user_backup_codes')
      .select('id, used')
      .eq('user_id', user.id)
      .eq('code_hash', hash)
      .eq('used', false)
      .maybeSingle();

    const isValidCode = !!found;
    
    if (!isValidCode) {
      return NextResponse.json(
        { error: 'Invalid backup code' },
        { status: 400 }
      );
    }

    // Mark code as used
    if (found) {
      await supabase
        .from('user_backup_codes')
        .update({ used: true, used_at: new Date().toISOString() })
        .eq('id', found.id);
    }

    return NextResponse.json({
      success: true,
      message: 'Backup code verification successful'
    });

  } catch (error) {
    console.error('Backup code verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify backup code' },
      { status: 500 }
    );
  }
}

