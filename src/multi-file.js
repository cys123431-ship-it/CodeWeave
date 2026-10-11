export const MULTI_FILE_DRAFT_PREFIX = 'CODEWEAVE_MULTI_FILE_V1\n';
export const MULTI_FILE_VERSION = 1;
export const MAX_MULTI_FILE_COUNT = 6;
export const MAX_MULTI_FILE_LENGTH = 10_000;
export const MAX_MULTI_FILE_TOTAL = 24_000;
export const MAX_SERIALIZED_SUBMISSION = 25_000;

const FILE_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

function validateName(name) {
  if (typeof name !== 'string' || !FILE_NAME_PATTERN.test(name) || name === '.' || name === '..') {
    throw new Error('파일명은 경로가 아닌 안전한 영문 파일명이어야 합니다.');
  }
  return name;
}

function validateRequiredNames(requiredNames) {
  if (requiredNames === undefined) return null;
  if (!Array.isArray(requiredNames) || requiredNames.length === 0) {
    throw new Error('필수 파일 목록은 비어 있지 않은 배열이어야 합니다.');
  }
  const names = requiredNames.map(validateName);
  if (new Set(names).size !== names.length) throw new Error('필수 파일 목록에 중복 파일명이 있습니다.');
  return names;
}

function normalizeFiles(files, requiredNames) {
  if (!Array.isArray(files) || files.length === 0 || files.length > MAX_MULTI_FILE_COUNT) {
    throw new Error(`다중 파일 제출은 1~${MAX_MULTI_FILE_COUNT}개 파일이어야 합니다.`);
  }
  const seen = new Set();
  let total = 0;
  const normalized = files.map((file, index) => {
    if (!file || typeof file !== 'object' || Array.isArray(file)) {
      throw new Error(`files[${index}]가 파일 객체가 아닙니다.`);
    }
    const name = validateName(file.name);
    if (seen.has(name)) throw new Error(`${name}: 중복 파일명입니다.`);
    seen.add(name);
    if (typeof file.content !== 'string') throw new Error(`${name}: 파일 내용은 문자열이어야 합니다.`);
    if (file.content.length > MAX_MULTI_FILE_LENGTH) throw new Error(`${name}: 파일 크기는 ${MAX_MULTI_FILE_LENGTH}자를 넘을 수 없습니다.`);
    total += file.content.length;
    return { name, content: file.content };
  });
  if (total > MAX_MULTI_FILE_TOTAL) throw new Error(`다중 파일 전체 크기는 ${MAX_MULTI_FILE_TOTAL}자를 넘을 수 없습니다.`);
  const required = validateRequiredNames(requiredNames);
  if (required) {
    const allowed = new Set(required);
    const extra = normalized.find(file => !allowed.has(file.name));
    if (extra) throw new Error(`${extra.name}: 허용되지 않은 파일입니다.`);
    const missing = required.filter(name => !seen.has(name));
    if (missing.length) throw new Error(`필수 파일 누락: ${missing.join(', ')}`);
  }
  return normalized;
}

export function serializeMultiFileSubmission(files, { requiredNames } = {}) {
  const normalized = normalizeFiles(files, requiredNames);
  const encoded = MULTI_FILE_DRAFT_PREFIX + JSON.stringify({ version: MULTI_FILE_VERSION, files: normalized });
  if (encoded.length > MAX_SERIALIZED_SUBMISSION) {
    throw new Error(`직렬화된 다중 파일 전체 크기는 ${MAX_SERIALIZED_SUBMISSION}자를 넘을 수 없습니다.`);
  }
  return encoded;
}

export function parseMultiFileSubmission(value, { requiredNames } = {}) {
  if (typeof value !== 'string' || !value.startsWith(MULTI_FILE_DRAFT_PREFIX)) {
    throw new Error('CodeWeave 다중 파일 제출 형식이 아닙니다.');
  }
  if (value.length > MAX_SERIALIZED_SUBMISSION) {
    throw new Error(`직렬화된 다중 파일 전체 크기는 ${MAX_SERIALIZED_SUBMISSION}자를 넘을 수 없습니다.`);
  }
  let payload;
  try { payload = JSON.parse(value.slice(MULTI_FILE_DRAFT_PREFIX.length)); }
  catch { throw new Error('다중 파일 제출 JSON을 읽을 수 없습니다.'); }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) || payload.version !== MULTI_FILE_VERSION) {
    throw new Error('지원하지 않는 다중 파일 제출 버전입니다.');
  }
  return normalizeFiles(payload.files, requiredNames);
}

export function formatSubmissionForDisplay(value) {
  if (typeof value !== 'string' || !value.startsWith(MULTI_FILE_DRAFT_PREFIX)) return value ?? '';
  try {
    return parseMultiFileSubmission(value)
      .map(file => `===== ${file.name} =====\n${file.content}`)
      .join('\n\n');
  } catch { return value; }
}
