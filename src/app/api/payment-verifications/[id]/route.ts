import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Regular client for user authentication
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Service role client for database operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    
    // Verify the JWT token and get user using regular client
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('❌ Authentication error:', authError);
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    
    console.log('✅ User authenticated:', user.id);

    // Get user role from database using admin client
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Only superadmins can update payment verification status
    if (userProfile.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Only superadmins can update payment verification status' },
        { status: 403 }
      );
    }

    // Parse request body
    const { status, notes } = await request.json();

    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Valid status (approved/rejected) is required' },
        { status: 400 }
      );
    }

    const paymentId = params.id;
    console.log('🔍 Updating payment verification:', paymentId, 'with status:', status);

    // Get the payment verification details
    const { data: paymentVerification, error: fetchError } = await supabaseAdmin
      .from('payment_verifications')
      .select('id, student_id, course_id, status')
      .eq('id', paymentId)
      .single();

    if (fetchError || !paymentVerification) {
      return NextResponse.json(
        { error: 'Payment verification not found' },
        { status: 404 }
      );
    }

    // Check if already processed
    if (paymentVerification.status !== 'pending') {
      return NextResponse.json(
        { error: 'Payment verification has already been processed' },
        { status: 400 }
      );
    }

    // Update payment verification status
    const updateData: any = {
      status,
      verified_at: new Date().toISOString(),
      verified_by: user.id
    };

    if (notes) {
      updateData.notes = notes;
    }

    const { data: updatedPayment, error: updateError } = await supabaseAdmin
      .from('payment_verifications')
      .update(updateData)
      .eq('id', paymentId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating payment verification:', updateError);
      return NextResponse.json(
        { error: 'Failed to update payment verification' },
        { status: 500 }
      );
    }

    // If approved, enroll the student in the course
    if (status === 'approved') {
      console.log('🎓 Enrolling student:', paymentVerification.student_id, 'in course:', paymentVerification.course_id);
      
      const { error: enrollmentError } = await supabaseAdmin
        .from('student_enrollments')
        .insert({
          student_id: paymentVerification.student_id,
          course_id: paymentVerification.course_id
        });

      if (enrollmentError) {
        console.error('❌ Error enrolling student after payment approval:', enrollmentError);
        // Don't fail the request, just log the error
        // The payment verification is still updated
      } else {
        console.log('✅ Student enrolled successfully');
      }
    }

    return NextResponse.json({
      message: `Payment verification ${status} successfully`,
      paymentVerification: updatedPayment
    });

  } catch (error) {
    console.error('Error in payment verification update API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    
    // Verify the JWT token and get user using regular client
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('❌ Authentication error:', authError);
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    
    console.log('✅ User authenticated for delete:', user.id);

    // Get user role from database using admin client
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Only superadmins can delete payment verification entries
    if (userProfile.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Only superadmins can delete payment verification entries' },
        { status: 403 }
      );
    }

    const paymentId = params.id;
    console.log('🗑️ Deleting payment verification:', paymentId);

    // Delete the payment verification entry
    const { error: deleteError } = await supabaseAdmin
      .from('payment_verifications')
      .delete()
      .eq('id', paymentId);

    if (deleteError) {
      console.error('Error deleting payment verification:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete payment verification' },
        { status: 500 }
      );
    }

    console.log('✅ Payment verification deleted successfully');
    return NextResponse.json({
      message: 'Payment verification deleted successfully'
    });

  } catch (error) {
    console.error('Error in payment verification delete API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
