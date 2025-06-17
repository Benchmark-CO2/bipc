CREATE TABLE IF NOT EXISTS projects (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 1,
    -- Versioning column to trigger projects_updated_at
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name citext NOT NULL,
    cep TEXT NOT NULL,
    state TEXT NOT NULL,
    city TEXT NOT NULL,
    neighborhood TEXT NOT NULL,
    street TEXT NOT NULL,
    number TEXT NOT NULL,
    phase TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS projects_name_idx ON projects USING GIN (to_tsvector('simple', name));

CREATE OR REPLACE FUNCTION projects_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION projects_set_updated_at();
