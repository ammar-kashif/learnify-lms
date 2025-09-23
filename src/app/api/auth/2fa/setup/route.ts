import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import crypto from 'crypto';

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

    // Generate a secret key
    const secret = authenticator.generateSecret();
    
    // Generate the service name (your app name)
    const serviceName = 'Learnify LMS';
    const userEmail = user.email || 'user';
    
    // Create the TOTP URL
    const otpAuthUrl = authenticator.keyuri(userEmail, serviceName, secret);
    
    // Generate QR code
    const qrCode = await QRCode.toDataURL(otpAuthUrl);
    
    // Generate backup codes
    const backupCodes = Array.from({ length: 10 }, () => 
      Math.random().toString(36).substring(2, 10).toUpperCase()
    );

    // Persist secret and backup codes
    // Upsert 2FA settings
    await supabase
      .from('user_2fa_settings')
      .upsert({ user_id: user.id, secret, enabled: false }, { onConflict: 'user_id' });

    // Insert backup codes (hashed)
    const hashedCodes = backupCodes.map(code => ({
      user_id: user.id,
      code_hash: crypto.createHash('sha256').update(code).digest('hex'),
      used: false,
    }));
    await supabase
      .from('user_backup_codes')
      .delete()
      .eq('user_id', user.id);
    await supabase
      .from('user_backup_codes')
      .insert(hashedCodes);

    return NextResponse.json({
      secret,
      qr_code: qrCode,
      backup_codes: backupCodes,
      service_name: serviceName,
      user_email: userEmail
    });

  } catch (error) {
    console.error('2FA setup error:', error);
    return NextResponse.json(
      { error: 'Failed to setup 2FA' },
      { status: 500 }
    );
  }
}

