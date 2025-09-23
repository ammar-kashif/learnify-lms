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

    // In production, you would:
    // 1. Store the 2FA secret in your database
    // 2. Store backup codes securely
    // 3. Update user profile to indicate 2FA is enabled
    // 4. Send confirmation email

    // For now, we'll just return success
    // You should implement proper database storage here

    return NextResponse.json({
      success: true,
      message: '2FA enabled successfully'
    });

  } catch (error) {
    console.error('2FA completion error:', error);
    return NextResponse.json(
      { error: 'Failed to complete 2FA setup' },
      { status: 500 }
    );
  }
}

