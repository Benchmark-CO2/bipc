CREATE TABLE IF NOT EXISTS projects (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
