// Design-only, side-effect-free plan. Not imported by the HTTP grading pipeline.
import { MAX_CODE_LENGTH } from '../src/iterations.js';

const MANIFEST = `[package]
name = "codeweave_submission"
version = "0.0.0"
edition = "2021"
build = false
autobins = false
autoexamples = false
autotests = false
autobenches = false

[lib]
path = "src/lib.rs"
test = false
doctest = false

[[test]]
name = "codeweave"
path = "tests/codeweave.rs"
harness = true

[workspace]
`;

const LOCKFILE = `version = 3

[[package]]
name = "codeweave_submission"
version = "0.0.0"
`;

function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

function validateDefinition(definition, id) {
  if (!definition || definition.id !== id || definition.language !== 'rust'
      || definition.grader !== 'cargo-test'
      || typeof definition.starter !== 'string' || !definition.starter.trim()
      || typeof definition.harness !== 'string' || !definition.harness.trim()
      || !Array.isArray(definition.cases)
      || definition.cases.length < 8 || definition.cases.length > 12) {
    throw new TypeError('Rust 서버 전용 채점 계약이 올바르지 않습니다.');
  }
  const ids = new Set();
  for (const entry of definition.cases) {
    if (!entry || typeof entry.id !== 'string' || !/^case_\d{2}$/.test(entry.id)
        || ids.has(entry.id) || typeof entry.label !== 'string'
        || !entry.label.trim() || entry.label.length > 120) {
      throw new TypeError('Rust 사례 계약은 고유한 case_NN ID와 설명이 필요합니다.');
    }
    ids.add(entry.id);
  }
}

export function createRustPlan(request, definitions) {
  if (!request || typeof request !== 'object' || Array.isArray(request)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(request))
      || Reflect.ownKeys(request).length !== 2
      || !Object.hasOwn(request, 'exerciseId') || !Object.hasOwn(request, 'code')) {
    throw new TypeError('Rust 제출은 exerciseId와 code만 허용합니다.');
  }
  const { exerciseId, code } = request;
  if (typeof exerciseId !== 'string' || !/^[a-z][a-z0-9-]{0,79}$/.test(exerciseId)
      || typeof code !== 'string' || !code.trim() || code.length > MAX_CODE_LENGTH) {
    throw new TypeError('Rust 제출 문제 또는 코드 길이가 올바르지 않습니다.');
  }
  if (!(definitions instanceof Map) || !definitions.has(exerciseId)) {
    throw new TypeError('등록된 Rust 문제가 아닙니다.');
  }
  const definition = definitions.get(exerciseId);
  validateDefinition(definition, exerciseId);
  return freeze({
    executionEnabled: false,
    exerciseId,
    files: [
      { path: 'Cargo.toml', content: MANIFEST },
      { path: 'Cargo.lock', content: LOCKFILE },
      { path: 'src/lib.rs', content: code },
      { path: 'tests/codeweave.rs', content: definition.harness }
    ],
    compile: {
      command: 'cargo',
      args: ['test', '--manifest-path', 'Cargo.toml', '--frozen', '--test', 'codeweave',
        '--no-run', '--message-format=json', '--jobs', '1', '--color', 'never']
    },
    environment: {
      RUSTFLAGS: '-Dwarnings', CARGO_NET_OFFLINE: 'true',
      CARGO_INCREMENTAL: '0', CARGO_TERM_COLOR: 'never', RUST_BACKTRACE: '0'
    },
    list: { artifact: 'codeweave', args: ['--list', '--format', 'terse'] },
    listIgnored: { artifact: 'codeweave', args: ['--list', '--ignored', '--format', 'terse'] },
    runCases: definition.cases.map(entry => ({
      id: entry.id, label: entry.label, artifact: 'codeweave',
      args: [entry.id, '--exact', '--test-threads=1']
    }))
  });
}
