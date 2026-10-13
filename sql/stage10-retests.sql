-- Additive post-restore HTTP test evidence. Existing notes, sealed snapshots
-- and audit entries stay untouched.
CREATE TABLE IF NOT EXISTS defense.note_restore_retests (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  note_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  judge_run_id uuid NOT NULL,
  policy_version text NOT NULL,
  checks jsonb NOT NULL CHECK (jsonb_typeof(checks)='array'),
  checked_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE defense.note_restore_retests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON defense.note_restore_retests FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON defense.note_restore_retests TO service_role;
GRANT USAGE, SELECT ON SEQUENCE defense.note_restore_retests_id_seq TO service_role;
DO $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_trigger
    WHERE tgrelid='defense.note_restore_retests'::regclass
      AND tgname='trg_stage10_retest_immutable' AND NOT tgisinternal) THEN
    CREATE TRIGGER trg_stage10_retest_immutable
      BEFORE UPDATE OR DELETE ON defense.note_restore_retests
      FOR EACH ROW EXECUTE FUNCTION defense.stage10_reject_evidence_mutation();
  END IF;
END $$;
