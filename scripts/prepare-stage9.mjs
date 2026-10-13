import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const file = fileURLToPath(new URL('../bundle-notes.json', import.meta.url));
const notes = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
if (!notes || typeof notes !== 'object' || Array.isArray(notes)) {
  throw new Error('bundle-notes.json 형식을 확인하세요.');
}
notes.explanation = [
  '9단계 저장점: 기존 1~8단계, 등록 기기(device_registered), 복합 이상 재확인(step_up_required) 및 자료 소유권 검사는 그대로 유지했습니다.',
  '공식 탐지 가상 사건의 at, method, identity.sub만 읽습니다. 같은 가명 주체의 GET 사건이 10분 이동 구간에서 120건을 초과하면 burst_read로 회수 제안하며, 정확히 120건 및 정상 주체는 observe를 반환합니다.',
  '탐지 결과는 기존 5필드 접속 판정과 별개인 detect(events)의 {action: propose_revocation, reasonCode: burst_read, subject}입니다. 대상은 가상 가명 주체 하나로 한정하며 실제 회수 API는 만들지 않았습니다.',
  '공식 사건 입력에는 네트워크 및 기기 식별 필드가 없어 원문에 없는 신원·기기 정보를 추측하거나 저장하지 않았습니다. 실제 기기 회수와 소요 시간은 반 엔진·심판에서 확인해야 합니다.',
  '공식 6개 탐지 시험, 9개 추가 경계/교차 사용자 시험, 기존 1~8단계 회귀와 공개 HTTP 자기점검을 별도로 수행합니다. 비밀값·실명·메모 본문은 로그와 제출 묶음에 남기지 않습니다.',
].join('\n');
notes.blockedAt = '가상 detect(events) 계약에는 확인된 deviceId·network·권한 회수 경로·실측 경과 시간이 없습니다. 실제 엔진의 기기 회수 및 회수 후 재접속 차단은 학생측에서 수행하지 않고 심판 판정에 맡깁니다.';
writeFileSync(file, JSON.stringify(notes, null, 2) + '\n');
process.stdout.write('9단계 제출 설명 갱신: bundle-notes.json(로컬 전용)\n');
