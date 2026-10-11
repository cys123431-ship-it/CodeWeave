export function setProgressFlag(values, id, enabled) {
  const current = Array.isArray(values) ? values.filter(value => typeof value === 'string') : [];
  const next = current.filter(value => value !== id);
  if (enabled) next.push(id);
  return [...new Set(next)];
}

export function lessonLearningStatus(id, progress, iterations, practiceAvailable = false) {
  const theoryRead = Array.isArray(progress?.theoryRead) && progress.theoryRead.includes(id);
  const quizPassed = Array.isArray(progress?.completed) && progress.completed.includes(id);
  const entries = Array.isArray(iterations?.[id]) ? iterations[id] : [];
  const practicePassed = practiceAvailable && entries.some(entry => entry?.passed === true);
  const manuallyMarked = Array.isArray(progress?.review) && progress.review.includes(id);
  const latestQuizFailed = progress?.results?.[id]?.correct === false;
  const latestPracticeFailed = practiceAvailable && entries.length > 0 && entries[0]?.passed !== true;
  const reviewNeeded = manuallyMarked || latestQuizFailed || latestPracticeFailed;
  return {
    theoryRead, quizPassed, practiceAvailable, practicePassed, reviewNeeded,
    mastered: theoryRead && quizPassed && practicePassed && !reviewNeeded
  };
}

export function trackLearningSummary(lessons, progress, iterations) {
  const statuses = lessons.map(lesson => lessonLearningStatus(
    lesson.id, progress, iterations, lesson.track === 'c'
  ));
  return {
    total: lessons.length,
    theory: statuses.filter(status => status.theoryRead).length,
    quiz: statuses.filter(status => status.quizPassed).length,
    practice: statuses.filter(status => status.practicePassed).length,
    review: statuses.filter(status => status.reviewNeeded).length,
    mastered: statuses.filter(status => status.mastered).length
  };
}
