-- Temporary Stage 11 diagnostic events. No user IDs, tokens, IPs, paths or contents.
CREATE TABLE IF NOT EXISTS defense.stage11_diagnostic_events (
  event_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  event text NOT NULL CHECK (event IN (
    'html_loaded','module_started','auth_config_loaded','auth_config_failed',
    'auth_ready','login_attempt','login_succeeded','login_failed',
    'device_keygen_started','device_keygen_failed','device_request_started',
    'device_request_succeeded','device_request_failed','device_status_requested',
    'device_approved','device_pending','device_status_failed',
    'notes_request_started','notes_request_succeeded','notes_request_failed',
    'auth_config_enter','auth_config_served','auth_config_unavailable',
    'device_enter','device_auth_rejected','device_identity_verified',
    'device_pending_created','device_status_served','device_error',
    'notes_enter','notes_auth_rejected','notes_identity_verified',
    'notes_device_rejected','notes_device_verified'
  )),
  source text NOT NULL CHECK (source IN ('browser','server')),
  actor text NOT NULL DEFAULT 'unknown'
    CHECK (actor IN ('unknown','anonymous','student','judge_a','judge_b')),
  route text NOT NULL CHECK (route IN ('page','auth_config','device','notes')),
  trace_id uuid,
  status_code int CHECK (status_code BETWEEN 100 AND 599)
);
CREATE INDEX IF NOT EXISTS idx_stage11_diag_recent
  ON defense.stage11_diagnostic_events (occurred_at DESC);
ALTER TABLE defense.stage11_diagnostic_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE defense.stage11_diagnostic_events FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON TABLE defense.stage11_diagnostic_events TO service_role;
REVOKE ALL ON SEQUENCE defense.stage11_diagnostic_events_event_id_seq FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SEQUENCE defense.stage11_diagnostic_events_event_id_seq TO service_role;
