# Schedule creation algorithm

This document describes how the schedule creation (assignment generation) algorithm works, based on the implementation in `src/lib/scheduler.ts`, `src/lib/scheduler.types.ts`, and the config/API layer in `src/lib/schedule-helpers.ts` and `src/app/api/schedules/`.

---

## 1. Overview

The scheduler assigns **members** to **roles** for a set of **dates**, subject to:

- **Round-robin fairness**: per role and per day-of-week, a pointer cycles through capable members so assignments rotate over time.
- **Eligibility**: only members who are available that day, not on holiday, and (when applicable) within the event’s time window and not blocked by exclusive groups are considered.
- **Role order**: roles can be filled in a configurable order per day via **event role priorities** (lower number = filled first).
- **Exclusive groups**: at most one role from a given exclusive group per member per date.
- **Dependent roles**: roles that depend on another role are **not** passed to the scheduler; they are assigned manually in the schedule detail UI.

The algorithm is **deterministic** for a given input: same dates, roles, members, previous assignments, and config yield the same output.

---

## 2. Where the scheduler is used

| Context | Purpose |
|--------|---------|
| **Create schedule** | `POST /api/schedules` — create one or more month schedules; for each month, only **assignable** dates are passed to the scheduler. |
| **Rebuild (overwrite / fill empty)** | `PUT /api/schedules/[id]` with `action: "rebuild_apply"` — regenerate assignments for future assignable dates (overwrite or fill only empty slots). |
| **Recurring event change** | `rebuildScheduleFutureAssignments()` in `schedule-helpers.ts` — when an assignable event’s day or times change, future assignments are regenerated to respect the new config. |

Configuration (roles, members, availability, holidays, priorities, event time windows) is loaded via `loadScheduleConfig(groupId)` in `src/lib/schedule-helpers.ts`. Previous assignments for rotation continuity come from committed schedules (and, when rebuilding, from past + kept future entries).

---

## 3. High-level flow (Mermaid)

```mermaid
flowchart TB
  subgraph Input["Input preparation"]
    A[Load schedule config] --> B[Active days, roles, members, holidays]
    B --> C[Event role priorities & time windows]
    C --> D[Previous assignments from committed schedules]
    D --> E[Assignable dates for month(s) or rebuild]
  end

  subgraph Scheduler["generateSchedule()"]
    E --> F[Build per-role rotation lists (alphabetically by member name)]
    F --> G[Initialise per-role per-day-of-week pointers from previousAssignments]
    G --> H[For each date in order]
    H --> I[Sort roles by day role priorities]
    I --> J[For each role in order, for each slot]
    J --> K[Pick next eligible member from rotation from pointer]
    K --> L{Eligible?}
    L -->|Yes| M[Assign; advance pointer; update exclusive-group tracking]
    L -->|No| N[Record unfilled slot]
    M --> O[More slots/roles/dates?]
    N --> O
    O -->|Yes| J
    O -->|No| P[Return assignments + unfilledSlots]
  end

  subgraph Output["Output"]
    P --> Q[Persist schedule_date + schedule_date_assignments]
  end

  Input --> Scheduler
  Scheduler --> Output
```

---

## 4. Inputs and types

The scheduler accepts a `SchedulerInput` object:

| Field | Description |
|-------|-------------|
| `dates` | ISO date strings (`YYYY-MM-DD`) to schedule (assignable dates only). |
| `roles` | Role definitions: `id`, `name`, `requiredCount`, optional `exclusiveGroupId`. Only roles with `dependsOnRoleId == null` are included. |
| `members` | Member info: `id`, `name`, `roleIds`, `availableDays` (weekday names), optional `availabilityBlocksByDay`, `holidays`. |
| `previousAssignments` | Optional list of `{ date, roleId, memberId }` used to seed per-day-of-week pointers so rotation continues fairly. |
| `dayRolePriorities` | Optional `dayOfWeek → { roleId → priority }`. Lower number = filled first; unlisted roles get Infinity. |
| `dayEventTimeWindow` | Optional `dayOfWeek → { startUtc, endUtc }` in `HH:MM` UTC. When set, only members with at least one availability block overlapping this window are eligible. |

**Day-of-week names** are the canonical Spanish names (e.g. `Miércoles`, `Domingo`) from `src/lib/dates.ts`, so the scheduler and DB/weekdays stay in sync.

---

## 5. Algorithm steps (detail)

### 5.1 Build rotation lists

- For each role, collect members who have that role (`member.roleIds.includes(role.id)`).
- Sort those members **alphabetically by name** to form a stable rotation list per role.
- Empty lists are skipped (no slots filled for that role).

### 5.2 Initialise per-role per-day-of-week pointers

- For each role, from `previousAssignments`, find the **last** assignment per day-of-week (by date).
- Set the pointer for that (role, day-of-week) to the index **after** that member in the role’s rotation list (wrapping with `% list.length`).
- This makes the next run continue from the next person in line for that weekday.

### 5.3 Process each date

For each date, in chronological order:

1. **Day of week** is derived from the date (UTC) using the same Spanish weekday names as the rest of the app.
2. **Per-date state**:
   - `memberGroupsOnDate`: which exclusive group IDs each member is already filling on this date.
   - `memberRolesOnDate`: which role IDs each member is already assigned on this date (prevents duplicate assignment to the same role on the same date).
3. **Order roles** for this day using `dayRolePriorities`: lower priority number first; ties keep the original order; unlisted roles go last.
4. For each role in that order, for each slot from `0` to `requiredCount - 1`:
   - Get the current pointer for `(roleId, dayOfWeek)` (default 0).
   - **Eligibility**: walk the role’s rotation list starting at the pointer until an **eligible** member is found (see §6).
   - If found: record assignment, advance pointer to the next index (wrap), update `memberGroupsOnDate` and `memberRolesOnDate` for the chosen member.
   - If not found: append an **unfilled slot** `{ date, roleId }` and do not advance the pointer.

### 5.4 Output

- `assignments`: array of `{ date, roleId, memberId }`.
- `unfilledSlots`: array of `{ date, roleId }` for slots that could not be filled.

---

## 6. Eligibility rules

For a member to be chosen for a role on a given date, **all** of the following must hold:

| Rule | Description |
|------|-------------|
| **Day availability** | The member’s `availableDays` includes the date’s day-of-week (e.g. Miércoles). |
| **Not on holiday** | The date is not within any of the member’s `holidays` ranges (start/end inclusive). |
| **No duplicate role** | The member is not already assigned to this same role on this date (`memberRolesOnDate`). |
| **Exclusive group** | If the role has `exclusiveGroupId`, the member is not already filling any other role in that exclusive group on this date (`memberGroupsOnDate`). |
| **Event time window** | If `dayEventTimeWindow` is set for this day-of-week, the member must have at least one **availability block** (in `availabilityBlocksByDay[dayOfWeek]`) whose time range overlaps the event window (both in UTC, `HH:MM`). If no window is set for the day, this check is skipped (full-day availability is enough). |

Time overlap is computed as half-open intervals: `[start, end)` and true when `aStart < bEnd && bStart < aEnd` (in minutes since midnight).

---

## 7. Rotation and fairness

- **Per role, per day-of-week**: each (role, weekday) has its own pointer. So the “next” person for “Voz” on Wednesdays is independent from “Voz” on Sundays.
- **Pick from pointer**: `pickFromRotation()` walks the role’s list starting at the pointer, wraps around, and returns the first eligible member; the pointer is then set to the index after that member.
- **Stable order**: the rotation list is sorted by member name, so the order is deterministic and consistent across runs.
- **Continuity**: when `previousAssignments` are provided (from committed schedules or from past + kept future entries), pointers are initialised so that the next assignment for that role on that weekday follows the last one historically.

---

## 8. Role priorities and exclusive groups

- **Event role priorities** (`event_role_priorities` / `dayRolePriorities`): only apply to **assignable** recurring events. For each day-of-week, roles are filled in ascending priority order; roles not in the map are treated as lowest priority (filled last). This allows e.g. “Voz” to be filled before “Batería” on a given weekday.
- **Exclusive groups**: roles can belong to an **exclusive group**. On a single date, a member can fill **at most one** role from that group. After an assignment, the member’s set of “groups already filled on this date” is updated, and the eligibility check excludes any member who already has that `exclusiveGroupId` on the date.

---

## 9. Event time window

- Assignable recurring events can have `start_time_utc` and `end_time_utc` (HH:MM UTC).
- **Scheduler**: when `dayEventTimeWindow` is set for a day-of-week, a member is eligible only if they have at least one **availability block** for that weekday that **overlaps** the event window.
- **Member availability**: stored per weekday in `member_availability` (and exposed as `availabilityBlocksByDay`). No block or no overlap ⇒ member is ineligible for that event on that day.
- Defaults: if not set, event window is effectively full day (00:00–23:59) and no time-window filter is applied.

---

## 10. Dependent roles (manual assignment)

- Roles with `dependsOnRoleId` set (e.g. “Leader” depends on “Voice”) are **excluded** from `roleDefinitions` passed to the scheduler.
- They are **not** auto-filled; the schedule detail UI allows manual assignment for dependent roles.
- The scheduler only sees independent roles; it does not enforce or use dependency rules.

---

## 11. Related code and config

| What | Where |
|------|--------|
| Scheduler core | `src/lib/scheduler.ts` — `generateSchedule()` |
| Types | `src/lib/scheduler.types.ts` — `SchedulerInput`, `SchedulerOutput`, `RoleDefinition`, `MemberInfo`, etc. |
| Config loading | `src/lib/schedule-helpers.ts` — `loadScheduleConfig()`, `getPreviousAssignments()` |
| Dates / weekday names | `src/lib/dates.ts` — `getDayNameFromDateString()`, `getScheduleDates()` |
| Create schedule | `src/app/api/schedules/route.ts` — POST |
| Rebuild / preview | `src/app/api/schedules/[id]/route.ts` — PUT with rebuild_preview / rebuild_apply |
| Rebuild after event change | `src/lib/schedule-helpers.ts` — `rebuildScheduleFutureAssignments()` |
| DB | `docs/DATABASE.md` — `schedule_date`, `schedule_date_assignments`, `event_role_priorities`, `recurring_events`, `member_availability`, etc. |
