# Features

## Project Setup
- Next.js 16 with App Router, TypeScript, Tailwind CSS
- Drizzle ORM with PostgreSQL (postgres-js driver, Neon-hosted) for data persistence
- Jest with ts-jest for testing (TDD)
- Database schema with tables: groups, members, exclusive_groups, roles, member_roles, schedule_days, member_availability, holidays, schedules, schedule_entries, schedule_date_notes, schedule_rehearsal_dates, day_role_priorities

### Scripts
- `npm run dev` — Start the dev server
- `npm test` — Run tests
- `npm run test:watch` — Run tests in watch mode
- `npm run db:generate` — Generate a new migration after schema changes
- `npm run db:migrate` — Apply pending migrations
- `npm run db:studio` — Open Drizzle Studio to inspect the database

## Multi-Group Architecture
- The app supports multiple independent groups, each with their own members, roles, schedules, and configuration
- **Groups table**: `id`, `name`, `slug` (unique). Slug is used in client-facing URLs
- **Group scoping**: `members`, `roles`, `exclusive_groups`, `schedule_days`, and `schedules` tables have a `group_id` FK. Child tables (member_roles, holidays, etc.) are scoped transitively through their parent
- **Unique constraint**: schedules have a unique index on `(group_id, month, year)` — one schedule per month per group
- **Landing page** at `/` (behind auth): lists all groups with links to configure or view the public schedule. Includes a form to create new groups
- **Admin routes**: `/:slug/config/*` — scoped to a group via slug in URL, resolved to `groupId` via context
- **Public routes**: `/:slug/cronograma` (current month), `/:slug/cronograma/:year/:month` (specific month)
- **API routes**: admin APIs stay at their original paths (e.g. `/api/members`, `/api/schedules`) and accept `groupId` as a query parameter. Public APIs are at `/api/cronograma/:slug` and `/api/cronograma/:slug/:year/:month`
- **Group context**: `src/lib/group-context.tsx` provides `GroupProvider` and `useGroup()` hook, resolving slug to groupId once in the admin layout

## Schedule Generation Algorithm
- Pure function in `src/lib/scheduler.ts` with types in `src/lib/scheduler.types.ts`
- Takes dates, roles (with required counts), and members (with roles, availability, holidays) as input
- **Round-robin rotation with per-day-of-week pointers**: For each role, an alphabetically-sorted list of capable members is maintained with a separate pointer for each day of the week. When filling a slot, the algorithm walks from that day's pointer until an eligible candidate is found (available that day, not on holiday, not blocked by exclusive group), assigns them, and advances the pointer. This ensures each day of the week has its own independent rotation
- Returns both assignments and any unfilled slots
- Previous assignments can be passed in to initialise each role's per-day pointer to the position after the last assigned member on that day of the week, ensuring seamless rotation continuity across months
- **Configurable role dependencies (manual selection)**: Any role can depend on another via `dependsOnRoleId`. Dependent roles are left empty during generation and manually selected by the user from a dropdown
- **Exclusive role groups**: Roles in the same exclusive group cannot be assigned to the same member on the same date
- **Day role priorities**: Roles are sorted by day-specific priority before filling

## Member Management
- CRUD operations via `/:slug/config/members`
- Each member can be assigned multiple roles and set available days
- API routes: `GET/POST /api/members?groupId=N`, `GET/PUT/DELETE /api/members/[id]`

## Role Management
- Dedicated `/:slug/config/roles` page for managing roles and exclusive groups
- Roles: view, add, rename, delete, configure with required counts, dependencies, exclusive groups, and relevance flag
- Exclusive Groups: CRUD management
- API routes: `/api/configuration/roles?groupId=N`, `/api/configuration/exclusive-groups?groupId=N`

## Configuration
- **Active Days**: Toggle which days are included in schedules
- **Rehearsal Days**: Toggle rehearsal days
- **Column Order**: Configurable display order for role columns
- **Role Priorities by Day**: Set fill order per day
- **Holidays**: Set date ranges when specific members are unavailable
- API routes: `/api/configuration/days?groupId=N`, `/api/configuration/holidays?groupId=N`, `/api/configuration/priorities?groupId=N`

## Schedule Generation & Preview
- Generate schedules for one or more months at a time via `/:slug/config/schedules`
- **One schedule per month/year per group**: Enforced at database level with unique index on `(group_id, month, year)`. API returns 409 on duplicate
- Preview in grid, manual swap/edit, dependent role selection, date notes, rehearsal dates
- "Crear" finalises the schedule; shareable link is `/:slug/cronograma/:year/:month`
- **Previous/Next navigation** in both admin and public views
- API routes: `/api/schedules?groupId=N`, `/api/schedules/[id]`, `/api/schedules/[id]/notes`, `/api/schedules/[id]/rehearsals`

## Localisation
- All UI text in Spanish
- App name: **Cronogramas**

## Shared Public View
- Public read-only page at `/:slug/cronograma/:year/:month` — no admin navigation shown
- Mobile-first responsive design, light/dark mode toggle, member filter
- Dependent and relevant role highlighting, date notes, rehearsal dates
- Previous/Next navigation between committed schedules
- Current month view at `/:slug/cronograma`
- Public API: `/api/cronograma/:slug` (current month), `/api/cronograma/:slug/:year/:month` (specific month)

## Admin Authentication
- HTTP Basic Auth protects all non-public routes via Next.js middleware
- Public: `/:slug/cronograma*` and `/api/cronograma/*`
- Protected: everything else (landing page, admin config, admin APIs)
- Credentials via `ADMIN_USER` and `ADMIN_PASSWORD` env vars; 401 if not set

## Default Seeds
- Schedule days are seeded per group on first access (defaults: Wednesday, Friday, Sunday active)
- No default roles are seeded; configured by the user via the roles page
- A "Default" group with slug "default" was created during migration for existing data
