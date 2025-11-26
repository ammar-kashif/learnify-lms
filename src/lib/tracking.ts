/**
 * Centralized tracking utility for user actions
 * Non-blocking - errors are logged but don't interrupt user flow
 */

export type ActionType =
  | 'video_play'
  | 'video_complete'
  | 'quiz_start'
  | 'quiz_complete'
  | 'assignment_submit'
  | 'page_view'
  | 'course_view'
  | 'enrollment_request'
  | 'payment_submit'
  | 'button_click'
  | 'form_submit'
  | 'form_start'
  | 'search_query'
  | 'download'
  | 'share'
  | 'bookmark'
  | 'login'
  | 'logout'
  | 'settings_change'
  | 'error_occurred'
  | 'modal_open'
  | 'modal_close'
  | 'tab_switch'
  | 'live_class_join'
  | 'live_class_leave'
  | 'feedback_submit'
  | 'bug_report_submit'
  | 'content_flag';

export type ResourceType =
  | 'lecture_recording'
  | 'quiz'
  | 'assignment'
  | 'course'
  | 'page'
  | 'live_class'
  | 'user_profile'
  | 'settings'
  | 'dashboard'
  | 'admin_panel'
  | 'button'
  | 'form'
  | 'modal'
  | 'tab';

export interface TrackingMetadata {
  [key: string]: any;
}

export interface TrackActionParams {
  action_type: ActionType;
  resource_type: ResourceType;
  resource_id?: string;
  course_id?: string;
  metadata?: TrackingMetadata;
  sessionToken?: string | null;
}

/**
 * Track a user action
 * This function is non-blocking and will not throw errors
 */
export async function trackAction(params: TrackActionParams): Promise<void> {
  try {
    const { action_type, resource_type, resource_id, course_id, metadata, sessionToken } = params;

    // Build headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (sessionToken) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
    }

    // Make API call - don't await to avoid blocking
    fetch('/api/tracking', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action_type,
        resource_type,
        resource_id: resource_id || null,
        course_id: course_id || null,
        metadata: metadata || {},
      }),
    }).catch((error) => {
      // Silently fail - tracking should not interrupt user experience
      console.debug('Tracking error (non-blocking):', error);
    });
  } catch (error) {
    // Silently fail - tracking should not interrupt user experience
    console.debug('Tracking error (non-blocking):', error);
  }
}

/**
 * Track video play event
 */
export function trackVideoPlay(
  recordingId: string,
  courseId: string,
  metadata?: TrackingMetadata,
  sessionToken?: string | null
): void {
  trackAction({
    action_type: 'video_play',
    resource_type: 'lecture_recording',
    resource_id: recordingId,
    course_id: courseId,
    metadata,
    sessionToken,
  });
}

/**
 * Track video completion event
 */
export function trackVideoComplete(
  recordingId: string,
  courseId: string,
  metadata?: TrackingMetadata,
  sessionToken?: string | null
): void {
  trackAction({
    action_type: 'video_complete',
    resource_type: 'lecture_recording',
    resource_id: recordingId,
    course_id: courseId,
    metadata,
    sessionToken,
  });
}

/**
 * Track page view
 */
export function trackPageView(
  pagePath: string,
  metadata?: TrackingMetadata,
  sessionToken?: string | null
): void {
  trackAction({
    action_type: 'page_view',
    resource_type: 'page',
    resource_id: pagePath,
    metadata: {
      page_url: typeof window !== 'undefined' ? window.location.href : pagePath,
      ...metadata,
    },
    sessionToken,
  });
}

/**
 * Track course view
 */
export function trackCourseView(
  courseId: string,
  metadata?: TrackingMetadata,
  sessionToken?: string | null
): void {
  trackAction({
    action_type: 'course_view',
    resource_type: 'course',
    resource_id: courseId,
    course_id: courseId,
    metadata,
    sessionToken,
  });
}

/**
 * Track quiz start
 */
export function trackQuizStart(
  quizId: string,
  courseId: string,
  metadata?: TrackingMetadata,
  sessionToken?: string | null
): void {
  trackAction({
    action_type: 'quiz_start',
    resource_type: 'quiz',
    resource_id: quizId,
    course_id: courseId,
    metadata,
    sessionToken,
  });
}

/**
 * Track quiz completion
 */
export function trackQuizComplete(
  quizId: string,
  courseId: string,
  score?: number,
  metadata?: TrackingMetadata,
  sessionToken?: string | null
): void {
  trackAction({
    action_type: 'quiz_complete',
    resource_type: 'quiz',
    resource_id: quizId,
    course_id: courseId,
    metadata: {
      score,
      ...metadata,
    },
    sessionToken,
  });
}

/**
 * Track assignment submission
 */
export function trackAssignmentSubmit(
  assignmentId: string,
  courseId: string,
  metadata?: TrackingMetadata,
  sessionToken?: string | null
): void {
  trackAction({
    action_type: 'assignment_submit',
    resource_type: 'assignment',
    resource_id: assignmentId,
    course_id: courseId,
    metadata,
    sessionToken,
  });
}

/**
 * Track enrollment request
 */
export function trackEnrollmentRequest(
  courseId: string,
  enrollmentType: 'demo' | 'paid',
  metadata?: TrackingMetadata,
  sessionToken?: string | null
): void {
  trackAction({
    action_type: 'enrollment_request',
    resource_type: 'course',
    resource_id: courseId,
    course_id: courseId,
    metadata: {
      enrollment_type: enrollmentType,
      ...metadata,
    },
    sessionToken,
  });
}

/**
 * Track payment submission
 */
export function trackPaymentSubmit(
  courseId: string,
  amount: number,
  planId?: string,
  metadata?: TrackingMetadata,
  sessionToken?: string | null
): void {
  trackAction({
    action_type: 'payment_submit',
    resource_type: 'course',
    resource_id: courseId,
    course_id: courseId,
    metadata: {
      amount,
      subscription_plan_id: planId,
      ...metadata,
    },
    sessionToken,
  });
}

