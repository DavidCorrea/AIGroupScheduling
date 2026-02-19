# Features

## Project Setup
- Next.js 16 with App Router, TypeScript, Tailwind CSS
- Drizzle ORM with PostgreSQL (postgres-js driver, Neon-hosted) for data persistence
- Auth.js v5 (next-auth) with Google OAuth and Drizzle adapter for authentication
- Jest with ts-jest for testing (TDD)
- Database schema with tables: users, accounts, groups, group_collaborators, members, exclusive_groups, roles, member_roles, schedule_days, member_availability, holidays, schedules, schedule_entries, schedule_date_notes, schedule_rehearsal_dates, day_role_priorities

### Scripts
- `npm run dev` — Start the dev server
- `npm test` — Run tests
- `npm run test:watch` — Run tests in watch mode
- `npm run db:generate` — Generate a new migration after schema changes
- `npm run db:migrate` — Apply pending migrations
- `npm run db:studio` — Open Drizzle Studio to inspect the database

## User Authentication
- **Google OAuth** via Auth.js v5 with JWT session strategy
- **Users table**: Auth.js managed (id, name, email, emailVerified, image) plus `isAdmin` and `canCreateGroups` flags
- **Accounts table**: Auth.js managed (OAuth provider links)
- **Login page** at `/login` with Google sign-in button
- **Settings page** at `/settings` for user profile, personal holiday management, and admin panel link (if admin)
- **Middleware**: checks for session cookie; redirects to `/login` for unauthenticated page requests, returns 401 for unauthenticated API calls
- **Public paths**: `/login`, `/api/auth/*`, `/:slug/cronograma/*`, `/api/cronograma/*`, `/admin/*`, `/api/admin/*`

## Admin Panel
- **Admin page** at `/admin` for managing all users (toggle `isAdmin`, `canCreateGroups`, delete users)
- Only accessible by users with `isAdmin === true`, or via bootstrap credentials when no admin users exist
- **Bootstrap mode**: when no admin users exist in the database, `/admin/login` accepts `ADMIN_USERNAME`/`ADMIN_PASSWORD` env vars and sets a short-lived cookie for access
- **Group creation gating**: only users with `canCreateGroups` or `isAdmin` can create groups (enforced at API and UI level)
- **API routes**: `GET/PUT/DELETE /api/admin/users`, `POST /api/admin/auth` (bootstrap login)

## Multi-Group Architecture
- The app supports multiple independent groups, each with their own members, roles, schedules, and configuration
- **Groups table**: `id`, `name`, `slug` (unique), `owner_id` (FK to users). Slug is used in client-facing URLs
- **Group collaborators**: users with full admin access to a group (same as owner). Managed via `/:slug/config/collaborators`
- **Members**: belong to a group with their own `name` and optional `email` columns. Optionally linked to a user via `user_id` (nullable). When a member has an email set and a new user signs in with that email for the first time, the member is automatically linked to the new user
- **Group scoping**: `members`, `roles`, `exclusive_groups`, `schedule_days`, and `schedules` tables have a `group_id` FK
- **Unique constraint**: schedules have a unique index on `(group_id, month, year)` — one schedule per month per group
- **Landing page** at `/` (behind auth): lists all groups the user owns, collaborates on, or is a member of (with role badges). Shows cross-group upcoming assignments with conflict detection
- **Admin routes**: `/:slug/config/*` — scoped to a group via slug in URL. Requires owner or collaborator access
- **Public routes**: `/:slug/cronograma` (current month), `/:slug/cronograma/:year/:month` (specific month)
- **API routes**: admin APIs at their original paths (e.g. `/api/members`, `/api/schedules`) accept `groupId` as a query parameter with auth + group access checks. Public APIs at `/api/cronograma/:slug/*`
- **Group context**: `src/lib/group-context.tsx` provides `GroupProvider` and `useGroup()` hook

## Holidays
- **User-scoped holidays**: Each user manages their own absence dates from `/settings`. These apply globally across all groups the user belongs to. API: `GET/POST/DELETE /api/holidays`
- **Member-scoped holidays**: Admins can set absence dates for specific members (linked or unlinked) from the group holidays page (`/:slug/config/holidays`). These are scoped to the member. API: `GET/POST/DELETE /api/configuration/holidays?groupId=N`
- **Group holidays page** (`/:slug/config/holidays`): shows both user-scoped and member-scoped holidays for the group, filtered to current and future dates only. User-scoped holidays are read-only (managed in `/settings`). Member-scoped holidays can be added and deleted by admins
- The scheduler combines both sources: for linked members it fetches user-level + member-level holidays; for unlinked members it only fetches member-level holidays

## Schedule Generation Algorithm
- Pure function in `src/lib/scheduler.ts` with types in `src/lib/scheduler.types.ts`
- Takes dates, roles (with required counts), and members (with roles, availability, holidays) as input
- **Round-robin rotation with per-day-of-week pointers**: For each role, an alphabetically-sorted list of capable members is maintained with a separate pointer for each day of the week
- Previous assignments can be passed in to initialise rotation continuity across months
- **Configurable role dependencies (manual selection)**: Dependent roles are left empty during generation and manually selected by the user
- **Exclusive role groups**: Roles in the same exclusive group cannot be assigned to the same member on the same date
- **Day role priorities**: Roles are sorted by day-specific priority before filling

## Member Management
- Members belong to a group and have their own `name` column
- Members can optionally be linked to a `User` account (via `user_id`). Linked members benefit from user-scoped holidays and can see their assignments on the dashboard
- Members without a linked user can still be scheduled and have admin-set holidays
- Adding a member: provide a name (required) and optionally link to a user by searching their email
- Editing a member: update name, link/unlink user, update roles and availability
- API routes: `GET/POST /api/members?groupId=N`, `GET/PUT/DELETE /api/members/[id]`

## Role Management
- Dedicated `/:slug/config/roles` page for managing roles and exclusive groups
- Roles: view, add, rename, delete, configure with required counts, dependencies, exclusive groups, and relevance flag
- API routes: `/api/configuration/roles?groupId=N`, `/api/configuration/exclusive-groups?groupId=N`

## Configuration
- **Active Days**: Toggle which days are included in schedules
- **Rehearsal Days**: Toggle rehearsal days
- **Column Order**: Configurable display order for role columns
- **Role Priorities by Day**: Set fill order per day
- API routes: `/api/configuration/days?groupId=N`, `/api/configuration/priorities?groupId=N`

## Schedule Generation & Preview
- Generate schedules for one or more months at a time via `/:slug/config/schedules`
- **One schedule per month/year per group**: Enforced at database level with unique index
- Preview in grid, manual swap/edit, dependent role selection, date notes, rehearsal dates
- **Previous/Next navigation** in both admin and public views
- API routes: `/api/schedules?groupId=N`, `/api/schedules/[id]`, `/api/schedules/[id]/notes`, `/api/schedules/[id]/rehearsals`

## Dashboard
- Home page (`/`) shows cross-group upcoming assignments with conflict detection
- Conflicts: same date in multiple groups highlighted in red
- API: `GET /api/user/dashboard`

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

## Default Seeds
- Schedule days are seeded per group on first access (defaults: Wednesday, Friday, Sunday active)
- No default roles are seeded; configured by the user via the roles page

## Environment Variables
- `DATABASE_URL` — PostgreSQL connection string
- `GOOGLE_CLIENT_ID` — Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` — Google OAuth client secret
- `NEXTAUTH_SECRET` — Random secret for JWT encryption
- `AUTH_TRUST_HOST=true` — Required for deployment
- `ADMIN_USERNAME` — Bootstrap admin username (only used when no admin users exist)
- `ADMIN_PASSWORD` — Bootstrap admin password (only used when no admin users exist)
