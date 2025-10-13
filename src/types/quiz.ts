// Quiz Question Interface
export interface QuizQuestion {
  id: string;
  question: string;
  type: 'multiple_choice' | 'text';
  options?: string[]; // Only for multiple choice
  correct_answer?: number; // Index of correct option (0-based) for multiple choice
  correct_text_answer?: string; // For text questions - teacher's expected answer
  points: number;
  requires_manual_grading?: boolean; // For text questions
}

// Quiz Settings Interface
export interface QuizSettings {
  time_limit?: number; // in minutes
  max_attempts?: number;
  shuffle_questions?: boolean;
  show_correct_answers?: boolean;
  allow_review?: boolean;
}

// Quiz Interface
export interface Quiz {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  questions: QuizQuestion[];
  settings: QuizSettings;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Student Answer Interface
export interface StudentAnswer {
  question_id: string;
  selected_answer?: number; // Index of selected option (0-based) for multiple choice
  text_answer?: string; // For text questions
  is_correct: boolean;
  points_earned: number;
  manually_graded?: boolean; // Whether this answer was manually graded
  teacher_feedback?: string; // Teacher's feedback for text questions
}

// Quiz Attempt Interface
export interface QuizAttempt {
  id: string;
  quiz_id: string;
  student_id: string;
  student_name?: string; // Added student name for display
  answers: StudentAnswer[];
  score: number;
  max_score: number;
  completed_at?: string;
  created_at: string;
}

// Quiz Creation/Update Interface
export interface CreateQuizData {
  course_id: string;
  title: string;
  description?: string;
  questions: Omit<QuizQuestion, 'id'>[];
  settings?: QuizSettings;
}

// Quiz Submission Interface
export interface SubmitQuizData {
  quiz_id: string;
  answers: Omit<StudentAnswer, 'is_correct' | 'points_earned'>[];
}

// Quiz Results Interface (for display)
export interface QuizResults {
  quiz: Quiz;
  attempt: QuizAttempt;
  percentage: number;
  passed: boolean;
  time_taken?: number; // in minutes
}
