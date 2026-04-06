-- Remove cnpj column
ALTER TABLE users DROP COLUMN IF EXISTS cnpj;

-- Remove type column
ALTER TABLE users DROP COLUMN IF EXISTS type;

-- Drop the user_type enum
DROP TYPE IF EXISTS user_type;
