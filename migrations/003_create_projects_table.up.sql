CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ(0) NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    updated_at TIMESTAMPTZ(0) NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name citext NOT NULL,
    cep TEXT,
    state TEXT NOT NULL,
    city TEXT NOT NULL,
    neighborhood TEXT,
    street TEXT,
    number TEXT,
    phase TEXT NOT NULL,
    description TEXT,
    image_id UUID,
    UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS projects_name_idx ON projects USING GIN (to_tsvector('simple', name));
