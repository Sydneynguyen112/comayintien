-- ============================================
-- ROVA LMS — Full Reset + Setup
-- XOÁ HẾT → TẠO LẠI TỪ ĐẦU
-- ============================================

-- Xoá hết tables cũ (thứ tự ngược để tránh lỗi foreign key)
DROP TABLE IF EXISTS blog_likes CASCADE;
DROP TABLE IF EXISTS blog_comments CASCADE;
DROP TABLE IF EXISTS blog_posts CASCADE;
DROP TABLE IF EXISTS mentor_reviews CASCADE;
DROP TABLE IF EXISTS lesson_progress CASCADE;
DROP TABLE IF EXISTS submissions CASCADE;
DROP TABLE IF EXISTS enrollments CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;
DROP TABLE IF EXISTS lessons CASCADE;
DROP TABLE IF EXISTS modules CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- ============================================
-- TẠO TABLES
-- ============================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('admin','mentor','student')),
  mentor_id UUID REFERENCES profiles(id),
  avatar_url TEXT,
  classification TEXT CHECK (classification IN ('newbie','beginner','intermediate','advanced')),
  risk_tag TEXT DEFAULT 'normal' CHECK (risk_tag IN ('normal','at_risk','watch','churned')),
  discord_handle TEXT,
  last_active_date TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  price BIGINT,
  price_label TEXT,
  thumbnail_url TEXT,
  total_lessons INT DEFAULT 0,
  total_duration_sec INT DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE modules (
  id TEXT PRIMARY KEY,
  course_id TEXT REFERENCES courses(id),
  title TEXT NOT NULL,
  order_index INT NOT NULL
);

CREATE TABLE lessons (
  id TEXT PRIMARY KEY,
  module_id TEXT REFERENCES modules(id),
  title TEXT NOT NULL,
  video_url TEXT,
  duration_sec INT DEFAULT 0,
  order_index INT NOT NULL,
  materials JSONB DEFAULT '[]'
);

CREATE TABLE assignments (
  id TEXT PRIMARY KEY,
  course_id TEXT REFERENCES courses(id),
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  materials JSONB DEFAULT '[]',
  order_index INT NOT NULL
);

CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id TEXT REFERENCES assignments(id),
  user_id UUID REFERENCES profiles(id),
  image_urls TEXT[] DEFAULT '{}',
  note TEXT,
  metadata JSONB DEFAULT '{}',
  mentor_feedback TEXT,
  graded_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  course_id TEXT REFERENCES courses(id),
  status TEXT DEFAULT 'active',
  progress_pct NUMERIC DEFAULT 0,
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  lesson_id TEXT REFERENCES lessons(id),
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed')),
  watch_count INT DEFAULT 0,
  last_watched_at TIMESTAMPTZ,
  UNIQUE(user_id, lesson_id)
);

-- Migration: nếu table đã tồn tại, chạy lệnh ALTER này:
-- ALTER TABLE lesson_progress ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'not_started';
-- ALTER TABLE lesson_progress ADD COLUMN IF NOT EXISTS watch_count INT DEFAULT 0;
-- ALTER TABLE lesson_progress ADD COLUMN IF NOT EXISTS last_watched_at TIMESTAMPTZ;

CREATE TABLE mentor_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID REFERENCES profiles(id),
  student_id UUID REFERENCES profiles(id),
  rating INT CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT DEFAULT 'article' CHECK (type IN ('article','podcast')),
  summary TEXT,
  content TEXT,
  cover_url TEXT,
  author_id UUID REFERENCES profiles(id),
  published BOOLEAN DEFAULT false,
  likes INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE blog_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES blog_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE blog_likes (
  post_id UUID REFERENCES blog_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  PRIMARY KEY (post_id, user_id)
);

-- ============================================
-- FORMS / SURVEY
-- ============================================

CREATE TABLE forms (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  form_type TEXT DEFAULT 'survey' CHECK (form_type IN ('survey','onboarding')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','published')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE form_questions (
  id TEXT PRIMARY KEY,
  form_id TEXT REFERENCES forms(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('text','textarea','radio','checkbox','select','rating')),
  options JSONB DEFAULT '[]',
  required BOOLEAN DEFAULT false,
  order_index INT NOT NULL
);

CREATE TABLE form_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id TEXT REFERENCES forms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  respondent_name TEXT,
  respondent_email TEXT,
  respondent_phone TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE form_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID REFERENCES form_responses(id) ON DELETE CASCADE,
  question_id TEXT REFERENCES form_questions(id) ON DELETE CASCADE,
  answer_value TEXT
);

-- ============================================
-- ROW LEVEL SECURITY + POLICIES
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_profiles" ON profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_courses" ON courses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_modules" ON modules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_lessons" ON lessons FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_assignments" ON assignments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_submissions" ON submissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_enrollments" ON enrollments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_lesson_progress" ON lesson_progress FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_mentor_reviews" ON mentor_reviews FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_blog_posts" ON blog_posts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_blog_comments" ON blog_comments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_blog_likes" ON blog_likes FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_forms" ON forms FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_form_questions" ON form_questions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_form_responses" ON form_responses FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_form_answers" ON form_answers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
