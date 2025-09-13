// Quiz Question Interface
export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_answer: number; // Index of correct option (0-based)
  points: number;
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
  selected_answer: number; // Index of selected option (0-based)
  is_correct: boolean;
  points_earned: number;
}

// Quiz Attempt Interface
export interface QuizAttempt {
  id: string;
  quiz_id: string;
  student_id: string;
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
