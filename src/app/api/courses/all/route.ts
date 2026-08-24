import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

/**
 * GET /api/courses/all
 *
 * The public catalogue behind /courses. Unauthenticated.
 *
 * This used to be a bare `select('*')` with no filter, so every row in the
 * table — including unfinished and test courses — was visible to anyone. It now
 * returns only published rows and only the columns the catalogue renders.
 *
 * `is_published` gates the PUBLIC catalogue only. Do not copy this filter into
 * the routes that serve a student their own enrolled courses: unpublished
 * courses still have live enrolments and subscriptions behind them.
 */
export async function GET(_request: NextRequest) {
  try {
    const { data: courses, error } = await supabase
      .from('courses')
      .select('id, title, description, level, board, subject, created_at, updated_at')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching courses:', error);
      return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
    }

    return NextResponse.json({
      courses: courses || [],
      count: courses?.length || 0,
    });
  } catch (error) {
    console.error('Unexpected error fetching courses:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
