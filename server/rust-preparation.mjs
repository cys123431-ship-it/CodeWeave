// Internal preparation only: no subprocesses and no HTTP registration.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createRustPlan } from './rust-contract.mjs';

export async function prepareRustWorkspace(request, definitions, parent = os.tmpdir()) {
  const plan = createRustPlan(request, definitions);
  const root = await fs.realpath(parent);
  const dir = await fs.mkdtemp(path.join(root, 'codeweave-rust-'));
  try {
    await fs.chmod(dir, 0o700);
    for (const name of ['src', 'tests', 'target']) {
      await fs.mkdir(path.join(dir, name), { mode: 0o700 });
    }
    for (const file of plan.files) {
      await fs.writeFile(path.join(dir, file.path), file.content, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
    }
    return { dir, targetDir: path.join(dir, 'target'), plan };
  } catch (error) {
    // Only the exact directory just created by this call is cleaned up.
    await fs.rm(dir, { recursive: true, force: true });
    throw error;
  }
}

// Verified with trusted Linux/macOS fixtures; never select moving stable/nightly.
export const RUST_TOOLCHAIN_VERSION = '1.99.0';

export function checkRustToolchain(cargo, rustc) {
  const versions = {};
  for (const [name, output] of [['cargo', cargo], ['rustc', rustc]]) {
    const text = output?.stdout;
    const first = typeof text === 'string' ? text.trim() : '';
    const pattern = new RegExp('^' + name + ' ' + RUST_TOOLCHAIN_VERSION.replaceAll('.', '\\.')
      + '(?: \\([^\\r\\n\\x00-\\x1f()]+\\))?$');
    if (output?.status !== 0 || output.error || output.signal
        || typeof text !== 'string' || Buffer.byteLength(text, 'utf8') > 1024 || !pattern.test(first)) {
      throw new Error('Rust 도구를 사용할 수 없거나 고정 버전과 다릅니다: ' + name + ' ' + RUST_TOOLCHAIN_VERSION);
    }
    versions[name] = first;
  }
  return Object.freeze(versions);
}

export async function selectRustArtifact(stdout, workspace) {
  try {
    if (typeof stdout !== 'string' || Buffer.byteLength(stdout, 'utf8') > 80000) throw Error();
    const messages = stdout.split(/\r?\n/).filter(line => line.trim()).map(line => JSON.parse(line));
    const finished = messages.filter(message => message?.reason === 'build-finished');
    if (finished.length !== 1 || finished[0].success !== true) throw Error();
    const manifest = path.join(workspace.dir, 'Cargo.toml');
    const artifacts = messages.filter(message => message?.reason === 'compiler-artifact'
      && message.manifest_path === manifest && message.target?.name === 'codeweave'
      && Array.isArray(message.target.kind) && message.target.kind.length === 1 && message.target.kind[0] === 'test'
      && message.profile?.test === true && typeof message.executable === 'string');
    if (artifacts.length !== 1) throw Error();
    const executable = artifacts[0].executable;
    if (!path.isAbsolute(executable) || path.normalize(executable) !== executable) throw Error();
    const target = workspace.targetDir;
    if (await fs.realpath(target) !== target) throw Error();
    const relative = path.relative(target, executable);
    if (!relative || relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) throw Error();
    let current = target;
    const parts = relative.split(path.sep);
    for (let i = 0; i < parts.length; i++) {
      current = path.join(current, parts[i]);
      const stat = await fs.lstat(current);
      if (stat.isSymbolicLink() || (i < parts.length - 1 ? !stat.isDirectory() : !stat.isFile())) throw Error();
      if (i === parts.length - 1 && process.platform !== 'win32' && !(stat.mode & 0o111)) throw Error();
    }
    return executable;
  } catch {
    throw new Error('Rust 컴파일 산출물이 누락되었거나 안전한 대상 경로/계약과 일치하지 않습니다.');
  }
}

function listingIds(output) {
  if (output?.status !== 0 || output.error || output.signal || typeof output.stdout !== 'string'
      || Buffer.byteLength(output.stdout, 'utf8') > 80000) throw Error();
  const ids = [];
  for (const line of output.stdout.split(/\r?\n/).filter(line => line.trim())) {
    const match = /^(case_\d{2}): test$/.exec(line);
    if (!match || ids.includes(match[1])) throw Error();
    ids.push(match[1]);
  }
  return ids;
}

export function validateRustListing(all, ignored, cases) {
  try {
    if (!Array.isArray(cases) || cases.length < 8 || cases.length > 12) throw Error();
    const expected = cases.map(entry => entry?.id);
    if (expected.some(id => typeof id !== 'string' || !/^case_\d{2}$/.test(id))
        || new Set(expected).size !== expected.length) throw Error();
    const ids = listingIds(all);
    if (listingIds(ignored).length || ids.length !== expected.length
        || ids.some(id => !expected.includes(id))) throw Error();
    return Object.freeze([...expected]);
  } catch {
    throw new Error('Rust 테스트 목록이 선언 사례와 다르거나 열거에 실패했습니다.');
  }
}
