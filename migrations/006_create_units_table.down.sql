-- Active: 1748393261038@@127.0.0.1@5432
DROP TRIGGER IF EXISTS units_updated_at ON units;
DROP FUNCTION IF EXISTS units_set_updated_at();
DROP INDEX IF EXISTS units_project_id_idx;
DROP TABLE IF EXISTS units;