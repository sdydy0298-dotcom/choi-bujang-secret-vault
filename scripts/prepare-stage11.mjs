import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const file = fileURLToPath(new URL('../bundle-notes.json', import.meta.url));
const notes = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
if (!notes || typeof notes !== 'object' || Array.isArray(notes)) throw new Error('INVALID_BUNDLE_NOTES');
notes.explanation=[
  '11단계 저장점: 기존 1~10단계의 정상 서비스 및 보안 정책(7단계 복합 이상 접속 추가 확인 포함)은 보존합니다. 설치형 웹앱 manifest, 아이콘과 오프라인 안내 화면만 추가합니다.',
  '기기 승인은 비공개 defense.device_approvals의 pending/approved/revoked 상태가 결정하며 학생 화면의 승인 요청 버튼은 권한을 주지 않습니다. 승인 전에는 메모 자료 영역과 새 메모 입력 화면을 숨깁니다.',
  '승인된 기기의 모든 메모·공지 요청은 비내보내기 P-256 개인키의 요청별 ECDSA 서명을 요구합니다. 서명은 메서드, 경로+쿼리, JSON 본문 SHA-256, 90초 시각, 128비트 일회용 nonce에 묶이고 서버는 공개키 승인 상태와 재사용 여부를 검증합니다.',
  '로그인 세션과 기기 개인키는 현재 페이지 메모리에서만 사용하고 localStorage·IndexedDB·Service Worker 캐시에 보관하지 않습니다. 페이지를 닫거나 새로고침한 뒤에는 재등록·재승인이 필요한 제한이 있습니다.',
  '이 단계의 자동 테스트는 서명 누락/승인 전 차단/경로 위조/본문 위조/재전송을 검증합니다. 실제 사용자 기기 승인 및 공식 판정 결과는 별도로 확인해야 합니다.'
].join('\n');
notes.blockedAt='실제 사용자 기기 등록 및 관리자의 승인 상태 변경은 배포 뒤 사용자 조작을 기다리고 있습니다. 심판 11단계 제출 실측은 미실행입니다.';
writeFileSync(file,JSON.stringify(notes,null,2)+'\n');
console.log('11단계 로컬 제출 설명 준비: bundle-notes.json');
