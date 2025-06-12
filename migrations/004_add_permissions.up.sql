CREATE TABLE IF NOT EXISTS permissions (
    id SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users_projects_permissions (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    permission_id SMALLINT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, project_id, permission_id)
);

-- Insert initial permissions 
INSERT INTO permissions (code)
VALUES 
    ('project:view'),
    ('project:edit');

