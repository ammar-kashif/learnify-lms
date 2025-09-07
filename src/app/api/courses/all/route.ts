import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  try {
    console.log('🔄 Fetching all courses...');
    
    // Fetch all courses from the database
    const { data: courses, error } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching courses:', error);
      return NextResponse.json(
        { error: 'Failed to fetch courses' },
        { status: 500 }
      );
    }

    console.log('✅ Courses fetched successfully:', courses?.length || 0, 'courses');
    
    return NextResponse.json({ 
      courses: courses || [],
      count: courses?.length || 0
    });
  } catch (error) {
    console.error('💥 Unexpected error fetching courses:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

