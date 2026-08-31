ALTER TABLE projects
    DROP COLUMN IF EXISTS project_start_date,
    DROP COLUMN IF EXISTS project_end_date,
    DROP COLUMN IF EXISTS construction_start_date,
    DROP COLUMN IF EXISTS construction_end_date;