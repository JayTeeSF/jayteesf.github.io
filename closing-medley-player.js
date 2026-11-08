/* One media clock controls both the lyrics and their motion. No elapsed-time timer. */
(() => {
  'use strict';
  const { songs, cues } = window.CLOSING_MEDLEY;
  const audio = document.getElementById('audio');
  const screen = document.getElementById('lyric-screen');
  const lyric = document.getElementById('lyric');
  const status = document.getElementById('player-status');
  const label = document.getElementById('song-label');
  const count = document.getElementById('song-count');
  const fullscreen = document.getElementById('fullscreen');
  const songButtons = [...document.querySelectorAll('[data-song]')];
  const kinetic = document.body.dataset.lyrics === 'kinetic'
    ? window.MEDLEY_KINETIC.create(document.querySelector('.lyric-stage'), screen, document.body.dataset.presentation || 'crescendo')
    : null;
  const wordsMode = document.body.dataset.lyrics === 'words' || Boolean(kinetic);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let lastKey = null;
  let wordElements = [];
  let frame = null;
  let buffering = false;
  let playError = '';

  function render() {
    const time = audio.currentTime;
    const songIndex = songs.reduce((found, song, i) => time >= song.start ? i : found, 0);
    const song = songs[songIndex];
    label.textContent = song.title;
    count.textContent = `0${songIndex + 1} / 03`;
    songButtons.forEach((button, i) => {
      if (i === songIndex) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    });
    const cueIndex = cues.findIndex(cue => time >= cue.start && time < cue.end);
    const cue = cues[cueIndex];
    const key = audio.ended ? 'ended' : cue ? cueIndex : `title-${songIndex}`;
    if (key !== lastKey) {
      lastKey = key;
      wordElements = [];
      lyric.replaceChildren();
      const text = !audio.ended && cue ? cue.text : '';
      lyric.classList.toggle('long-line', text.length > 62);
      if (wordsMode && cue && !audio.ended) {
        text.split(/\s+/).forEach((word, i) => {
          if (i) lyric.append(' ');
          const span = document.createElement('span');
          span.className = kinetic ? 'word kinetic-word' : 'word';
          span.textContent = word;
          lyric.append(span);
          wordElements.push(span);
        });
      } else lyric.textContent = text;
    }
    // Derive entrance and gentle growth from the media time, so pausing freezes
    // motion and seeking reconstructs the correct point in the animation.
    if (cue && !audio.ended && !reducedMotion.matches && !kinetic) {
      const age = Math.max(0, time - cue.start);
      const entrance = Math.min(1, age / .42);
      const eased = 1 - Math.pow(1 - entrance, 3);
      const scale = 1 + Math.min(age / Math.max(.1, cue.end - cue.start), 1) * .018;
      lyric.style.opacity = String(.3 + .7 * eased);
      lyric.style.transform = `translateY(${(1 - eased) * 15}px) scale(${scale})`;
    } else {
      lyric.style.opacity = '1';
      lyric.style.transform = 'none';
    }
    if (wordElements.length && cue) {
      let active = -1;
      cue.words.forEach((word, i) => { if (time >= word.start && time < word.end) active = i; });
      wordElements.forEach((span, i) => {
        span.classList.toggle('sung', time >= cue.words[i].end);
        span.classList.toggle('active', i === active);
      });
    }
    if (kinetic) {
      screen.dataset.motion = cue?.motion || song.motion;
      kinetic.render(wordElements, audio.ended ? null : cue, time, reducedMotion.matches);
    }
    status.textContent = playError || (audio.ended ? 'Medley complete. Press play to listen again.' : audio.paused ? (time === 0 ? 'Press play below to begin.' : 'Paused') : buffering ? 'Loading audio…' : '\u00a0');
  }

  function stopFrames() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
  }
  function tick() {
    frame = null;
    render();
    if (!audio.paused && !audio.ended && !buffering) frame = requestAnimationFrame(tick);
  }
  function startFrames() {
    stopFrames();
    tick();
  }
  async function playFrom(time) {
    playError = '';
    audio.currentTime = time;
    render();
    try { await audio.play(); }
    catch { playError = 'Playback could not start. Press play in the audio controls to try again.'; render(); }
  }
  audio.addEventListener('playing', () => { buffering = false; playError = ''; startFrames(); });
  audio.addEventListener('waiting', () => { buffering = true; stopFrames(); render(); });
  audio.addEventListener('pause', () => { stopFrames(); render(); });
  audio.addEventListener('ended', () => { stopFrames(); render(); });
  audio.addEventListener('error', () => {
    playError = 'The medley could not load. Check your connection and reload this page.';
    stopFrames();
    render();
  });
  for (const event of ['loadedmetadata', 'timeupdate', 'seeking', 'seeked', 'ratechange', 'canplay', 'emptied']) {
    audio.addEventListener(event, () => {
      if (event === 'seeked' || event === 'canplay' || event === 'emptied') buffering = false;
      render();
      if (!audio.paused && !audio.ended && !buffering && frame === null) startFrames();
    });
  }
  reducedMotion.addEventListener('change', render);
  window.addEventListener('resize', render);
  screen.addEventListener('presentationchange', render);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopFrames();
    else if (!audio.paused && !audio.ended && !buffering) startFrames();
    else render();
  });
  document.getElementById('restart').addEventListener('click', () => playFrom(0));
  songButtons.forEach(button => button.addEventListener('click', () => playFrom(songs[Number(button.dataset.song)].start)));
  if (screen.requestFullscreen && document.fullscreenEnabled) {
    fullscreen.hidden = false;
    fullscreen.addEventListener('click', async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await screen.requestFullscreen();
      } catch { status.textContent = 'Full screen is unavailable in this browser.'; }
    });
    document.addEventListener('fullscreenchange', () => {
      const expanded = document.fullscreenElement === screen;
      fullscreen.textContent = expanded ? '⛶ Exit full screen' : '⛶ Full screen';
      fullscreen.setAttribute('aria-pressed', String(expanded));
      render();
    });
  }
  render();
})();
