ALTER TABLE units
ADD COLUMN repetition_count INTEGER NOT NULL DEFAULT 1;

ALTER TABLE units
ADD CONSTRAINT units_repetition_count_positive CHECK (repetition_count > 0);
