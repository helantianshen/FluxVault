PRAGMA foreign_keys = ON;

CREATE TABLE administrators (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    username TEXT NOT NULL UNIQUE CHECK (length(username) BETWEEN 1 AND 120),
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
) STRICT;

CREATE TABLE api_keys (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    secret_hash TEXT NOT NULL UNIQUE,
    prefix TEXT NOT NULL,
    scopes TEXT NOT NULL CHECK (json_valid(scopes) AND json_type(scopes) = 'array'),
    status TEXT NOT NULL CHECK (status IN ('enabled', 'disabled', 'revoked')),
    expires_at TEXT,
    created_at TEXT NOT NULL
) STRICT;

CREATE TABLE storage_instances (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('telegram', 'github', 's3')),
    secret_ref TEXT NOT NULL,
    private_supported INTEGER NOT NULL CHECK (private_supported IN (0, 1)),
    enabled INTEGER NOT NULL CHECK (enabled IN (0, 1)),
    config_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(config_json)),
    created_at TEXT NOT NULL
) STRICT;

CREATE TABLE files (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL CHECK (length(CAST(name AS BLOB)) BETWEEN 1 AND 255),
    content_type TEXT NOT NULL,
    size INTEGER NOT NULL DEFAULT 0 CHECK (size >= 0),
    instance_id TEXT NOT NULL REFERENCES storage_instances(id) ON DELETE RESTRICT,
    owner_key_id TEXT REFERENCES api_keys(id) ON DELETE RESTRICT,
    owner_kind TEXT NOT NULL CHECK (owner_kind IN ('system', 'api_key')),
    visibility TEXT NOT NULL CHECK (visibility IN ('public', 'private')),
    state TEXT NOT NULL CHECK (state IN ('pending', 'ready', 'deleting')),
    locator_json TEXT CHECK (locator_json IS NULL OR json_valid(locator_json)),
    last_error TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK ((owner_kind = 'system' AND owner_key_id IS NULL) OR (owner_kind = 'api_key' AND owner_key_id IS NOT NULL)),
    CHECK (state <> 'ready' OR locator_json IS NOT NULL)
) STRICT;

CREATE INDEX idx_files_owner_created ON files(owner_key_id, created_at DESC, id DESC);
CREATE INDEX idx_files_instance_created ON files(instance_id, created_at DESC, id DESC);
CREATE INDEX idx_files_state_created ON files(state, created_at DESC, id DESC);
CREATE INDEX idx_files_created ON files(created_at DESC, id DESC);
