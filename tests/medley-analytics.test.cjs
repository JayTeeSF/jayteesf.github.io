const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup({ ready = true, audio = true, failing = false, path = '/closing-medley.html' } = {}) {
  const calls = [];
  const media = new EventTarget();
  const script = new EventTarget();
  const window = { location: { pathname: path } };
  function connect() {
    window.goatcounter = { count(data) {
      if (failing) throw new Error('Analytics unavailable');
      calls.push(data);
    } };
  }
  if (ready) connect();
  const document = {
    getElementById: () => audio ? media : null,
    querySelector: () => script,
  };
  vm.runInNewContext(fs.readFileSync('closing-medley-analytics.js', 'utf8'), { window, document });
  return { calls, media, script, window, connect };
}

test('counts actual playback and reaching the end once per page load, not pauses or buffering', () => {
  const { calls, media } = setup();
  for (const name of ['play', 'waiting', 'error']) media.dispatchEvent(new Event(name));
  assert.equal(calls.length, 0);
  for (const name of ['playing', 'pause', 'playing', 'waiting', 'playing', 'ended', 'playing', 'ended']) {
    media.dispatchEvent(new Event(name));
  }
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
    { path: 'medley-started:/closing-medley.html', title: 'Medley playback started', event: true, no_session: true },
    { path: 'medley-completed:/closing-medley.html', title: 'Medley reached the end', event: true, no_session: true },
  ]);
});

test('keeps early events until the async counter loads, without duplicates', () => {
  const { calls, media, script, connect } = setup({ ready: false });
  for (const name of ['playing', 'playing', 'ended']) media.dispatchEvent(new Event(name));
  assert.equal(calls.length, 0);
  connect();
  script.dispatchEvent(new Event('load'));
  script.dispatchEvent(new Event('load'));
  assert.equal(calls.length, 2);
});

test('a missing or failing counter does not interrupt media events', () => {
  for (const options of [{ ready: false }, { failing: true }]) {
    const { window } = setup(options);
    assert.doesNotThrow(() => {
      window.MEDLEY_ANALYTICS.started();
      window.MEDLEY_ANALYTICS.completed();
    });
  }
});

test('YouTube reports actual playing and final excerpt completion, including replays', () => {
  const { window, calls } = setup({ audio: false, path: '/closing-medley-youtube.html' });
  const elements = new Map();
  for (const id of ['start', 'restart', 'now-playing']) {
    const element = new EventTarget();
    element.click = () => element.dispatchEvent(new Event('click'));
    elements.set(id, element);
  }
  let playerOptions;
  let currentVideo;
  let currentTime;
  const player = {
    loadVideoById({ videoId, startSeconds }) { currentVideo = videoId; currentTime = startSeconds; },
    getVideoData: () => ({ video_id: currentVideo }),
    getCurrentTime: () => currentTime,
  };
  const context = {
    window,
    document: { getElementById: id => elements.get(id) },
    YT: { PlayerState: { PLAYING: 1, ENDED: 0, BUFFERING: 3 },
      Player: function (id, options) { playerOptions = options; return player; } },
    setInterval: () => 1, clearInterval() {}, setTimeout: fn => fn(),
  };
  const html = fs.readFileSync('closing-medley-youtube.html', 'utf8');
  const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
  vm.runInNewContext(inline, context);
  window.onYouTubeIframeAPIReady();
  const state = data => playerOptions.events.onStateChange({ data });
  for (let replay = 0; replay < 2; replay++) {
    elements.get('start').click();
    assert.equal(calls.length, replay ? 2 : 0); // A click alone is not playback.
    for (const end of [78, 75, 68]) {
      state(1);
      state(3);
      state(1);
      currentTime = end;
      state(0);
    }
  }
  assert.deepEqual(calls.map(call => call.path), [
    'medley-started:/closing-medley-youtube.html',
    'medley-completed:/closing-medley-youtube.html',
  ]);
});
