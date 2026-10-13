import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const file = fileURLToPath(new URL('../bundle-notes.json', import.meta.url));
const notes = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
if (!notes || typeof notes !== 'object' || Array.isArray(notes)) throw new Error('invalid_bundle_notes');
notes.explanation = [
  '10단계 저장점: 기존 1~9단계 기기 등록(device_registered), 단계7(step_up_required), 개인 메모 소유권, 9단계 회수 제안은 유지합니다.',
  '검증된 9단계 안전 정책 사본 SHA-256 확인 후 시험 정책 notes의 차이만 출력하고 명시적 확인 뒤 복원합니다. 운영 정책과 타 서비스 규칙 및 기존 감사 기록은 수정하지 않습니다.',
  'Supabase 비공개 백업은 심판 시험 계정 B가 메모를 처음 생성하는 INSERT 시점에 트리거로 생성됩니다. 검증된 백업이 없거나 ID/소유자/실행ID/내용 해시가 틀리면 복원하지 않습니다.',
  'POST /api/restore는 서명 검증 judge-B만 허용하고 B 메모 한 건을 트랜잭션으로 복원한 뒤 내용 SHA-256을 검증합니다. 다른 메모 및 기존 감사 기록은 보존합니다.',
  '단계10의 로컬 검증과 실제 운영 심판의 변조/삭제/재침공 실측은 구분해 기록합니다.'
].join('\n');
notes.blockedAt = '실제 심판의 B 메모 복구와 이전 1~9단계 재침공은 심판 판정 전 미실행입니다.';
writeFileSync(file, JSON.stringify(notes,null,2)+'\n');
console.log('10단계 로컬 제출 메모 생성: bundle-notes.json');
