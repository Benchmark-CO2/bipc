CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ(0) NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    name citext NOT NULL,
    cep TEXT,
    state TEXT NOT NULL,
    city TEXT NOT NULL,
    neighborhood TEXT,
    street TEXT,
    number TEXT,
    phase TEXT NOT NULL,
    description TEXT,
    benchmark BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS projects_name_idx ON projects USING GIN (to_tsvector('simple', name));

CREATE TABLE IF NOT EXISTS users_projects (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, project_id)
);
