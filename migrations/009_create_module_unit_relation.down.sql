BEGIN;

ALTER TABLE element_consumption 
    DROP CONSTRAINT IF EXISTS element_consumption_single_ref_check;

ALTER TABLE element_consumption 
    DROP COLUMN IF EXISTS unit_id;

ALTER TABLE element_consumption RENAME TO floors_consumption;

ALTER TABLE module_application 
    DROP CONSTRAINT IF EXISTS module_application_single_ref_check;

ALTER TABLE module_application 
    DROP COLUMN IF EXISTS unit_id;

ALTER TABLE module_application RENAME TO module_floor;

COMMIT;
