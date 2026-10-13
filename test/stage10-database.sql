-- Run inside a transaction, after sql/stage10-recovery.sql; always ROLLBACK.
DO $$
DECLARE
 target uuid := gen_random_uuid();
 owner_uuid uuid := gen_random_uuid();
 run_uuid uuid := gen_random_uuid();
 result jsonb;
 before_notes jsonb;
 before_audit bigint;
 rejected boolean := false;
BEGIN
 SELECT coalesce(jsonb_agg(to_jsonb(n) ORDER BY id),'[]'::jsonb) INTO before_notes FROM defense.notes n;
 SELECT count(*) INTO before_audit FROM defense.note_restore_audit;
 INSERT INTO defense.notes(id,owner_id,judge_run_id,judge_identity,title,content)
 VALUES(target,owner_uuid,run_uuid,'b','Synthetic regression','Synthetic original');
 UPDATE defense.notes SET title='Changed',content='Changed' WHERE id=target;
 result := defense.stage10_restore_b_note(target,owner_uuid,run_uuid);
 IF result->>'id' <> target::text OR result->>'owner_id' <> owner_uuid::text
 OR result->>'content_sha256' <> encode(sha256(convert_to('Synthetic original','UTF8')),'hex')
 OR result->>'operation' <> 'repaired' THEN RAISE EXCEPTION 'repair API contract mismatch'; END IF;
 IF NOT EXISTS(SELECT 1 FROM defense.notes n JOIN defense.note_recovery_backups b ON b.note_id=n.id
 WHERE n.id=target AND n.owner_id=b.owner_id AND n.title=b.title AND n.content=b.content
 AND b.content_sha256=encode(sha256(convert_to(n.content,'UTF8')),'hex')
 AND b.sealed_backup_sha256=encode(sha256(convert_to(n.title || chr(10) || '--ALEPH-STAGE10--' || chr(10) || n.content,'UTF8')),'hex'))
 THEN RAISE EXCEPTION 'restored row mismatch'; END IF;
 DELETE FROM defense.notes WHERE id=target;
 result := defense.stage10_restore_b_note(target,owner_uuid,run_uuid);
 IF result->>'operation' <> 'reinsert' OR result->>'content_sha256' <> encode(sha256(convert_to('Synthetic original','UTF8')),'hex')
 THEN RAISE EXCEPTION 'deleted note recovery mismatch'; END IF;
 BEGIN
 PERFORM defense.stage10_restore_b_note(target,gen_random_uuid(),run_uuid);
 EXCEPTION WHEN OTHERS THEN rejected := true;
 END;
 IF NOT rejected THEN RAISE EXCEPTION 'wrong owner was accepted'; END IF;
 IF (SELECT coalesce(jsonb_agg(to_jsonb(n) ORDER BY id),'[]'::jsonb) FROM defense.notes n WHERE id<>target) IS DISTINCT FROM before_notes
 THEN RAISE EXCEPTION 'unrelated notes changed'; END IF;
 IF (SELECT count(*) FROM defense.note_restore_audit) <> before_audit+2
 THEN RAISE EXCEPTION 'audit count mismatch'; END IF;
END $$;
SELECT 'PASS: repair, reinsert, hashes, owner rejection, unrelated notes, audit' AS database_regression;
