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

### `schedule_days`
| Column       | Type    | Constraints                                |
|--------------|---------|---------------------------------------------|
| id           | serial  | PRIMARY KEY                                 |
| day_of_week  | text    | NOT NULL                                    |
| active       | boolean | NOT NULL, DEFAULT true                      |
| is_rehearsal | boolean | NOT NULL, DEFAULT false                     |
| group_id     | integer | NOT NULL, FK → groups.id ON DELETE CASCADE  |

### `member_availability`
| Column          | Type    | Constraints                                      |
|-----------------|---------|--------------------------------------------------|
| id              | serial  | PRIMARY KEY                                      |
| member_id       | integer | NOT NULL, FK → members.id ON DELETE CASCADE      |
| schedule_day_id | integer | NOT NULL, FK → schedule_days.id ON DELETE CASCADE|

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

### `schedule_entries`
| Column      | Type    | Constraints                                    |
|-------------|---------|------------------------------------------------|
| id          | serial  | PRIMARY KEY                                    |
| schedule_id | integer | NOT NULL, FK → schedules.id ON DELETE CASCADE  |
| date        | text    | NOT NULL                                       |
| role_id     | integer | NOT NULL, FK → roles.id                        |
| member_id   | integer | NOT NULL, FK → members.id                      |

### `schedule_date_notes`
| Column      | Type    | Constraints                                    |
|-------------|---------|------------------------------------------------|
| id          | serial  | PRIMARY KEY                                    |
| schedule_id | integer | NOT NULL, FK → schedules.id ON DELETE CASCADE  |
| date        | text    | NOT NULL                                       |
| description | text    | NOT NULL                                       |

### `schedule_rehearsal_dates`
| Column      | Type    | Constraints                                    |
|-------------|---------|------------------------------------------------|
| id          | serial  | PRIMARY KEY                                    |
| schedule_id | integer | NOT NULL, FK → schedules.id ON DELETE CASCADE  |
| date        | text    | NOT NULL                                       |

### `day_role_priorities`
| Column          | Type    | Constraints                                      |
|-----------------|---------|--------------------------------------------------|
| id              | serial  | PRIMARY KEY                                      |
| schedule_day_id | integer | NOT NULL, FK → schedule_days.id ON DELETE CASCADE|
| role_id         | integer | NOT NULL, FK → roles.id ON DELETE CASCADE        |
| priority        | integer | NOT NULL, DEFAULT 0                              |
