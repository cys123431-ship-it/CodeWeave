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
      return () => {
        if (owner === lease) owner = null;
      };
    }
  });
}

// C and every internal Rust service in this Node process use the same owner.
export const gradingAdmission = createGradingAdmission();
