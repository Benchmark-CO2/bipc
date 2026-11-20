BEGIN;

ALTER TABLE module
    ADD COLUMN IF NOT EXISTS material_consumption JSONB;

COMMIT;
