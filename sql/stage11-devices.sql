-- Stage 11 only. Apply in the trusted Supabase SQL editor or via migration.
-- These tables never expose keys/approvals to anon or authenticated callers.
CREATE TABLE IF NOT EXISTS defense.device_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  label text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 60),
  public_jwk jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','revoked','rejected')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  CONSTRAINT stage11_approved_at_consistency CHECK (status <> 'approved' OR approved_at IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_stage11_device_owner ON defense.device_approvals(owner_id,status);
CREATE TABLE IF NOT EXISTS defense.device_request_nonces (
  device_id uuid NOT NULL REFERENCES defense.device_approvals(id) ON DELETE RESTRICT,
  nonce text NOT NULL CHECK (nonce ~ '^[0-9a-f]{32}$'),
  used_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (device_id,nonce)
);
ALTER TABLE defense.device_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE defense.device_request_nonces ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE defense.device_approvals,defense.device_request_nonces FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON defense.device_approvals TO service_role;
GRANT SELECT,INSERT ON defense.device_request_nonces TO service_role;

-- IMPORTANT: Do not automatically approve a pending registration.
-- After verifying the registered device and owner's request through an
-- independent trusted channel, a database administrator may execute:
-- UPDATE defense.device_approvals
-- SET status = 'approved', approved_at = now()
-- WHERE id = '<device UUID>'::uuid AND owner_id = '<verified owner UUID>'::uuid
--   AND status = 'pending';
-- For revocation, use status='revoked'; a browser never receives this capability.
