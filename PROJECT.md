# Features

## Project Setup
- Next.js 16 with App Router, TypeScript, Tailwind CSS
- Drizzle ORM with PostgreSQL (postgres-js driver, Neon-hosted) for data persistence
- Jest with ts-jest for testing (TDD)
- Database schema with tables: members, exclusive_groups, roles, member_roles, schedule_days, member_availability, holidays, schedules, schedule_entries, schedule_date_notes, schedule_rehearsal_dates, day_role_priorities

### Scripts
- `npm run dev` — Start the dev server
- `npm test` — Run tests
- `npm run test:watch` — Run tests in watch mode
- `npm run db:generate` — Generate a new migration after schema changes
- `npm run db:migrate` — Apply pending migrations
- `npm run db:studio` — Open Drizzle Studio to inspect the database

## Schedule Generation Algorithm
- Pure function in `src/lib/scheduler.ts` with types in `src/lib/scheduler.types.ts`
- Takes dates, roles (with required counts), and members (with roles, availability, holidays) as input
- **Round-robin rotation with per-day-of-week pointers**: For each role, an alphabetically-sorted list of capable members is maintained with a separate pointer for each day of the week. When filling a slot, the algorithm walks from that day's pointer until an eligible candidate is found (available that day, not on holiday, not blocked by exclusive group), assigns them, and advances the pointer. This ensures each day of the week has its own independent rotation (e.g., the Wednesday drummer rotation is separate from Sunday's)
- Returns both assignments and any unfilled slots
- Previous assignments can be passed in to initialise each role's per-day pointer to the position after the last assigned member on that day of the week, ensuring seamless rotation continuity across months
- **Configurable role dependencies (manual selection)**: Any role can be configured to depend on another via the `dependsOnRoleId` column (nullable FK on the `roles` table). Dependent roles (e.g., Leader depends on Voice) are **not** auto-assigned by the scheduler. Instead, they are left empty during schedule generation and the user manually picks the member from a dropdown in the schedule detail UI. The dropdown is populated with members already assigned to the source role on that date. The API supports `assign` and `unassign` actions for dependent role entries with validation (the member must be assigned to the source role on that date). By default, Leader depends on Voice (configured in the seed and the Configuration UI via a "Depends on" dropdown)
- **Per-day-of-week rotation for all roles**: All roles use per-day-of-week round-robin pointers, ensuring fair rotation within each day independently (e.g., playing drums on Wednesday does not affect the Sunday drummer rotation)
- **Exclusive role groups**: Roles can be assigned to an exclusive group via the `exclusive_groups` table (FK `exclusive_group_id` on `roles`). Two roles sharing the same group cannot be assigned to the same member on the same date. Roles with no group or different groups can coexist freely on the same member. This prevents, for example, a member from being assigned both Keyboard and Electric Guitar on the same date while still allowing them to sing (Voice) and play an instrument simultaneously. Groups are managed from the `/roles` page via CRUD API at `/api/configuration/exclusive-groups`
- **Day role priorities**: When `dayRolePriorities` is provided, roles are sorted by day-specific priority before filling (lower priority number = filled first)

## Member Management
- CRUD operations for band members via `/members` page
- Each member can be assigned multiple roles (Leader, Keyboard, Electric Guitar, etc.)
- Each member can set which active days of the week they are available
- API routes: `GET/POST /api/members`, `GET/PUT/DELETE /api/members/[id]`

## Role Management
- Dedicated `/roles` page for managing roles and exclusive groups
- **Roles**: View, add, rename, delete, and configure roles with required person counts, optional dependencies (e.g., Leader depends on Voice), and optional exclusive groups via dropdown. Deleting a role cascade-deletes all schedule entries and member associations for that role
- **Exclusive Groups**: CRUD management of exclusive groups (e.g., "Instrumento"). Deleting a group sets referencing roles' `exclusiveGroupId` to null
- **Relevant roles**: Each role has an `isRelevant` boolean flag (default false), toggled via a "Relevante" checkbox in the roles page. Relevant roles cause date highlighting in the shared view when a member is filtered (see Shared Public View)
- API routes: `/api/configuration/roles`, `/api/configuration/exclusive-groups`

## Configuration
- **Active Days**: Toggle which days of the week are included in schedules (defaults: Wednesday, Friday, Sunday)
- **Rehearsal Days**: Toggle which days of the week are rehearsal days; these appear in the schedule without member assignments
- **Column Order**: Configurable display order for role columns in all schedule views (admin preview, shared link, current month). Uses up/down arrows in the configuration page with a save button. New roles are appended at the end. The `displayOrder` column on the `roles` table controls ordering; the API supports batch reorder via `PATCH /api/configuration/roles`
- **Role Priorities by Day**: Set the fill order of roles per day of the week (e.g., prioritise Acoustic Guitar over Electric Guitar on Wednesdays)
- **Holidays**: Set date ranges when specific members are unavailable
- API routes: `/api/configuration/days`, `/api/configuration/holidays`, `/api/configuration/priorities`

## Schedule Generation & Preview
- Generate schedules for one or more months at a time via `/schedules`
- **One schedule per month/year**: Enforced at database level with a unique index on `(month, year)`. The API also returns a 409 error if a schedule already exists for the requested month and year. The existing schedule must be deleted before generating a new one
- Preview generated schedule in a grid (dates x roles) via `/schedules/[id]`
- Manual swap: click "swap" on any assignment to replace with another eligible member or select "— Vaciar —" to empty the slot (works on both draft and created schedules)
- **Manual dependent role selection**: For roles with a dependency (e.g., Leader depends on Voice), the schedule grid shows a dropdown populated with members assigned to the source role on that date. The user selects who fills the dependent role; clearing the selection removes the entry
- **Date descriptions**: Add notes to specific dates (e.g., "Celebration day") shown inline in the grid
- **Rehearsal dates**: Weekly rehearsal days auto-populate; individual dates can also be added/removed per schedule
- "Crear" action finalises the schedule (status changes from "Borrador" to "Creado"); the shareable link is always `/shared/{year}/{month}`
- **Previous/Next navigation**: admin schedule detail page includes "Anterior" and "Siguiente" links to navigate between schedules (any status)
- **Edit created schedules**: Created schedules can be edited in-place (swaps, notes); changes are reflected live on the share link
- Rotation continuity: previously created schedules feed into the algorithm for fair distribution
- API routes: `/api/schedules`, `/api/schedules/[id]`, `/api/schedules/[id]/notes`, `/api/schedules/[id]/rehearsals`

## Localisation
- **All UI text in Spanish**: both admin and public views use Spanish labels, month names, date formatting (`es-ES` locale), buttons, and messages; role and member names remain as configured in the database
- App name: **Cronogramas**

## Shared Public View
- Public read-only page at `/shared/{year}/{month}` (e.g. `/shared/2026/2`) — no admin navigation shown
- **Mobile-first responsive design**: card-based layout on small screens, table grid on desktop (breakpoint: `lg`)
- **Light/dark mode toggle**: class-based dark mode (`.dark` / `.light` on `<html>`) with system-preference fallback; persists choice in `localStorage`
- **Filter by member**: dropdown to select a specific person and show only their dates and roles
- **Multi-role display**: when a member is filtered, all their roles on each date are grouped and listed together (e.g., "Leader, Voice, Teclado Principal"); both Voice and Leader entries are stored explicitly in the DB
- **Dependent role highlight**: when a filtered member has a dependent role on a date (e.g., Leader), the card/row receives accent styling (coloured border, background tint, ★ badge with the role name). In the "Próxima asignación" section, dependent roles are shown only with the ★ badge and excluded from the regular roles text to avoid duplication
- **Relevant role highlight**: dates where the filtered member holds a role marked as "relevant" are visually highlighted with the same accent styling (border, background tint, ring) as dependent roles. Both indicators can coexist on the same date
- **Date notes**: displayed inline under each date in both mobile and desktop views
- **Rehearsal dates**: shown with distinct muted styling and "Ensayo" label
- **Previous/Next navigation**: "Anterior" and "Siguiente" links in the header to navigate between committed schedules by month

## Current Month Public View
- Stable public URL at `/cronograma` — always shows the committed schedule for the current running month
- Same UI as the shared view (Spanish labels, filtering, dark mode, dependent/relevant role highlight, prev/next navigation)
- Reuses the `SharedScheduleView` component extracted from the shared page
- API route: `/api/cronograma` — finds the committed schedule matching the current month/year; returns 404 if none exists

## Admin Authentication
- HTTP Basic Auth protects all non-public routes via Next.js middleware (`src/middleware.ts`)
- Public routes (`/shared/*`, `/cronograma`, `/api/shared/*`, `/api/cronograma`) and static assets bypass auth
- Credentials configured via `ADMIN_USER` and `ADMIN_PASSWORD` environment variables
- If no credentials are set, all admin routes return 401 (locked by default)
- Set credentials as environment variables on your hosting provider
- `.env.example` documents the required variables for local development (copy to `.env.local`)

## Default Seeds
- Schedule days are seeded on first access if the `schedule_days` table is empty (defaults: Wednesday, Friday, Sunday active)
- No default roles are seeded; roles and exclusive groups are configured by the user via the `/roles` page
