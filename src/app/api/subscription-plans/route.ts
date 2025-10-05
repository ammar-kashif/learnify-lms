import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/subscription-plans - Fetch all active subscription plans
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // Optional filter by type

    let query = supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price_pkr', { ascending: true });

    if (type) {
      query = query.eq('type', type);
    }

    const { data: plans, error } = await query;

    if (error) {
      console.error('Error fetching subscription plans:', error);
      return NextResponse.json(
        { error: 'Failed to fetch subscription plans' },
        { status: 500 }
      );
    }

    return NextResponse.json({ plans });
  } catch (error) {
    console.error('Error in subscription plans API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/subscription-plans - Create new subscription plan (Admin only)
export async function POST(request: NextRequest) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin or superadmin
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userProfile || !['admin', 'superadmin'].includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, type, duration_months, duration_until_date, price_pkr, features } = body;

    // Validate required fields
    if (!name || !type || !price_pkr) {
      return NextResponse.json(
        { error: 'Missing required fields: name, type, price_pkr' },
        { status: 400 }
      );
    }

    // Validate type
    if (!['recordings_only', 'live_classes_only', 'recordings_and_live'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be one of: recordings_only, live_classes_only, recordings_and_live' },
        { status: 400 }
      );
    }

    // Validate duration (either duration_months or duration_until_date, not both)
    if (duration_months && duration_until_date) {
      return NextResponse.json(
        { error: 'Cannot specify both duration_months and duration_until_date' },
        { status: 400 }
      );
    }

    if (!duration_months && !duration_until_date) {
      return NextResponse.json(
        { error: 'Must specify either duration_months or duration_until_date' },
        { status: 400 }
      );
    }

    const { data: plan, error: insertError } = await supabase
      .from('subscription_plans')
      .insert({
        name,
        type,
        duration_months,
        duration_until_date,
        price_pkr,
        features: features || []
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating subscription plan:', insertError);
      return NextResponse.json(
        { error: 'Failed to create subscription plan' },
        { status: 500 }
      );
    }

    return NextResponse.json({ plan }, { status: 201 });
  } catch (error) {
    console.error('Error in subscription plans POST API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

