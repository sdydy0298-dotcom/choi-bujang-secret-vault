import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { deploymentIdentity } from './deployment-identity.mjs';

const root = resolve(import.meta.dirname, '..');
const source = resolve(root, 'data.json');
const output = resolve(root, 'public', 'data.json');
const config = JSON.parse(await readFile(resolve(root, 'aleph.config.json'), 'utf8'));
const data = JSON.parse(await readFile(source, 'utf8'));

if (!Array.isArray(data.notes)) {
  throw new Error('실습용 자료 형식을 확인하세요. 실제 학생 자료를 넣으면 안 됩니다.');
}

await mkdir(resolve(root, 'public'), { recursive: true });

if (config.step === 1) {
  await copyFile(source, output);
  console.log('실습용 공개 자료를 public/data.json에 복사했습니다.');
} else if (config.step === 2) {
  if (data.notes.length !== 0) {
    throw new Error('2단계에서는 공개 data.json에 가상 메모 본문을 남기면 안 됩니다.');
  }
  const publicData = { sampleMarker: config.sampleMarker, notes: [] };
  await writeFile(output, `${JSON.stringify(publicData, null, 2)}\n`, 'utf8');
  console.log('2단계 공개 data.json을 메모 없는 정적 파일로 생성했습니다.');
} else {
  throw new Error('현재 빌드 도구가 지원하는 방어전 단계를 확인하세요.');
}

if (!process.argv.includes('--local')) {
  const identity = deploymentIdentity(process.env, config);
  await writeFile(resolve(root, 'public', 'aleph.json'),
    `${JSON.stringify(identity, null, 2)}\n`, 'utf8');
  console.log('배포 저장소·커밋·주소를 public/aleph.json에 기록했습니다.');
}
