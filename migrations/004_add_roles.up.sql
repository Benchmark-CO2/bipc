CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    simulation BOOLEAN NOT NULL,
    is_protected BOOLEAN NOT NULL,
    UNIQUE (project_id, name)
);

CREATE TABLE IF NOT EXISTS permissions (
    id SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    UNIQUE (action, resource)
);

CREATE TABLE IF NOT EXISTS roles_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id SMALLINT REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS users_roles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

INSERT INTO permissions (action, resource)
VALUES
    ('*','*'),
    ('update', 'project'),
    ('create', 'invite'),
    ('delete', 'collaborator'),
    ('delete', 'invite'),
    ('create', 'role'),
    ('update', 'role'),
    ('delete', 'role')
    ('create', 'unit')
    ('update', 'unit')
    ('delete', 'unit');
