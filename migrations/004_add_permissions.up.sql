CREATE TABLE IF NOT EXISTS permissions (
    id SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users_projects_permissions (
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    permission_id SMALLINT REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, project_id, permission_id)
);

INSERT INTO permissions (code)
VALUES 
    ('project:owner'),
    ('project:view'),
    ('project:edit');
