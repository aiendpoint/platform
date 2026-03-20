-- Add discover_count to track how many times agents looked up this community spec
ALTER TABLE community_specs ADD COLUMN IF NOT EXISTS discover_count INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_community_specs_discover_count ON community_specs (discover_count DESC);
