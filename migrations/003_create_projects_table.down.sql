DROP TRIGGER IF EXISTS projects_updated_at ON projects;
DROP FUNCTION IF EXISTS projects_set_updated_at();
DROP TABLE IF EXISTS projects;
DROP TYPE IF EXISTS project_phase;
DROP TYPE IF EXISTS state_br;
DROP DOMAIN IF EXISTS cep_br;