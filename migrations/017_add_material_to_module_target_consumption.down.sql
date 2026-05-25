BEGIN;

ALTER TABLE module
    DROP COLUMN IF EXISTS total_material;

ALTER TABLE module_target_consumption
    DROP COLUMN IF EXISTS material;

COMMIT;
