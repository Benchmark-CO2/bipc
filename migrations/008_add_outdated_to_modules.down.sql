-- Recreate floor_group table
CREATE TABLE floor_group (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add group_id column back to floor
ALTER TABLE floor ADD COLUMN group_id UUID;

-- Recreate floor_group records and link floors back
INSERT INTO floor_group (id, unit_id, name, category)
SELECT gen_random_uuid(), unit_id, floor_group, category
FROM floor
GROUP BY unit_id, floor_group, category;

UPDATE floor f
SET group_id = fg.id
FROM floor_group fg
WHERE f.unit_id = fg.unit_id 
  AND f.floor_group = fg.name 
  AND f.category = fg.category;

-- Make group_id NOT NULL and add foreign key
ALTER TABLE floor ALTER COLUMN group_id SET NOT NULL;
ALTER TABLE floor ADD CONSTRAINT floor_group_id_fkey FOREIGN KEY (group_id) REFERENCES floor_group(id) ON DELETE CASCADE;

-- Remove foreign key constraint
ALTER TABLE floor DROP CONSTRAINT IF EXISTS fk_floor_unit;

-- Remove new columns from floor table
ALTER TABLE floor DROP COLUMN IF EXISTS category;
ALTER TABLE floor DROP COLUMN IF EXISTS floor_group;
ALTER TABLE floor DROP COLUMN IF EXISTS unit_id;

-- Remove outdated column from module table
ALTER TABLE module DROP COLUMN outdated;
