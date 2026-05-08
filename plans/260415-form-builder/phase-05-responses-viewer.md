# Phase 05 — Responses Viewer

## Context Links
- [Main Plan](plan.md)
- [Phase 01 — Database](phase-01-database-setup.md)
- [Phase 04 — Public Form](phase-04-public-form-page.md)

## Overview
- **Date:** 2026-04-15
- **Description:** Admin page to view form responses in table format with export capability
- **Priority:** P1
- **Status:** TODO

## Key Insights
- Each response = 1 row. Columns = respondent info + each question as a column
- Need to pivot form_answers into a flat row per response
- Export to CSV — standard browser-side generation, no server needed
- Questions may change after responses collected — column headers should use question_text from form_questions

## Requirements
1. Table view of all responses for a specific form
2. Columns: respondent name, email, phone, submitted_at, + one column per question
3. Sort by submitted_at (newest first)
4. Export to CSV
5. Delete individual responses
6. Response count summary
7. Back navigation to form builder or form list

## Architecture

### Route
`app/(dashboard)/admin/forms/[formId]/responses/page.tsx`

### Data Loading
```typescript
// 1. Load form (for title)
// 2. Load questions (for column headers), ordered by order_index
// 3. Load responses ordered by submitted_at DESC
// 4. Load all answers for these responses
// 5. Client-side: pivot answers into response rows
```

### Pivot Logic
```typescript
type ResponseRow = {
  id: string;
  respondent_name: string;
  respondent_email: string;
  respondent_phone: string;
  submitted_at: string;
  answers: Record<string, string>; // question_id -> answer_value
};
```

### CSV Export
```typescript
function exportCSV(questions: FormQuestion[], rows: ResponseRow[]) {
  const headers = ["Ho ten", "Email", "SDT", "Ngay gui", ...questions.map(q => q.question_text)];
  const csvRows = rows.map(r => [
    r.respondent_name, r.respondent_email, r.respondent_phone,
    new Date(r.submitted_at).toLocaleString("vi-VN"),
    ...questions.map(q => r.answers[q.id] || "")
  ]);
  // Generate CSV string, create Blob, trigger download
}
```

### Page Layout
```
Header: [< Back] "Phan hoi: {form title}" [Export CSV]
Summary: "{N} phan hoi" badge
---
Table:
  Columns: Ho ten | Email | SDT | Ngay gui | Q1 | Q2 | ... | Actions
  Rows: one per response
  Actions: [Delete]
---
Empty state if no responses
```

## Related Code Files
- `app/(dashboard)/admin/forms/[formId]/responses/page.tsx` — **NEW**
- `lib/types.ts` — uses FormResponse, FormAnswer types

## Implementation Steps
- [ ] Create page file with route param extraction
- [ ] Load form, questions, responses, answers
- [ ] Pivot answers into row format
- [ ] Render responsive table (horizontal scroll on mobile)
- [ ] Format dates with `toLocaleString("vi-VN")`
- [ ] Delete response handler (cascade deletes answers via FK)
- [ ] CSV export function
- [ ] Response count summary
- [ ] Empty state with illustration/message
- [ ] Back navigation links

## Todo List
- [ ] Page scaffold + data loading
- [ ] Pivot logic
- [ ] Table rendering
- [ ] CSV export
- [ ] Delete response
- [ ] Empty state
- [ ] Back navigation

## Success Criteria
- All responses displayed with correct answer mapping
- Table columns match current form questions
- CSV exports with correct Vietnamese headers and data
- Delete removes response + cascaded answers
- Works with 0, 1, and many responses
- Horizontal scroll on mobile for wide tables

## Risk Assessment
- **Medium:** Large number of responses (100+) could slow client-side pivot. Acceptable for MVP — paginate later if needed.
- **Low:** Question text changes after responses collected — answers still map by question_id, column headers reflect current question text. Minor UX quirk, acceptable.
- **Note:** Checkbox answers stored as comma-separated string in answer_value. CSV export should handle this gracefully (wrap in quotes).
