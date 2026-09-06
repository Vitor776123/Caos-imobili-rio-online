/* =====================================================================
   CAOS IMOBILIÁRIO — ÁUDIO (100% sintetizado com Web Audio API)
   ---------------------------------------------------------------------
   • Nada de arquivos: osciladores, ruído e envelopes, estilo chiptune.
   • AudioContext só nasce/retoma no primeiro toque/clique do usuário
     (política de autoplay). Chamadas antes disso são ignoradas em silêncio.
   • CaosAudio.sfx('nome')  toca um efeito
   • CaosAudio.music.start()/stop()/setStage(0..3)  trilha em loop
   • CaosAudio.setMuted('sfx'|'music', bool)  — preferência em localStorage
   ===================================================================== */
(function (global) {
'use strict';
const AC = global.AudioContext || global.webkitAudioContext;
const PREF_KEY = 'caos_audio_pref';
const pref = Object.assign({ sfx: true, music: true }, (() => { try { return JSON.parse(localStorage.getItem(PREF_KEY) || '{}'); } catch (e) { return {}; } })());

let ctx = null, master = null, sfxBus = null, musicBus = null, noiseBuf = null, unlocked = false;
const listeners = [];

function ensure() {
  if (!AC) return null;
  if (!ctx) {
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.connect(master);
    musicBus = ctx.createGain(); musicBus.connect(master);
    applyPref();
    // buffer de ruído branco (percussão)
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}
function applyPref() { if (sfxBus) sfxBus.gain.value = pref.sfx ? 1 : 0; if (musicBus) musicBus.gain.value = pref.music ? 1 : 0; }
function savePref() { localStorage.setItem(PREF_KEY, JSON.stringify(pref)); applyPref(); listeners.forEach((f) => f({ ...pref })); }

/* desbloqueio: primeiro gesto do usuário em qualquer lugar */
function unlock() { if (unlocked) return; const c = ensure(); if (!c) return; unlocked = c.state === 'running'; if (unlocked && music.wanted && !music.playing) music.start(); }
['pointerdown', 'keydown', 'touchstart'].forEach((ev) => document.addEventListener(ev, () => { const c = ensure(); if (c && c.state !== 'running') c.resume().then(unlock).catch(() => {}); else unlock(); }, { passive: true }));

/* ---------- primitivas ---------- */
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12); // MIDI -> Hz
function tone({ freq, type = 'square', t = 0, dur = 0.15, vol = 0.25, attack = 0.005, release = 0.06, slide = null, bus = sfxBus, detune = 0 }) {
  const c = ctx; const o = c.createOscillator(); const g = c.createGain(); const t0 = c.currentTime + t;
  o.type = type; o.frequency.setValueAtTime(freq, t0); if (detune) o.detune.value = detune;
  if (slide != null) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + attack); g.gain.setValueAtTime(vol, t0 + Math.max(attack, dur - release)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.01);
  o.connect(g); g.connect(bus); o.start(t0); o.stop(t0 + dur + 0.05);
}
function noise({ t = 0, dur = 0.08, vol = 0.2, filter = 2500, q = 1, type = 'bandpass', bus = sfxBus }) {
  const c = ctx; const s = c.createBufferSource(); s.buffer = noiseBuf; const f = c.createBiquadFilter(); f.type = type; f.frequency.value = filter; f.Q.value = q;
  const g = c.createGain(); const t0 = c.currentTime + t; g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(f); f.connect(g); g.connect(bus); s.start(t0); s.stop(t0 + dur + 0.02);
}
function arp(notes, { step = 0.07, dur = 0.12, type = 'square', vol = 0.2, t = 0 } = {}) { notes.forEach((n, i) => tone({ freq: NOTE(n), type, t: t + i * step, dur, vol })); }

/* ---------- banco de efeitos ---------- */
const SFX = {
  click() { tone({ freq: 880, type: 'square', dur: 0.05, vol: 0.12 }); tone({ freq: 1320, type: 'square', t: 0.03, dur: 0.04, vol: 0.08 }); },
  dice() { for (let i = 0; i < 7; i++) { noise({ t: i * 0.07 + Math.random() * 0.02, dur: 0.05, vol: 0.25, filter: 1800 + Math.random() * 1500, q: 2 }); tone({ freq: 500 + Math.random() * 400, type: 'triangle', t: i * 0.07, dur: 0.03, vol: 0.08 }); } tone({ freq: 660, type: 'square', t: 0.55, dur: 0.12, vol: 0.18 }); },
  step() { tone({ freq: 740, type: 'triangle', dur: 0.045, vol: 0.09, slide: 980 }); },
  land() { tone({ freq: 520, type: 'square', dur: 0.08, vol: 0.14, slide: 390 }); noise({ dur: 0.05, vol: 0.12, filter: 900 }); },
  chaching() { noise({ dur: 0.06, vol: 0.2, filter: 6000, q: 3 }); arp([76, 83, 88], { step: 0.09, dur: 0.22, type: 'square', vol: 0.22 }); tone({ freq: NOTE(95), type: 'sine', t: 0.28, dur: 0.35, vol: 0.12 }); },
  pay() { tone({ freq: NOTE(64), type: 'sawtooth', dur: 0.32, vol: 0.16, slide: NOTE(55) }); },
  karmaBom() { arp([72, 76, 79, 84, 88, 91, 96], { step: 0.05, dur: 0.16, type: 'triangle', vol: 0.2 }); tone({ freq: NOTE(103), type: 'sine', t: 0.35, dur: 0.5, vol: 0.1, detune: 8 }); },
  karmaRuim() { [64, 62, 60, 56].forEach((n, i) => tone({ freq: NOTE(n), type: 'sawtooth', t: i * 0.22, dur: 0.22, vol: 0.2, slide: NOTE(n - 1) })); },
  powerup() { arp([60, 64, 67, 72, 76, 79, 84], { step: 0.045, dur: 0.1, type: 'square', vol: 0.18 }); arp([84, 88, 91, 96], { step: 0.06, dur: 0.2, type: 'square', vol: 0.16, t: 0.32 }); },
  whoosh() { noise({ dur: 0.45, vol: 0.35, filter: 400, q: 0.7, type: 'lowpass' }); tone({ freq: 220, type: 'sawtooth', dur: 0.4, vol: 0.14, slide: 1400 }); tone({ freq: 90, type: 'square', t: 0.42, dur: 0.18, vol: 0.25, slide: 40 }); noise({ t: 0.42, dur: 0.12, vol: 0.3, filter: 700 }); },
  suspense() { for (let i = 0; i < 8; i++) tone({ freq: NOTE(45 + (i % 2)), type: 'triangle', t: i * 0.19, dur: 0.16, vol: 0.18 }); for (let i = 0; i < 16; i++) noise({ t: i * 0.095, dur: 0.03, vol: 0.06 + i * 0.008, filter: 3000 }); },
  fanfare() { arp([72, 72, 72, 76, 79], { step: 0.11, dur: 0.15, type: 'square', vol: 0.2 }); tone({ freq: NOTE(84), type: 'square', t: 0.6, dur: 0.5, vol: 0.22 }); tone({ freq: NOTE(76), type: 'triangle', t: 0.6, dur: 0.5, vol: 0.14 }); },
  gameover() { [67, 66, 65, 64].forEach((n, i) => tone({ freq: NOTE(n), type: 'square', t: i * 0.2, dur: 0.18, vol: 0.18 })); tone({ freq: NOTE(60), type: 'sawtooth', t: 0.85, dur: 0.5, vol: 0.18, slide: NOTE(53) }); tone({ freq: 1200, type: 'sine', t: 1.3, dur: 0.08, vol: 0.12, slide: 2400 }); },
  dundundun() { [[48, 0], [47, 0.35], [46, 0.7]].forEach(([n, t]) => { tone({ freq: NOTE(n), type: 'sawtooth', t, dur: 0.3, vol: 0.28 }); tone({ freq: NOTE(n - 12), type: 'square', t, dur: 0.3, vol: 0.2 }); noise({ t, dur: 0.1, vol: 0.2, filter: 300, type: 'lowpass' }); }); tone({ freq: NOTE(46), type: 'sawtooth', t: 1.05, dur: 0.8, vol: 0.3 }); },
  coins() { [93, 98, 96, 101, 105].forEach((n, i) => { tone({ freq: NOTE(n), type: 'sine', t: i * 0.06, dur: 0.14, vol: 0.16 }); tone({ freq: NOTE(n + 12), type: 'triangle', t: i * 0.06, dur: 0.08, vol: 0.06 }); }); },
  finale() { const mel = [72, 76, 79, 84, 79, 84, 88, 96]; mel.forEach((n, i) => { tone({ freq: NOTE(n), type: 'square', t: i * 0.14, dur: 0.16, vol: 0.2 }); tone({ freq: NOTE(n - 12), type: 'triangle', t: i * 0.14, dur: 0.16, vol: 0.1 }); }); tone({ freq: NOTE(96), type: 'square', t: 1.15, dur: 0.9, vol: 0.22 }); tone({ freq: NOTE(91), type: 'square', t: 1.15, dur: 0.9, vol: 0.14 }); tone({ freq: NOTE(84), type: 'triangle', t: 1.15, dur: 0.9, vol: 0.14 }); noise({ t: 1.15, dur: 0.4, vol: 0.2, filter: 5000 }); },
  evento() { tone({ freq: NOTE(67), type: 'square', dur: 0.1, vol: 0.16 }); tone({ freq: NOTE(74), type: 'square', t: 0.11, dur: 0.18, vol: 0.16 }); },
  eventoForte() { [55, 54, 53].forEach((n, i) => tone({ freq: NOTE(n), type: 'sawtooth', t: i * 0.16, dur: 0.16, vol: 0.2 })); noise({ dur: 0.3, vol: 0.2, filter: 250, type: 'lowpass' }); },
};
function sfx(name) { if (!pref.sfx || !ensure() || ctx.state !== 'running' || !SFX[name]) return; try { SFX[name](); } catch (e) { /* silêncio */ } }

/* ---------- música de fundo (sequenciador chiptune em loop) ---------- */
// 4 estágios de declínio: maior/alegre → menor/tenso; BPM sobe um pouco no fim
const SONGS = [
  { bpm: 112, bass: [48, 48, 55, 55, 53, 53, 55, 55], mel: [72, 0, 76, 79, 0, 76, 74, 0, 72, 0, 74, 76, 0, 74, 72, 0], type: 'square', vol: 0.06 },
  { bpm: 116, bass: [48, 48, 55, 55, 53, 53, 50, 50], mel: [72, 0, 75, 79, 0, 75, 74, 0, 72, 0, 74, 75, 0, 74, 72, 0], type: 'square', vol: 0.06 },
  { bpm: 122, bass: [45, 45, 52, 52, 50, 50, 47, 47], mel: [69, 0, 72, 76, 0, 72, 71, 0, 69, 0, 71, 72, 0, 68, 69, 0], type: 'sawtooth', vol: 0.05 },
  { bpm: 130, bass: [45, 45, 44, 44, 45, 45, 41, 41], mel: [69, 0, 72, 75, 0, 72, 68, 0, 69, 0, 68, 72, 0, 66, 69, 0], type: 'sawtooth', vol: 0.05 },
];
const music = {
  playing: false, wanted: false, stage: 0, timer: null, nextTime: 0, stepIdx: 0,
  start() { this.wanted = true; if (this.playing || !ensure() || ctx.state !== 'running') return; this.playing = true; this.nextTime = ctx.currentTime + 0.05; this.stepIdx = 0; this.tick(); },
  stop() { this.wanted = false; this.playing = false; clearTimeout(this.timer); },
  setStage(s) { this.stage = Math.max(0, Math.min(3, s | 0)); },
  tick() {
    if (!this.playing) return;
    const song = SONGS[this.stage]; const step = 60 / song.bpm / 2; // colcheias
    while (this.nextTime < ctx.currentTime + 0.35) {
      const i = this.stepIdx; const t = this.nextTime - ctx.currentTime;
      const m = song.mel[i % song.mel.length]; if (m) tone({ freq: NOTE(m), type: song.type, t, dur: step * 0.8, vol: song.vol, bus: musicBus });
      if (i % 2 === 0) tone({ freq: NOTE(song.bass[(i / 2) % song.bass.length]), type: 'triangle', t, dur: step * 1.6, vol: song.vol * 1.4, bus: musicBus });
      if (i % 4 === 0) noise({ t, dur: 0.05, vol: song.vol * 0.9, filter: 200, type: 'lowpass', bus: musicBus }); // bumbo
      if (i % 4 === 2) noise({ t, dur: 0.03, vol: song.vol * 0.5, filter: 6000, bus: musicBus }); // chimbal
      this.nextTime += step; this.stepIdx++;
    }
    this.timer = setTimeout(() => this.tick(), 120);
  },
};

document.addEventListener('click', (e) => { if (e.target.closest('.btn, .icon-btn, .mode-card, .tab, .type-toggle, .avatar-btn, .picker-grid button, .picker-arrow')) sfx('click'); }, true);

global.CaosAudio = {
  sfx, music, ensure,
  get pref() { return { ...pref }; },
  setMuted(kind, muted) { pref[kind] = !muted; savePref(); if (kind === 'music' && !muted && music.wanted && !music.playing) music.start(); },
  toggle(kind) { this.setMuted(kind, pref[kind]); return !pref[kind]; },
  onChange(fn) { listeners.push(fn); },
  isReady: () => !!ctx && ctx.state === 'running',
  get masterNode() { return master; }, // diagnóstico/testes
};
})(window);
