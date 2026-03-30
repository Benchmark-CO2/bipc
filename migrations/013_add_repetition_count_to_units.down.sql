ALTER TABLE units
DROP CONSTRAINT IF EXISTS units_repetition_count_positive;

ALTER TABLE units
DROP COLUMN IF EXISTS repetition_count;
