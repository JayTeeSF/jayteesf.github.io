// Run with `node test/closing-medley-browser.cjs` when Playwright is installed.
// PLAYWRIGHT_MODULE may point to an existing Playwright installation.
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const url = name => pathToFileURL(path.join(root, name)).href;

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const externalRequests = [];
    page.on('request', request => { if (/^https?:/.test(request.url())) externalRequests.push(request.url()); });
    await page.goto(url('closing-medley.html'));
    await page.waitForFunction(() => document.querySelector('audio').readyState >= 1);
    assert.equal(await page.locator('audio').evaluate(a => Math.round(a.duration)), 181);
    assert.equal(await page.locator('#lyric-screen audio[controls]').count(), 1);
    assert.equal(await page.locator('iframe').count(), 0);
    assert.deepEqual(externalRequests, [], 'main player should work without external services');

    async function seek(time, expected) {
      await page.locator('audio').evaluate((audio, time) => {
        audio.pause();
        audio.currentTime = time;
      }, time);
      await page.waitForFunction(() => !document.querySelector('audio').seeking);
      await page.waitForFunction(text => document.getElementById('lyric').textContent === text, expected);
    }
    await seek(.5, 'Blessed assurance');
    await seek(5, 'Jesus is mine');
    await seek(57.8, 'I trust in God');
    await seek(61, 'Miracles when You move');
    assert.equal(await page.locator('[data-song="1"]').getAttribute('aria-current'), 'true');
    await seek(120.5, "How many know He's faithful?");
    await seek(125, 'Be Still and Know'); // Instrumental after spoken introduction.
    await seek(128, 'I have faced many mountains');
    await seek(147.5, "I won't fear");
    await seek(144.5, "I won't fear"); // Same words, different cue: seeking must reconstruct animation.
    await seek(5, 'Jesus is mine'); // Backward seek across songs.
    assert.equal(await page.locator('[data-song="0"]').getAttribute('aria-current'), 'true');

    // Exercise native media playback, rather than a simulated timer.
    await page.locator('audio').evaluate(a => a.play());
    await page.waitForTimeout(350);
    await page.locator('audio').evaluate(a => a.pause());
    await page.waitForTimeout(50);
    const paused = await page.locator('audio').evaluate(a => a.currentTime);
    const frozenStyle = await page.locator('#lyric').getAttribute('style');
    await page.waitForTimeout(250);
    assert.equal(await page.locator('audio').evaluate(a => a.currentTime), paused);
    assert.equal(await page.locator('#lyric').getAttribute('style'), frozenStyle);
    assert.equal(await page.locator('#player-status').textContent(), 'Paused');
    await page.locator('audio').evaluate(a => a.dispatchEvent(new Event('waiting')));
    assert.equal(await page.locator('#player-status').textContent(), 'Paused', 'paused status takes priority over buffering');
    await page.locator('audio').evaluate(a => a.dispatchEvent(new Event('canplay')));

    await seek(61.8, 'Miracles when You move');
    await page.locator('audio').evaluate(a => { a.playbackRate = 2; return a.play(); });
    await page.waitForFunction(() => document.querySelector('audio').currentTime >= 62.6);
    await page.locator('audio').evaluate(a => a.pause());
    assert.equal(await page.locator('audio').evaluate(a => a.playbackRate), 2);
    assert.equal(await page.locator('#lyric').textContent(), 'Such an easy thing for You to do', 'lyrics follow audio across a boundary at double speed');

    await page.locator('[data-song="2"]').click();
    await page.waitForFunction(() => document.querySelector('audio').currentTime >= 120 && !document.querySelector('audio').paused);
    assert.equal(await page.locator('#song-label').textContent(), 'Be Still and Know');
    await page.locator('audio').evaluate(a => { a.currentTime = 180.8; a.playbackRate = 4; });
    await page.waitForFunction(() => document.querySelector('audio').ended);
    assert.match(await page.locator('#player-status').textContent(), /Medley complete/);
    await page.locator('#restart').click();
    await page.waitForFunction(() => document.querySelector('audio').currentTime < 3 && !document.querySelector('audio').paused);
    await page.locator('audio').evaluate(a => a.pause());

    // Fullscreen must keep native controls visible in a short landscape viewport.
    await page.setViewportSize({ width: 812, height: 375 });
    if (await page.locator('#fullscreen').isVisible()) {
      await page.locator('#fullscreen').click();
      await page.waitForFunction(() => document.fullscreenElement !== null);
      const fits = await page.locator('audio').evaluate(a => a.getBoundingClientRect().bottom <= innerHeight);
      assert(fits, 'fullscreen audio controls must fit in short landscape screens');
      await page.locator('#fullscreen').click();
      await page.waitForFunction(() => document.fullscreenElement === null);
    }

    // Every full line must fit within the screen on narrow phones.
    await page.setViewportSize({ width: 320, height: 740 });
    await seek(30, 'And what He did for me on Calvary is more than enough');
    const layout = await page.evaluate(() => {
      const text = document.getElementById('lyric').getBoundingClientRect();
      const stage = document.querySelector('.lyric-stage').getBoundingClientRect();
      return { overflow: document.documentElement.scrollWidth > innerWidth, textTop: text.top, textBottom: text.bottom, stageTop: stage.top, stageBottom: stage.bottom };
    });
    assert.equal(layout.overflow, false);
    assert(layout.textTop >= layout.stageTop && layout.textBottom <= layout.stageBottom, 'long line must fit in lyric stage');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await page.locator('#lyric').evaluate(e => getComputedStyle(e).transform), 'none');
    await page.screenshot({ path: '/private/tmp/closing-medley-mobile.png', fullPage: true });
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.screenshot({ path: '/private/tmp/closing-medley-desktop.png', fullPage: true });

    await page.goto(url('closing-medley-words.html'));
    await page.waitForFunction(() => document.querySelector('audio').readyState >= 1);
    await seek(5.5, 'Jesus is mine');
    assert.equal(await page.locator('.word.active').textContent(), 'is');
    await seek(4, 'Jesus is mine');
    assert.equal(await page.locator('.word.active').textContent(), 'Jesus');
    await page.screenshot({ path: '/private/tmp/closing-medley-words.png', fullPage: true });

    // All measured word starts are monotone and belong to their displayed line.
    const cueProblems = await page.evaluate(() => window.CLOSING_MEDLEY.cues.flatMap((cue, index, cues) => {
      const problems = [];
      if (!(cue.end > cue.start)) problems.push(`empty cue ${index}`);
      if (index && cue.start < cues[index - 1].end) problems.push(`overlap ${index}`);
      if (cue.words.length !== cue.text.split(/\s+/).length) problems.push(`word count ${index}`);
      cue.words.forEach((word, i) => {
        if (word.start < cue.start || word.start >= cue.end) problems.push(`word outside cue ${index}/${i}`);
        if (i && word.start < cue.words[i - 1].start) problems.push(`word order ${index}/${i}`);
      });
      return problems;
    }));
    assert.deepEqual(cueProblems, []);
    assert.deepEqual(errors, []);
    console.log('PASS: whole-line and word pages; real playback, pause, seek, rate, song jumps, end/restart, mobile fit, reduced motion, cue integrity; no JavaScript errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
