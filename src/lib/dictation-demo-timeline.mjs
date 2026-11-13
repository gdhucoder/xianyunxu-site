/**
 * A single cancellable animation clock. It never opens a microphone or requests
 * generated text. Browser scheduling is injected so the same lifecycle is tested.
 * @typedef {'idle' | 'playing' | 'paused' | 'complete'} PlaybackState
 * @typedef {{elapsedMs: number, state: PlaybackState}} PlaybackSnapshot
 * @typedef {{now: () => number, requestFrame: (callback: (time: number) => void) => number,
 * cancelFrame: (handle: number) => void, onChange: (snapshot: PlaybackSnapshot) => void}} PlaybackDriver
 * @typedef {{durationMs: number, sourceDurationMs: number, posterAtMs: number, playback: {autoplay: boolean, loop: boolean}, spoken: string, result: string,
 * stages: {id: string, startMs: number, title: string, description: string}[],
 * cues: {atMs: number, text: string}[],
 * waveform: {weights: number[], minHeight: number, maxHeight: number}}} DemoConfig
 */

export class DemoPlayback {
  /** @type {PlaybackState} */
  #state = 'idle';
  /** @type {number | null} */
  #handle = null;
  #elapsedMs = 0;
  #offsetMs = 0;
  #anchor = 0;
  #disposed = false;
  #epoch = 0;
  #loop = false;

  /** @param {number} durationMs @param {PlaybackDriver} driver @param {{loop?: boolean}} [options] */
  constructor(durationMs, driver, options = {}) {
    if (!Number.isFinite(durationMs) || durationMs <= 0) throw new Error('Invalid demo duration');
    this.durationMs = durationMs;
    this.driver = driver;
    this.#loop = options.loop ?? false;
  }

  get snapshot() { return { elapsedMs: this.#elapsedMs, state: this.#state }; }

  /** Changing motion policy must not jump to the end of an earlier lap. @param {boolean} enabled */
  setLoop(enabled) {
    if (this.#disposed || this.#loop === enabled) return;
    const now = this.driver.now();
    if (this.#state === 'playing') this.#elapsedMs = this.#position(now);
    this.#offsetMs = this.#elapsedMs;
    this.#anchor = now;
    this.#loop = enabled;
  }

  play() {
    if (this.#disposed || this.#state === 'playing') return;
    if (this.#state === 'complete') this.#elapsedMs = 0;
    this.#offsetMs = this.#elapsedMs;
    this.#anchor = this.driver.now();
    this.#state = 'playing';
    this.#emit();
    this.#schedule();
  }

  pause() {
    if (this.#disposed || this.#state !== 'playing') return;
    this.#elapsedMs = this.#position(this.driver.now());
    this.#state = this.#elapsedMs >= this.durationMs ? 'complete' : 'paused';
    this.#cancel();
    this.#emit();
  }

  replay() {
    if (this.#disposed) return;
    this.#cancel();
    this.#elapsedMs = 0;
    this.#state = 'idle';
    this.play();
  }

  destroy() {
    this.#disposed = true;
    this.#cancel();
  }

  /** @param {number} time */
  #position(time) {
    const elapsed = this.#offsetMs + Math.max(0, time - this.#anchor);
    return this.#loop ? elapsed % this.durationMs : Math.min(this.durationMs, elapsed);
  }

  #schedule() {
    if (!this.#disposed && this.#state === 'playing' && this.#handle === null) {
      const epoch = this.#epoch;
      this.#handle = this.driver.requestFrame((time) => {
        if (epoch === this.#epoch) this.#tick(time);
      });
    }
  }

  /** @param {number} time */
  #tick = (time) => {
    this.#handle = null;
    if (this.#disposed || this.#state !== 'playing') return;
    this.#elapsedMs = this.#position(time);
    if (this.#elapsedMs >= this.durationMs) this.#state = 'complete';
    this.#emit();
    this.#schedule();
  };

  #cancel() {
    this.#epoch += 1;
    if (this.#handle !== null) this.driver.cancelFrame(this.#handle);
    this.#handle = null;
  }

  #emit() { this.driver.onChange(this.snapshot); }
}

/** @param {DemoConfig} config @param {number} elapsedMs @param {boolean} [reducedMotion] */
export function demoFrame(config, elapsedMs, reducedMotion = false) {
  const elapsed = Math.max(0, Math.min(config.durationMs, elapsedMs));
  const stage = config.stages.findLast((item) => elapsed >= item.startMs) ?? config.stages[0];
  if (!stage) throw new Error('Demo requires a stage');
  const recordingStart = config.stages.find((item) => item.id === 'recording')?.startMs ?? 0;
  const processingStart = config.stages.find((item) => item.id === 'processing')?.startMs ?? 0;
  const caption = reducedMotion && stage.id === 'recording'
    ? config.spoken
    : config.cues.filter((cue) => elapsed >= cue.atMs).map((cue) => cue.text).join('');
  // The capsule shows the source utterance duration, not a real recognition timer.
  const recordingDuration = Math.max(1, processingStart - recordingStart);
  const seconds = Math.floor(Math.max(0, Math.min(elapsed, processingStart) - recordingStart) / recordingDuration * config.sourceDurationMs / 1000);
  const { minHeight, maxHeight, weights } = config.waveform;
  const heights = weights.map((weight, index) => {
    const level = reducedMotion ? 0.58 : 0.3 + 0.7 * (Math.sin(elapsed / 170 + index * 1.7) + 1) / 2;
    return minHeight + (maxHeight - minHeight) * weight * level;
  });
  return { stage, caption, seconds, heights, result: stage.id === 'result' ? config.result : '' };
}

/** @param {number} seconds */
export function timeLabel(seconds) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds) % 60).padStart(2, '0')}`;
}

/** @param {DemoConfig} config @param {number} elapsedMs */
export function demoClock(config, elapsedMs) {
  const sourceMs = Math.max(0, Math.min(config.durationMs, elapsedMs)) / config.durationMs * config.sourceDurationMs;
  return `${timeLabel(sourceMs / 1000)} / ${timeLabel(config.sourceDurationMs / 1000)}`;
}

/** @param {{enabled: boolean, reducedMotion: boolean, hidden: boolean, pageActive: boolean, manuallyPaused: boolean}} state */
export function shouldAutoplay(state) {
  return state.enabled && !state.reducedMotion && !state.hidden && state.pageActive && !state.manuallyPaused;
}
