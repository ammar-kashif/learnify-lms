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
      .select('secret')
      .eq('user_id', user.id)
      .single();

    if (!settings?.secret) {
      return NextResponse.json({ error: '2FA not initialized' }, { status: 400 });
    }

    // Validate against the stored secret (allow small time window)
    authenticator.options = { window: 1 } as any;
    const isValid = authenticator.verify({ token: code.trim(), secret: settings.secret });
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Mark 2FA as enabled
    await supabase
      .from('user_2fa_settings')
      .update({ enabled: true })
      .eq('user_id', user.id);

    return NextResponse.json({
      success: true,
      message: '2FA setup verified successfully'
    });

  } catch (error) {
    console.error('2FA verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify 2FA setup' },
      { status: 500 }
    );
  }
}
