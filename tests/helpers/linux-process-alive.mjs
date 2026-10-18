import fs from 'node:fs/promises';

// Trusted test evidence only; an unreadable /proc entry is not proof of exit.
export async function linuxProcessAlive(pid, {
  signal = () => process.kill(pid, 0),
  readStat = () => fs.readFile(`/proc/${pid}/stat`, 'utf8')
} = {}) {
  function exists() {
    try { signal(); return true; }
    catch (error) { if (error.code === 'ESRCH') return false; throw error; }
  }
  if (!exists()) return false;
  const stat = await readStat().catch(() => '');
  // The PID may exit after signal(0) but before the asynchronous read completes.
  // Only a second ESRCH can prove exit when the stat read was unavailable.
  if (!stat) return exists();
  return stat.slice(stat.lastIndexOf(')') + 2)[0] !== 'Z';
}
