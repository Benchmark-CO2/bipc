-- Add outdated column to module table
ALTER TABLE module ADD COLUMN outdated BOOLEAN NOT NULL DEFAULT FALSE;

-- Add new columns to floor table (keeping group_id for now)
ALTER TABLE floor ADD COLUMN unit_id UUID;
ALTER TABLE floor ADD COLUMN floor_group TEXT;
ALTER TABLE floor ADD COLUMN category TEXT;

-- Migrate data from floor_group to floor
UPDATE floor f
SET unit_id = fg.unit_id,
    floor_group = fg.name,
    category = fg.category
FROM floor_group fg
WHERE f.group_id = fg.id;

-- Make new columns NOT NULL after data migration
ALTER TABLE floor ALTER COLUMN unit_id SET NOT NULL;
ALTER TABLE floor ALTER COLUMN floor_group SET NOT NULL;
ALTER TABLE floor ALTER COLUMN category SET NOT NULL;

-- Add foreign key constraint for unit_id
ALTER TABLE floor ADD CONSTRAINT fk_floor_unit FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE;

-- Remove old floor_group table and group_id column
ALTER TABLE floor DROP CONSTRAINT floor_group_id_fkey;
ALTER TABLE floor DROP COLUMN group_id;
DROP TABLE floor_group;
