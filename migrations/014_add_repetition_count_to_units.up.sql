ALTER TABLE units
ADD COLUMN repetition_count INTEGER NOT NULL DEFAULT 1;

ALTER TABLE units
ADD COLUMN housing_units_count INTEGER NULL;

ALTER TABLE units
ADD CONSTRAINT units_repetition_count_positive CHECK (repetition_count > 0);

ALTER TABLE units
ADD CONSTRAINT units_housing_units_count_positive
CHECK (housing_units_count IS NULL OR housing_units_count > 0);
