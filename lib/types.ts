// ===== ROVA LMS TypeScript Types =====
// Derived from mock-data.ts schema

export type Role = "admin" | "mentor" | "student";
export type Classification = "newbie" | "beginner" | "intermediate" | "advanced";
export type RiskTag = "normal" | "at_risk" | "watch" | "churned";
export type EnrollmentStatus = "active" | "paused" | "completed" | "dropped";
export type LessonStatus = "completed" | "in_progress" | "not_started";

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  avatar_url: string | null;
  date_of_birth: string;
  discord_id: string | null;
  role: Role;
  mentor_id: string | null;
  classification: Classification | null;
  onboarding_completed: boolean;
  pro_upgraded_at: string | null;
  upsale_upgraded_at: string | null;
  referral_source: string | null;
  risk_tag: RiskTag;
  last_active_date: string;
  last_login_at: string;
  created_at: string;
}

export interface MentorProfile {
  id: string;
  user_id: string;
  bio: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  price: number | string;
  created_at: string;
}

export interface Module {
  id: string;
  course_id: string;
  title: string;
  order_index: number;
}

export interface Lesson {
  id: string;
  module_id: string;
  title: string;
  thumbnail_url: string;
  video_url: string;
  materials: { type: string; label: string; url: string }[];
  duration_sec: number;
  order_index: number;
}

export interface Quiz {
  id: string;
  lesson_id: string;
  title: string;
  questions: {
    id: string;
    text: string;
    options: string[];
    correct: number;
  }[];
  pass_score: number;
}

export interface Assignment {
  id: string;
  lesson_id: string;
  title: string;
  description: string;
  materials: { type: string; label: string; url: string }[];
}

export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  status: EnrollmentStatus;
  progress_pct: number;
  target_days: number;
  enrolled_at: string;
  completed_at: string | null;
}

export interface LessonProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  status: LessonStatus;
  watched_seconds: number;
  time_spent_sec: number;
  last_position_sec: number;
  watch_count: number;
  started_at: string;
  completed_at: string | null;
  last_watched_at: string;
}

export interface Submission {
  id: string;
  assignment_id: string;
  user_id: string;
  image_urls: string[];
  metadata: {
    pair: string;
    timeframe: string;
    date: string;
    formula: string;
    direction: string;
    note: string;
  };
  annotated_image_urls: string[] | null;
  mentor_feedback: string | null;
  graded_at: string | null;
  submitted_at: string;
}

export interface MentorReview {
  id: string;
  mentor_id: string;
  student_id: string;
  rating: number;
  feedback: string;
  created_at: string;
}

export interface UserNote {
  id: string;
  user_id: string;
  author_id: string;
  content: string;
  created_at: string;
}
