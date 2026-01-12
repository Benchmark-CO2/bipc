-- Migration: Refactor module_floor to support both floor and unit associations
-- This allows foundation modules to be associated with units
-- while structure modules remain associated with floors

BEGIN;

ALTER TABLE module_floor RENAME TO module_application;

ALTER TABLE module_application DROP CONSTRAINT module_floor_pkey;

ALTER TABLE module_application 
    ALTER COLUMN floor_id DROP NOT NULL;

ALTER TABLE module_application 
    ADD COLUMN unit_id UUID REFERENCES units(id) ON DELETE CASCADE;

ALTER TABLE module_application 
    ADD CONSTRAINT module_application_single_ref_check 
    CHECK (
        (floor_id IS NOT NULL AND unit_id IS NULL) OR
        (floor_id IS NULL AND unit_id IS NOT NULL)
    );

ALTER TABLE floors_consumption RENAME TO element_consumption;

ALTER TABLE element_consumption DROP CONSTRAINT floors_consumption_pkey;

ALTER TABLE element_consumption 
    ALTER COLUMN floor_id DROP NOT NULL;

ALTER TABLE element_consumption 
    ADD COLUMN unit_id UUID REFERENCES units(id) ON DELETE CASCADE;

ALTER TABLE element_consumption 
    ADD CONSTRAINT element_consumption_single_ref_check 
    CHECK (
        (floor_id IS NOT NULL AND unit_id IS NULL) OR
        (floor_id IS NULL AND unit_id IS NOT NULL)
    );

CREATE UNIQUE INDEX element_consumption_floor_unique 
    ON element_consumption (floor_id, role_id, option_id, technology)
    WHERE floor_id IS NOT NULL;

CREATE UNIQUE INDEX element_consumption_unit_unique
    ON element_consumption (unit_id, role_id, option_id, technology)
    WHERE unit_id IS NOT NULL;

COMMIT;
