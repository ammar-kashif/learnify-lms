export type UserRole = 'student' | 'teacher' | 'admin';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  title: string;
  subject: string;
  level: 'O Level' | 'A Level' | 'IGCSE';
  description: string;
  thumbnail_url?: string;
  duration_weeks: number;
  price: number;
  max_students: number;
  current_students: number;
  status: 'active' | 'draft' | 'archived';
  rating: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Chapter {
  id: string;
  course_id: string;
  title: string;
  description: string;
  order: number;
  duration_minutes: number;
  video_url?: string;
  resources_url?: string;
  status: 'published' | 'draft';
  created_at: string;
  updated_at: string;
}

export interface StudentEnrollment {
  id: string;
  student_id: string;
  course_id: string;
  enrolled_at: string;
  progress_percentage: number;
  last_accessed: string;
  status: 'active' | 'completed' | 'dropped';
}

export interface TeacherCourse {
  id: string;
  teacher_id: string;
  course_id: string;
  assigned_at: string;
  is_primary: boolean;
}

export interface Assignment {
  id: string;
  chapter_id: string;
  title: string;
  description: string;
  due_date: string;
  total_points: number;
  submission_count: number;
  created_at: string;
}

export interface StudentProgress {
  student_id: string;
  course_id: string;
  chapter_id: string;
  completed: boolean;
  completed_at?: string;
  score?: number;
  time_spent_minutes: number;
}

export interface DashboardStats {
  total_courses: number;
  total_students: number;
  total_revenue: number;
  active_enrollments: number;
  completion_rate: number;
  average_score: number;
}

export interface NavigationItem {
  title: string;
  href: string;
  icon: string;
  badge?: string;
  children?: NavigationItem[];
}
