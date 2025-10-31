CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ(0) NOT NULL,
    inviter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    email citext NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS invitations_project_id_email_pending_idx
ON invitations (project_id, email)
WHERE status = 'pending';