export type BSideChannel = 'kick' | 'clap' | 'hat' | 'acid';

type Pattern = Record<BSideChannel, boolean[]>;
type Callbacks = {
  onStep: (step: number) => void;
  onPlaying: (playing: boolean) => void;
  onError?: (message: string) => void;
};
type Voice = { sources: AudioScheduledSourceNode[]; nodes: AudioNode[]; end: number };

const channels: BSideChannel[] = ['kick', 'clap', 'hat', 'acid'];
const sequence = (steps: number[]) => Array.from({ length: 16 }, (_, i) => steps.includes(i));
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));

/** A small original instrument: it never fetches music or starts audio on page load. */
export function createBSideAudio(callbacks: Callbacks) {
  let context: AudioContext | undefined;
  let master: GainNode | undefined;
  let limiter: DynamicsCompressorNode | undefined;
  let acidTone: BiquadFilterNode | undefined;
  let noise: AudioBuffer | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  let pendingStart: Promise<void> | undefined;
  let playing = false;
  let destroyed = false;
  let epoch = 0;
  let step = 0;
  let nextTime = 0;
  let tempo = 132;
  let volume = .65;
  let filter = .62;
  let lastManualHit = -Infinity;
  const visualTimers = new Set<ReturnType<typeof setTimeout>>();
  const voices = new Set<Voice>();
  const enabled: Record<BSideChannel, boolean> = { kick: true, clap: true, hat: true, acid: true };
  const pattern: Pattern = {
    kick: sequence([0, 6, 8, 11]),
    clap: sequence([4, 12]),
    hat: sequence([0, 2, 3, 6, 8, 10, 11, 14]),
    acid: sequence([0, 3, 6, 8, 10, 14]),
  };
  const notes = [36, 36, 43, 48, 36, 39, 43, 34, 36, 48, 46, 43, 39, 36, 34, 43];

  function releaseVoice(voice: Voice) {
    voices.delete(voice);
    voice.nodes.forEach(node => { try { node.disconnect(); } catch { /* Already disconnected. */ } });
  }

  function trackVoice(sources: AudioScheduledSourceNode[], nodes: AudioNode[], end: number) {
    const voice = { sources, nodes, end };
    voices.add(voice);
    let remaining = sources.length;
    sources.forEach(source => source.addEventListener('ended', () => {
      remaining--;
      if (remaining === 0) releaseVoice(voice);
    }, { once: true }));
    return voice;
  }

  async function ready() {
    if (destroyed) throw new Error('La stanza è stata chiusa. Riaprila per suonare.');
    if (!context) {
      const Audio = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Audio) throw new Error('Questo browser non supporta il suono della stanza. Prova con Safari, Chrome o Firefox aggiornato.');
      context = new Audio({ latencyHint: 'interactive' });
      master = context.createGain();
      master.gain.value = volume;
      limiter = context.createDynamicsCompressor();
      limiter.threshold.value = -13;
      limiter.knee.value = 15;
      limiter.ratio.value = 5;
      limiter.attack.value = .003;
      limiter.release.value = .16;
      master.connect(limiter).connect(context.destination);
      acidTone = context.createBiquadFilter();
      acidTone.type = 'lowpass';
      acidTone.frequency.value = 240 + filter * filter * 11500;
      acidTone.Q.value = .75;
      acidTone.connect(master);
      noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
      const samples = noise.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    }
    // Safari may report an interrupted context after a call or audio-route change.
    if (context.state !== 'running' && context.state !== 'closed') await context.resume();
    if (context.state !== 'running') throw new Error('Tocca di nuovo il tasto play per attivare il suono.');
    return context;
  }

  function synth(channel: BSideChannel, at: number, index: number, velocity = 1) {
    const ctx = context;
    if (!ctx || !master || !noise || !acidTone || destroyed) return;
    // Keep manual tapping and a heavily edited pattern bounded on small devices.
    for (const voice of voices) if (voice.end < ctx.currentTime - .1) releaseVoice(voice);
    if (voices.size > 52) return;
    const amp = ctx.createGain();
    const silent = .0001;
    let end = at + .3;
    if (channel === 'kick') {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, at);
      osc.frequency.exponentialRampToValueAtTime(49, at + .055);
      osc.frequency.exponentialRampToValueAtTime(39, at + .24);
      amp.gain.setValueAtTime(silent, at);
      amp.gain.exponentialRampToValueAtTime(.8 * velocity, at + .004);
      amp.gain.exponentialRampToValueAtTime(silent, at + .32);
      osc.connect(amp).connect(master);
      end = at + .34;
      trackVoice([osc], [osc, amp], end);
      osc.start(at); osc.stop(end);
    } else if (channel === 'clap') {
      const source = ctx.createBufferSource();
      source.buffer = noise;
      const band = ctx.createBiquadFilter();
      band.type = 'bandpass'; band.frequency.value = 1450; band.Q.value = .65;
      const high = ctx.createBiquadFilter();
      high.type = 'highpass'; high.frequency.value = 600;
      amp.gain.setValueAtTime(silent, at);
      for (const offset of [0, .012, .026]) {
        amp.gain.setValueAtTime(.42 * velocity, at + offset + .001);
        amp.gain.exponentialRampToValueAtTime(.025 * velocity, at + offset + .01);
      }
      amp.gain.setValueAtTime(.28 * velocity, at + .04);
      amp.gain.exponentialRampToValueAtTime(silent, at + .19);
      source.connect(band).connect(high).connect(amp).connect(master);
      end = at + .22;
      trackVoice([source], [source, band, high, amp], end);
      source.start(at, .17); source.stop(end);
    } else if (channel === 'hat') {
      const source = ctx.createBufferSource();
      source.buffer = noise;
      const high = ctx.createBiquadFilter();
      high.type = 'highpass'; high.frequency.value = 7300;
      const duration = index % 4 === 2 ? .09 : .045;
      amp.gain.setValueAtTime(.17 * velocity, at);
      amp.gain.exponentialRampToValueAtTime(silent, at + duration);
      source.connect(high).connect(amp).connect(master);
      end = at + duration + .02;
      trackVoice([source], [source, high, amp], end);
      source.start(at, .42); source.stop(end);
    } else {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      const frequency = 440 * Math.pow(2, (notes[index % 16] - 69) / 12);
      osc.frequency.setValueAtTime(frequency, at);
      const resonant = ctx.createBiquadFilter();
      resonant.type = 'lowpass'; resonant.Q.value = 7.5;
      resonant.frequency.setValueAtTime(200 + filter * 3700, at);
      resonant.frequency.exponentialRampToValueAtTime(110 + filter * 600, at + .15);
      amp.gain.setValueAtTime(silent, at);
      amp.gain.exponentialRampToValueAtTime(.12 * velocity, at + .008);
      amp.gain.exponentialRampToValueAtTime(silent, at + .19);
      osc.connect(resonant).connect(amp).connect(acidTone);
      end = at + .21;
      trackVoice([osc], [osc, resonant, amp], end);
      osc.start(at); osc.stop(end);
    }
  }

  function schedule() {
    if (!context || !playing) return;
    // Recover from background suspension without bursting through stale steps.
    if (nextTime < context.currentTime - .15) nextTime = context.currentTime + .025;
    while (nextTime < context.currentTime + .11) {
      const currentStep = step;
      const at = nextTime;
      channels.forEach(channel => {
        if (enabled[channel] && pattern[channel][currentStep]) {
          const velocity = channel === 'hat' ? (currentStep % 4 === 0 ? .75 : 1) : 1;
          synth(channel, at, currentStep, velocity);
        }
      });
      const currentEpoch = epoch;
      const visual = setTimeout(() => {
        visualTimers.delete(visual);
        if (playing && epoch === currentEpoch && !destroyed) callbacks.onStep(currentStep);
      }, Math.max(0, (at - context.currentTime) * 1000));
      visualTimers.add(visual);
      // Small alternating swing makes the pattern feel played rather than rigid.
      nextTime += (60 / tempo / 4) * (currentStep % 2 === 0 ? 1.07 : .93);
      step = (step + 1) % 16;
    }
  }

  function stop() {
    epoch++;
    pendingStart = undefined;
    clearInterval(timer); timer = undefined;
    visualTimers.forEach(clearTimeout); visualTimers.clear();
    const wasPlaying = playing;
    playing = false;
    step = 0;
    if (context && master) {
      // A short ramp avoids clicks, including when a note is already ringing.
      const now = context.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0, now + .012);
      for (const voice of voices) {
        voice.sources.forEach(source => { try { source.stop(now + .015); } catch { /* Source has ended. */ } });
      }
    }
    callbacks.onStep(-1);
    if (wasPlaying) callbacks.onPlaying(false);
  }

  async function start() {
    if (playing || destroyed) return;
    if (pendingStart) return pendingStart;
    const ticket = epoch;
    const task = (async () => {
      try {
        const ctx = await ready();
        if (destroyed || ticket !== epoch || playing) return;
        master!.gain.cancelScheduledValues(ctx.currentTime);
        master!.gain.setValueAtTime(0, ctx.currentTime);
        master!.gain.linearRampToValueAtTime(volume, ctx.currentTime + .018);
        playing = true;
        step = 0;
        nextTime = ctx.currentTime + .035;
        callbacks.onPlaying(true);
        schedule();
        timer = setInterval(schedule, 25);
      } catch (error) {
        if (destroyed || ticket !== epoch) return;
        const message = error instanceof Error ? error.message : 'Il suono non è partito. Tocca di nuovo play.';
        callbacks.onError?.(message);
        throw error;
      }
    })();
    pendingStart = task;
    try { await task; } finally { if (pendingStart === task) pendingStart = undefined; }
  }

  async function hit(channel: BSideChannel) {
    if (!channels.includes(channel) || destroyed) return;
    const ticket = epoch;
    try {
      const ctx = await ready();
      if (destroyed || ticket !== epoch || ctx.currentTime - lastManualHit < .018) return;
      lastManualHit = ctx.currentTime;
      master!.gain.cancelScheduledValues(ctx.currentTime);
      master!.gain.setTargetAtTime(volume, ctx.currentTime, .008);
      synth(channel, ctx.currentTime + .005, step, .9);
    } catch (error) {
      if (destroyed || ticket !== epoch) return;
      callbacks.onError?.(error instanceof Error ? error.message : 'Tocca di nuovo il pad per attivare il suono.');
      throw error;
    }
  }

  return {
    start, stop, hit,
    toggleStep(channel: BSideChannel, index: number) {
      if (!channels.includes(channel) || !Number.isInteger(index) || index < 0 || index > 15) return false;
      pattern[channel][index] = !pattern[channel][index];
      return pattern[channel][index];
    },
    getPattern(): Pattern {
      return Object.fromEntries(channels.map(channel => [channel, [...pattern[channel]]])) as Pattern;
    },
    setTempo(value: number) { tempo = clamp(value, 90, 160); },
    setFilter(value: number) {
      filter = clamp(value, 0, 1);
      if (context && acidTone) acidTone.frequency.setTargetAtTime(240 + filter * filter * 11500, context.currentTime, .03);
    },
    setChannel(channel: BSideChannel, active: boolean) { if (channels.includes(channel)) enabled[channel] = active; },
    setVolume(value: number) {
      volume = clamp(value, 0, 1);
      if (context && master && (playing || voices.size > 0)) master.gain.setTargetAtTime(volume, context.currentTime, .025);
    },
    randomize() {
      pattern.kick = sequence([0, 8, Math.random() < .5 ? 6 : 7, Math.random() < .5 ? 10 : 11]);
      pattern.clap = sequence(Math.random() < .5 ? [4, 12] : [4, 12, 15]);
      pattern.hat = Array.from({ length: 16 }, (_, i) => i % 2 === 0 || Math.random() > .72);
      pattern.acid = Array.from({ length: 16 }, (_, i) => i === 0 || (i % 2 === 0 ? Math.random() > .4 : Math.random() > .78));
    },
    destroy() {
      if (destroyed) return;
      stop();
      destroyed = true;
      // Close the hardware context after cancelling pending resume/start work.
      if (context && context.state !== 'closed') void context.close().catch(() => {});
      voices.forEach(releaseVoice);
      master?.disconnect(); acidTone?.disconnect(); limiter?.disconnect();
      noise = undefined;
    },
  };
}
