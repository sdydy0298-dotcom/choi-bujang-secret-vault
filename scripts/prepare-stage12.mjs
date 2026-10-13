import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const path=fileURLToPath(new URL('../bundle-notes.json',import.meta.url));
const notes=existsSync(path)?JSON.parse(readFileSync(path,'utf8')):{};
if(!notes||typeof notes!=='object'||Array.isArray(notes))throw new Error('INVALID_BUNDLE_NOTES');
notes.explanation=[
  '12단계 저장점: 기존 1~11단계 로그인, 기기 전자서명, 7단계 복합 이상 추가 확인, 접근 구역과 단건 복구를 유지합니다. 기존 자료와 DB 기록은 삭제하지 않습니다.',
  '탈환 작전실은 승인된 기기에서만 실제 서버 API의 비공개 요약을 읽습니다. 판정기 구현 규칙, ALEPH SDP 엔진 실측 미연결 탐지, 현재 기기 회수 상태, 정책 버전과 복구 감사 건수를 각각 출처와 함께 표시합니다.',
  '1~11단계 정상·금지 대조표는 기대값, 실제 HTTP 상태, 요청 ID, 확인 시각을 별도로 보관합니다. 실제 응답을 받은 공개 정상·무인증 금지 요청만 live_http로 기록하며 미실행은 실제 결과처럼 표시하지 않습니다.',
  '41종 공격 세부 항목의 공식 매핑과 통합 운영 재시험은 현재 실측이 없어 전체 미실행으로 기록합니다. 로컬 판정기·탐지 가상 시험을 41종 공격 통과 증거로 쓰지 않습니다.',
  '학생 구현과 제공 ALEPH SDP 엔진 출처를 구분하고 npm install, 검증, 실행, 중지, 복구 안내를 README에 남겼습니다. 새 실측은 다른 동작을 변경하지 않는 관측 전용 서버 함수에서 보호됩니다.'
].join('\n');
notes.blockedAt='41종 공식 연속 공격의 개별 결과, 운영 엔진 탐지·회수 실측, 실제 복구 성공 재시험은 미실행입니다. 서버 요약의 0건과 가상 시험 통과를 공식 통과로 쓰지 않습니다.';
writeFileSync(path,JSON.stringify(notes,null,2)+'\n');
console.log('12단계 실제·미실행을 구분한 로컬 제출 설명 준비 완료');
