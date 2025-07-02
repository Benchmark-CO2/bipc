-- Create table for concrete (to store volumes for each FCK per module)
CREATE TABLE IF NOT EXISTS concrete (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    volume_fck20 DOUBLE PRECISION DEFAULT 0,
    volume_fck25 DOUBLE PRECISION DEFAULT 0,
    volume_fck30 DOUBLE PRECISION DEFAULT 0,
    volume_fck35 DOUBLE PRECISION DEFAULT 0,
    volume_fck40 DOUBLE PRECISION DEFAULT 0,
    volume_fck45 DOUBLE PRECISION DEFAULT 0
);

-- Concrete Wall Module
CREATE TABLE IF NOT EXISTS module_concrete_wall (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    unit_id BIGINT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    floor_repetition INTEGER NOT NULL,
    floor_area DOUBLE PRECISION NOT NULL,
    floor_height DOUBLE PRECISION NOT NULL,
    concrete_walls INTEGER NOT NULL REFERENCES concrete(id),
    concrete_slabs INTEGER NOT NULL REFERENCES concrete(id),
    steel_ca50 DOUBLE PRECISION NOT NULL,
    steel_ca60 DOUBLE PRECISION NOT NULL,
    wall_thickness DOUBLE PRECISION,
    slab_thickness DOUBLE PRECISION,
    form_area DOUBLE PRECISION,
    wall_area DOUBLE PRECISION,
    total_co2_min DOUBLE PRECISION,
    total_co2_max DOUBLE PRECISION,
    total_energy_min DOUBLE PRECISION,
    total_energy_max DOUBLE PRECISION,
    version INTEGER NOT NULL DEFAULT 1,
    in_use BOOLEAN,
    created_at TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Beam Column Module
CREATE TABLE IF NOT EXISTS module_beam_column (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    unit_id BIGINT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    floor_repetition INTEGER NOT NULL,
    floor_area DOUBLE PRECISION NOT NULL,
    floor_height DOUBLE PRECISION NOT NULL,
    concrete_columns INTEGER NOT NULL REFERENCES concrete(id),
    concrete_beams INTEGER NOT NULL REFERENCES concrete(id),
    concrete_slabs INTEGER NOT NULL REFERENCES concrete(id),
    steel_ca50 DOUBLE PRECISION NOT NULL,
    steel_ca60 DOUBLE PRECISION NOT NULL,
    form_columns DOUBLE PRECISION,
    form_beams DOUBLE PRECISION,
    form_slabs DOUBLE PRECISION,
    form_total DOUBLE PRECISION,
    column_number INTEGER,
    avg_beam_span INTEGER,
    avg_slab_span INTEGER,
    total_co2_min DOUBLE PRECISION,
    total_co2_max DOUBLE PRECISION,
    total_energy_min DOUBLE PRECISION,
    total_energy_max DOUBLE PRECISION,
    version INTEGER NOT NULL DEFAULT 1,
    in_use BOOLEAN,
    created_at TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_module_concrete_wall_unit_id ON module_concrete_wall(unit_id);
CREATE INDEX IF NOT EXISTS idx_module_beam_column_unit_id ON module_beam_column(unit_id);
