BEGIN;

ALTER TABLE module
    DROP COLUMN IF EXISTS material_consumption;

COMMIT;
