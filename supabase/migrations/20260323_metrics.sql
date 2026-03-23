-- ─── Metrics Tables for Research Data Collection ────────────────────────────
-- Collects token efficiency benchmarks and discovery event data
-- for quantitative analysis of the /ai endpoint standard.
-- All inserts are fire-and-forget (non-blocking) from the registry.

-- ─────────────────────────────────────────────────────────────────────────────
-- Table: token_benchmarks
-- Compares token cost of /ai response vs HTML page for the same service.
-- Measured automatically during validation.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE token_benchmarks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Target
  url           TEXT NOT NULL,
  domain        TEXT NOT NULL,
  service_id    UUID REFERENCES services(id) ON DELETE SET NULL,

  -- /ai endpoint metrics
  ai_bytes      INTEGER NOT NULL,
  ai_tokens     INTEGER NOT NULL,
  ai_fields     INTEGER NOT NULL DEFAULT 0,
  ai_response_ms INTEGER,

  -- HTML page metrics (homepage fetch for comparison)
  html_bytes    INTEGER,
  html_tokens   INTEGER,
  html_response_ms INTEGER,

  -- Computed
  token_ratio   NUMERIC(6,2),
  efficiency_gain_pct NUMERIC(6,2),

  -- Context
  capability_count INTEGER NOT NULL DEFAULT 0,
  spec_version  TEXT,
  source        TEXT NOT NULL DEFAULT 'validation'
                CHECK (source IN ('validation', 'registration', 'monitor'))
);

CREATE INDEX idx_token_benchmarks_domain     ON token_benchmarks (domain);
CREATE INDEX idx_token_benchmarks_created_at ON token_benchmarks (created_at DESC);
CREATE INDEX idx_token_benchmarks_ratio      ON token_benchmarks (token_ratio DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- Table: discovery_events
-- Tracks each MCP discovery attempt and which fallback step succeeded.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE discovery_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Target
  url           TEXT NOT NULL,
  domain        TEXT NOT NULL,

  -- Discovery result
  step          TEXT NOT NULL
                CHECK (step IN ('direct', 'registry', 'generation', 'failed')),
  success       BOOLEAN NOT NULL,
  response_ms   INTEGER,

  -- Context
  tool          TEXT NOT NULL DEFAULT 'aiendpoint_discover'
                CHECK (tool IN (
                  'aiendpoint_discover',
                  'aiendpoint_search_services',
                  'aiendpoint_fetch_ai_spec',
                  'aiendpoint_validate_service',
                  'aiendpoint_submit_community_spec'
                )),
  confidence    INTEGER,
  error_code    TEXT,

  -- Agent info (anonymized)
  agent_hash    TEXT
);

CREATE INDEX idx_discovery_events_domain     ON discovery_events (domain);
CREATE INDEX idx_discovery_events_step       ON discovery_events (step);
CREATE INDEX idx_discovery_events_created_at ON discovery_events (created_at DESC);
CREATE INDEX idx_discovery_events_tool       ON discovery_events (tool);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS policies
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE token_benchmarks  ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovery_events  ENABLE ROW LEVEL SECURITY;

-- Insert-only from service key; read for analytics
CREATE POLICY "token_benchmarks_insert" ON token_benchmarks FOR INSERT WITH CHECK (true);
CREATE POLICY "token_benchmarks_read"   ON token_benchmarks FOR SELECT USING (true);

CREATE POLICY "discovery_events_insert" ON discovery_events FOR INSERT WITH CHECK (true);
CREATE POLICY "discovery_events_read"   ON discovery_events FOR SELECT USING (true);
