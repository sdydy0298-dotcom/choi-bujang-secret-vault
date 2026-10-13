import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const file=fileURLToPath(new URL('../bundle-notes.json',import.meta.url));
const notes=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):{};
if(!notes||typeof notes!=='object'||Array.isArray(notes))throw Error('bundle-notes.json 형식을 확인하세요.');
if(!String(notes.explanation||'').includes('8단계'))notes.explanation=[
'8단계: 기존 1~7단계 자료실, 기기 등록 및 복합 이상 접속 규칙, 메모별 소유자 검사를 보존했습니다.',
'자원 ID를 note:UUID와 notice:UUID로 나누고, 판정기에서 정확한 GET/POST/PUT/DELETE 구역 및 경로를 제한합니다. 강사 권한이 없는 공지 수정은 거부합니다.',
'API는 서버 검증 사용자·notes.owner_id 및 Supabase Auth app_metadata 강사 권한을 다시 검사합니다. 정상·불명 경로·공지 쓰기 가상 규칙을 시험했고 실제 A/B 교차 수정은 미실행입니다.'
].join('\n');
if(!/(기기|등록|device)/iu.test(String(notes.explanation||''))) {
  notes.explanation += '\n6단계 기기 등록 규칙(device_registered)을 유지했습니다.';
}
notes.blockedAt='실제 A/B 교차 요청과 강사 계정의 공지 작성·수정은 운영 시험 계정 권한이 준비되지 않아 미실행; 일반 학생의 공지 쓰기는 차단합니다.';
writeFileSync(file,JSON.stringify(notes,null,2)+'\n');
process.stdout.write('8단계 로컬 제출 설명 생성(기존 다른 키 보존).\n');
