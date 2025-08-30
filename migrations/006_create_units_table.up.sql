CREATE TABLE IF NOT EXISTS units (
    id UUID PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tower (
    id UUID PRIMARY KEY REFERENCES units(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ(0) NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    updated_at TIMESTAMPTZ(0) NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS tower_option (
    id UUID PRIMARY KEY,
    tower_id UUID NOT NULL REFERENCES tower(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    active BOOLEAN NOT NULL
);

CREATE TABLE IF NOT EXISTS floor_group (
    id UUID PRIMARY KEY,
    tower_id UUID NOT NULL REFERENCES tower(id) ON DELETE CASCADE,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS floor (
    id UUID PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES floor_group(id) ON DELETE CASCADE,
    area FLOAT8 NOT NULL,
    height FLOAT8 NOT NULL,
    "index" INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS concrete (
  id UUID PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS steel_mass (
  concrete_id UUID NOT NULL REFERENCES concrete(id) ON DELETE CASCADE,
  ca TEXT NOT NULL,
  mass FLOAT8 NOT NULL,
  PRIMARY KEY (concrete_id, ca)
);

CREATE TABLE IF NOT EXISTS concrete_volume (
  concrete_id UUID NOT NULL REFERENCES concrete(id) ON DELETE CASCADE,
  fck INTEGER NOT NULL,
  volume FLOAT8 NOT NULL,
  PRIMARY KEY (concrete_id, fck)
);

CREATE TABLE IF NOT EXISTS module (
    id UUID PRIMARY KEY,
    tower_option_id UUID NOT NULL REFERENCES tower_option(id) ON DELETE CASCADE,
    type TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS module_floor (
    module_id UUID NOT NULL REFERENCES module(id) ON DELETE CASCADE,
    floor_id UUID NOT NULL REFERENCES floor(id) ON DELETE CASCADE,
    PRIMARY KEY (module_id, floor_id)
);

CREATE TABLE IF NOT EXISTS module_concrete_wall (
    id UUID PRIMARY KEY REFERENCES module(id) ON DELETE CASCADE,
    concrete_walls UUID NOT NULL REFERENCES concrete(id),
    concrete_slabs UUID NOT NULL REFERENCES concrete(id),
    wall_thickness FLOAT8,
    slab_thickness FLOAT8,
    form_area FLOAT8,
    wall_area FLOAT8,
    total_co2_min FLOAT8,
    total_co2_max FLOAT8,
    total_energy_min FLOAT8,
    total_energy_max FLOAT8,
    created_at TIMESTAMPTZ(0) NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    updated_at TIMESTAMPTZ(0) NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS module_beam_column (
    id UUID PRIMARY KEY REFERENCES module(id) ON DELETE CASCADE,
    concrete_columns UUID NOT NULL REFERENCES concrete(id),
    concrete_beams UUID NOT NULL REFERENCES concrete(id),
    concrete_slabs UUID NOT NULL REFERENCES concrete(id),
    form_columns FLOAT8,
    form_beams FLOAT8,
    form_slabs FLOAT8,
    form_total FLOAT8,
    column_number INTEGER,
    avg_beam_span INTEGER,
    avg_slab_span INTEGER,
    total_co2_min FLOAT8,
    total_co2_max FLOAT8,
    total_energy_min FLOAT8,
    total_energy_max FLOAT8,
    created_at TIMESTAMPTZ(0) NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    updated_at TIMESTAMPTZ(0) NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
