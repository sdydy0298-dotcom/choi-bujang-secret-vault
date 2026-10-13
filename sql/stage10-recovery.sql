-- Stage 10, forward-only, no backfill. Install BEFORE simulated attack.
-- Keep previous notes and all unrelated policies/records intact.
CREATE TABLE IF NOT EXISTS defense.note_recovery_backups (
  note_id uuid PRIMARY KEY,
  owner_id uuid NOT NULL,
  judge_run_id uuid NOT NULL,
  judge_identity text NOT NULL CHECK (judge_identity = 'b'),
  title text NOT NULL,
  content text NOT NULL,
  content_sha256 text NOT NULL CHECK (content_sha256 ~ '^[0-9a-f]{64}$'),
  captured_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE defense.note_recovery_backups ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE defense.note_recovery_backups FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE defense.note_recovery_backups TO service_role;

CREATE TABLE IF NOT EXISTS defense.note_restore_audit (
  audit_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  note_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  judge_run_id uuid NOT NULL,
  restored_at timestamptz NOT NULL DEFAULT now(),
  restored_hash text NOT NULL,
  operation text NOT NULL CHECK (operation IN ('reinsert','repaired'))
);
ALTER TABLE defense.note_restore_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE defense.note_restore_audit FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE defense.note_restore_audit TO service_role;

-- Capture immutable baseline atomically with B's initial note INSERT.
CREATE OR REPLACE FUNCTION defense.stage10_backup_b_on_insert()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, defense
AS $$
BEGIN
  IF NEW.judge_identity = 'b' AND NEW.judge_run_id IS NOT NULL AND NEW.owner_id IS NOT NULL THEN
    INSERT INTO defense.note_recovery_backups
      (note_id, owner_id, judge_run_id, judge_identity, title, content,
       content_sha256, captured_at, verified_at)
    VALUES
      (NEW.id, NEW.owner_id, NEW.judge_run_id, 'b', NEW.title, NEW.content,
       encode(sha256(convert_to(NEW.title || E'\n--ALEPH-STAGE10--\n' || NEW.content, 'UTF8')), 'hex'),
       now(), now())
    ON CONFLICT (note_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION defense.stage10_backup_b_on_insert() FROM PUBLIC, anon, authenticated;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger
                 WHERE tgrelid = 'defense.notes'::regclass
                   AND tgname = 'trg_stage10_backup_b_insert'
                   AND NOT tgisinternal) THEN
    CREATE TRIGGER trg_stage10_backup_b_insert
      AFTER INSERT ON defense.notes
      FOR EACH ROW EXECUTE FUNCTION defense.stage10_backup_b_on_insert();
  END IF;
END $$;

-- Prevent silent modification or deletion of the sealed evidence.
CREATE OR REPLACE FUNCTION defense.stage10_reject_evidence_mutation()
RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, defense
AS $$
BEGIN
  RAISE EXCEPTION 'stage10 evidence is append-only' USING ERRCODE = '42501';
END;
$$;
REVOKE ALL ON FUNCTION defense.stage10_reject_evidence_mutation() FROM PUBLIC, anon, authenticated;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger
                 WHERE tgrelid = 'defense.note_recovery_backups'::regclass
                   AND tgname = 'trg_stage10_backup_immutable'
                   AND NOT tgisinternal) THEN
    CREATE TRIGGER trg_stage10_backup_immutable
      BEFORE UPDATE OR DELETE ON defense.note_recovery_backups
      FOR EACH ROW EXECUTE FUNCTION defense.stage10_reject_evidence_mutation();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger
                 WHERE tgrelid = 'defense.note_restore_audit'::regclass
                   AND tgname = 'trg_stage10_audit_immutable'
                   AND NOT tgisinternal) THEN
    CREATE TRIGGER trg_stage10_audit_immutable
      BEFORE UPDATE OR DELETE ON defense.note_restore_audit
      FOR EACH ROW EXECUTE FUNCTION defense.stage10_reject_evidence_mutation();
  END IF;
END $$;

-- Only the already authenticated server's service-role can invoke this RPC.
-- Each restoration rechecks owner, run, B identity, and backup SHA-256.
CREATE OR REPLACE FUNCTION defense.stage10_restore_b_note(
  p_note_id uuid,
  p_owner_id uuid,
  p_run_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, defense
AS $$
DECLARE
  snapshot defense.note_recovery_backups%ROWTYPE;
  existing record;
  digest_now text;
  operation_now text;
BEGIN
  IF p_note_id IS NULL OR p_owner_id IS NULL OR p_run_id IS NULL THEN
    RAISE EXCEPTION 'invalid recovery target';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_note_id::text, 0));
  SELECT * INTO snapshot FROM defense.note_recovery_backups
   WHERE note_id = p_note_id AND owner_id = p_owner_id
     AND judge_run_id = p_run_id AND judge_identity = 'b'
     AND verified_at IS NOT NULL
   FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'verified backup not found';
  END IF;
  digest_now := encode(sha256(convert_to(snapshot.title || E'\n--ALEPH-STAGE10--\n' || snapshot.content, 'UTF8')), 'hex');
  IF digest_now <> snapshot.content_sha256 THEN
    RAISE EXCEPTION 'verified backup integrity mismatch';
  END IF;
  SELECT owner_id, judge_run_id, judge_identity INTO existing
    FROM defense.notes WHERE id = p_note_id FOR UPDATE;
  IF FOUND THEN
    IF existing.owner_id IS DISTINCT FROM snapshot.owner_id OR
       existing.judge_run_id IS DISTINCT FROM snapshot.judge_run_id OR
       existing.judge_identity IS DISTINCT FROM 'b' THEN
      RAISE EXCEPTION 'current note has a different verified owner';
    END IF;
    UPDATE defense.notes SET title = snapshot.title, content = snapshot.content
      WHERE id = p_note_id;
    operation_now := 'repaired';
  ELSE
    INSERT INTO defense.notes
      (id, owner_id, judge_run_id, judge_identity, title, content)
    VALUES
      (snapshot.note_id, snapshot.owner_id, snapshot.judge_run_id,
       'b', snapshot.title, snapshot.content);
    operation_now := 'reinsert';
  END IF;
  INSERT INTO defense.note_restore_audit
    (note_id, owner_id, judge_run_id, restored_hash, operation)
  VALUES (snapshot.note_id, snapshot.owner_id, snapshot.judge_run_id,
          snapshot.content_sha256, operation_now);
  RETURN jsonb_build_object('id', snapshot.note_id, 'owner_id', snapshot.owner_id,
    'content_sha256', snapshot.content_sha256, 'operation', operation_now);
END;
$$;
REVOKE ALL ON FUNCTION defense.stage10_restore_b_note(uuid,uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION defense.stage10_restore_b_note(uuid,uuid,uuid) TO service_role;
