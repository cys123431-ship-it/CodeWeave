// Trusted HTTP endpoint lifetime only. This does not authorize a grading request.
export function createRequestCancellation(req, res) {
  const controller = new AbortController();
  function cancel() {
    controller.abort(Object.assign(new Error('Grading connection closed'), { name: 'AbortError', code: 'ABORT_ERR' }));
  }
  function responseClosed() {
    if (!res.writableFinished) cancel();
  }
  req.once('aborted', cancel);
  res.once('close', responseClosed);
  if (req.aborted || (res.destroyed && !res.writableFinished)) cancel();
  return Object.freeze({
    signal: controller.signal,
    dispose() {
      req.removeListener('aborted', cancel);
      res.removeListener('close', responseClosed);
    }
  });
}
