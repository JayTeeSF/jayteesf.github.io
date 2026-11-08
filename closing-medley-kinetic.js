/* Expressive typography: pure media-time poses, including the surrounding glow.
 * Emphasis metadata was prepared offline; no microphone, network, or audio graph.
 */
window.MEDLEY_KINETIC = (() => {
  'use strict';
  const clamp = value => Math.max(0, Math.min(1, value));
  const ease = value => 1 - Math.pow(1 - clamp(value), 3);

  function render(elements, cue, time, reduceMotion, screen) {
    const theme = cue.motion || 'rise';
    screen.dataset.motion = theme;
    let bloom = 0;
    elements.forEach((span, i) => {
      const word = cue.words[i];
      const emphasis = word.emphasis ?? .4;
      const age = time - word.start;
      const duration = Math.max(.12, word.end - word.start);
      const after = clamp((time - word.end) / .45);
      const progress = clamp(age / duration);
      const crest = word.crest ?? (word.start + duration * .4);
      const spread = Math.max(.12, duration * .38);
      const pulse = age >= 0 ? Math.exp(-Math.pow((time - crest) / spread, 2)) * (1 - after) : 0;
      const held = age >= 0 ? Math.sin(Math.PI * progress) * Math.min(1, duration / 1.4) : 0;
      span.dataset.emphasis = emphasis.toFixed(3);
      span.style.fontWeight = emphasis >= .72 ? '700' : '500';
      if (reduceMotion) {
        span.style.transform = 'none';
        span.style.opacity = '1';
        span.style.textShadow = 'none';
        return;
      }
      // Preview every word; its onset resolves the muted preview into full ink.
      const entry = age < 0 ? 0 : ease(age / (theme === 'strong' ? .17 : theme === 'settle' ? .65 : .36));
      const anticipation = age < 0 ? clamp(1 + age / .45) : 0;
      let y, scale, rotation = 0;
      if (theme === 'strong') {
        // Land emphatic declarations. No shaking/flashing or letter scattering.
        const attack = age >= 0 ? Math.exp(-age * 7) : 0;
        y = (1 - entry) * 12 - held * emphasis * 3;
        scale = 1 + emphasis * (.14 * attack + .12 * pulse + .025 * held);
        rotation = (1 - entry) * -.9;
      } else if (theme === 'settle') {
        // The final song exhales downward; long notes gently open and settle.
        y = -(1 - entry) * 7 + held * emphasis * 2;
        scale = 1 + emphasis * (.055 * pulse + .035 * held);
      } else {
        // Warm upward entrances, with held notes opening into the vocal crest.
        y = (1 - entry) * 16 - emphasis * held * 6;
        scale = 1 + emphasis * (.105 * pulse + .05 * held);
      }
      // Give the nearest upcoming word a slight lift, without hiding the line.
      y -= anticipation * 2;
      span.style.transform = `translateY(${y.toFixed(3)}px) rotate(${rotation.toFixed(3)}deg) scale(${scale.toFixed(4)})`;
      span.style.opacity = (.56 + .44 * entry).toFixed(3);
      span.style.textShadow = pulse > .02 ? `0 0 ${(5 + 18 * emphasis * pulse).toFixed(1)}px rgba(231,199,127,${(.09 + .2 * emphasis * pulse).toFixed(3)})` : 'none';
      bloom = Math.max(bloom, pulse * (.2 + .8 * (word.energy ?? .4)) * emphasis);
    });
    screen.style.setProperty('--vocal-bloom', reduceMotion ? '0' : bloom.toFixed(3));
  }
  return { render };
})();
