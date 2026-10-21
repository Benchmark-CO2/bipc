ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS project_start_date DATE,
    ADD COLUMN IF NOT EXISTS project_end_date DATE,
    ADD COLUMN IF NOT EXISTS construction_start_date DATE,
    ADD COLUMN IF NOT EXISTS construction_end_date DATE;