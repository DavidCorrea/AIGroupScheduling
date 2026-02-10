# Database Schema

## Tables

### groups
| Column | Type    | Constraints              |
|--------|---------|--------------------------|
| id     | serial  | PRIMARY KEY              |
| name   | text    | NOT NULL                 |
| slug   | text    | NOT NULL, UNIQUE         |

### members
| Column   | Type    | Constraints                                  |
|----------|---------|----------------------------------------------|
| id       | serial  | PRIMARY KEY                                  |
| name     | text    | NOT NULL                                     |
| group_id | integer | NOT NULL, FK → groups(id) ON DELETE CASCADE  |

### exclusive_groups
| Column   | Type    | Constraints                                  |
|----------|---------|----------------------------------------------|
| id       | serial  | PRIMARY KEY                                  |
| name     | text    | NOT NULL                                     |
| group_id | integer | NOT NULL, FK → groups(id) ON DELETE CASCADE  |

### roles
| Column              | Type    | Constraints                                              |
|---------------------|---------|----------------------------------------------------------|
| id                  | serial  | PRIMARY KEY                                              |
| name                | text    | NOT NULL                                                 |
| required_count      | integer | NOT NULL, DEFAULT 1                                      |
| display_order       | integer | NOT NULL, DEFAULT 0                                      |
| depends_on_role_id  | integer | NULLABLE                                                 |
| exclusive_group_id  | integer | FK → exclusive_groups(id) ON DELETE SET NULL              |
| is_relevant         | boolean | NOT NULL, DEFAULT false                                  |
| group_id            | integer | NOT NULL, FK → groups(id) ON DELETE CASCADE              |

### member_roles
| Column    | Type    | Constraints                                   |
|-----------|---------|-----------------------------------------------|
| id        | serial  | PRIMARY KEY                                   |
| member_id | integer | NOT NULL, FK → members(id) ON DELETE CASCADE  |
| role_id   | integer | NOT NULL, FK → roles(id) ON DELETE CASCADE    |

### schedule_days
| Column       | Type    | Constraints                                  |
|--------------|---------|----------------------------------------------|
| id           | serial  | PRIMARY KEY                                  |
| day_of_week  | text    | NOT NULL                                     |
| active       | boolean | NOT NULL, DEFAULT true                       |
| is_rehearsal | boolean | NOT NULL, DEFAULT false                      |
| group_id     | integer | NOT NULL, FK → groups(id) ON DELETE CASCADE  |

### member_availability
| Column          | Type    | Constraints                                          |
|-----------------|---------|------------------------------------------------------|
| id              | serial  | PRIMARY KEY                                          |
| member_id       | integer | NOT NULL, FK → members(id) ON DELETE CASCADE         |
| schedule_day_id | integer | NOT NULL, FK → schedule_days(id) ON DELETE CASCADE   |

### holidays
| Column      | Type    | Constraints                                   |
|-------------|---------|-----------------------------------------------|
| id          | serial  | PRIMARY KEY                                   |
| member_id   | integer | NOT NULL, FK → members(id) ON DELETE CASCADE  |
| start_date  | text    | NOT NULL                                      |
| end_date    | text    | NOT NULL                                      |
| description | text    | NULLABLE                                      |

### schedules
| Column     | Type    | Constraints                                                  |
|------------|---------|--------------------------------------------------------------|
| id         | serial  | PRIMARY KEY                                                  |
| month      | integer | NOT NULL                                                     |
| year       | integer | NOT NULL                                                     |
| status     | text    | NOT NULL, DEFAULT 'draft', ENUM('draft', 'committed')        |
| created_at | text    | NOT NULL, DEFAULT current timestamp                          |
| group_id   | integer | NOT NULL, FK → groups(id) ON DELETE CASCADE                  |

**Indexes:**
- `schedules_group_month_year_unique` — UNIQUE on (group_id, month, year)

### schedule_entries
| Column      | Type    | Constraints                                       |
|-------------|---------|---------------------------------------------------|
| id          | serial  | PRIMARY KEY                                       |
| schedule_id | integer | NOT NULL, FK → schedules(id) ON DELETE CASCADE    |
| date        | text    | NOT NULL                                          |
| role_id     | integer | NOT NULL, FK → roles(id)                          |
| member_id   | integer | NOT NULL, FK → members(id)                        |

### schedule_date_notes
| Column      | Type    | Constraints                                       |
|-------------|---------|---------------------------------------------------|
| id          | serial  | PRIMARY KEY                                       |
| schedule_id | integer | NOT NULL, FK → schedules(id) ON DELETE CASCADE    |
| date        | text    | NOT NULL                                          |
| description | text    | NOT NULL                                          |

### schedule_rehearsal_dates
| Column      | Type    | Constraints                                       |
|-------------|---------|---------------------------------------------------|
| id          | serial  | PRIMARY KEY                                       |
| schedule_id | integer | NOT NULL, FK → schedules(id) ON DELETE CASCADE    |
| date        | text    | NOT NULL                                          |

### day_role_priorities
| Column          | Type    | Constraints                                          |
|-----------------|---------|------------------------------------------------------|
| id              | serial  | PRIMARY KEY                                          |
| schedule_day_id | integer | NOT NULL, FK → schedule_days(id) ON DELETE CASCADE   |
| role_id         | integer | NOT NULL, FK → roles(id) ON DELETE CASCADE           |
| priority        | integer | NOT NULL, DEFAULT 0                                  |
