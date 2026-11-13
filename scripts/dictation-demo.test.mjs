import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DemoPlayback, demoFrame, demoClock, shouldAutoplay, timeLabel } from '../src/lib/dictation-demo-timeline.mjs';
/** @type {import('../src/lib/dictation-demo-timeline.mjs').DemoConfig} */
const config = JSON.parse(readFileSync(new URL('../src/data/dictation-demo.json', import.meta.url), 'utf8'));

/** @param {{loop?: boolean}} [options] */
function fixture(options = {}) {
  let now = 0;
  let sequence = 0;
  /** @type {Map<number, (time: number) => void>} */
  const pending = new Map();
  /** @type {import('../src/lib/dictation-demo-timeline.mjs').PlaybackSnapshot[]} */
  const frames = [];
  const playback = new DemoPlayback(config.durationMs, {
    now: () => now,
    requestFrame: (callback) => { pending.set(++sequence, callback); return sequence; },
    cancelFrame: (handle) => pending.delete(handle),
    onChange: (frame) => frames.push(frame),
  }, options);
  /** @param {number} ms */
  function advance(ms) {
    now += ms;
    const callbacks = [...pending.values()];
    pending.clear();
    callbacks.forEach((callback) => callback(now));
  }
  return { playback, pending, frames, advance };
}

test('the preset script takes eight seconds with a readable result at the end of each lap', () => {
  assert.equal(config.spoken, '嗯，帮我跟小林说一下，明天下午三点开会，然后记得带上项目方案。');
  assert.equal(config.result, '小林，明天下午三点开会，记得带上项目方案。');
  assert.equal(config.cues.map((cue) => cue.text).join(''), config.spoken);
  const lastStage = config.stages.at(-1);
  assert.ok(lastStage);
  assert.equal(config.durationMs, 8000);
  assert.equal(config.sourceDurationMs, 20000);
  assert.deepEqual(config.playback, { autoplay: true, loop: true });
  assert.ok(config.durationMs - lastStage.startMs >= 2500);
  assert.deepEqual(config.stages.map((stage) => stage.startMs), [...config.stages.map((stage) => stage.startMs)].sort((a, b) => a - b));
});

test('phase boundaries keep the input empty until the one-time preset insertion', () => {
  assert.equal(demoFrame(config, 0).stage.id, 'prompt');
  assert.equal(demoFrame(config, 320).stage.id, 'recording');
  assert.equal(demoFrame(config, 4320).stage.id, 'processing');
  assert.equal(demoFrame(config, 5439).result, '');
  assert.equal(demoFrame(config, 5440).result, config.result);
  assert.equal(demoFrame(config, config.durationMs).result, config.result);
});

test('captions accumulate only the configured cues and the timer stops with recording', () => {
  assert.equal(demoFrame(config, 559).caption, '');
  assert.equal(demoFrame(config, 800).caption, '嗯，帮我跟小林说一下，');
  assert.equal(demoFrame(config, 4320).caption, config.spoken);
  assert.equal(demoFrame(config, 4320).seconds, 20);
  assert.equal(demoFrame(config, 4320).seconds, demoFrame(config, 8000).seconds);
  assert.equal(timeLabel(65), '1:05');
});

test('source clock is a 2.5-times preview, separate from eight-second playback', () => {
  assert.equal(demoClock(config, 0), '0:00 / 0:20');
  assert.equal(demoClock(config, 4000), '0:10 / 0:20');
  assert.equal(demoClock(config, 8000), '0:20 / 0:20');
  assert.equal(demoClock(config, 9000), '0:20 / 0:20');
  const poster = demoFrame(config, config.posterAtMs);
  assert.equal(poster.stage.id, 'recording');
  assert.ok(poster.caption.length > 0);
  assert.equal(poster.result, '');
});

test('the clock only starts when requested and duplicate play never accumulates frame loops', () => {
  const { playback, pending, advance } = fixture();
  assert.equal(pending.size, 0);
  assert.equal(playback.snapshot.state, 'idle');
  playback.play(); playback.play(); playback.play();
  assert.equal(pending.size, 1);
  advance(3000);
  assert.equal(pending.size, 1);
  assert.equal(playback.snapshot.elapsedMs, 3000);
});

test('pause freezes progress; resume excludes paused time', () => {
  const { playback, pending, advance } = fixture();
  playback.play(); advance(4000); playback.pause();
  assert.equal(pending.size, 0);
  advance(9000);
  assert.equal(playback.snapshot.elapsedMs, 4000);
  playback.play(); advance(1000);
  assert.equal(playback.snapshot.elapsedMs, 5000);
});

test('replay cancels an old loop and clears result and subtitles immediately', () => {
  const { playback, pending, advance } = fixture();
  playback.play(); advance(6000);
  assert.equal(demoFrame(config, playback.snapshot.elapsedMs).result, config.result);
  playback.replay();
  assert.equal(playback.snapshot.elapsedMs, 0);
  assert.equal(demoFrame(config, playback.snapshot.elapsedMs).result, '');
  assert.equal(demoFrame(config, playback.snapshot.elapsedMs).caption, '');
  assert.equal(pending.size, 1);
});

test('completion retains the unsent result, stops its scheduler and does not loop', () => {
  const { playback, pending, advance } = fixture();
  playback.play(); advance(7999);
  assert.equal(playback.snapshot.state, 'playing');
  advance(1);
  assert.deepEqual(playback.snapshot, { elapsedMs: config.durationMs, state: 'complete' });
  assert.equal(pending.size, 0);
  advance(10000);
  assert.equal(playback.snapshot.state, 'complete');
  assert.equal(demoFrame(config, playback.snapshot.elapsedMs).result, config.result);
});

test('looping retains the result until the eight-second boundary and reuses one scheduler', () => {
  const { playback, pending, advance } = fixture({ loop: true });
  playback.play(); advance(7999);
  assert.equal(demoFrame(config, playback.snapshot.elapsedMs).result, config.result);
  advance(1);
  assert.deepEqual(playback.snapshot, { elapsedMs: 0, state: 'playing' });
  assert.equal(demoFrame(config, playback.snapshot.elapsedMs).result, '');
  assert.equal(pending.size, 1);
  advance(3 * config.durationMs + 1234);
  assert.equal(playback.snapshot.elapsedMs, 1234);
  assert.equal(pending.size, 1);
  playback.destroy();
  assert.equal(pending.size, 0);
});

test('loop pause and resume exclude hidden or manually paused time across a cycle boundary', () => {
  const { playback, pending, advance } = fixture({ loop: true });
  playback.play(); advance(7900); playback.pause();
  advance(24000);
  assert.deepEqual(playback.snapshot, { elapsedMs: 7900, state: 'paused' });
  assert.equal(pending.size, 0);
  playback.play(); advance(100);
  assert.deepEqual(playback.snapshot, { elapsedMs: 0, state: 'playing' });
  assert.equal(pending.size, 1);
});

test('disabling loops in a later lap finishes the current lap without jumping', () => {
  const { playback, pending, advance } = fixture({ loop: true });
  playback.play(); advance(10000);
  assert.equal(playback.snapshot.elapsedMs, 2000);
  playback.setLoop(false);
  advance(5999);
  assert.equal(playback.snapshot.state, 'playing');
  assert.equal(playback.snapshot.elapsedMs, 7999);
  advance(1);
  assert.equal(playback.snapshot.state, 'complete');
  assert.equal(pending.size, 0);
});

test('autoplay policy respects hidden pages, reduced motion and an explicit manual pause', () => {
  const active = { enabled: true, reducedMotion: false, hidden: false, pageActive: true, manuallyPaused: false };
  assert.equal(shouldAutoplay(active), true);
  for (const changed of [{ enabled: false }, { reducedMotion: true }, { hidden: true }, { pageActive: false }, { manuallyPaused: true }]) {
    assert.equal(shouldAutoplay({ ...active, ...changed }), false);
  }
  assert.equal(shouldAutoplay({ ...active, hidden: false, manuallyPaused: true }), false);
});

test('a cancelled frame arriving after replay cannot create a second loop', () => {
  const { playback, pending, frames } = fixture();
  playback.play();
  const late = [...pending.values()][0];
  assert.ok(late);
  playback.replay();
  const count = frames.length;
  late(1000);
  assert.equal(frames.length, count);
  assert.equal(pending.size, 1);
});

test('unmount cancels the pending callback and a late callback cannot resurrect it', () => {
  const { playback, pending, frames, advance } = fixture({ loop: true });
  playback.play();
  advance(config.durationMs * 7 + 500);
  const late = [...pending.values()][0];
  assert.ok(late);
  playback.destroy();
  assert.equal(pending.size, 0);
  const count = frames.length;
  late(10000); playback.play(); playback.replay();
  assert.equal(frames.length, count);
  assert.equal(pending.size, 0);
});

test('reduced motion uses a stable waveform and readable full preset caption', () => {
  const a = demoFrame(config, 2000, true);
  const b = demoFrame(config, 2400, true);
  assert.deepEqual(a.heights, b.heights);
  assert.equal(a.caption, config.spoken);
  assert.equal(demoFrame(config, 5440, true).result, config.result);
});

test('browser controller includes leave/unmount cleanup and no real capture or sending', () => {
  const controller = readFileSync(new URL('../src/lib/dictation-demo-controller.ts', import.meta.url), 'utf8');
  const component = readFileSync(new URL('../src/components/demo/DictationDemo.astro', import.meta.url), 'utf8');
  assert.match(controller, /visibilitychange/);
  assert.match(controller, /pagehide/);
  assert.match(controller, /pageshow/);
  assert.match(controller, /syncPlaybackPolicy\(\)/);
  assert.match(controller, /playback\.setLoop/);
  assert.match(controller, /manuallyPaused/);
  assert.match(controller, /events\.abort\(\)/);
  assert.match(component, /disconnectedCallback/);
  assert.match(component, /type="button" disabled aria-label="发送已禁用/);
  assert.doesNotMatch(controller, /getUserMedia|MediaRecorder|fetch\(|WebSocket|setInterval|setTimeout/);
});

test('realistic chat context is preset separately and never becomes a sent demo result', () => {
  const scene = JSON.parse(readFileSync(new URL('../src/data/dictation-demo.json', import.meta.url), 'utf8'));
  const component = readFileSync(new URL('../src/components/demo/DictationDemo.astro', import.meta.url), 'utf8');
  const controller = readFileSync(new URL('../src/lib/dictation-demo-controller.ts', import.meta.url), 'utf8');
  assert.ok(scene.chat.contextMessage.length > 0);
  assert.notEqual(scene.chat.contextMessage, config.result);
  assert.match(component, /data-chat-context/);
  assert.match(component, /config\.chat\.contextMessage/);
  assert.doesNotMatch(controller, /data-chat-context|appendChild|insertAdjacentHTML/);
  assert.match(scene.ui.overlayNote, /放大展示/);
});

test('homepage hero reuses one full-width demo while retaining download and preset boundaries', () => {
  const hero = readFileSync(new URL('../src/components/Hero.astro', import.meta.url), 'utf8');
  const home = readFileSync(new URL('../src/pages/index.astro', import.meta.url), 'utf8');
  const component = readFileSync(new URL('../src/components/demo/DictationDemo.astro', import.meta.url), 'utf8');
  assert.equal((hero.match(/<DictationDemo featured\s*\/>/g) ?? []).length, 1);
  assert.equal((home.match(/<Hero\s/g) ?? []).length, 1);
  assert.match(hero, /href=\{sitePath\("\/download\/"\)\}/);
  assert.match(hero, /id="dictation-demo"/);
  assert.ok(hero.indexOf('id="dictation-demo"') < hero.indexOf('class="hero-copy"'));
  assert.ok(component.indexOf('class="xy-overlay-area"') < component.indexOf('class="xy-spoken"'));
  assert.ok(component.indexOf('class="xy-spoken"') < component.indexOf('class="xy-chat"'));
  assert.match(hero, /max-width: 1040px/);
  assert.match(component, /class="xy-demo-example"/);
  const scene = JSON.parse(readFileSync(new URL('../src/data/dictation-demo.json', import.meta.url), 'utf8'));
  assert.match(scene.ui.previewLabel, /演示示例 · 2\.5× 快览/);
  assert.match(component, /演示不会发送消息/);
  assert.match(component, /config\.ui\.previewLabel/);
  assert.doesNotMatch(hero, /hero-demo-note|不是真实识别|本例展示/);
  assert.doesNotMatch(home, /PublicPreviewNotice/);
  assert.doesNotMatch(hero, /visual-orbit|hero-visual|autoplay/);
});
