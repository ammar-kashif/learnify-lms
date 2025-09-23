import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticator } from 'otplib';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code || code.length !== 6) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
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

    // Load user's secret
    const { data: settings } = await supabase
      .from('user_2fa_settings')
      .select('secret, enabled')
      .eq('user_id', user.id)
      .single();

    if (!settings?.enabled) {
      return NextResponse.json({ error: '2FA not enabled' }, { status: 400 });
    }

    // Validate token
    authenticator.options = { window: 1 } as any;
    const isValid = authenticator.verify({ token: code.trim(), secret: settings.secret });
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // In production, you would:
    // 1. Update the session to mark 2FA as verified
    // 2. Log the successful 2FA verification
    // 3. Possibly update last login timestamp

    return NextResponse.json({
      success: true,
      message: '2FA verification successful'
    });

  } catch (error) {
    console.error('2FA verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify 2FA code' },
      { status: 500 }
    );
  }
}
