// Chiptune music + sound effects, synthesized live with WebAudio.

const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const midi = (name) => {
  const m = /^([A-G][#b]?)(\d)$/.exec(name);
  return NOTE[m[1]] + (Number(m[2]) + 1) * 12;
};
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Songs: melody tokens are NOTE:length (length in 16th notes), r = rest.
// Chords drive the bass line and the soft arpeggio.
const SONGS = {
  title: {
    bpm: 100,
    lead: 'C5:4 G5:4 E5:2 G5:2 C6:4 B5:4 D6:2 B5:2 G5:8 A5:4 C6:4 E6:4 D6:2 C6:2 A5:12 r:4 ' +
          'C6:4 B5:2 A5:2 G5:4 E5:4 D5:4 G5:4 B5:4 D6:4 C6:4 A5:4 F5:4 A5:4 G5:8 B5:4 D6:4',
    chords: 'C:16 G:16 Am:16 F:16 C:16 G:16 F:16 G:16',
    drums: 'k...h...s...h...',
  },
  town: {
    bpm: 112,
    lead: 'E5:2 G5:2 C6:4 B5:2 A5:2 G5:4 A5:2 C6:2 E5:4 D5:2 E5:2 C5:4 ' +
          'F5:2 A5:2 C6:3 A5:1 G5:2 F5:2 E5:4 D5:2 E5:2 F5:2 G5:2 B5:4 r:4 ' +
          'E5:2 G5:2 C6:4 D6:2 C6:2 B5:2 G5:2 A5:3 G5:1 E5:4 C5:2 D5:2 E5:4 ' +
          'F5:2 A5:2 G5:2 F5:2 E5:2 D5:2 B4:2 D5:2 C5:8 r:8',
    chords: 'C:16 Am:16 F:16 G:16 C:16 Am:16 F:8 G:8 C:16',
    drums: 'k...h.h.s...h...',
  },
  route: {
    bpm: 132,
    lead: 'G5:2 B5:2 D6:2 B5:2 A5:2 G5:2 D5:4 E5:2 G5:2 B5:4 A5:2 G5:2 E5:4 ' +
          'C6:2 B5:2 A5:2 G5:2 E5:2 G5:2 A5:4 F#5:2 A5:2 D6:6 r:2 D6:2 C6:2 ' +
          'B5:2 D6:2 G6:4 F#6:2 E6:2 D6:4 E6:2 D6:2 B5:4 G5:2 A5:2 B5:4 ' +
          'C6:2 B5:2 A5:2 G5:2 F#5:2 G5:2 A5:4 G5:8 r:4 D5:2 F#5:2',
    chords: 'G:16 Em:16 C:16 D:16 G:16 Em:16 C:8 D:8 G:16',
    drums: 'k.h.s.h.k.h.s.hh',
  },
  battle: {
    bpm: 152,
    lead: 'A5:2 C6:2 E6:2 A5:2 C6:2 E6:2 D6:2 C6:2 B5:2 C6:2 B5:2 A5:2 E5:4 r:4 ' +
          'F5:2 A5:2 C6:2 F6:2 E6:2 C6:2 A5:2 C6:2 B5:4 D6:4 G6:4 F6:2 D6:2 ' +
          'A5:2 C6:2 E6:2 A6:2 G6:2 E6:2 C6:2 E6:2 D6:2 C6:2 B5:2 A5:2 G5:4 A5:4 ' +
          'F5:4 A5:4 C6:4 D6:4 E6:8 G#5:4 B5:4',
    chords: 'Am:16 Am:16 F:16 G:16 Am:16 Am:16 F:16 E:16',
    drums: 'k.h.s.hkk.h.s.hh',
  },
  rival: {
    bpm: 160,
    lead: 'E5:2 G5:2 B5:2 E6:2 D6:2 B5:2 G5:2 B5:2 C6:2 E6:2 G6:4 F#6:2 E6:2 D6:4 ' +
          'D6:2 F#5:2 A5:2 D6:2 C6:2 A5:2 F#5:2 A5:2 B5:4 D#6:4 F#6:6 r:2 ' +
          'E6:2 D6:2 B5:2 G5:2 E5:2 G5:2 B5:2 E6:2 G6:4 E6:4 C6:4 E6:4 ' +
          'A5:2 C6:2 E6:2 A6:2 G6:2 E6:2 C6:2 A5:2 B5:8 D#6:4 F#6:4',
    chords: 'Em:16 C:16 D:16 B:16 Em:16 C:16 Am:16 B:16',
    drums: 'k.hsk.hsk.hsk.ss',
  },
  victory: {
    bpm: 120,
    lead: 'G5:2 C6:2 E6:2 G6:6 E6:2 G6:2 A6:4 G6:2 F6:2 E6:4 C6:4 ' +
          'D6:2 E6:2 F6:2 D6:2 B5:4 G5:4 C6:12 r:4',
    chords: 'C:16 F:16 G:16 C:16',
    drums: 'k...h...k.k.h...',
  },
  center: {
    bpm: 96,
    lead: 'A5:4 C6:4 F6:4 E6:2 C6:2 G5:4 C6:2 E6:2 G6:6 r:2 ' +
          'F6:2 E6:2 D6:4 A5:4 D6:4 D6:4 C6:2 Bb5:2 F5:8 ' +
          'A5:2 C6:2 F6:4 G6:2 A6:2 G6:4 E6:4 G6:4 C6:8 ' +
          'D6:2 F6:2 Bb6:4 A6:2 G6:2 F6:4 E6:4 G6:4 C6:8',
    chords: 'F:16 C:16 Dm:16 Bb:16 F:16 C:16 Bb:16 C:16',
    drums: 'k.......h.......',
  },
};

// Sound effect recipes per move type.
const TYPE_SFX = {
  fire: ['noise', 0.35, 400, 0.2, 4000],
  water: ['noise', 0.3, 700, 0.16, 2200],
  grass: ['noise', 0.22, 2400, 0.12],
  electric: ['zap'],
  ice: ['tone', 'p12', 96, 0.25, 0.08, 84],
  ground: ['noise', 0.35, 120, 0.3, 900],
  wind: ['noise', 0.4, 1500, 0.14, 5000],
  flying: ['noise', 0.25, 1800, 0.12, 5000],
  fighting: ['noise', 0.12, 200, 0.35],
  psychic: ['tone', 'p50', 72, 0.35, 0.07, 90],
  ghost: ['tone', 'triangle', 60, 0.45, 0.2, 48],
  poison: ['tone', 'p25', 50, 0.3, 0.08, 44],
  metal: ['tone', 'p12', 100, 0.18, 0.08, 88],
  dragon: ['noise', 0.4, 200, 0.3, 1500],
  mythical: ['arp', [84, 88, 91, 96]],
  neutral: ['noise', 0.1, 300, 0.25],
};

function compileSong(def) {
  const steps = [];
  const push = (i, ev) => { (steps[i] ||= []).push(ev); };
  let t = 0;
  for (const tok of def.lead.trim().split(/\s+/)) {
    const [n, l] = tok.split(':');
    const len = Number(l);
    if (n !== 'r') push(t, { ch: 'lead', m: midi(n), len });
    t += len;
  }
  const total = t;
  t = 0;
  for (const tok of def.chords.trim().split(/\s+/)) {
    const [sym, l] = tok.split(':');
    const len = Number(l);
    const cm = /^([A-G][#b]?)(m?)$/.exec(sym);
    const pc = NOTE[cm[1]];
    const third = cm[2] ? 3 : 4;
    const bassRoot = 36 + pc;
    const bassPat = [0, 7, 12, 7];
    const arpPat = [0, third, 7, 12, 7, third];
    for (let i = 0; i < len; i += 2) {
      push(t + i, { ch: 'bass', m: bassRoot + bassPat[(i / 2) % 4], len: 2 });
      push(t + i, { ch: 'arp', m: 60 + pc + arpPat[(i / 2) % arpPat.length], len: 2 });
    }
    t += len;
  }
  for (let bar = 0; bar < total; bar += 16) {
    [...def.drums].forEach((c, i) => { if (c !== '.') push(bar + i, { ch: c }); });
  }
  for (let i = 0; i < total; i++) steps[i] ||= [];
  return { steps, len: total, spb: 60 / def.bpm / 4 };
}

function pulseWave(ctx, duty) {
  const N = 48;
  const real = new Float32Array(N);
  const imag = new Float32Array(N);
  for (let n = 1; n < N; n++) {
    real[n] = (2 / (n * Math.PI)) * Math.sin(2 * Math.PI * n * duty);
    imag[n] = (2 / (n * Math.PI)) * (1 - Math.cos(2 * Math.PI * n * duty));
  }
  return ctx.createPeriodicWave(real, imag);
}

export const Audio = {
  ctx: null,
  currentId: null,
  pendingId: null,
  musicVol: 0.6,
  sfxVol: 0.8,

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = (this.ctx = new AC());
      this.master = ctx.createGain();
      this.master.connect(ctx.destination);
      this.musicGain = ctx.createGain();
      this.musicGain.connect(this.master);
      this.sfxGain = ctx.createGain();
      this.sfxGain.connect(this.master);
      this.waves = { p25: pulseWave(ctx, 0.25), p12: pulseWave(ctx, 0.125), p50: pulseWave(ctx, 0.5) };
      const len = ctx.sampleRate;
      this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      // A silent blip fully unlocks iOS audio.
      const b = ctx.createBufferSource();
      b.buffer = ctx.createBuffer(1, 1, 22050);
      b.connect(ctx.destination);
      b.start(0);
      this.setVolumes(this.musicVol, this.sfxVol);
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) this.ctx.suspend(); else this.ctx.resume();
      });
    }
    if (this.ctx.state !== 'running') this.ctx.resume();
    if (this.pendingId) {
      const id = this.pendingId;
      this.pendingId = null;
      this.playMusic(id);
    }
  },

  get ready() { return !!this.ctx; },

  setVolumes(music, sfx) {
    this.musicVol = music;
    this.sfxVol = sfx;
    if (!this.ctx) return;
    this.musicGain.gain.value = music * 0.9;
    this.sfxGain.gain.value = sfx;
  },

  playMusic(id) {
    if (!this.ctx) { this.pendingId = id; return; }
    if (this.currentId === id) return;
    this.stopMusic();
    const def = SONGS[id];
    if (!def) return;
    this.currentId = id;
    this.song = def._compiled ||= compileSong(def);
    this.songGain = this.ctx.createGain();
    this.songGain.connect(this.musicGain);
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.12;
    this.timer = setInterval(() => this.schedule(), 25);
  },

  stopMusic() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.currentId = null;
    if (this.songGain) {
      const g = this.songGain;
      g.gain.setTargetAtTime(0, this.ctx.currentTime, 0.04);
      setTimeout(() => g.disconnect(), 400);
      this.songGain = null;
    }
  },

  schedule() {
    const ctx = this.ctx;
    if (!this.song || ctx.state !== 'running') return;
    if (this.nextTime < ctx.currentTime - 0.5) this.nextTime = ctx.currentTime + 0.05; // after a stall
    const ahead = ctx.currentTime + 0.2;
    while (this.nextTime < ahead) {
      for (const ev of this.song.steps[this.step]) this.playEvent(ev, this.nextTime);
      this.nextTime += this.song.spb;
      this.step = (this.step + 1) % this.song.len;
    }
  },

  playEvent(ev, t) {
    const spb = this.song.spb;
    const out = this.songGain;
    switch (ev.ch) {
      case 'lead': this.tone('p25', ev.m, t, ev.len * spb * 0.92, 0.12, out); break;
      case 'arp': this.tone('p12', ev.m, t, ev.len * spb * 0.6, 0.035, out); break;
      case 'bass': this.tone('triangle', ev.m, t, ev.len * spb * 0.85, 0.2, out); break;
      case 'k': this.kick(t, out); break;
      case 's': this.noiseHit(t, 0.11, 1200, 0.16, out); break;
      case 'h': this.noiseHit(t, 0.035, 7000, 0.06, out); break;
      default: break;
    }
  },

  tone(type, m, t, dur, vol, dest, slideTo) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    if (this.waves[type]) o.setPeriodicWave(this.waves[type]); else o.type = type;
    o.frequency.setValueAtTime(mtof(m), t);
    if (slideTo != null) o.frequency.exponentialRampToValueAtTime(mtof(slideTo), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.006);
    g.gain.setValueAtTime(vol, t + dur * 0.65);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(dest);
    o.start(t);
    o.stop(t + dur + 0.02);
  },

  kick(t, dest) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    o.connect(g);
    g.connect(dest);
    o.start(t);
    o.stop(t + 0.15);
  },

  noiseHit(t, dur, hp, vol, dest, lpFrom) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = lpFrom ? 'lowpass' : 'highpass';
    f.frequency.setValueAtTime(lpFrom || hp, t);
    if (lpFrom) f.frequency.exponentialRampToValueAtTime(hp, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(dest);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  },

  sfx(name) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime + 0.005;
    const out = this.sfxGain;
    switch (name) {
      case 'blip': this.tone('p25', 84, t, 0.045, 0.1, out); break;
      case 'select':
        this.tone('p25', 76, t, 0.05, 0.12, out);
        this.tone('p25', 83, t + 0.05, 0.07, 0.12, out);
        break;
      case 'back':
        this.tone('p25', 79, t, 0.05, 0.11, out);
        this.tone('p25', 72, t + 0.05, 0.07, 0.11, out);
        break;
      case 'bump': this.tone('triangle', 38, t, 0.08, 0.35, out); break;
      case 'door':
        this.noiseHit(t, 0.28, 300, 0.22, out, 3500);
        this.tone('p50', 60, t, 0.12, 0.06, out, 48);
        break;
      case 'exit': this.noiseHit(t, 0.2, 500, 0.08, out, 2500); break;
      case 'grass': this.noiseHit(t, 0.09, 2600, 0.1, out); break;
      case 'text': this.tone('p12', 79, t, 0.022, 0.035, out); break;
      case 'save':
        [72, 76, 79, 84].forEach((m, i) => this.tone('p25', m, t + i * 0.07, 0.09, 0.11, out));
        break;
      case 'start':
        [60, 64, 67, 72, 76, 79, 84].forEach((m, i) => this.tone('p25', m, t + i * 0.045, 0.08, 0.1, out));
        break;
      case 'error': this.tone('p50', 45, t, 0.18, 0.1, out, 40); break;
      case 'encounter':
        [76, 72, 76, 72, 79, 84].forEach((m, i) => this.tone('p25', m, t + i * 0.08, 0.08, 0.1, out));
        break;
      case 'lunge': this.noiseHit(t, 0.08, 1500, 0.08, out); break;
      case 'hit': this.noiseHit(t, 0.14, 150, 0.35, out); this.tone('triangle', 40, t, 0.1, 0.3, out, 30); break;
      case 'hitSuper':
        this.noiseHit(t, 0.22, 100, 0.45, out);
        this.tone('p50', 52, t, 0.18, 0.12, out, 36);
        break;
      case 'hitWeak': this.noiseHit(t, 0.08, 800, 0.18, out); break;
      case 'faint': this.tone('p25', 72, t, 0.5, 0.1, out, 36); break;
      case 'throw': this.tone('p12', 72, t, 0.3, 0.06, out, 90); break;
      case 'orbpop':
        this.tone('p25', 84, t, 0.05, 0.08, out);
        this.tone('p25', 91, t + 0.05, 0.08, 0.08, out);
        break;
      case 'wobble': this.tone('triangle', 48, t, 0.08, 0.3, out); this.tone('triangle', 43, t + 0.1, 0.08, 0.3, out); break;
      case 'caught':
        [72, 76, 79, 84, 79, 84, 88].forEach((m, i) => this.tone('p25', m, t + i * 0.09, i === 6 ? 0.4 : 0.09, 0.11, out));
        break;
      case 'levelup':
        [72, 76, 79, 76, 79, 84].forEach((m, i) => this.tone('p25', m, t + i * 0.07, i === 5 ? 0.3 : 0.07, 0.11, out));
        break;
      case 'exp': this.tone('p12', 84, t, 0.3, 0.03, out, 96); break;
      case 'heal':
        [72, 79, 76, 84, 88].forEach((m, i) => this.tone('p25', m, t + i * 0.1, 0.12, 0.1, out));
        break;
      case 'statup': this.tone('p25', 72, t, 0.25, 0.08, out, 84); break;
      case 'statdown': this.tone('p25', 84, t, 0.25, 0.08, out, 70); break;
      case 'status': this.tone('p50', 64, t, 0.08, 0.08, out); this.tone('p50', 61, t + 0.1, 0.12, 0.08, out); break;
      case 'evolve': [60, 64, 67, 72].forEach((m, i) => this.tone('triangle', m, t + i * 0.25, 0.25, 0.2, out)); break;
      case 'spotted':
        [79, 79, 84].forEach((m, i) => this.tone('p25', m, t + i * 0.09, 0.08, 0.12, out));
        this.tone('p25', 91, t + 0.27, 0.25, 0.12, out);
        break;
      case 'pickup':
        [72, 76, 79, 84, 88].forEach((m, i) => this.tone('p25', m, t + i * 0.06, 0.07, 0.1, out));
        break;
      case 'buy':
        this.tone('p25', 88, t, 0.06, 0.1, out);
        this.tone('p25', 96, t + 0.07, 0.15, 0.1, out);
        break;
      case 'sparkle': this.tone('p12', 96 + Math.floor(Math.random() * 8), t, 0.05, 0.03, out); break;
      default:
        if (name.startsWith('move:')) this.moveSfx(name.slice(5), t, out);
        break;
    }
  },

  moveSfx(type, t, out) {
    const r = TYPE_SFX[type] || TYPE_SFX.neutral;
    if (r[0] === 'noise') this.noiseHit(t, r[1], r[2], r[3], out, r[4]);
    else if (r[0] === 'tone') this.tone(r[1], r[2], t, r[3], r[4], out, r[5]);
    else if (r[0] === 'zap') {
      for (let i = 0; i < 6; i++) this.tone('p50', 70 + Math.floor(Math.random() * 20), t + i * 0.04, 0.04, 0.07, out);
    } else if (r[0] === 'arp') r[1].forEach((m, i) => this.tone('p25', m, t + i * 0.06, 0.08, 0.08, out));
  },
};
