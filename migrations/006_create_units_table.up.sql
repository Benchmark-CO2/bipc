CREATE TABLE IF NOT EXISTS units (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    created_at TIMESTAMPTZ(0) NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    updated_at TIMESTAMPTZ(0) NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS options (
    id UUID PRIMARY KEY,
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    active BOOLEAN NOT NULL
);

CREATE TABLE IF NOT EXISTS floor_group (
    id UUID PRIMARY KEY,
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT
);

CREATE TABLE IF NOT EXISTS floor (
    id UUID PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES floor_group(id) ON DELETE CASCADE,
    area FLOAT8 NOT NULL,
    height FLOAT8 NOT NULL,
    "index" INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS module (
    id UUID PRIMARY KEY,
    option_id UUID NOT NULL REFERENCES options(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    total_co2_min FLOAT8 NOT NULL DEFAULT 0,
    total_co2_max FLOAT8 NOT NULL DEFAULT 0,
    total_energy_min FLOAT8 NOT NULL DEFAULT 0,
    total_energy_max FLOAT8 NOT NULL DEFAULT 0,
    relative_co2_min FLOAT8 DEFAULT 0,
    relative_co2_max FLOAT8 DEFAULT 0,
    relative_energy_min FLOAT8 DEFAULT 0,
    relative_energy_max FLOAT8 DEFAULT 0,
    created_at TIMESTAMPTZ(0) NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    updated_at TIMESTAMPTZ(0) NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS module_floor (
    module_id UUID NOT NULL REFERENCES module(id) ON DELETE CASCADE,
    floor_id UUID NOT NULL REFERENCES floor(id) ON DELETE CASCADE,
    PRIMARY KEY (module_id, floor_id)
);

CREATE TABLE IF NOT EXISTS floors_consumption (
    floor_id UUID NOT NULL REFERENCES floor(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    option_id UUID NOT NULL REFERENCES options(id) ON DELETE CASCADE,
    technology TEXT NOT NULL,
    co2_min FLOAT8 NOT NULL DEFAULT 0,
    co2_max FLOAT8 NOT NULL DEFAULT 0,
    energy_min FLOAT8 NOT NULL DEFAULT 0,
    energy_max FLOAT8 NOT NULL DEFAULT 0,
    PRIMARY KEY (floor_id, role_id, option_id, technology)
);
