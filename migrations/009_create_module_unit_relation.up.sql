-- Migration: Refactor module_floor to support both floor and unit associations
-- This allows foundation modules to be associated with units
-- while structure modules remain associated with floors

BEGIN;

ALTER TABLE module_floor RENAME TO module_application;

ALTER TABLE module_application 
    ADD COLUMN unit_id UUID REFERENCES units(id) ON DELETE CASCADE;

ALTER TABLE module_application 
    ADD CONSTRAINT module_application_single_ref_check 
    CHECK (
        (floor_id IS NOT NULL AND unit_id IS NULL) OR
        (floor_id IS NULL AND unit_id IS NOT NULL)
    );

ALTER TABLE floors_consumption RENAME TO element_consumption;

ALTER TABLE element_consumption 
    ADD COLUMN unit_id UUID REFERENCES units(id) ON DELETE CASCADE;

ALTER TABLE element_consumption 
    ADD CONSTRAINT element_consumption_single_ref_check 
    CHECK (
        (floor_id IS NOT NULL AND unit_id IS NULL) OR
        (floor_id IS NULL AND unit_id IS NOT NULL)
    );

COMMIT;
