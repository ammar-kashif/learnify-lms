import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create admin client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { chapterId } = await request.json();

    if (!chapterId) {
      return NextResponse.json({ success: false, error: 'No chapter ID provided' }, { status: 400 });
    }

    console.log('Deleting chapter with ID:', chapterId);
    
    // First, let's check if the chapter exists
    const { data: existingChapter, error: fetchError } = await supabaseAdmin
      .from('chapters')
      .select('*')
      .eq('id', chapterId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching chapter before deletion:', fetchError);
      return NextResponse.json({ success: false, error: fetchError.message }, { status: 400 });
    }
    
    console.log('Chapter exists before deletion:', existingChapter);
    
    const { error, count } = await supabaseAdmin
      .from('chapters')
      .delete()
      .eq('id', chapterId)
      .select('*');

    if (error) {
      console.error('Error deleting chapter:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    console.log('Delete operation result - count:', count);
    console.log('Chapter deleted successfully from Supabase');
    
    return NextResponse.json({ 
      success: true, 
      deletedCount: count,
      message: 'Chapter deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting chapter:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete chapter',
    }, { status: 500 });
  }
}
