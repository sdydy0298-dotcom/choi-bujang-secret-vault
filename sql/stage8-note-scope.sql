-- Stage 8: idempotent schema update; existing notes and owners are retained.
ALTER TABLE defense.notes
  ADD COLUMN IF NOT EXISTS judge_run_id uuid,
  ADD COLUMN IF NOT EXISTS judge_identity text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'defense.notes'::regclass
      AND conname = 'notes_stage8_judge_scope_pair_chk'
  ) THEN
    ALTER TABLE defense.notes ADD CONSTRAINT notes_stage8_judge_scope_pair_chk
      CHECK (
        (judge_run_id IS NULL AND judge_identity IS NULL)
        OR (judge_run_id IS NOT NULL AND judge_identity IN ('a','b'))
      );
  END IF;
END $$;
COMMENT ON COLUMN defense.notes.judge_run_id IS
  'Verified judge run UUID; NULL for pre-existing and ordinary student notes.';
COMMENT ON COLUMN defense.notes.judge_identity IS
  'Verified ALEPH judge A/B identity; NULL for student notes; not user writable.';
