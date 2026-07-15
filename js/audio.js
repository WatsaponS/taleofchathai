// TaleofChaThai — procedural audio via Web Audio: SFX synth + a generative BGM sequencer.
// No audio asset files exist for this project, so both SFX and music are self-contained code.
'use strict';

let sfxCtx = null;
let sfxMuted = false;

function isSfxMuted() { return sfxMuted; }
function toggleSfxMute() {
  sfxMuted = !sfxMuted;
  if (bgmGainNode) bgmGainNode.gain.value = sfxMuted ? 0 : BGM_VOLUME;
}

function ensureCtx() {
  if (!sfxCtx) {
    try { sfxCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
  }
  if (sfxCtx.state === 'suspended') sfxCtx.resume();
  return sfxCtx;
}

function tone(ctx, { freq = 440, dur = 0.15, type = 'sine', vol = 0.2, slide = 0, delay = 0 }) {
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.linearRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise(ctx, { dur = 0.12, vol = 0.15, delay = 0, low = false }) {
  const t0 = ctx.currentTime + delay;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const gain = ctx.createGain();
  gain.gain.value = vol;
  if (low) {
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass'; filt.frequency.value = 500;
    src.connect(filt).connect(gain).connect(ctx.destination);
  } else {
    src.connect(gain).connect(ctx.destination);
  }
  src.start(t0);
}

function playSfx(name) {
  if (sfxMuted) return;
  const ctx = ensureCtx();
  if (!ctx) return;
  switch (name) {
    case 'hit':      noise(ctx, { dur: 0.1, vol: 0.2 }); tone(ctx, { freq: 180, dur: 0.1, type: 'square', vol: 0.12, slide: -80 }); break;
    case 'superhit': noise(ctx, { dur: 0.16, vol: 0.28 }); tone(ctx, { freq: 240, dur: 0.18, type: 'sawtooth', vol: 0.15, slide: -140 }); break;
    case 'heal':     tone(ctx, { freq: 520, dur: 0.12, vol: 0.12 }); tone(ctx, { freq: 660, dur: 0.14, vol: 0.12, delay: 0.1 }); tone(ctx, { freq: 780, dur: 0.2, vol: 0.12, delay: 0.2 }); break;
    case 'status':   tone(ctx, { freq: 300, dur: 0.25, type: 'triangle', vol: 0.14, slide: -120 }); break;
    case 'catch':    tone(ctx, { freq: 440, dur: 0.1, vol: 0.14 }); tone(ctx, { freq: 550, dur: 0.1, vol: 0.14, delay: 0.12 }); tone(ctx, { freq: 700, dur: 0.25, vol: 0.16, delay: 0.24 }); break;
    case 'faint':    tone(ctx, { freq: 300, dur: 0.4, type: 'sawtooth', vol: 0.14, slide: -220 }); break;
    case 'win':      [523, 659, 784, 1046].forEach((f, i) => tone(ctx, { freq: f, dur: 0.18, vol: 0.14, delay: i * 0.13 })); break;
    case 'exclaim':  tone(ctx, { freq: 880, dur: 0.09, type: 'square', vol: 0.16 }); tone(ctx, { freq: 880, dur: 0.12, type: 'square', vol: 0.16, delay: 0.1 }); break;
    case 'warp':     tone(ctx, { freq: 200, dur: 0.3, type: 'sine', vol: 0.12, slide: 300 }); break;
    case 'bump':     noise(ctx, { dur: 0.05, vol: 0.08, low: true }); break;
    case 'evolve':   [392, 494, 587, 784, 988].forEach((f, i) => tone(ctx, { freq: f, dur: 0.2, vol: 0.13, delay: i * 0.11 })); break;
    default:         tone(ctx, { freq: 400, dur: 0.08, vol: 0.1 });
  }
}

// ---- Background music: a small generative sequencer, not audio files — two distinct loops
// (upbeat overworld vs. driving battle) so field-walking and battle read as clearly different. ----
let bgmCtx = null;
let bgmGainNode = null;
let bgmTimer = null;
let bgmCurrentKey = null;
const BGM_VOLUME = 0.16;

const BGM_NOTE_FREQ = {
  E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94, C4: 261.63, D4: 293.66,
  E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88, C5: 523.25, D5: 587.33,
  E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00, B5: 987.77, C6: 1046.50,
};

// Field: bright major-key melody over a walking bassline — an upbeat "adventure" loop.
// Battle: faster, minor-key, syncopated stabs over a driving eighth-note bass + kick pulse.
const BGM_TRACKS = {
  field: {
    bpm: 132, beatsPerLoop: 8,
    lead: [
      { n: 'E5', b: 0, d: .5 }, { n: 'G5', b: .5, d: .5 }, { n: 'A5', b: 1, d: .5 }, { n: 'G5', b: 1.5, d: .5 },
      { n: 'E5', b: 2, d: .5 }, { n: 'D5', b: 2.5, d: .5 }, { n: 'E5', b: 3, d: 1 },
      { n: 'G5', b: 4, d: .5 }, { n: 'A5', b: 4.5, d: .5 }, { n: 'C6', b: 5, d: .5 }, { n: 'A5', b: 5.5, d: .5 },
      { n: 'G5', b: 6, d: .5 }, { n: 'F5', b: 6.5, d: .5 }, { n: 'G5', b: 7, d: 1 },
    ],
    bass: [
      { n: 'C4', b: 0, d: 1 }, { n: 'G3', b: 1, d: 1 }, { n: 'A3', b: 2, d: 1 }, { n: 'G3', b: 3, d: 1 },
      { n: 'F3', b: 4, d: 1 }, { n: 'C4', b: 5, d: 1 }, { n: 'G3', b: 6, d: 1 }, { n: 'C4', b: 7, d: 1 },
    ],
    leadType: 'square', bassType: 'triangle', leadVol: 0.10, bassVol: 0.13,
  },
  battle: {
    bpm: 168, beatsPerLoop: 8,
    lead: [
      { n: 'A4', b: 0, d: .5 }, { n: 'C5', b: .5, d: .5 }, { n: 'A4', b: 1.5, d: .5 }, { n: 'E5', b: 2, d: .5 },
      { n: 'D5', b: 2.5, d: .5 }, { n: 'C5', b: 3.5, d: .5 },
      { n: 'A4', b: 4, d: .5 }, { n: 'C5', b: 4.5, d: .5 }, { n: 'A4', b: 5.5, d: .5 }, { n: 'G4', b: 6, d: .5 },
      { n: 'F4', b: 6.5, d: .5 }, { n: 'E4', b: 7.5, d: .5 },
    ],
    bass: [
      { n: 'A3', b: 0, d: .5 }, { n: 'A3', b: .5, d: .5 }, { n: 'A3', b: 1, d: .5 }, { n: 'A3', b: 1.5, d: .5 },
      { n: 'G3', b: 2, d: .5 }, { n: 'G3', b: 2.5, d: .5 }, { n: 'A3', b: 3, d: .5 }, { n: 'A3', b: 3.5, d: .5 },
      { n: 'F3', b: 4, d: .5 }, { n: 'F3', b: 4.5, d: .5 }, { n: 'F3', b: 5, d: .5 }, { n: 'F3', b: 5.5, d: .5 },
      { n: 'E3', b: 6, d: .5 }, { n: 'E3', b: 6.5, d: .5 }, { n: 'E3', b: 7, d: .5 }, { n: 'E3', b: 7.5, d: .5 },
    ],
    leadType: 'sawtooth', bassType: 'square', leadVol: 0.11, bassVol: 0.15, percussion: true,
  },
};

function ensureBgmCtx() {
  if (!bgmCtx) {
    try { bgmCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    bgmGainNode = bgmCtx.createGain();
    bgmGainNode.gain.value = sfxMuted ? 0 : BGM_VOLUME;
    bgmGainNode.connect(bgmCtx.destination);
  }
  if (bgmCtx.state === 'suspended') bgmCtx.resume();
  return bgmCtx;
}

function bgmNote(ctx, freq, startTime, dur, type, vol) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(vol, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);
  osc.connect(gain).connect(bgmGainNode);
  osc.start(startTime);
  osc.stop(startTime + dur + 0.03);
}

function bgmKick(ctx, startTime) {
  const len = Math.floor(ctx.sampleRate * 0.05);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filt = ctx.createBiquadFilter();
  filt.type = 'lowpass'; filt.frequency.value = 900;
  const gain = ctx.createGain();
  gain.gain.value = 0.09;
  src.connect(filt).connect(gain).connect(bgmGainNode);
  src.start(startTime);
}

// Schedules one full loop's worth of notes up front (using absolute AudioContext time), then
// re-arms itself via setTimeout right as the loop ends — simpler than a lookahead scheduler and
// plenty accurate for background music.
function scheduleBgmLoop(key) {
  const ctx = ensureBgmCtx();
  if (!ctx) return;
  const track = BGM_TRACKS[key];
  const secPerBeat = 60 / track.bpm;
  const loopDur = track.beatsPerLoop * secPerBeat;
  const t0 = ctx.currentTime + 0.05;
  track.lead.forEach(ev => bgmNote(ctx, BGM_NOTE_FREQ[ev.n], t0 + ev.b * secPerBeat, ev.d * secPerBeat * 0.92, track.leadType, track.leadVol));
  track.bass.forEach(ev => bgmNote(ctx, BGM_NOTE_FREQ[ev.n], t0 + ev.b * secPerBeat, ev.d * secPerBeat * 0.92, track.bassType, track.bassVol));
  if (track.percussion) {
    for (let beat = 0; beat < track.beatsPerLoop; beat++) bgmKick(ctx, t0 + beat * secPerBeat);
  }
  bgmTimer = setTimeout(() => { if (bgmCurrentKey === key) scheduleBgmLoop(key); }, loopDur * 1000);
}

function playBgm(key) {
  if (!BGM_TRACKS[key] || bgmCurrentKey === key) return;
  clearTimeout(bgmTimer);
  bgmCurrentKey = key;
  scheduleBgmLoop(key);
}

function stopBgm() {
  clearTimeout(bgmTimer);
  bgmCurrentKey = null;
}
