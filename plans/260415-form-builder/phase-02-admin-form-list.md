# Phase 02 — Admin Form List Page

## Context Links
- [Main Plan](plan.md)
- [Phase 01 — Database](phase-01-database-setup.md)
- [Example CRUD Page](../../app/(dashboard)/admin/courses/page.tsx)
- [Sidebar](../../components/layout/Sidebar.tsx)

## Overview
- **Date:** 2026-04-15
- **Description:** Admin page listing all forms with CRUD operations, publish toggle, copy link
- **Priority:** P0
- **Status:** TODO

## Key Insights
- Courses page pattern: `"use client"`, useState for data + dialog states, direct supabase calls, Dialog for create/edit
- genId(prefix) for TEXT PKs
- Toast via local state + setTimeout
- Vietnamese UI labels throughout
- Sidebar uses `adminNav` array with `{ href, label, icon }` objects

## Requirements
1. List all forms in a card/table layout
2. Create form via Dialog (title + description)
3. Edit form title/description via Dialog
4. Delete form with confirmation
5. Toggle status draft/published
6. Copy public link button
7. Response count badge per form
8. Link to builder page (`/admin/forms/[formId]`)
9. Link to responses page (`/admin/forms/[formId]/responses`)
10. Add "Forms" to sidebar adminNav

## Architecture
- Single `"use client"` page component at `app/(dashboard)/admin/forms/page.tsx`
- Load forms + response counts on mount via `useEffect`
- Response count: query `form_responses` grouped by form_id, or fetch all and count client-side
- Copy link: `navigator.clipboard.writeText(window.location.origin + "/forms/" + formId)`

### Page Layout
```
Header: "Quan ly Bieu mau" + [+ Tao moi] button
Cards grid (or table):
  Each card:
    - Title, description snippet
    - Status badge (draft=gray, published=green)
    - Response count badge
    - Actions: [Builder] [Responses] [Copy Link] [Edit] [Toggle Publish] [Delete]
```

## Related Code Files
- `app/(dashboard)/admin/forms/page.tsx` — **NEW**
- `components/layout/Sidebar.tsx` — **MODIFY** (add nav item)
- `lib/supabase.ts` — existing, no changes

### Sidebar Change
Add to `adminNav` array (after blog, before profile):
```typescript
{ href: "/admin/forms", label: "Bieu mau", icon: FileText },
```
Import `FileText` already imported in Sidebar.tsx.

## Implementation Steps
- [ ] Add `{ href: "/admin/forms", label: "Bieu mau", icon: FileText }` to `adminNav` in Sidebar.tsx (before profile item)
- [ ] Create `app/(dashboard)/admin/forms/page.tsx`
- [ ] Implement `loadData()`: fetch forms + form_responses counts
- [ ] Implement create form Dialog (title, description fields)
- [ ] Implement edit form Dialog
- [ ] Implement delete with `confirm()` dialog
- [ ] Implement publish/unpublish toggle (update status field)
- [ ] Implement copy public link (clipboard API)
- [ ] Add navigation links to builder and responses pages
- [ ] Show response count Badge per form

## Todo List
- [ ] Sidebar nav item
- [ ] Page scaffold with state
- [ ] Load data function
- [ ] Create dialog
- [ ] Edit dialog
- [ ] Delete handler
- [ ] Publish toggle
- [ ] Copy link
- [ ] Navigation to sub-pages

## Success Criteria
- Forms listed with all metadata visible
- CRUD operations work and reflect immediately
- Publish toggle updates status in DB
- Copy link produces correct public URL
- Response count shows accurate number
- Sidebar highlights correctly on `/admin/forms`

## Risk Assessment
- **Low:** Direct copy of courses page pattern, well-understood
- **Note:** Response count query could be N+1 — mitigate by fetching all responses with just form_id in a single query and counting client-side
