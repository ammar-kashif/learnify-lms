import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type AccessType = 'lecture_recording' | 'live_class';
export type SubscriptionType = 'recordings_only' | 'live_classes_only' | 'recordings_and_live';

export interface AccessResult {
  hasAccess: boolean;
  accessType: 'subscription' | 'demo' | 'none';
  subscription?: {
    id: string;
    planName: string;
    planType: SubscriptionType;
    expiresAt: string;
  };
  demoAccess?: {
    id: string;
    accessType: AccessType;
    expiresAt: string;
  };
  message?: string;
}

/**
 * Check if user has access to a specific resource in a course
 */
export async function checkUserAccess(
  userId: string,
  courseId: string,
  resourceType: AccessType
): Promise<AccessResult> {
  try {
    // FIRST: Check for regular enrollment (paid or demo)
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('student_enrollments')
      .select('enrollment_type')
      .eq('student_id', userId)
      .eq('course_id', courseId)
      .maybeSingle();

    if (!enrollmentError && enrollment) {
      if (enrollment.enrollment_type === 'paid') {
        // User has paid enrollment - full access to all content
        return {
          hasAccess: true,
          accessType: 'subscription', // Treat paid enrollment as subscription access
          message: 'Paid enrollment access'
        };
      } else if (enrollment.enrollment_type === 'demo') {
        // User has demo enrollment - limited access
        return {
          hasAccess: true,
          accessType: 'demo',
          message: 'Demo enrollment access'
        };
      }
    }

    // SECOND: Check for active subscription
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select(`
        id,
        status,
        expires_at,
        subscription_plans (
          name,
          type
        )
      `)
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (!subError && subscription) {
      const planType = subscription.subscription_plans?.[0]?.type as SubscriptionType;
      
      // Check if subscription covers the requested resource type
      const hasSubscriptionAccess = 
        (resourceType === 'lecture_recording' && 
         (planType === 'recordings_only' || planType === 'recordings_and_live')) ||
        (resourceType === 'live_class' && 
         (planType === 'live_classes_only' || planType === 'recordings_and_live'));

      if (hasSubscriptionAccess) {
        return {
          hasAccess: true,
          accessType: 'subscription',
          subscription: {
            id: subscription.id,
            planName: subscription.subscription_plans?.[0]?.name,
            planType: planType,
            expiresAt: subscription.expires_at
          }
        };
      }
    }

    // Check for demo access
    const { data: demoAccess, error: demoError } = await supabase
      .from('demo_access')
      .select('*')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .eq('access_type', resourceType)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (!demoError && demoAccess) {
      return {
        hasAccess: true,
        accessType: 'demo',
        demoAccess: {
          id: demoAccess.id,
          accessType: demoAccess.access_type as AccessType,
          expiresAt: demoAccess.expires_at
        }
      };
    }

    // No access found
    return {
      hasAccess: false,
      accessType: 'none',
      message: `No ${resourceType} access found for this course`
    };

  } catch (error) {
    console.error('Error checking user access:', error);
    return {
      hasAccess: false,
      accessType: 'none',
      message: 'Error checking access permissions'
    };
  }
}

/**
 * Check if user can access lecture recordings for a course
 */
export async function canAccessLectureRecordings(
  userId: string,
  courseId: string
): Promise<AccessResult> {
  return checkUserAccess(userId, courseId, 'lecture_recording');
}

/**
 * Check if user can access live classes for a course
 */
export async function canAccessLiveClasses(
  userId: string,
  courseId: string
): Promise<AccessResult> {
  return checkUserAccess(userId, courseId, 'live_class');
}

/**
 * Check if user has used demo access for a specific course
 * Note: Demo access is now per-course, not global
 */
export async function hasUsedDemoAccessForCourse(userId: string, courseId: string): Promise<boolean> {
  try {
    const { data: demoAccess, error } = await supabase
      .from('demo_access')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !demoAccess) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error checking demo access for course:', error);
    return false;
  }
}

/**
 * Check if user is enrolled in a course (paid or demo)
 */
export async function isEnrolledInCourse(
  userId: string,
  courseId: string
): Promise<boolean> {
  try {
    const { data: enrollment, error } = await supabase
      .from('student_enrollments')
      .select('id')
      .eq('student_id', userId)
      .eq('course_id', courseId)
      .single();

    return !error && !!enrollment;
  } catch (error) {
    console.error('Error checking course enrollment:', error);
    return false;
  }
}

/**
 * Get user's subscription for a specific course
 */
export async function getUserSubscription(
  userId: string,
  courseId: string
): Promise<AccessResult['subscription'] | null> {
  try {
    const { data: subscription, error } = await supabase
      .from('user_subscriptions')
      .select(`
        id,
        expires_at,
        subscription_plans (
          name,
          type
        )
      `)
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !subscription) {
      return null;
    }

    return {
      id: subscription.id,
      planName: subscription.subscription_plans?.[0]?.name,
      planType: subscription.subscription_plans?.[0]?.type as SubscriptionType,
      expiresAt: subscription.expires_at
    };
  } catch (error) {
    console.error('Error getting user subscription:', error);
    return null;
  }
}

/**
 * Get available subscription plans for a specific type
 */
export async function getSubscriptionPlans(type?: SubscriptionType) {
  try {
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
      return [];
    }

    return plans || [];
  } catch (error) {
    console.error('Error getting subscription plans:', error);
    return [];
  }
}

