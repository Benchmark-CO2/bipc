CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    name TEXT NOT NULL,
    email citext UNIQUE NOT NULL,
    password_hash BYTEA NOT NULL,
    activated BOOLEAN NOT NULL,
    image_url TEXT,
    crea_cau TEXT,
    birthdate DATE,
    city TEXT,
    activity TEXT,
    enterprise TEXT
);