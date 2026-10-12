import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const notesFile = fileURLToPath(new URL('../bundle-notes.json', import.meta.url));
const notes = existsSync(notesFile) ? JSON.parse(readFileSync(notesFile, 'utf8')) : {};
if (!notes || typeof notes !== 'object' || Array.isArray(notes)) {
  throw new Error('bundle-notes.json의 형식을 확인하세요.');
}

// Never overwrite a student's already written stage-6 explanation.
if (typeof notes.explanation === 'string' && notes.explanation.includes('6단계')) {
  process.stdout.write('기존 6단계 설명을 보존했습니다.\n');
} else {
  notes.explanation = [
    '6단계에서 기존 자료실과 사용자별 메모 CRUD를 보존하고 보호 서비스 notes의 읽기 경로를 설정했습니다.',
    '엔진이 확인한 등록 기기의 읽기만 허용하는 device_registered 규칙을 작성했으며, 미등록·확인 불충분 요청은 거부합니다. 로컬 가상 요청 시험은 실제 mTLS 시험이 아닙니다.',
    '기기 인증서와 사용자 연결, 등록 기기에서의 정상 읽기 및 미등록 기기 공격 차단은 공식 접속 도구와 운영 심판에서 별도로 확인해야 합니다.',
  ].join('\n');
  writeFileSync(notesFile, JSON.stringify(notes, null, 2) + '\n', 'utf8');
  process.stdout.write('Git에 포함되지 않는 bundle-notes.json의 오래된 설명을 6단계 기준으로 갱신했습니다.\n');
}
