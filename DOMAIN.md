# Domain

A glossary of domain-specific knowledge for this project.

## Terms

| Term | Meaning |
|------|---------|
| **Event** | Recurring weekday config: one row per weekday in `recurring_events` (type assignable or for_everyone, label, optional time window). Defines *what* happens on that day of the week; not a calendar date. |
| **Schedule date** | A concrete date in a schedule: one row in `schedule_date` for a given schedule (month/year). Tied to an event for type/label; only assignable schedule dates have assignments. |
| **Assignment** | A member assigned to a role on a specific schedule date: one row in `schedule_date_assignments` (scheduleDateId + roleId + memberId). "Mis asignaciones" = the user's assignments across groups. |
| **Group** | A musical group (solo artist, band, orchestra) that owns its own members, roles, schedules, and config. Identified by a unique slug used in URLs. |
| **Collaborator** | A user with full admin-like access to a group they don't own (via `group_collaborators`). |
| **Member** | A person in a group. Has a name, optional email, optional link to a User. When linked, inherits the user's holidays. |
| **Cronograma** | The public-facing schedule view for a group (`/:slug/cronograma/:year/:month`). Spanish for "schedule" or "timetable." Also the app name: **Cronogramas**. |
| **Exclusive group** | A set of roles where a member assigned to one role in the group cannot be assigned to another role in the same group on the same date. |

## Business rules

- A schedule is unique per (group, month, year). Each schedule contains schedule dates, each tied to a recurring event.
- Only assignable events produce assignments; for_everyone events appear on the schedule but have no role assignments.
- The scheduler uses round-robin with per-weekday pointers that carry over across months for continuity.
- Linked members (member with a `user_id`) get both user-level and member-level holidays applied during scheduling.
- Time-aware conflicts: a user has a conflict only when assigned on the same date in different groups with overlapping time windows.
- Calendar export requires both the user flag (`canExportCalendars`, admin-set) and the group flag (`calendarExportEnabled`, admin-set).
