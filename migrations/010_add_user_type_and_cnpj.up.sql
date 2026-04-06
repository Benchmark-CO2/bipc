-- Add user_type enum
CREATE TYPE user_type AS ENUM ('member', 'company', 'analyst', 'admin');

-- Add type and cnpj columns to users table
ALTER TABLE users ADD COLUMN type user_type NOT NULL DEFAULT 'member';
ALTER TABLE users ADD COLUMN cnpj TEXT;
