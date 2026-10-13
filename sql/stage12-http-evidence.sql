-- Stage 12 real HTTP evidence. Append-only, row scoped, no note contents.
CREATE TABLE IF NOT EXISTS defense.stage12_http_evidence (
  evidence_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner_id uuid NOT NULL,
  request_id uuid NOT NULL,
  case_id text NOT NULL CHECK (case_id ~ '^S[0-9]{2}_[A-Z_]{2,40}$'),
  stage smallint NOT NULL CHECK (stage BETWEEN 1 AND 12),
  category text NOT NULL CHECK (category IN ('normal','forbidden')),
  source text NOT NULL DEFAULT 'live_http' CHECK (source = 'live_http'),
  expected_status smallint NOT NULL CHECK (expected_status BETWEEN 100 AND 599),
  actual_status smallint CHECK (actual_status BETWEEN 100 AND 599),
  verdict text NOT NULL CHECK (verdict IN ('pass','fail','not_run')),
  checked_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stage12_evidence_actual_consistency CHECK (
    (verdict='not_run' AND actual_status IS NULL) OR
    (verdict='pass' AND actual_status=expected_status) OR
    (verdict='fail' AND actual_status IS NOT NULL AND actual_status<>expected_status))
);
CREATE INDEX IF NOT EXISTS stage12_evidence_owner_time ON defense.stage12_http_evidence(owner_id,checked_at DESC);
ALTER TABLE defense.stage12_http_evidence ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE defense.stage12_http_evidence FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON TABLE defense.stage12_http_evidence TO service_role;
REVOKE ALL ON SEQUENCE defense.stage12_http_evidence_evidence_id_seq FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SEQUENCE defense.stage12_http_evidence_evidence_id_seq TO service_role;
