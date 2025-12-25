BEGIN;

ALTER TABLE element_consumption DROP CONSTRAINT element_consumption_pkey;

ALTER TABLE element_consumption 
    DROP CONSTRAINT IF EXISTS element_consumption_single_ref_check;

ALTER TABLE element_consumption 
    DROP COLUMN IF EXISTS unit_id;

ALTER TABLE element_consumption 
    ALTER COLUMN floor_id SET NOT NULL;

ALTER TABLE element_consumption RENAME TO floors_consumption;

ALTER TABLE floors_consumption 
    ADD PRIMARY KEY (floor_id, role_id, option_id, technology);

ALTER TABLE module_application 
    DROP CONSTRAINT IF EXISTS module_application_single_ref_check;

ALTER TABLE module_application 
    DROP COLUMN IF EXISTS unit_id;

ALTER TABLE module_application 
    ALTER COLUMN floor_id SET NOT NULL;

ALTER TABLE module_application RENAME TO module_floor;

ALTER TABLE module_floor 
    ADD PRIMARY KEY (module_id, floor_id);

COMMIT;
