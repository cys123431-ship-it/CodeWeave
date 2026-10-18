// Same-process admission only; neither a queue nor an isolation boundary.
export function createGradingAdmission() {
  let owner = null;
  return Object.freeze({
    get busy() {
      return owner !== null;
    },
    tryAcquire() {
      if (owner !== null) return null;
      const lease = Symbol('grading lease');
      owner = lease;
      let quarantined = false;
      const resume = () => {
        if (owner !== lease || !quarantined) return false;
        quarantined = false;
        owner = null;
        return true;
      };
      const release = () => {
        if (owner === lease && !quarantined) owner = null;
      };
      release.quarantine = () => {
        if (owner !== lease) throw new Error('Grading lease is no longer owned');
        quarantined = true;
        return resume;
      };
      return Object.freeze(release);
    }
  });
}

// C and every internal Rust service in this Node process use the same owner.
export const gradingAdmission = createGradingAdmission();
