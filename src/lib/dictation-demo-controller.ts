import config from '../data/dictation-demo.json';
import { DemoPlayback, demoFrame, timeLabel } from './dictation-demo-timeline.mjs';
import type { PlaybackSnapshot } from './dictation-demo-timeline.mjs';

/** Only manages the preset local scene. No capture, network, storage, or sending. */
export function mountDictationDemo(root: HTMLElement) {
  const element = <T extends HTMLElement>(selector: string): T => {
    const found = root.querySelector<T>(selector);
    if (!found) throw new Error(`Missing demo element: ${selector}`);
    return found;
  };
  const toggle = element<HTMLButtonElement>('[data-toggle]');
  const replay = element<HTMLButtonElement>('[data-replay]');
  const input = element<HTMLTextAreaElement>('[data-message]');
  const title = element('[data-scene-title]');
  const description = element('[data-scene-description]');
  const subtitle = element('[data-subtitle]');
  const progress = element<HTMLProgressElement>('[data-progress]');
  const clock = element('[data-clock]');
  const recordTime = element('[data-record-time]');
  const announcement = element('[data-announcement]');
  const captionLabel = element('[data-caption-label]');
  const feedback = element('[data-feedback]');
  const reducedNote = element('[data-reduced-note]');
  const motionToggle = element<HTMLInputElement>('[data-reduce-motion]');
  const bars = [...root.querySelectorAll<HTMLElement>('[data-wave-bar]')];
  const dots = [...root.querySelectorAll<HTMLElement>('[data-process-dot]')];
  const steps = [...root.querySelectorAll<HTMLElement>('[data-step]')];
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  const events = new AbortController();
  let previousStage = '';
  let visibilityPaused = false;
  let localReducedMotion = false;

  const playback: DemoPlayback = new DemoPlayback(config.durationMs, {
    now: () => performance.now(),
    requestFrame: (callback) => requestAnimationFrame(callback),
    cancelFrame: (handle) => cancelAnimationFrame(handle),
    onChange: render,
  });

  function render(snapshot: PlaybackSnapshot = playback.snapshot) {
    const reducedMotion = media.matches || localReducedMotion;
    const { stage, caption, seconds, heights, result } = demoFrame(config, snapshot.elapsedMs, reducedMotion);
    root.dataset.phase = stage.id;
    root.dataset.playback = snapshot.state;
    root.dataset.reducedMotion = String(reducedMotion);
    title.textContent = snapshot.state === 'idle' ? config.stages[0]!.title : stage.title;
    description.textContent = stage.description;
    subtitle.textContent = caption || config.ui.initialCaption;
    input.value = result;
    recordTime.textContent = timeLabel(seconds);
    clock.textContent = `${timeLabel(snapshot.elapsedMs / 1000)} / ${timeLabel(config.durationMs / 1000)}`;
    progress.value = snapshot.elapsedMs;
    progress.setAttribute('aria-valuetext', `${stage.title}，${timeLabel(snapshot.elapsedMs / 1000)}`);
    toggle.dataset.icon = snapshot.state === 'playing' ? 'pause' : snapshot.state === 'complete' ? 'replay' : 'play';
    element('[data-toggle-label]').textContent = snapshot.state === 'playing' ? config.ui.pause
      : snapshot.state === 'complete' ? config.ui.replay : snapshot.state === 'paused' ? config.ui.resume : config.ui.play;
    replay.disabled = snapshot.state === 'idle';
    replay.hidden = snapshot.state === 'complete';
    reducedNote.hidden = !reducedMotion;
    motionToggle.checked = reducedMotion;
    motionToggle.disabled = media.matches;
    captionLabel.textContent = stage.id === 'prompt' ? config.ui.captionIdle : stage.id === 'recording' ? config.ui.captionRecording : config.ui.captionFinished;
    feedback.textContent = visibilityPaused && snapshot.state === 'paused' ? config.ui.feedbackHidden
      : snapshot.state === 'paused' ? config.ui.feedbackPaused
      : stage.id === 'result' ? config.ui.feedbackResult : config.ui.feedbackIdle;
    bars.forEach((bar, index) => { bar.style.height = `${heights[index] ?? 3}px`; });
    dots.forEach((dot, index) => {
      dot.style.opacity = String(reducedMotion ? 1 : 0.35 + (Math.sin(snapshot.elapsedMs / 250 + index * 2) + 1) * 0.325);
    });
    const active = config.stages.findIndex((item) => item.id === stage.id);
    steps.forEach((step, index) => {
      step.dataset.status = index === active ? 'current' : index < active ? 'done' : 'next';
      if (index === active) step.setAttribute('aria-current', 'step');
      else step.removeAttribute('aria-current');
    });
    if (previousStage !== stage.id) {
      // Announce semantic stage changes, not every animation frame or syllable.
      announcement.textContent = `${stage.title}。${stage.id === 'result' ? config.result + '消息不会自动发送。' : stage.description}`;
      previousStage = stage.id;
    }
  }

  toggle.addEventListener('click', () => {
    visibilityPaused = false;
    if (playback.snapshot.state === 'playing') playback.pause();
    else if (playback.snapshot.state === 'complete') playback.replay();
    else playback.play();
  }, { signal: events.signal });
  replay.addEventListener('click', () => {
    visibilityPaused = false;
    previousStage = '';
    playback.replay();
  }, { signal: events.signal });
  const pauseOnLeave = () => {
    if (playback.snapshot.state === 'playing') {
      visibilityPaused = true;
      playback.pause();
    }
  };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseOnLeave();
  }, { signal: events.signal });
  window.addEventListener('pagehide', pauseOnLeave, { signal: events.signal });
  document.addEventListener('astro:before-swap', pauseOnLeave, { signal: events.signal });
  media.addEventListener('change', () => render(), { signal: events.signal });
  motionToggle.addEventListener('change', () => {
    localReducedMotion = motionToggle.checked;
    render();
  }, { signal: events.signal });
  render();

  return () => {
    playback.destroy();
    events.abort();
    root.getAnimations({ subtree: true }).forEach((animation) => animation.cancel());
  };
}
