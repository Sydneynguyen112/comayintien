# Phase 04 — Public Form Page

## Context Links
- [Main Plan](plan.md)
- [Phase 01 — Database](phase-01-database-setup.md)
- [Phase 03 — Builder](phase-03-form-builder-page.md)

## Overview
- **Date:** 2026-04-15
- **Description:** Standalone public form page — no auth, no sidebar, ROVA branding, gold theme
- **Priority:** P0
- **Status:** TODO

## Key Insights
- App has `(marketing)` route group — public pages without dashboard layout. Form page goes here.
- No auth required — anyone with the link can submit
- Must validate: form exists AND status === 'published', else show 404/draft message
- Gold luxury theme must be applied — consistent with ROVA brand
- Vietnamese UI labels

## Requirements
1. Standalone page at `/forms/[formId]` — no sidebar, no auth
2. Load form metadata + questions (only if published)
3. Respondent info fields: name, email, phone (at top)
4. Render all question types correctly
5. Client-side validation (required fields)
6. Submit: insert `form_response` + `form_answers` in transaction
7. Success screen after submit (animated, ROVA branded)
8. Error/404 for non-existent or draft forms

## Architecture

### Route
`app/(marketing)/forms/[formId]/page.tsx`

### State
```typescript
const [form, setForm] = useState<Form | null>(null);
const [questions, setQuestions] = useState<FormQuestion[]>([]);
const [answers, setAnswers] = useState<Record<string, string>>({});
const [respondent, setRespondent] = useState({ name: "", email: "", phone: "" });
const [submitting, setSubmitting] = useState(false);
const [submitted, setSubmitted] = useState(false);
const [notFound, setNotFound] = useState(false);
```

### Question Type Renderers
| Type | Component |
|------|-----------|
| text | `<Input />` |
| textarea | `<Textarea />` or `<Input />` multiline |
| radio | Radio group with gold accent |
| checkbox | Checkbox group |
| select | `<Select />` dropdown |
| rating | 5 star buttons (filled/empty) with gold color |

### Submit Flow
1. Validate required fields (respondent email + required questions)
2. Insert `form_responses` row, get back `id`
3. Insert all `form_answers` rows with `response_id`
4. Show success screen

### Page Layout
```
Centered container (max-w-2xl), dark bg
---
ROVA logo + gold accent line
Form title (H1) + description
---
Respondent section:
  Name, Email*, Phone inputs
---
Questions:
  Each question with type-appropriate input
  Required indicator (*)
---
[Submit button — gold primary]
---
Success screen (AnimatePresence):
  Checkmark animation
  "Cam on ban da gui bieu mau!"
  ROVA branding footer
```

## Related Code Files
- `app/(marketing)/forms/[formId]/page.tsx` — **NEW**
- Possibly `app/(marketing)/layout.tsx` — verify exists, may need minimal layout (no sidebar)

## Implementation Steps
- [ ] Verify `(marketing)` layout exists and has no sidebar
- [ ] Create page at `app/(marketing)/forms/[formId]/page.tsx`
- [ ] Load form + questions, check status === 'published'
- [ ] Render 404/draft state if not found or not published
- [ ] Respondent info section (name, email, phone)
- [ ] Question renderer per type:
  - [ ] Text input
  - [ ] Textarea
  - [ ] Radio group
  - [ ] Checkbox group
  - [ ] Select dropdown
  - [ ] Rating stars (1-5)
- [ ] Client-side validation for required fields
- [ ] Submit handler: insert response + answers
- [ ] Success screen with animation
- [ ] ROVA branding header + footer
- [ ] Mobile responsive layout
- [ ] Gold theme styling (dark bg, gold accents)

## Todo List
- [ ] Check marketing layout
- [ ] Page scaffold
- [ ] Form loading + validation
- [ ] Respondent fields
- [ ] 6 question type renderers
- [ ] Validation logic
- [ ] Submit to Supabase
- [ ] Success screen
- [ ] Responsive + themed styling

## Success Criteria
- Public link works without authentication
- Draft forms show appropriate message (not the form)
- All 6 question types render and collect data correctly
- Required field validation prevents incomplete submissions
- Data persists correctly in form_responses + form_answers
- Success screen displays after submission
- Mobile-friendly layout
- Gold theme consistent with ROVA brand

## Risk Assessment
- **Medium:** Supabase anon key must have INSERT permission on form_responses and form_answers — RLS policies allow this (allow_all pattern). No security concern since forms are public by design.
- **Low:** Multi-step insert (response then answers) — if answers insert fails, orphan response row. Acceptable for MVP. Could wrap in Supabase RPC function later if needed.
- **Note:** Consider adding rate limiting or CAPTCHA in future to prevent spam submissions.
