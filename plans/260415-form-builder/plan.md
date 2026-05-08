# Form Builder Feature — Implementation Plan

## Overview
Google Forms-like feature for ROVA LMS. Admin creates forms with various question types, publishes them via public landing page link for students/leads to fill.

## Scope
- 4 new Supabase tables (forms, form_questions, form_responses, form_answers)
- 3 admin pages (list, builder, responses)
- 1 public page (standalone form + success screen)
- Sidebar nav update

## Phases

| # | Phase | Priority | Status | File |
|---|-------|----------|--------|------|
| 1 | Database Setup | P0 | TODO | [phase-01](phase-01-database-setup.md) |
| 2 | Admin Form List | P0 | TODO | [phase-02](phase-02-admin-form-list.md) |
| 3 | Form Builder Page | P0 | TODO | [phase-03](phase-03-form-builder-page.md) |
| 4 | Public Form Page | P0 | TODO | [phase-04](phase-04-public-form-page.md) |
| 5 | Responses Viewer | P1 | TODO | [phase-05](phase-05-responses-viewer.md) |

## Dependencies
- Phase 1 must complete first (DB tables)
- Phase 2-3 can start in parallel after Phase 1
- Phase 4 depends on Phase 1 (reads forms + questions)
- Phase 5 depends on Phase 4 (needs response data)

## Architecture Decisions
- Follow existing pattern: `"use client"` pages with direct Supabase calls
- ID generation: `genId(prefix)` helper (matches courses page pattern)
- Public form page under `app/(marketing)/forms/[formId]/page.tsx` (no sidebar/auth layout)
- Question options stored as JSONB array of strings
- Reorder via up/down buttons updating `order_index` (no drag-and-drop library needed)

## Estimated Effort
~3-4 days for a single developer. Phase 1: 0.5d, Phase 2: 0.5d, Phase 3: 1d, Phase 4: 0.5d, Phase 5: 0.5-1d.

## Files Created/Modified
- **New:** `supabase-setup.sql` additions (4 tables + RLS)
- **New:** `app/(dashboard)/admin/forms/page.tsx`
- **New:** `app/(dashboard)/admin/forms/[formId]/page.tsx`
- **New:** `app/(dashboard)/admin/forms/[formId]/responses/page.tsx`
- **New:** `app/(marketing)/forms/[formId]/page.tsx`
- **New:** `lib/types.ts` additions (Form types)
- **Modified:** `components/layout/Sidebar.tsx` (add Forms nav)
