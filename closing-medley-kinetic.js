/* Each pose is a pure function of the audio position: no running CSS animation,
   wall-clock pulse or anticipation of the next word. */
window.MEDLEY_KINETIC = (() => {
  'use strict';
  const clamp = n => Math.max(0, Math.min(1, n));
  const smooth = n => { const p = clamp(n); return p * p * (3 - 2 * p); };

  function create(stage, screen, initialMode) {
    const modes = { crescendo: 'Crescendo', flow: 'Flowing line', echo: 'Outline echo' };
    const focus = document.createElement('div');
    focus.className = 'word-focus';
    focus.setAttribute('aria-hidden', 'true');
    const ghosts = [0, 1].map(() => {
      const span = document.createElement('span');
      span.className = 'focus-echo';
      focus.append(span);
      return span;
    });
    const face = document.createElement('span');
    face.className = 'focus-face';
    focus.append(face);
    stage.querySelector('.lyric').after(focus);
    const label = document.createElement('label');
    label.className = 'style-picker';
    label.append('Style ');
    const select = document.createElement('select');
    select.setAttribute('aria-label', 'Kinetic text presentation');
    for (const [value, text] of Object.entries(modes)) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = text;
      select.append(option);
    }
    select.value = Object.hasOwn(modes, initialMode) ? initialMode : 'crescendo';
    label.append(select);
    screen.querySelector('.toolbar').prepend(label);
    screen.dataset.presentation = select.value;
    select.addEventListener('change', () => {
      screen.dataset.presentation = select.value;
      screen.dispatchEvent(new Event('presentationchange'));
    });

    function render(elements, cue, time, reduceMotion, active) {
      const mode = select.value;
      // Support an already-open page still running the previous player script.
      if (typeof active !== 'number') active = cue ? cue.words.findIndex(w => time >= w.start && time < w.end) : -1;
      const word = active >= 0 ? cue.words[active] : null;
      const text = word?.text || '';
      face.textContent = text;
      ghosts.forEach(ghost => { ghost.textContent = text; });
      focus.classList.toggle('silent', !word);
      if (cue) screen.dataset.motion = cue.motion || 'rise';
      let growth = 0;
      if (word) {
        const duration = Math.max(.04, word.end - word.start);
        const elapsed = clamp((time - word.start) / duration);
        // Unlike a brief onset pulse, this increases throughout the entire note.
        // Short syllables get a small gesture; long notes have room to unfold.
        const held = clamp((duration - .25) / 1.1);
        growth = smooth(elapsed) * (.14 + .56 * held) * (.65 + .35 * (word.emphasis ?? .5));
        focus.dataset.progress = elapsed.toFixed(4);
      } else focus.dataset.progress = '0';

      face.style.transform = 'none';
      face.style.fontSize = '';
      ghosts.forEach(ghost => { ghost.style.transform = 'none'; ghost.style.opacity = '0'; });
      if (word && mode !== 'flow') {
        // Fit the *expanded* word inside the screen, including long words and
        // narrow/fullscreen layouts. Measure untransformed text, not old poses.
        const available = focus.clientWidth * .93;
        const fit = Math.min(1, available / Math.max(1, face.offsetWidth * (mode === 'echo' ? 2.18 : 1.72)));
        const scale = fit * (reduceMotion ? 1 : 1 + growth);
        face.style.transform = reduceMotion ? 'none' : `scale(${scale.toFixed(4)})`;
        face.style.fontSize = reduceMotion ? `${Math.min(1, available / Math.max(1, face.offsetWidth)) * 100}%` : '';
        if (mode === 'echo' && !reduceMotion) {
          ghosts.forEach((ghost, i) => {
            ghost.style.transform = `scale(${(fit * (1 + growth * (1.32 + i * .28))).toFixed(4)})`;
            ghost.style.opacity = (growth * (.22 - i * .07)).toFixed(4);
          });
        }
      } else face.style.fontSize = '';
      elements.forEach((span, i) => {
        span.style.transform = 'none';
        span.style.opacity = '1';
        span.style.fontWeight = '500';
        span.style.textShadow = 'none';
        span.dataset.emphasis = String(cue.words[i].emphasis ?? .4);
      });
      if (mode === 'flow' && word && !reduceMotion) {
        // Give the growing word physical space; shift only neighbours sharing
        // its row. The reserved side gutters keep this inside the screen.
        const span = elements[active];
        const width = span.offsetWidth;
        const maxExtra = Math.min(stage.clientWidth * .14, 2 * Math.max(0, width * .55));
        const extra = Math.min(width * growth, maxExtra);
        const scale = 1 + extra / Math.max(1, width);
        span.style.transform = `scale(${scale.toFixed(4)})`;
        elements.forEach((other, i) => {
          if (i !== active && other.offsetTop === span.offsetTop) {
            other.style.transform = `translateX(${((i < active ? -1 : 1) * extra / 2).toFixed(3)}px)`;
          }
        });
      }
      screen.style.setProperty('--vocal-bloom', reduceMotion ? '0' : (growth * .65).toFixed(4));
    }
    return { render };
  }
  return { create };
})();
