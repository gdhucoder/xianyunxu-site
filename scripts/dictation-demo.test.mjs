import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DemoPlayback, demoFrame, timeLabel } from '../src/lib/dictation-demo-timeline.mjs';
/** @type {import('../src/lib/dictation-demo-timeline.mjs').DemoConfig} */
const config = JSON.parse(readFileSync(new URL('../src/data/dictation-demo.json', import.meta.url), 'utf8'));

function fixture() {
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
  });
  /** @param {number} ms */
  function advance(ms) {
    now += ms;
    const callbacks = [...pending.values()];
    pending.clear();
    callbacks.forEach((callback) => callback(now));
  }
  return { playback, pending, frames, advance };
}

test('the preset script and result match the requested scenario, with enough reading time', () => {
  assert.equal(config.spoken, '嗯，帮我跟小林说一下，明天下午三点开会，然后记得带上项目方案。');
  assert.equal(config.result, '小林，明天下午三点开会，记得带上项目方案。');
  assert.equal(config.cues.map((cue) => cue.text).join(''), config.spoken);
  const lastStage = config.stages.at(-1);
  assert.ok(lastStage);
  assert.ok(config.durationMs - lastStage.startMs >= 6000);
  assert.deepEqual(config.stages.map((stage) => stage.startMs), [...config.stages.map((stage) => stage.startMs)].sort((a, b) => a - b));
});

test('phase boundaries keep the input empty until the one-time preset insertion', () => {
  assert.equal(demoFrame(config, 0).stage.id, 'prompt');
  assert.equal(demoFrame(config, 1800).stage.id, 'recording');
  assert.equal(demoFrame(config, 12200).stage.id, 'processing');
  assert.equal(demoFrame(config, 14699).result, '');
  assert.equal(demoFrame(config, 14700).result, config.result);
  assert.equal(demoFrame(config, config.durationMs).result, config.result);
});

test('captions accumulate only the configured cues and the timer stops with recording', () => {
  assert.equal(demoFrame(config, 2499).caption, '');
  assert.equal(demoFrame(config, 3600).caption, '嗯，帮我跟小林说一下，');
  assert.equal(demoFrame(config, 12200).caption, config.spoken);
  assert.equal(demoFrame(config, 12200).seconds, demoFrame(config, 20000).seconds);
  assert.equal(timeLabel(65), '1:05');
});

test('play is explicit and duplicate play never accumulates frame loops', () => {
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
  playback.play(); advance(16000);
  assert.equal(demoFrame(config, playback.snapshot.elapsedMs).result, config.result);
  playback.replay();
  assert.equal(playback.snapshot.elapsedMs, 0);
  assert.equal(demoFrame(config, playback.snapshot.elapsedMs).result, '');
  assert.equal(demoFrame(config, playback.snapshot.elapsedMs).caption, '');
  assert.equal(pending.size, 1);
});

test('completion retains the unsent result, stops its scheduler and does not loop', () => {
  const { playback, pending, advance } = fixture();
  playback.play(); advance(config.durationMs + 500);
  assert.deepEqual(playback.snapshot, { elapsedMs: config.durationMs, state: 'complete' });
  assert.equal(pending.size, 0);
  advance(10000);
  assert.equal(playback.snapshot.state, 'complete');
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
  const { playback, pending, frames } = fixture();
  playback.play();
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
  const b = demoFrame(config, 8000, true);
  assert.deepEqual(a.heights, b.heights);
  assert.equal(a.caption, config.spoken);
  assert.equal(demoFrame(config, 14700, true).result, config.result);
});

test('browser controller includes leave/unmount cleanup and no real capture or sending', () => {
  const controller = readFileSync(new URL('../src/lib/dictation-demo-controller.ts', import.meta.url), 'utf8');
  const component = readFileSync(new URL('../src/components/demo/DictationDemo.astro', import.meta.url), 'utf8');
  assert.match(controller, /visibilitychange/);
  assert.match(controller, /pagehide/);
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
  assert.equal((hero.match(/<DictationDemo\s*\/>/g) ?? []).length, 1);
  assert.equal((home.match(/<Hero\s/g) ?? []).length, 1);
  assert.match(hero, /href=\{sitePath\("\/download\/"\)\}/);
  assert.match(hero, /href="#dictation-demo"/);
  assert.match(hero, /id="dictation-demo"/);
  assert.match(hero, /max-width: 1040px/);
  assert.match(hero, /不是真实识别/);
  assert.match(hero, /可选的 AI 文字整理/);
  assert.doesNotMatch(hero, /visual-orbit|hero-visual|autoplay/);
});
