import fs from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

// Exact browser assets, not directory prefixes. Add new learning assets here
// together with the shell regression test; server code and project metadata stay private.
const PUBLIC_FILES = new Set([
  'index.html', 'workbench.html', 'styles.css', 'workbench.css', 'sw.js',
  'manifest.webmanifest', 'assets/icon.svg', 'src/app.js', 'src/catalog.js',
  'src/figures.js', 'src/logic.js', 'src/workbench.js', 'src/practice.js',
  'src/iterations.js', 'src/attempt-backup.js'
]);
const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
};

// Validate the original request target before URL normalization can erase ../
// or backslashes. Only origin-form requests and a single decoding step are allowed.
export function parseRequestPath(target) {
  if (typeof target !== 'string' || !target.startsWith('/') || /[#\u0000-\u0020\u007f]/.test(target)) return null;
  const encoded = target.split('?')[0];
  if (/%(?:2f|5c)/i.test(encoded)) return null;
  let decoded;
  try { decoded = decodeURIComponent(encoded); } catch { return null; }
  if (/[\\%\u0000-\u0020\u007f]/.test(decoded) || decoded.includes('//')) return null;
  if (decoded.split('/').some(segment => segment === '.' || segment === '..')) return null;
  return decoded;
}

export async function openLearningFile(root, pathname) {
  const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
  if (!PUBLIC_FILES.has(relative)) return null;
  const realRoot = await fs.realpath(root);
  const components = relative.split('/');
  let filename = realRoot;
  for (let index = 0; index < components.length; index++) {
    filename = path.join(filename, components[index]);
    const stat = await fs.lstat(filename);
    if (stat.isSymbolicLink() || (index < components.length - 1 ? !stat.isDirectory() : !stat.isFile())) return null;
  }
  // Reject external and internal symlink aliases. On platforms supporting
  // O_NOFOLLOW, opening the final file also refuses a link replaced after lstat.
  if (await fs.realpath(filename) !== filename) return null;
  const handle = await fs.open(filename, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const stat = await handle.stat();
    if (!stat.isFile()) { await handle.close(); return null; }
    return { handle, size: stat.size, contentType: CONTENT_TYPES[path.extname(relative)] };
  } catch (error) { await handle.close(); throw error; }
}
