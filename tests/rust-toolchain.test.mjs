import test from 'node:test';
import assert from 'node:assert/strict';
import { checkRustToolchain } from '../server/rust-preparation.mjs';

// Version selected from successful Linux/macOS fixture CI, not latest/stable.
const version = '1.99.0';
const result = (name, release = version) => ({
  status: 0, signal: null, stdout: `${name} ${release} (fixture 2026-09-28)\n`, stderr: ''
});

test('Rust toolchain accepts the verified exact stable release for both tools', () => {
  const cargo = result('cargo');
  const rustc = result('rustc');
  assert.deepEqual(checkRustToolchain(cargo, rustc), {
    cargo: cargo.stdout.trim(), rustc: rustc.stdout.trim()
  });
  assert.ok(Object.isFrozen(checkRustToolchain(cargo, rustc)));
});

test('Rust toolchain rejects newer, older and mixed tool releases', () => {
  for (const release of ['1.90.0', '1.99.1', '1.100.0']) {
    assert.throws(() => checkRustToolchain(result('cargo', release), result('rustc')), /Rust 도구/);
    assert.throws(() => checkRustToolchain(result('cargo'), result('rustc', release)), /Rust 도구/);
    assert.throws(() => checkRustToolchain(result('cargo', release), result('rustc', release)), /Rust 도구/);
  }
});

test('Rust toolchain rejects nightly, beta and malformed release suffixes', () => {
  for (const release of ['1.99.0-nightly', '1.99.0-beta.1', '1.99.0+custom', '1.99.00', '01.99.0']) {
    assert.throws(() => checkRustToolchain(result('cargo', release), result('rustc')), /Rust 도구/);
    assert.throws(() => checkRustToolchain(result('cargo'), result('rustc', release)), /Rust 도구/);
  }
});

test('Rust toolchain rejects additional or oversized version output instead of ignoring it', () => {
  for (const stdout of ['cargo 1.99.0\nnot a version\n', 'cargo 1.99.0 ' + 'x'.repeat(2048),
    'cargo 1.99.0 arbitrary text', 'cargo 1.99.0\0']) {
    assert.throws(() => checkRustToolchain({ ...result('cargo'), stdout }, result('rustc')), /Rust 도구/);
  }
});

test('Rust toolchain rejects failed, signalled or missing tools despite matching version text', () => {
  for (const change of [{ status: 1 }, { status: null }, { signal: 'SIGTERM' }, { error: { code: 'ENOENT' } }]) {
    assert.throws(() => checkRustToolchain({ ...result('cargo'), ...change }, result('rustc')), /Rust 도구/);
    assert.throws(() => checkRustToolchain(result('cargo'), { ...result('rustc'), ...change }), /Rust 도구/);
  }
});
