# Phase 03 — Form Builder Page

## Context Links
- [Main Plan](plan.md)
- [Phase 01 — Database](phase-01-database-setup.md)
- [Courses Page Pattern](../../app/(dashboard)/admin/courses/page.tsx)

## Overview
- **Date:** 2026-04-15
- **Description:** Interactive form builder where admin adds/edits/deletes/reorders questions
- **Priority:** P0
- **Status:** TODO

## Key Insights
- Courses page manages modules+lessons in expandable sections — similar nested UX needed here
- `order_index` reordering pattern: swap values between adjacent items, update both in DB
- Question types each need different option editors (radio/checkbox/select need options list, rating/text/textarea do not)
- JSONB `options` field stores array of strings for choice-based questions

## Requirements
1. Display form title + description (editable inline or via dialog)
2. List all questions ordered by `order_index`
3. Add question via Dialog (type selector, question text, required toggle, options if applicable)
4. Edit question inline or via Dialog
5. Delete question with confirmation
6. Reorder questions with up/down buttons
7. Preview mode — render form as student would see it
8. Back navigation to `/admin/forms`

## Architecture

### Route
`app/(dashboard)/admin/forms/[formId]/page.tsx`

### State
```typescript
const [form, setForm] = useState<Form | null>(null);
const [questions, setQuestions] = useState<FormQuestion[]>([]);
const [questionDialog, setQuestionDialog] = useState(false);
const [editingQuestion, setEditingQuestion] = useState<FormQuestion | null>(null);
const [previewMode, setPreviewMode] = useState(false);
```

### Question Dialog Fields
- `question_text` — Input
- `question_type` — Select dropdown (text, textarea, radio, checkbox, select, rating)
- `required` — Checkbox toggle
- `options` — Dynamic list (add/remove) — only shown when type is radio/checkbox/select

### Reorder Logic
```
function moveQuestion(questionId, direction: 'up' | 'down'):
  1. Find question index in sorted array
  2. Swap order_index with adjacent question
  3. Update both rows in Supabase
  4. Reload questions
```

### Preview Mode
- Toggle button switches between builder view and preview view
- Preview renders questions using the same components as public form page
- Read-only, no submit functionality

### Page Layout
```
Header: [< Back] "Form: {title}" [Preview] [Published badge]
Form info: title (editable), description (editable)
---
Questions list:
  Each question card:
    - Order number + question text
    - Type badge
    - Required indicator
    - Options list (if applicable)
    - Actions: [Up] [Down] [Edit] [Delete]
---
Footer: [+ Them cau hoi] button
```

## Related Code Files
- `app/(dashboard)/admin/forms/[formId]/page.tsx` — **NEW**
- `lib/types.ts` — uses Form, FormQuestion types from Phase 01

## Implementation Steps
- [ ] Create page file with route param extraction
- [ ] Load form + questions on mount
- [ ] Render form header with editable title/description
- [ ] Render questions list sorted by order_index
- [ ] Add question Dialog with type-dependent fields
- [ ] Options editor sub-component (add/remove string items for radio/checkbox/select)
- [ ] Edit question — populate dialog with existing data
- [ ] Delete question with confirm
- [ ] Reorder up/down — swap order_index values
- [ ] Preview mode toggle — render questions as form
- [ ] Back button to `/admin/forms`

## Todo List
- [ ] Page scaffold + data loading
- [ ] Form header (editable title/desc)
- [ ] Question list rendering
- [ ] Add question dialog
- [ ] Options editor (dynamic list)
- [ ] Edit question
- [ ] Delete question
- [ ] Reorder (up/down)
- [ ] Preview toggle
- [ ] Type-specific rendering (rating stars, radio groups, etc.)

## Success Criteria
- All 6 question types can be created with correct options
- Reorder persists to DB and UI updates immediately
- Preview shows accurate representation of public form
- Editing a question preserves all fields
- Deleting a question reindexes remaining questions

## Risk Assessment
- **Medium:** Options editor UX — adding/removing options dynamically requires careful state management. Keep it simple: array of strings with add/remove buttons, no drag-and-drop.
- **Low:** Reorder logic is straightforward swap — edge cases at first/last position (disable respective button).
- **Note:** Preview component should be extracted as shared component reused in Phase 04 public page.
