BEGIN;

-- Recreate module_application table (will be empty)
-- Note: This rollback recreates the table structure but data will be lost.
-- Use database backup to restore data if needed.
CREATE TABLE IF NOT EXISTS module_application (
    module_id UUID NOT NULL REFERENCES module(id) ON DELETE CASCADE,
    floor_id UUID REFERENCES floor(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
    CONSTRAINT module_application_single_ref_check 
        CHECK (
            (floor_id IS NOT NULL AND unit_id IS NULL) OR
            (floor_id IS NULL AND unit_id IS NOT NULL)
        )
);

CREATE INDEX IF NOT EXISTS idx_module_application_module ON module_application(module_id);
CREATE INDEX IF NOT EXISTS idx_module_application_floor ON module_application(floor_id);
CREATE INDEX IF NOT EXISTS idx_module_application_unit ON module_application(unit_id);

-- Recreate element_consumption table (will be empty)
-- Note: This rollback recreates the table structure but data will be lost.
-- Use database backup to restore data if needed.
CREATE TABLE IF NOT EXISTS element_consumption (
    floor_id UUID REFERENCES floor(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
    role_id UUID NOT NULL,
    option_id UUID NOT NULL,
    technology TEXT NOT NULL,
    co2_min FLOAT8 NOT NULL DEFAULT 0,
    co2_max FLOAT8 NOT NULL DEFAULT 0,
    energy_min FLOAT8 NOT NULL DEFAULT 0,
    energy_max FLOAT8 NOT NULL DEFAULT 0,
    CONSTRAINT element_consumption_single_ref_check 
        CHECK (
            (floor_id IS NOT NULL AND unit_id IS NULL) OR
            (floor_id IS NULL AND unit_id IS NOT NULL)
        )
);

CREATE UNIQUE INDEX IF NOT EXISTS element_consumption_floor_unique 
    ON element_consumption (floor_id, role_id, option_id, technology)
    WHERE floor_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS element_consumption_unit_unique
    ON element_consumption (unit_id, role_id, option_id, technology)
    WHERE unit_id IS NOT NULL;

COMMIT;
