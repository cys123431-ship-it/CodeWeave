import test from 'node:test';
import assert from 'node:assert/strict';

const api = () => import('./helpers/rust-fixture-linker.mjs');

test('trusted Rust fixtures disable bundled LLD only on Linux x64 and keep warnings fatal', async () => {
  const { rustFixtureFlags } = await api();
  assert.deepEqual(rustFixtureFlags('linux', 'x64'), ['-Dwarnings', '-Clinker-features=-lld']);
  for (const [platform, arch] of [['darwin', 'arm64'], ['linux', 'arm64'], ['win32', 'x64']]) {
    assert.deepEqual(rustFixtureFlags(platform, arch), ['-Dwarnings']);
  }
});

test('trusted Rust linker policy ignores inherited compiler flags without mutating the explicit environment', async () => {
  const { withRustFixtureLinker } = await api();
  const original = Object.freeze({ PATH: '/trusted/bin', CARGO_NET_OFFLINE: 'true', RUSTFLAGS: '-Awarnings -Copt-level=3' });
  const fixed = withRustFixtureLinker(original, 'linux', 'x64');
  assert.equal(fixed.RUSTFLAGS, '-Dwarnings -Clinker-features=-lld');
  assert.equal(fixed.CARGO_NET_OFFLINE, 'true');
  assert.equal(fixed.PATH, '/trusted/bin');
  assert.equal(original.RUSTFLAGS, '-Awarnings -Copt-level=3');
});
