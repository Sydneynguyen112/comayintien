# Phase 01 — Database Setup

## Context Links
- [Main Plan](plan.md)
- [Existing DB Schema](../../supabase-setup.sql)

## Overview
- **Date:** 2026-04-15
- **Description:** Create 4 Supabase tables for the form builder feature
- **Priority:** P0
- **Status:** TODO

## Key Insights
- Existing project uses TEXT PK with `genId(prefix)` for entity tables (courses, modules, lessons)
- UUID PK used for join/transactional tables (submissions, enrollments)
- RLS enabled on all tables with permissive `allow_all` policies (same pattern to follow)
- JSONB used for flexible data (lessons.materials) — same approach for question options

## Requirements
1. `forms` table — stores form metadata and publish status
2. `form_questions` table — stores questions with type, options, ordering
3. `form_responses` table — stores respondent info per submission
4. `form_answers` table — stores individual answers per question

## Architecture

### Table: `forms`
```sql
CREATE TABLE forms (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','published')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Table: `form_questions`
```sql
CREATE TABLE form_questions (
  id TEXT PRIMARY KEY,
  form_id TEXT REFERENCES forms(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('text','textarea','radio','checkbox','select','rating')),
  options JSONB DEFAULT '[]',
  required BOOLEAN DEFAULT false,
  order_index INT NOT NULL
);
```

### Table: `form_responses`
```sql
CREATE TABLE form_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id TEXT REFERENCES forms(id) ON DELETE CASCADE,
  respondent_name TEXT,
  respondent_email TEXT,
  respondent_phone TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now()
);
```

### Table: `form_answers`
```sql
CREATE TABLE form_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID REFERENCES form_responses(id) ON DELETE CASCADE,
  question_id TEXT REFERENCES form_questions(id) ON DELETE CASCADE,
  answer_value TEXT
);
```

### RLS Policies
```sql
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_forms" ON forms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_form_questions" ON form_questions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_form_responses" ON form_responses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_form_answers" ON form_answers FOR ALL USING (true) WITH CHECK (true);
```

## Related Code Files
- `supabase-setup.sql` — append new tables
- `lib/types.ts` — add TypeScript interfaces

### TypeScript Types to Add
```typescript
export type FormStatus = "draft" | "published";
export type QuestionType = "text" | "textarea" | "radio" | "checkbox" | "select" | "rating";

export interface Form {
  id: string;
  title: string;
  description: string | null;
  status: FormStatus;
  created_at: string;
  updated_at: string;
}

export interface FormQuestion {
  id: string;
  form_id: string;
  question_text: string;
  question_type: QuestionType;
  options: string[];
  required: boolean;
  order_index: number;
}

export interface FormResponse {
  id: string;
  form_id: string;
  respondent_name: string | null;
  respondent_email: string | null;
  respondent_phone: string | null;
  submitted_at: string;
}

export interface FormAnswer {
  id: string;
  response_id: string;
  question_id: string;
  answer_value: string | null;
}
```

## Implementation Steps
- [ ] Append SQL to `supabase-setup.sql`
- [ ] Run SQL in Supabase dashboard or via CLI
- [ ] Add TypeScript interfaces to `lib/types.ts`
- [ ] Verify tables exist via Supabase dashboard

## Todo List
- [ ] Write SQL migration
- [ ] Add types
- [ ] Verify in Supabase

## Success Criteria
- All 4 tables created with correct constraints and FKs
- RLS policies active
- TypeScript types match DB schema exactly
- ON DELETE CASCADE on form_id and response_id FKs

## Risk Assessment
- **Low:** Schema is straightforward, follows existing patterns
- **Note:** `ON DELETE CASCADE` on form_questions and form_answers — deleting a form cascades to all related data. This is intentional for simplicity but admin should see a confirmation dialog.
