// Explicit operator entry point for trusted personal code only; never public hosting.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLearningServer } from '../server/learning-server.mjs';
import { createLocalRustGradingService } from '../server/rust-executor.mjs';
import { createRustGradingDefinitions } from '../server/rust-exercises.mjs';
import { RUST_TOOLCHAIN_VERSION } from '../server/rust-preparation.mjs';
import { gradingAdmission } from '../server/grading-admission.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const HELP = `CodeWeave 선택적 Rust 로컬 서버 (Linux/macOS, Rust ${RUST_TOOLCHAIN_VERSION})
node scripts/start-rust.mjs --trusted-personal-code --sysroot ABSOLUTE_PATH --workspace-parent EXISTING_ABSOLUTE_DIRECTORY [--port 4173]
신뢰하는 본인 코드만 실행하세요. 샌드박스가 아니며 공개 서버로 배포할 수 없습니다.
일반 npm start는 C 전용입니다. 환경 변수로 Rust를 켜거나 호스트를 바꿀 수 없습니다.
`;

export function parseRustArgs(args) {
  if (!Array.isArray(args) || args.length > 7 || args.some(arg => typeof arg !== 'string')) {
    throw new TypeError('Explicit Rust CLI arguments are required');
  }
  const seen = new Set();
  const values = { port: 4173 };
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    if (seen.has(flag)) throw new TypeError('Duplicate Rust CLI argument');
    seen.add(flag);
    if (flag === '--trusted-personal-code') continue;
    if (!['--sysroot', '--workspace-parent', '--port'].includes(flag)) {
      throw new TypeError('Unsupported Rust CLI argument');
    }
    const value = args[++index];
    if (typeof value !== 'string') throw new TypeError('Missing Rust CLI argument');
    if (flag === '--port') {
      if (!/^(0|[1-9][0-9]{0,4})$/.test(value) || Number(value) > 65535) {
        throw new TypeError('Invalid loopback port');
      }
      values.port = Number(value);
    } else {
      if (!path.isAbsolute(value) || value.includes('\0') || value.length > 4096) {
        throw new TypeError('Explicit absolute operator paths are required');
      }
      values[flag === '--sysroot' ? 'sysroot' : 'parent'] = value;
    }
  }
  if (!seen.has('--trusted-personal-code') || !values.sysroot || !values.parent) {
    throw new TypeError('Explicit trust, sysroot and workspace parent are required');
  }
  return Object.freeze(values);
}

export async function startRustServer(args) {
  const options = parseRustArgs(args);
  const rustService = await createLocalRustGradingService({ enabled: true,
    definitions: createRustGradingDefinitions(), sysroot: options.sysroot, parent: options.parent });
  const app = createLearningServer({ root: ROOT, rustService });
  try {
    await app.listen(options.port);
    return Object.freeze({ app, rustService });
  } catch (error) {
    await app.close();
    throw error;
  }
}

export async function closeRustServer({ app, rustService }) {
  await app.close();
  const deadline = Date.now() + 5000;
  while (gradingAdmission.busy && rustService.inspect().state === 'ready' && Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  if (gradingAdmission.busy || rustService.inspect().state !== 'ready') {
    throw new Error('Rust grading cleanup is unconfirmed');
  }
}

async function main(args) {
  if (args.length === 1 && args[0] === '--help') {
    console.log(HELP);
    return;
  }
  const { app, rustService } = await startRustServer(args);
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    try {
      // Existing requests finish/cancel and settle their owned group before the server closes.
      await closeRustServer({ app, rustService });
    } catch {
      console.error('Rust 정리가 미확정입니다. 재시작 전에 운영자가 프로세스 종료 상태를 확인하세요.');
      process.exitCode = 1;
    } finally {
      if (!gradingAdmission.busy) {
        process.removeListener('SIGINT', stop);
        process.removeListener('SIGTERM', stop);
      }
    }
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  console.log('CodeWeave Rust local learning app: http://127.0.0.1:' + app.address().port +
    '\n주의: C/Rust 코드는 격리되지 않습니다. 신뢰하는 본인 코드만 실행하고 공용 서버로 배포하지 마세요.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(() => {
    console.error('Rust 서버를 시작할 수 없습니다. --help와 로컬 개발 안내에서 인수·고정 도구 버전·작업 폴더·포트를 확인하세요.');
    process.exitCode = 1;
  });
}
