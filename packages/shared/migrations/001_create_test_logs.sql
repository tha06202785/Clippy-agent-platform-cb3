-- Migration: Create test_logs table
-- Run when Supabase DDL is available (via Supabase dashboard or supabase CLI)
-- Currently, test logging uses clippy_activity_log (category='test') as a fallback

CREATE TABLE IF NOT EXISTS test_logs (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL,
  org_id      UUID        NOT NULL,
  action      TEXT        NOT NULL,          -- e.g. 'api_route_test', 'assertion_failed', 'ai_copilot_call'
  title       TEXT        NOT NULL,          -- human-readable description
  level       TEXT        DEFAULT 'info',    -- info | warn | error | pass | fail
  metadata    JSONB       DEFAULT '{}',      -- free-form: { route, method, status, latencyMs, ... }
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_test_logs_org_id     ON test_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_test_logs_user_id     ON test_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_test_logs_action      ON test_logs(action);
CREATE INDEX IF NOT EXISTS idx_test_logs_created_at  ON test_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_logs_level       ON test_logs(level);

-- RLS (copy from clippy_activity_log or adjust as needed)
ALTER TABLE test_logs ENABLE ROW LEVEL SECURITY;

-- Org members can read their org's test logs
CREATE POLICY "Org members can read test_logs"
  ON test_logs FOR SELECT
  USING (auth.uid() = user_id OR true);  -- tighten when auth is confirmed

-- Service role can do everything
CREATE POLICY "Service role full access to test_logs"
  ON test_logs FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE test_logs IS 'Structured test & QA logging for Clippy route/regression tests';
