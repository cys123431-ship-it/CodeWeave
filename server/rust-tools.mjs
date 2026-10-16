// Internal path/host validation only. No subprocesses, installation or HTTP route.
import fs from 'node:fs/promises';
import path from 'node:path';
import { RUST_TOOLCHAIN_VERSION } from './rust-preparation.mjs';

const hosts = {
  'linux-x64': 'x86_64-unknown-linux-gnu',
  'linux-arm64': 'aarch64-unknown-linux-gnu',
  'darwin-x64': 'x86_64-apple-darwin',
  'darwin-arm64': 'aarch64-apple-darwin'
};

export async function resolveRustToolPaths(sysroot, { platform = process.platform, arch = process.arch } = {}) {
  const host = hosts[platform + '-' + arch];
  if (!host || typeof sysroot !== 'string' || !path.isAbsolute(sysroot) || sysroot.includes('\0')) {
    throw new Error('Rust 도구 경로/호스트가 지원 계약과 다릅니다.');
  }
  const root = await fs.realpath(sysroot);
  if (root === path.parse(root).root) throw new Error('Rust sysroot는 파일시스템 루트일 수 없습니다.');
  const bin = path.join(root, 'bin');
  if (!(await fs.lstat(bin)).isDirectory()) throw new Error('Rust bin은 실제 디렉터리여야 합니다.');
  const tools = { cargo: path.join(bin, 'cargo'), rustc: path.join(bin, 'rustc'), host };
  for (const file of [tools.cargo, tools.rustc]) {
    const stat = await fs.lstat(file);
    if (!stat.isFile() || !(stat.mode & 0o111) || await fs.realpath(file) !== file) {
      throw new Error('Rust 도구는 같은 sysroot 안의 실제 실행 파일이어야 합니다.');
    }
  }
  return Object.freeze(tools);
}

export function checkRustToolHost(output, expectedHost) {
  const text = output?.stdout;
  if (output?.status !== 0 || output.error || output.signal || typeof text !== 'string'
      || Buffer.byteLength(text, 'utf8') > 4096 || text.includes('\0')) {
    throw new Error('Rust 호스트 확인에 실패했습니다.');
  }
  const lines = text.trim().split(/\r?\n/);
  const host = lines.filter(line => line.startsWith('host: '));
  const release = lines.filter(line => line.startsWith('release: '));
  if (host.length !== 1 || host[0] !== 'host: ' + expectedHost
      || release.length !== 1 || release[0] !== 'release: ' + RUST_TOOLCHAIN_VERSION) {
    throw new Error('Rust 호스트/릴리스가 고정 계약과 다릅니다.');
  }
  return expectedHost;
}
