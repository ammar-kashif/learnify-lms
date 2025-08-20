import { Course, Chapter, User, StudentEnrollment, TeacherCourse, Assignment, StudentProgress } from '@/types/dashboard';

// Mock Users
export const mockUsers: User[] = [
  {
    id: 'user-1',
    email: 'john.smith@cambridge.edu',
    full_name: 'John Smith',
    role: 'teacher',
    avatar_url: '/avatars/john-smith.jpg',
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z'
  },
  {
    id: 'user-2',
    email: 'sarah.johnson@cambridge.edu',
    full_name: 'Sarah Johnson',
    role: 'teacher',
    avatar_url: '/avatars/sarah-johnson.jpg',
    created_at: '2024-01-20T00:00:00Z',
    updated_at: '2024-01-20T00:00:00Z'
  },
  {
    id: 'user-3',
    email: 'michael.brown@cambridge.edu',
    full_name: 'Michael Brown',
    role: 'teacher',
    avatar_url: '/avatars/michael-brown.jpg',
    created_at: '2024-02-01T00:00:00Z',
    updated_at: '2024-02-01T00:00:00Z'
  },
  {
    id: 'user-4',
    email: 'emma.wilson@cambridge.edu',
    full_name: 'Emma Wilson',
    role: 'teacher',
    avatar_url: '/avatars/emma-wilson.jpg',
    created_at: '2024-02-10T00:00:00Z',
    updated_at: '2024-02-10T00:00:00Z'
  },
  {
    id: 'user-5',
    email: 'alex.chen@student.edu',
    full_name: 'Alex Chen',
    role: 'student',
    avatar_url: '/avatars/alex-chen.jpg',
    created_at: '2024-01-25T00:00:00Z',
    updated_at: '2024-01-25T00:00:00Z'
  },
  {
    id: 'user-6',
    email: 'sophia.rodriguez@student.edu',
    full_name: 'Sophia Rodriguez',
    role: 'student',
    avatar_url: '/avatars/sophia-rodriguez.jpg',
    created_at: '2024-02-05T00:00:00Z',
    updated_at: '2024-02-05T00:00:00Z'
  },
  {
    id: 'user-7',
    email: 'david.kim@student.edu',
    full_name: 'David Kim',
    role: 'student',
    avatar_url: '/avatars/david-kim.jpg',
    created_at: '2024-02-15T00:00:00Z',
    updated_at: '2024-02-15T00:00:00Z'
  }
];

// Mock Courses (Cambridge O Levels)
export const mockCourses: Course[] = [
  {
    id: 'course-1',
    title: 'Cambridge O Level Mathematics',
    subject: 'Mathematics',
    level: 'O Level',
    description: 'Comprehensive coverage of O Level Mathematics including algebra, geometry, trigonometry, and statistics.',
    thumbnail_url: '/courses/mathematics.jpg',
    duration_weeks: 24,
    price: 299.99,
    max_students: 30,
    current_students: 28,
    status: 'active',
    rating: 4.8,
    created_by: 'user-1',
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z'
  },
  {
    id: 'course-2',
    title: 'Cambridge O Level Physics',
    subject: 'Physics',
    level: 'O Level',
    description: 'Fundamental physics concepts including mechanics, electricity, waves, and modern physics.',
    thumbnail_url: '/courses/physics.jpg',
    duration_weeks: 20,
    price: 349.99,
    max_students: 25,
    current_students: 22,
    status: 'active',
    rating: 4.6,
    created_by: 'user-2',
    created_at: '2024-01-20T00:00:00Z',
    updated_at: '2024-01-20T00:00:00Z'
  },
  {
    id: 'course-3',
    title: 'Cambridge O Level Chemistry',
    subject: 'Chemistry',
    level: 'O Level',
    description: 'Core chemistry principles covering atomic structure, bonding, reactions, and organic chemistry.',
    thumbnail_url: '/courses/chemistry.jpg',
    duration_weeks: 22,
    price: 329.99,
    max_students: 28,
    current_students: 25,
    status: 'active',
    rating: 4.7,
    created_by: 'user-3',
    created_at: '2024-02-01T00:00:00Z',
    updated_at: '2024-02-01T00:00:00Z'
  },
  {
    id: 'course-4',
    title: 'Cambridge O Level Biology',
    subject: 'Biology',
    level: 'O Level',
    description: 'Life sciences including cell biology, genetics, ecology, and human physiology.',
    thumbnail_url: '/courses/biology.jpg',
    duration_weeks: 26,
    price: 319.99,
    max_students: 30,
    current_students: 27,
    status: 'active',
    rating: 4.5,
    created_by: 'user-4',
    created_at: '2024-02-10T00:00:00Z',
    updated_at: '2024-02-10T00:00:00Z'
  },
  {
    id: 'course-5',
    title: 'Cambridge O Level English Language',
    subject: 'English',
    level: 'O Level',
    description: 'Advanced English language skills including reading, writing, speaking, and listening.',
    thumbnail_url: '/courses/english.jpg',
    duration_weeks: 18,
    price: 279.99,
    max_students: 35,
    current_students: 32,
    status: 'active',
    rating: 4.9,
    created_by: 'user-1',
    created_at: '2024-01-25T00:00:00Z',
    updated_at: '2024-01-25T00:00:00Z'
  },
  {
    id: 'course-6',
    title: 'Cambridge O Level Computer Science',
    subject: 'Computer Science',
    level: 'O Level',
    description: 'Programming fundamentals, algorithms, data structures, and computer systems.',
    thumbnail_url: '/courses/computer-science.jpg',
    duration_weeks: 20,
    price: 369.99,
    max_students: 20,
    current_students: 18,
    status: 'active',
    rating: 4.4,
    created_by: 'user-2',
    created_at: '2024-02-05T00:00:00Z',
    updated_at: '2024-02-05T00:00:00Z'
  }
];

// Mock Chapters
export const mockChapters: Chapter[] = [
  // Mathematics Chapters
  {
    id: 'chapter-1',
    course_id: 'course-1',
    title: 'Algebra Fundamentals',
    description: 'Introduction to algebraic expressions, equations, and inequalities.',
    order: 1,
    duration_minutes: 90,
    video_url: '/videos/math-algebra-1.mp4',
    resources_url: '/resources/math-algebra-1.pdf',
    status: 'published',
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z'
  },
  {
    id: 'chapter-2',
    course_id: 'course-1',
    title: 'Geometry and Trigonometry',
    description: 'Plane geometry, coordinate geometry, and trigonometric functions.',
    order: 2,
    duration_minutes: 120,
    video_url: '/videos/math-geometry-1.mp4',
    resources_url: '/resources/math-geometry-1.pdf',
    status: 'published',
    created_at: '2024-01-20T00:00:00Z',
    updated_at: '2024-01-20T00:00:00Z'
  },
  {
    id: 'chapter-3',
    course_id: 'course-1',
    title: 'Statistics and Probability',
    description: 'Data analysis, probability theory, and statistical inference.',
    order: 3,
    duration_minutes: 100,
    video_url: '/videos/math-stats-1.mp4',
    resources_url: '/resources/math-stats-1.pdf',
    status: 'published',
    created_at: '2024-01-25T00:00:00Z',
    updated_at: '2024-01-25T00:00:00Z'
  },
  // Physics Chapters
  {
    id: 'chapter-4',
    course_id: 'course-2',
    title: 'Mechanics',
    description: 'Forces, motion, energy, and momentum.',
    order: 1,
    duration_minutes: 110,
    video_url: '/videos/physics-mechanics-1.mp4',
    resources_url: '/resources/physics-mechanics-1.pdf',
    status: 'published',
    created_at: '2024-01-20T00:00:00Z',
    updated_at: '2024-01-20T00:00:00Z'
  },
  {
    id: 'chapter-5',
    course_id: 'course-2',
    title: 'Electricity and Magnetism',
    description: 'Electric circuits, magnetic fields, and electromagnetic induction.',
    order: 2,
    duration_minutes: 95,
    video_url: '/videos/physics-electricity-1.mp4',
    resources_url: '/resources/physics-electricity-1.pdf',
    status: 'published',
    created_at: '2024-01-25T00:00:00Z',
    updated_at: '2024-01-25T00:00:00Z'
  },
  // Chemistry Chapters
  {
    id: 'chapter-6',
    course_id: 'course-3',
    title: 'Atomic Structure',
    description: 'Atoms, elements, and the periodic table.',
    order: 1,
    duration_minutes: 85,
    video_url: '/videos/chemistry-atomic-1.mp4',
    resources_url: '/resources/chemistry-atomic-1.pdf',
    status: 'published',
    created_at: '2024-02-01T00:00:00Z',
    updated_at: '2024-02-01T00:00:00Z'
  },
  {
    id: 'chapter-7',
    course_id: 'course-3',
    title: 'Chemical Bonding',
    description: 'Ionic, covalent, and metallic bonding.',
    order: 2,
    duration_minutes: 90,
    video_url: '/videos/chemistry-bonding-1.mp4',
    resources_url: '/resources/chemistry-bonding-1.pdf',
    status: 'published',
    created_at: '2024-02-05T00:00:00Z',
    updated_at: '2024-02-05T00:00:00Z'
  }
];

// Mock Student Enrollments
export const mockStudentEnrollments: StudentEnrollment[] = [
  {
    id: 'enrollment-1',
    student_id: 'user-5',
    course_id: 'course-1',
    enrolled_at: '2024-01-25T00:00:00Z',
    progress_percentage: 75,
    last_accessed: '2024-03-15T10:30:00Z',
    status: 'active'
  },
  {
    id: 'enrollment-2',
    student_id: 'user-5',
    course_id: 'course-2',
    enrolled_at: '2024-02-01T00:00:00Z',
    progress_percentage: 45,
    last_accessed: '2024-03-14T14:20:00Z',
    status: 'active'
  },
  {
    id: 'enrollment-3',
    student_id: 'user-6',
    course_id: 'course-1',
    enrolled_at: '2024-02-05T00:00:00Z',
    progress_percentage: 60,
    last_accessed: '2024-03-15T09:15:00Z',
    status: 'active'
  },
  {
    id: 'enrollment-4',
    student_id: 'user-6',
    course_id: 'course-3',
    enrolled_at: '2024-02-10T00:00:00Z',
    progress_percentage: 30,
    last_accessed: '2024-03-13T16:45:00Z',
    status: 'active'
  },
  {
    id: 'enrollment-5',
    student_id: 'user-7',
    course_id: 'course-4',
    enrolled_at: '2024-02-15T00:00:00Z',
    progress_percentage: 20,
    last_accessed: '2024-03-12T11:30:00Z',
    status: 'active'
  }
];

// Mock Teacher Courses
export const mockTeacherCourses: TeacherCourse[] = [
  {
    id: 'tc-1',
    teacher_id: 'user-1',
    course_id: 'course-1',
    assigned_at: '2024-01-15T00:00:00Z',
    is_primary: true
  },
  {
    id: 'tc-2',
    teacher_id: 'user-1',
    course_id: 'course-5',
    assigned_at: '2024-01-25T00:00:00Z',
    is_primary: true
  },
  {
    id: 'tc-3',
    teacher_id: 'user-2',
    course_id: 'course-2',
    assigned_at: '2024-01-20T00:00:00Z',
    is_primary: true
  },
  {
    id: 'tc-4',
    teacher_id: 'user-2',
    course_id: 'course-6',
    assigned_at: '2024-02-05T00:00:00Z',
    is_primary: true
  },
  {
    id: 'tc-5',
    teacher_id: 'user-3',
    course_id: 'course-3',
    assigned_at: '2024-02-01T00:00:00Z',
    is_primary: true
  },
  {
    id: 'tc-6',
    teacher_id: 'user-4',
    course_id: 'course-4',
    assigned_at: '2024-02-10T00:00:00Z',
    is_primary: true
  }
];

// Mock Assignments
export const mockAssignments: Assignment[] = [
  {
    id: 'assignment-1',
    chapter_id: 'chapter-1',
    title: 'Algebra Quiz 1',
    description: 'Solve linear equations and inequalities.',
    due_date: '2024-03-20T23:59:59Z',
    total_points: 25,
    submission_count: 28,
    created_at: '2024-03-10T00:00:00Z'
  },
  {
    id: 'assignment-2',
    chapter_id: 'chapter-2',
    title: 'Geometry Problem Set',
    description: 'Coordinate geometry and trigonometry problems.',
    due_date: '2024-03-25T23:59:59Z',
    total_points: 30,
    submission_count: 25,
    created_at: '2024-03-12T00:00:00Z'
  },
  {
    id: 'assignment-3',
    chapter_id: 'chapter-4',
    title: 'Physics Lab Report',
    description: 'Write a report on the mechanics experiment.',
    due_date: '2024-03-22T23:59:59Z',
    total_points: 40,
    submission_count: 20,
    created_at: '2024-03-08T00:00:00Z'
  }
];

// Mock Student Progress
export const mockStudentProgress: StudentProgress[] = [
  {
    student_id: 'user-5',
    course_id: 'course-1',
    chapter_id: 'chapter-1',
    completed: true,
    completed_at: '2024-03-01T00:00:00Z',
    score: 85,
    time_spent_minutes: 120
  },
  {
    student_id: 'user-5',
    course_id: 'course-1',
    chapter_id: 'chapter-2',
    completed: true,
    completed_at: '2024-03-10T00:00:00Z',
    score: 78,
    time_spent_minutes: 150
  },
  {
    student_id: 'user-5',
    course_id: 'course-1',
    chapter_id: 'chapter-3',
    completed: false,
    time_spent_minutes: 45
  },
  {
    student_id: 'user-6',
    course_id: 'course-1',
    chapter_id: 'chapter-1',
    completed: true,
    completed_at: '2024-03-05T00:00:00Z',
    score: 92,
    time_spent_minutes: 110
  },
  {
    student_id: 'user-6',
    course_id: 'course-1',
    chapter_id: 'chapter-2',
    completed: false,
    time_spent_minutes: 60
  }
];

// Helper functions
export const getCoursesByTeacher = (teacherId: string): Course[] => {
  const teacherCourseIds = mockTeacherCourses
    .filter(tc => tc.teacher_id === teacherId)
    .map(tc => tc.course_id);
  return mockCourses.filter(course => teacherCourseIds.includes(course.id));
};

export const getEnrollmentsByStudent = (studentId: string): StudentEnrollment[] => {
  return mockStudentEnrollments.filter(enrollment => enrollment.student_id === studentId);
};

export const getCoursesByStudent = (studentId: string): Course[] => {
  const enrolledCourseIds = mockStudentEnrollments
    .filter(enrollment => enrollment.student_id === studentId)
    .map(enrollment => enrollment.course_id);
  return mockCourses.filter(course => enrolledCourseIds.includes(course.id));
};

export const getChaptersByCourse = (courseId: string): Chapter[] => {
  return mockChapters
    .filter(chapter => chapter.course_id === courseId)
    .sort((a, b) => a.order - b.order);
};

export const getAssignmentsByCourse = (courseId: string): Assignment[] => {
  const courseChapterIds = mockChapters
    .filter(chapter => chapter.course_id === courseId)
    .map(chapter => chapter.id);
  return mockAssignments.filter(assignment => courseChapterIds.includes(assignment.chapter_id));
};
