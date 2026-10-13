import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const file = fileURLToPath(new URL('../bundle-notes.json', import.meta.url));
const notes = existsSync(file) ? JSON.parse(readFileSync(file,'utf8')) : {};
if (!notes || typeof notes !== 'object' || Array.isArray(notes)) {
  throw new Error('bundle-notes.json 형식을 확인해 주세요.');
}
let changed = false;
if (typeof notes.explanation !== 'string' || !notes.explanation.includes('7단계')) {
  notes.explanation = [
    '7단계: 기존 1~6단계 자료실과 device_registered 기기 규칙을 유지했습니다.',
    '판정기에서 엔진이 넘긴 judge_fixture 출처의 지역·시간·네트워크·최근 가상 위험 사건을 검토하고, 복합 이상이면 step_up_required로 추가 확인을 요청하도록 구현했습니다.',
    '정상·미등록·복합 이상·가상 재확인 사건은 npm run decider:test와 npm run fixture:7로 확인했습니다. 실제 운영 재로그인 전후의 차단·허용은 실측하지 않았습니다.',
  ].join('\n');
  changed = true;
}
if (notes.blockedAt == null || /접속 도구|설치 명령|mTLS/u.test(notes.blockedAt)) {
  notes.blockedAt = '제공 계약에는 stepUp.verified 및 authAgeSeconds가 있지만 운영 엔진의 실사용자 재로그인/자료 읽기 연동은 직접 실측할 수 없어 미실행으로 남겼습니다.';
  changed = true;
}
if (changed) writeFileSync(file, JSON.stringify(notes,null,2)+'\n','utf8');
process.stdout.write(changed
  ? '로컬 bundle-notes.json을 7단계 기준으로 정리했습니다(기존 다른 키 보존).\n'
  : '기존 7단계 설명과 미검증 기록을 보존했습니다.\n');
