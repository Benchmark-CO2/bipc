-- Add is_admin to users table
ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;

-- Create index for admin queries
CREATE INDEX idx_users_is_admin ON users(is_admin) WHERE is_admin = true;
