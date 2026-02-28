# Database Schema

## Auth.js Tables

### `users`
| Column            | Type        | Constraints              |
|-------------------|-------------|--------------------------|
| id                | text        | PRIMARY KEY, default uuid |
| name              | text        | nullable                 |
| email             | text        | NOT NULL, UNIQUE         |
| email_verified    | timestamp   | nullable                 |
| image             | text        | nullable                 |
| is_admin          | boolean     | NOT NULL, DEFAULT false  |
| can_create_groups | boolean     | NOT NULL, DEFAULT false  |

### `accounts`
| Column              | Type    | Constraints                           |
|---------------------|---------|---------------------------------------|
| user_id             | text    | NOT NULL, FK → users.id ON DELETE CASCADE |
| type                | text    | NOT NULL                              |
| provider            | text    | NOT NULL                              |
| provider_account_id | text    | NOT NULL                              |
| refresh_token       | text    | nullable                              |
| access_token        | text    | nullable                              |
| expires_at          | integer | nullable                              |
| token_type          | text    | nullable                              |
| scope               | text    | nullable                              |
| id_token            | text    | nullable                              |
| session_state       | text    | nullable                              |

**Primary key**: (provider, provider_account_id)

---

## App Tables

### `groups`
| Column   | Type    | Constraints                                 |
|----------|---------|---------------------------------------------|
| id       | serial  | PRIMARY KEY                                 |
| name     | text    | NOT NULL                                    |
| slug     | text    | NOT NULL, UNIQUE                            |
| owner_id | text    | NOT NULL, FK → users.id ON DELETE CASCADE   |

### `group_collaborators`
| Column   | Type    | Constraints                                 |
|----------|---------|---------------------------------------------|
| id       | serial  | PRIMARY KEY                                 |
| user_id  | text    | NOT NULL, FK → users.id ON DELETE CASCADE   |
| group_id | integer | NOT NULL, FK → groups.id ON DELETE CASCADE  |

### `members`
| Column   | Type    | Constraints                                 |
|----------|---------|---------------------------------------------|
| id       | serial  | PRIMARY KEY                                 |
| name     | text    | NOT NULL                                    |
| email    | text    | nullable (used for auto-linking on sign-in) |
| user_id  | text    | nullable, FK → users.id ON DELETE SET NULL  |
| group_id | integer | NOT NULL, FK → groups.id ON DELETE CASCADE  |

**Unique index**: `(group_id, email)` — no two members in the same group can share the same email.

### `exclusive_groups`
| Column   | Type    | Constraints                                |
|----------|---------|---------------------------------------------|
| id       | serial  | PRIMARY KEY                                 |
| name     | text    | NOT NULL                                    |
| group_id | integer | NOT NULL, FK → groups.id ON DELETE CASCADE  |

### `roles`
| Column             | Type    | Constraints                                         |
|--------------------|---------|-----------------------------------------------------|
| id                 | serial  | PRIMARY KEY                                         |
| name               | text    | NOT NULL                                            |
| required_count     | integer | NOT NULL, DEFAULT 1                                 |
| display_order      | integer | NOT NULL, DEFAULT 0                                 |
| depends_on_role_id | integer | nullable                                            |
| exclusive_group_id | integer | nullable, FK → exclusive_groups.id ON DELETE SET NULL|
| is_relevant        | boolean | NOT NULL, DEFAULT false                             |
| group_id           | integer | NOT NULL, FK → groups.id ON DELETE CASCADE          |

### `member_roles`
| Column    | Type    | Constraints                                |
|-----------|---------|---------------------------------------------|
| id        | serial  | PRIMARY KEY                                 |
| member_id | integer | NOT NULL, FK → members.id ON DELETE CASCADE |
| role_id   | integer | NOT NULL, FK → roles.id ON DELETE CASCADE   |

### `weekdays`
| Column        | Type    | Constraints   |
|---------------|---------|----------------|
| id            | serial  | PRIMARY KEY    |
| name          | text    | NOT NULL, UNIQUE (e.g. "Lunes", "Martes") |
| display_order | integer | NOT NULL, DEFAULT 0 |

Reference table for consistent weekday names. Seed: 7 rows (Lunes–Domingo).

### `recurring_events`
| Column         | Type    | Constraints                                |
|----------------|---------|--------------------------------------------|
| id             | serial  | PRIMARY KEY                                |
| weekday_id     | integer | NOT NULL, FK → weekdays.id ON DELETE CASCADE|
| active         | boolean | NOT NULL, DEFAULT true                      |
| type           | text    | NOT NULL, DEFAULT 'assignable' ('assignable' \| 'for_everyone') |
| label          | text    | NOT NULL, DEFAULT 'Evento' (e.g. "Ensayo", "Servicio") |
| start_time_utc | text    | NOT NULL, DEFAULT '00:00' (HH:MM UTC)      |
| end_time_utc   | text    | NOT NULL, DEFAULT '23:59' (HH:MM UTC)      |
| group_id       | integer | NOT NULL, FK → groups.id ON DELETE CASCADE  |

One row per weekday per group. When active, that weekday is included in schedule generation. **Label** is required (default `'Evento'`). Assignable events get role slots and scheduler; for_everyone events create a schedule_date with the label only. **Event time window**: `start_time_utc` and `end_time_utc` define the time range for assignable events; the scheduler only assigns members whose availability blocks overlap this window (times in UTC).

### `member_availability`
| Column         | Type    | Constraints                                |
|----------------|---------|--------------------------------------------|
| id             | serial  | PRIMARY KEY                                |
| member_id      | integer | NOT NULL, FK → members.id ON DELETE CASCADE |
| weekday_id     | integer | NOT NULL, FK → weekdays.id ON DELETE CASCADE|
| start_time_utc | text    | NOT NULL, DEFAULT '00:00' (HH:MM UTC)      |
| end_time_utc   | text    | NOT NULL, DEFAULT '23:59' (HH:MM UTC)      |

**Unique**: none. Multiple rows per (member_id, weekday_id) allowed for multiple time blocks per day (e.g. 09:00–11:00 and 16:00–17:30 on the same day). Times stored in UTC; UIs show local time.

### `holidays`
| Column      | Type    | Constraints                                  |
|-------------|---------|----------------------------------------------|
| id          | serial  | PRIMARY KEY                                  |
| user_id     | text    | nullable, FK → users.id ON DELETE CASCADE    |
| member_id   | integer | nullable, FK → members.id ON DELETE CASCADE  |
| start_date  | text    | NOT NULL                                     |
| end_date    | text    | NOT NULL                                     |
| description | text    | nullable                                     |

**Note**: Exactly one of `user_id` or `member_id` should be set per row. User-level holidays apply globally across all groups; member-level holidays are admin-managed for specific members.

### `schedules`
| Column     | Type    | Constraints                                |
|------------|---------|---------------------------------------------|
| id         | serial  | PRIMARY KEY                                 |
| month      | integer | NOT NULL                                    |
| year       | integer | NOT NULL                                    |
| status     | text    | NOT NULL, DEFAULT 'draft', enum: draft/committed |
| created_at | text    | NOT NULL, default: ISO timestamp            |
| group_id   | integer | NOT NULL, FK → groups.id ON DELETE CASCADE  |

**Indexes**: UNIQUE (group_id, month, year)

### `schedule_date`
| Column             | Type    | Constraints                                    |
|--------------------|---------|------------------------------------------------|
| id                 | serial  | PRIMARY KEY                                    |
| schedule_id        | integer | NOT NULL, FK → schedules.id ON DELETE CASCADE  |
| date               | text    | NOT NULL (YYYY-MM-DD)                          |
| type               | text    | NOT NULL ('assignable' \| 'for_everyone')      |
| label              | text    | nullable (optional label for any type, e.g. "Ensayo", "Servicio") |
| note               | text    | nullable (replaces former schedule_date_notes)  |
| recurring_event_id | integer | nullable, FK → recurring_events.id ON DELETE SET NULL |

**Unique**: (schedule_id, date). One row per calendar date in a schedule; assignable dates have role entries, for_everyone dates show only the label. Label is stored for any date type when provided. **recurring_event_id**: optional reference to the recurring event this date was generated from (null when added manually or for legacy rows).

### `schedule_date_assignments`
| Column           | Type    | Constraints                                    |
|------------------|---------|------------------------------------------------|
| id               | serial  | PRIMARY KEY                                    |
| schedule_date_id | integer | NOT NULL, FK → schedule_date.id ON DELETE CASCADE |
| role_id          | integer | NOT NULL, FK → roles.id                        |
| member_id        | integer | NOT NULL, FK → members.id                      |

### `schedule_audit_log`
| Column      | Type    | Constraints                                    |
|-------------|---------|------------------------------------------------|
| id          | serial  | PRIMARY KEY                                    |
| schedule_id | integer | NOT NULL, FK → schedules.id ON DELETE CASCADE  |
| user_id     | text    | nullable, FK → users.id ON DELETE SET NULL     |
| action      | text    | NOT NULL                                       |
| detail      | text    | nullable (plain string or JSON)                |
| created_at  | text    | NOT NULL, default: ISO timestamp               |

**Actions**: `created`, `published`, `bulk_update`, `rebuild`, `add_date`, `remove_extra_date`, `note_saved`, `note_deleted`. For `bulk_update` and `rebuild`, `detail` contains a JSON object with structured change data.

### `event_role_priorities`
| Column              | Type    | Constraints                                        |
|---------------------|---------|----------------------------------------------------|
| id                  | serial  | PRIMARY KEY                                        |
| recurring_event_id  | integer | NOT NULL, FK → recurring_events.id ON DELETE CASCADE|
| role_id             | integer | NOT NULL, FK → roles.id ON DELETE CASCADE          |
| priority            | integer | NOT NULL, DEFAULT 0                                |

Fill order for roles on **assignable** recurring events only. Keyed by recurring_event_id.
