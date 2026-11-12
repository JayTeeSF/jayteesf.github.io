/* Aggregate playback milestones: at most one start and one end per page load. */
(() => {
  'use strict';
  const seen = new Set();
  const pending = [];

  function flush() {
    if (typeof window.goatcounter?.count !== 'function') return;
    while (pending.length) {
      const event = pending.shift();
      try { window.goatcounter.count(event); }
      catch { /* Analytics must never interrupt playback. */ }
    }
  }

  function countOnce(milestone, title) {
    if (seen.has(milestone)) return;
    seen.add(milestone);
    pending.push({
      path: `medley-${milestone}:${window.location.pathname}`,
      title,
      event: true,
      no_session: true,
    });
    flush();
  }

  window.MEDLEY_ANALYTICS = {
    started: () => countOnce('started', 'Medley playback started'),
    completed: () => countOnce('completed', 'Medley reached the end'),
  };

  // GoatCounter loads asynchronously; preserve milestones that happen first.
  document.querySelector('script[data-goatcounter]')?.addEventListener('load', flush, { once: true });
  const audio = document.getElementById('audio');
  audio?.addEventListener('playing', window.MEDLEY_ANALYTICS.started);
  audio?.addEventListener('ended', window.MEDLEY_ANALYTICS.completed);
})();
