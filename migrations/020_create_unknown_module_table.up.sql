BEGIN;

CREATE TABLE IF NOT EXISTS unknown_module (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    "references" JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_unknown_module_user ON unknown_module(user_id);

-- Occurrences of an unknown module inside an option, mirroring the link
-- between the conventional module table and options. Each occurrence stores
-- its own materials with quantities (JSONB), because quantities belong to the
-- occurrence, not to the type. A given type is never applied to an option
-- more than once.
CREATE TABLE IF NOT EXISTS unknown_module_occurrence (
    id UUID PRIMARY KEY,
    option_id UUID NOT NULL REFERENCES options(id) ON DELETE CASCADE,
    unknown_module_id UUID NOT NULL REFERENCES unknown_module(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    materials JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unknown_module_occurrence_option_module_unique UNIQUE (option_id, unknown_module_id)
);

CREATE INDEX IF NOT EXISTS idx_unknown_module_occurrence_option ON unknown_module_occurrence(option_id);
CREATE INDEX IF NOT EXISTS idx_unknown_module_occurrence_module ON unknown_module_occurrence(unknown_module_id);

COMMIT;