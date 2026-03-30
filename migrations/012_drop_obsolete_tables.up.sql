BEGIN;

-- Drop element_consumption table (replaced by module_target_consumption)
DROP TABLE IF EXISTS element_consumption CASCADE;

-- Drop module_application table (replaced by module_target_consumption)
-- module_target_consumption now serves this purpose through target_id and target_type fields,
-- eliminating data redundancy and providing a single source of truth.
DROP TABLE IF EXISTS module_application CASCADE;

COMMIT;
