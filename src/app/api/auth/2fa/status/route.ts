import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
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

    // Check 2FA status from the database
    const { data: settings, error: settingsError } = await supabase
      .from('user_2fa_settings')
      .select('enabled, updated_at')
      .eq('user_id', user.id)
      .single();

    if (settingsError && settingsError.code !== 'PGRST116') {
      console.error('2FA status fetch error:', settingsError);
    }

    const { count: backupCount } = await supabase
      .from('user_backup_codes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('used', false);

    return NextResponse.json({
      enabled: settings?.enabled ?? false,
      last_enabled: settings?.updated_at ?? null,
      backup_codes_count: backupCount ?? 0
    });

  } catch (error) {
    console.error('2FA status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check 2FA status' },
      { status: 500 }
    );
  }
}

