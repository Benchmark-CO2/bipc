CREATE TABLE IF NOT EXISTS units (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    total_floors INTEGER,
    tower_floors INTEGER,
    base_floors INTEGER,
    basement_floors INTEGER,
    type_floors INTEGER,
    total_area DOUBLE PRECISION,
    created_at TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS units_project_id_idx ON units(project_id);

CREATE OR REPLACE FUNCTION units_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER units_updated_at
BEFORE UPDATE ON units
FOR EACH ROW
EXECUTE FUNCTION units_set_updated_at();