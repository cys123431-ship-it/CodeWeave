// CI preparation for trusted toolchain files, never submitted code or build output.
import fs from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const GiB = 1024 ** 3;
const limits = { maxFiles: 256, maxBytes: GiB, timeoutMs: 60000 };
const inside = (root, file) => {
  const relative = path.relative(root, file);
  return relative !== '' && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative);
};

export async function prepareRustInputs({ sysroot, targetLibdir,
  maxFiles = limits.maxFiles, maxBytes = limits.maxBytes, timeoutMs = limits.timeoutMs,
  now = () => performance.now()
}) {
  if (![sysroot, targetLibdir].every(p => typeof p === 'string' && path.isAbsolute(p))) {
    throw new TypeError('Rust input directories must be absolute');
  }
  for (const [name, value] of Object.entries({ maxFiles, maxBytes, timeoutMs })) {
    if (!Number.isSafeInteger(value) || value < 1 || value > limits[name]) throw new RangeError('Invalid Rust readiness budget');
  }
  const start = now();
  const checkTime = () => {
    if (now() - start >= timeoutMs) throw new Error('Rust input readiness deadline exceeded');
  };
  const root = await fs.realpath(sysroot);
  const target = await fs.realpath(targetLibdir);
  if (root === path.parse(root).root || !inside(root, target)) throw new Error('Rust target must be inside sysroot');
  const candidates = [path.join(root, 'bin/rustc')];
  for (const [directory, pattern] of [
    [path.join(root, 'lib'), /\.so(?:\.[A-Za-z0-9_.+-]+)?$/],
    [target, /\.(?:rlib|so|o)$/]
  ]) {
    checkTime();
    const names = (await fs.readdir(directory)).filter(name => pattern.test(name)).sort();
    if (directory === target && names.length === 0) throw new Error('No Rust target inputs');
    for (const name of names) candidates.push(path.join(directory, name));
  }
  if (candidates.length > maxFiles) throw new Error('Rust input file budget exceeded');
  const inputs = [];
  const seen = new Set();
  let plannedBytes = 0;
  for (const candidate of candidates) {
    checkTime();
    const resolved = await fs.realpath(candidate);
    if (!inside(root, resolved)) throw new Error('Rust input link must stay inside sysroot');
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    const stat = await fs.stat(resolved);
    if (!stat.isFile()) throw new Error('Rust input must be a regular file');
    plannedBytes += stat.size;
    if (plannedBytes > maxBytes) throw new Error('Rust input byte budget exceeded');
    inputs.push(resolved);
  }
  let bytes = 0;
  const buffer = Buffer.alloc(1024 * 1024);
  for (const input of inputs) {
    checkTime();
    const handle = await fs.open(input, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
    try {
      if (!(await handle.stat()).isFile()) throw new Error('Rust input must be a regular file');
      while (true) {
        checkTime();
        const { bytesRead } = await handle.read(buffer, 0, Math.min(buffer.length, maxBytes - bytes + 1), null);
        bytes += bytesRead;
        if (bytes > maxBytes) throw new Error('Rust input byte budget exceeded while reading');
        if (bytesRead === 0) break;
      }
    } finally {
      await handle.close();
    }
  }
  checkTime();
  return { files: inputs.length, bytes, durationMs: Math.round(now() - start) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  // Independent process deadline also covers slow discovery or a blocked read.
  const timer = setTimeout(() => {
    console.error('Rust input readiness deadline exceeded');
    process.exit(1);
  }, limits.timeoutMs);
  try {
    const run = promisify(execFile);
    const options = { encoding: 'utf8', timeout: 5000, maxBuffer: 8192 };
    const sysroot = (await run('rustc', ['--print', 'sysroot'], options)).stdout.trim();
    const targetLibdir = (await run('rustc', ['--print', 'target-libdir'], options)).stdout.trim();
    console.log('Trusted Rust input readiness:', JSON.stringify(await prepareRustInputs({ sysroot, targetLibdir })));
  } catch (error) {
    console.error('Rust input readiness failed:', error.code || error.message);
    process.exitCode = 1;
  } finally {
    clearTimeout(timer);
  }
}
