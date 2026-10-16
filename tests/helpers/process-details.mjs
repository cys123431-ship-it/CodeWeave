// Bounded, read-only metadata for already-owned trusted test processes.
// Never reads cmdline, environ, maps, file descriptors or file contents.
import fs from 'node:fs/promises';
import path from 'node:path';

async function read(file) {
  try { return (await fs.readFile(file, 'utf8')).slice(0, 16384); }
  catch (error) { return { unavailable: error.code || 'read failure' }; }
}

export async function readProcessDetails(pid, procRoot = '/proc') {
  if (!Number.isSafeInteger(pid) || pid < 1) throw new TypeError('Invalid owned PID');
  const root = path.join(procRoot, String(pid));
  const [status, ioText, names] = await Promise.all([
    read(path.join(root, 'status')), read(path.join(root, 'io')),
    fs.readdir(path.join(root, 'task')).catch(error => ({ unavailable: error.code || 'read failure' }))
  ]);
  const memory = {};
  let threadCount = null;
  if (typeof status === 'string') {
    for (const line of status.split('\n')) {
      const match = /^(VmRSS|VmSize|Threads):\s*(\d+)(?:\s+kB)?\s*$/.exec(line);
      if (!match) continue;
      if (match[1] === 'Threads') threadCount = Number(match[2]);
      else memory[match[1]] = match[2] + ' kB';
    }
  } else memory.unavailable = status.unavailable;
  const io = typeof ioText === 'string' ? Object.fromEntries(ioText.split('\n').flatMap(line => {
    const match = /^(rchar|read_bytes|write_bytes):\s*(\d+)$/.exec(line);
    return match ? [[match[1], match[2]]] : [];
  })) : ioText;
  if (!Array.isArray(names)) return { threadCount, memory, io, threads: [], threadsUnavailable: names.unavailable };
  const tids = names.filter(name => /^\d+$/.test(name)).sort((a, b) => Number(a) - Number(b)).slice(0, 16);
  const threads = await Promise.all(tids.map(async tid => {
    const dir = path.join(root, 'task', tid);
    const [name, wchan, stat] = await Promise.all([read(path.join(dir, 'comm')), read(path.join(dir, 'wchan')), read(path.join(dir, 'stat'))]);
    const fields = typeof stat === 'string' ? stat.slice(stat.lastIndexOf(')') + 2).trim().split(/\s+/) : [];
    return {
      tid: Number(tid), name: typeof name === 'string' ? name.trim().slice(0, 64) : name,
      state: /^[A-Za-z]$/.test(fields[0]) ? fields[0] : null,
      userTicks: /^\d+$/.test(fields[11]) ? fields[11] : null,
      systemTicks: /^\d+$/.test(fields[12]) ? fields[12] : null,
      wchan: typeof wchan === 'string' ? wchan.trim().slice(0, 80) : wchan
    };
  }));
  return { threadCount, memory, io, threads };
}
