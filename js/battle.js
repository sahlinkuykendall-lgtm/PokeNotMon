// Turn-based 1v1 battles: logic, the animated battle scene, and the battle HUD.

import { MOVES } from './data/moves.js';
import { SPECIES } from './data/monsters.js';
import { TYPE_INFO, effectiveness } from './data/types.js';
import {
  monName, isAlive, expForLevel, recalc, movesAtLevel, expProgress, STATUS_INFO, STAT_NAMES,
} from './monster.js';
import { Layout } from './layout.js';

const rand = Math.random;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const HOLD = { slow: 1.5, normal: 1.0, fast: 0.6 };
const CPS = { slow: 32, normal: 60, fast: 140 };

const FX = {
  neutral: { colors: ['#ffffff', '#f4eed8', '#d8ceb0'], shape: 'star' },
  fire: { colors: ['#fff2a0', '#ffb030', '#f0602a', '#d8342a'], shape: 'circle' },
  water: { colors: ['#e6f6ff', '#8fd0f5', '#4a93e0'], shape: 'bubble' },
  grass: { colors: ['#b8f0a0', '#6cc760', '#3f9b47'], shape: 'leaf' },
  electric: { colors: ['#ffffff', '#fff6a0', '#ffd23f', '#f0a81c'], shape: 'spark' },
  ice: { colors: ['#ffffff', '#d8f4ff', '#8fd8f0'], shape: 'shard' },
  ground: { colors: ['#d8b878', '#b08850', '#7a5a34'], shape: 'square' },
  wind: { colors: ['#ffffff', '#d8f6ee', '#8fd6c8'], shape: 'ring' },
  flying: { colors: ['#ffffff', '#e2e8ff', '#a8b8f0'], shape: 'leaf' },
  fighting: { colors: ['#ffffff', '#ffd08a', '#e0603a'], shape: 'star' },
  psychic: { colors: ['#ffd8f4', '#f47ab0', '#c04a98'], shape: 'ring' },
  ghost: { colors: ['#e0d4ff', '#9a88d8', '#5a4a8a'], shape: 'circle' },
  poison: { colors: ['#f0c8ff', '#b46ad8', '#7a3a9a'], shape: 'bubble' },
  metal: { colors: ['#ffffff', '#dfe6ec', '#9aa6b2'], shape: 'spark' },
  dragon: { colors: ['#d8ceff', '#8a7af0', '#4a3ac0'], shape: 'circle' },
  mythical: { colors: ['#ffffff', '#fff2b8', '#f2a7e8', '#ffd23f'], shape: 'star' },
};

const STATUS_FX = { psn: 'poison', brn: 'fire', slp: 'neutral', par: 'electric', frz: 'ice', cnf: 'psychic' };

class Side {
  constructor(name) {
    this.name = name;
    this.mon = null;
    this.visible = false;
    this.dx = 0; this.dy = 0;
    this.scale = 1;
    this.alpha = 1;
    this.white = false;
    this.blink = false;
    this.hpShown = 0;
    this.resetVolatile();
  }
  resetVolatile() {
    this.stages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
    this.confused = 0;
  }
}

function stageMult(st) { return st >= 0 ? (2 + st) / 2 : 2 / (2 - st); }

export class Battle {
  constructor(game, opts) {
    this.game = game;
    this.opts = opts;
    this.trainer = opts.trainer || null;
    this.kind = this.trainer ? 'trainer' : 'wild';
    this.foeParty = opts.foes;
    this.foeIndex = 0;
    this.party = game.data.party;
    this.me = new Side('me');
    this.foe = new Side('foe');
    this.tweens = [];
    this.particles = [];
    this.shakeT = 0; this.shakeAmp = 0;
    this.flashT = 0;
    this.time = 0;
    this.text = null;
    this.menu = null;
    this.tapped = false;
    this.participants = new Set();
    this.pendingEvolutions = new Set();
    this.runAttempts = 0;
    this.result = null;
    this.orb = null;
    this.trainerShown = false;
    this.trainerDx = 0;
    this.theme = opts.theme || 'field';
    this.buildUI();
  }

  // ------------------------------------------------------------------ helpers

  get settings() { return this.game.settings; }

  label(side, start = false) {
    const n = monName(side.mon);
    if (side.name === 'me') return n;
    const s = this.kind === 'wild' ? `the wild ${n}` : `the foe's ${n}`;
    return start ? cap(s) : s;
  }

  wait(sec) {
    return new Promise((done) => this.tweens.push({ t: 0, dur: sec, fn: null, done }));
  }

  tween(dur, fn) {
    fn(0);
    return new Promise((done) => this.tweens.push({ t: 0, dur, fn, done }));
  }

  say(text, opts = {}) {
    return new Promise((res) => {
      this.hideMenus();
      this.text = { chars: [...text], shown: 0, timer: 0, hold: opts.hold ?? (HOLD[this.settings.textSpeed] || 1), wait: !!opts.wait, res };
      this.textEl.textContent = '';
    });
  }

  sfx(name) { this.game.audio.sfx(name); }

  stat(side, key) {
    const m = side.mon;
    let v = m.stats[key] * stageMult(side.stages[key] || 0);
    if (key === 'spe' && m.status === 'par') v *= 0.5;
    return Math.max(1, Math.floor(v));
  }

  // ------------------------------------------------------------------ UI

  buildUI() {
    const root = document.createElement('div');
    root.className = 'battle-ui';
    root.innerHTML = `
      <div class="hpbox foe" style="display:none">
        <div class="hp-top"><span class="nm"></span><span class="st"></span><span class="lv"></span></div>
        <div class="hp-row"><b>HP</b><div class="bar"><div class="fill"></div></div></div>
      </div>
      <div class="hpbox me" style="display:none">
        <div class="hp-top"><span class="nm"></span><span class="st"></span><span class="lv"></span></div>
        <div class="hp-row"><b>HP</b><div class="bar"><div class="fill"></div></div></div>
        <div class="hp-num"></div>
        <div class="exp"><div class="fill"></div></div>
      </div>
      <div class="bt-panel">
        <div class="bt-text box"><span></span></div>
        <div class="bt-menu box" style="display:none">
          <button data-a="fight" class="bt-fight">Fight</button>
          <button data-a="bag" class="bt-bag">Bag</button>
          <button data-a="party" class="bt-party">Monsters</button>
          <button data-a="run" class="bt-run">Run</button>
        </div>
        <div class="bt-moves box" style="display:none"></div>
      </div>`;
    this.root = root;
    this.textEl = root.querySelector('.bt-text span');
    this.panel = root.querySelector('.bt-panel');
    this.menuEl = root.querySelector('.bt-menu');
    this.movesEl = root.querySelector('.bt-moves');
    this.hud = {
      foe: root.querySelector('.hpbox.foe'),
      me: root.querySelector('.hpbox.me'),
    };
    root.addEventListener('pointerdown', () => { this.tapped = true; });
    this.menuEl.querySelectorAll('button').forEach((b) => {
      b.addEventListener('pointerdown', (e) => e.stopPropagation());
      b.addEventListener('click', () => this.pick(b.dataset.a));
    });
    this.game.ui.overlay.appendChild(root);
  }

  destroy() {
    this.root.remove();
  }

  updateHud(sideName) {
    const side = this[sideName];
    const box = this.hud[sideName];
    const m = side.mon;
    if (!m) { box.style.display = 'none'; return; }
    box.style.display = '';
    box.querySelector('.nm').textContent = monName(m);
    box.querySelector('.lv').textContent = 'Lv' + m.level;
    const st = box.querySelector('.st');
    const info = STATUS_INFO[m.status];
    st.textContent = info ? info.label : '';
    st.style.background = info ? info.color : 'transparent';
    st.style.display = info ? '' : 'none';
    const frac = clamp(side.hpShown / m.stats.hp, 0, 1);
    const fill = box.querySelector('.bar .fill');
    fill.style.width = (frac * 100).toFixed(1) + '%';
    fill.style.background = frac > 0.5 ? '#4ccf5a' : frac > 0.2 ? '#f2c230' : '#e8483c';
    if (sideName === 'me') {
      box.querySelector('.hp-num').textContent = `${Math.ceil(side.hpShown)} / ${m.stats.hp}`;
      if (!this.expAnimating) box.querySelector('.exp .fill').style.width = (expProgress(m) * 100).toFixed(1) + '%';
    }
  }

  setExpBar(frac) {
    this.hud.me.querySelector('.exp .fill').style.width = (clamp(frac, 0, 1) * 100).toFixed(1) + '%';
  }

  hideMenus() {
    this.panel.classList.remove('moves-open');
    this.menuEl.style.display = 'none';
    this.movesEl.style.display = 'none';
    this.menu = null;
  }

  pick(value) {
    if (!this.menu) return;
    const m = this.menu;
    this.menu = null;
    this.sfx(value === null ? 'back' : 'select');
    m.resolve(value);
  }

  chooseMain() {
    return new Promise((resolve) => {
      this.textEl.textContent = `What will ${monName(this.me.mon)} do?`;
      this.text = null;
      this.movesEl.style.display = 'none';
      this.panel.classList.remove('moves-open');
      this.menuEl.style.display = '';
      const buttons = [...this.menuEl.querySelectorAll('button')];
      this.menu = { buttons, focus: this.lastMain || 0, cols: 2, resolve, values: buttons.map((b) => b.dataset.a), back: null };
      this.renderFocus();
    }).then((v) => { this.lastMain = ['fight', 'bag', 'party', 'run'].indexOf(v); return v; });
  }

  chooseMove() {
    const mon = this.me.mon;
    if (mon.moves.every((mv) => mv.pp <= 0)) return Promise.resolve('struggle');
    return new Promise((resolve) => {
      this.menuEl.style.display = 'none';
      const el = this.movesEl;
      el.innerHTML = '';
      const buttons = [];
      const values = [];
      mon.moves.forEach((slot, i) => {
        const mv = MOVES[slot.id];
        const t = TYPE_INFO[mv.type];
        const b = document.createElement('button');
        b.className = 'move-btn';
        b.style.setProperty('--tc', t.color);
        b.innerHTML = `<span class="mv-name">${mv.name}</span><span class="mv-meta"><span class="mv-type">${t.name}</span><span class="mv-pp">PP ${slot.pp}/${mv.pp}</span></span>`;
        if (slot.pp <= 0) b.classList.add('empty');
        b.addEventListener('pointerdown', (e) => e.stopPropagation());
        b.addEventListener('click', () => {
          if (slot.pp <= 0) { this.sfx('error'); return; }
          this.pick(i);
        });
        el.appendChild(b);
        buttons.push(b);
        values.push(i);
      });
      const back = document.createElement('button');
      back.className = 'move-back';
      back.textContent = '◀ Back';
      back.addEventListener('pointerdown', (e) => e.stopPropagation());
      back.addEventListener('click', () => this.pick(null));
      el.appendChild(back);
      buttons.push(back);
      values.push(null);
      el.style.display = '';
      this.panel.classList.add('moves-open');
      this.menu = { buttons, focus: 0, cols: 2, resolve, values, back: null, isMoves: true };
      this.renderFocus();
    });
  }

  renderFocus() {
    if (!this.menu) return;
    this.menu.buttons.forEach((b, i) => b.classList.toggle('focus', i === this.menu.focus));
  }

  // ------------------------------------------------------------------ loop hooks

  update(dt, input) {
    this.time += dt;
    // tweens
    const list = this.tweens;
    this.tweens = [];
    const keep = [];
    for (const tw of list) {
      tw.t += dt;
      const p = Math.min(1, tw.t / tw.dur);
      if (tw.fn) tw.fn(p);
      if (p >= 1) tw.done(); else keep.push(tw);
    }
    this.tweens = keep.concat(this.tweens);
    // particles
    for (const pt of this.particles) {
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vy += (pt.g || 0) * dt;
      pt.rot = (pt.rot || 0) + (pt.spin || 0) * dt;
      if (pt.grow) pt.size += pt.grow * dt;
    }
    this.particles = this.particles.filter((pt) => pt.life > 0);
    if (this.shakeT > 0) this.shakeT = Math.max(0, this.shakeT - dt);
    if (this.flashT > 0) this.flashT = Math.max(0, this.flashT - dt);

    const tapped = this.tapped;
    this.tapped = false;

    if (this.text) {
      const tx = this.text;
      const pressed = input.consume('a') || input.consume('b') || tapped;
      if (tx.shown < tx.chars.length) {
        const before = Math.floor(tx.shown);
        tx.shown = pressed ? tx.chars.length : Math.min(tx.chars.length, tx.shown + (CPS[this.settings.textSpeed] || 60) * dt);
        if (Math.floor(tx.shown) !== before) this.textEl.textContent = tx.chars.slice(0, Math.floor(tx.shown)).join('');
      } else {
        tx.timer += dt;
        if (pressed || (!tx.wait && tx.timer >= tx.hold)) {
          this.text = null;
          tx.res();
        }
      }
      return;
    }

    if (this.menu) {
      const m = this.menu;
      const nav = input.consumeNav();
      if (nav) {
        const n = m.buttons.length;
        let f = m.focus;
        if (m.isMoves && f === n - 1) {
          if (nav === 'up') f = Math.max(0, n - 3);
        } else if (nav === 'left' && f % 2 === 1) f -= 1;
        else if (nav === 'right' && f % 2 === 0 && f + 1 < n) f += 1;
        else if (nav === 'up' && f >= 2) f -= 2;
        else if (nav === 'down') f = f + 2 < n ? f + 2 : (m.isMoves ? n - 1 : f);
        if (f !== m.focus) { m.focus = f; this.sfx('blip'); this.renderFocus(); }
      }
      if (input.consume('a')) {
        const v = m.values[m.focus];
        if (m.isMoves && v !== null && this.me.mon.moves[v].pp <= 0) this.sfx('error');
        else this.pick(v);
      } else if (input.consume('b') && m.isMoves) {
        this.pick(null);
      }
    }
  }

  // ------------------------------------------------------------------ drawing

  layout() {
    const W = Layout.viewW, H = Layout.viewH;
    const panelH = this.panel.offsetHeight || 110;
    const sceneH = Math.max(120, H - panelH);
    const size = Math.min(sceneH * 0.44, W * 0.24);
    return {
      W, H, sceneH,
      foe: { x: W * 0.7, y: sceneH * 0.56, size },
      me: { x: W * 0.28, y: sceneH * 0.99, size: size * 1.3 },
    };
  }

  center(side) {
    const L = this.layout();
    const p = L[side.name];
    return { x: p.x + side.dx, y: p.y + side.dy - p.size * 0.45 };
  }

  draw(renderer) {
    const ctx = renderer.ctx;
    const L = this.layout();
    const k = renderer.canvas.width / Math.max(1, L.W);
    let sx = 0, sy = 0;
    if (this.shakeT > 0) {
      sx = (rand() - 0.5) * this.shakeAmp * 2;
      sy = (rand() - 0.5) * this.shakeAmp;
    }
    ctx.setTransform(k, 0, 0, k, sx * k, sy * k);
    ctx.imageSmoothingEnabled = false;
    this.drawBackground(ctx, L);
    this.drawPlatform(ctx, L.foe);
    this.drawPlatform(ctx, L.me);

    if (this.trainerShown && this.trainer) {
      const spr = this.game.sprites.trainer(this.trainer.look, 'down', 0);
      const sc = (L.foe.size / 42) * 1.25;
      ctx.drawImage(spr.img, L.foe.x + this.trainerDx - 17 * sc, L.foe.y - 40 * sc, 34 * sc, 42 * sc);
    }
    this.drawMon(ctx, this.foe, L.foe, 'front');
    this.drawMon(ctx, this.me, L.me, 'back');

    if (this.orb && this.orb.visible) {
      const img = this.game.monArt.orb();
      const s = L.foe.size / 64 * 1.6;
      ctx.save();
      ctx.translate(this.orb.x, this.orb.y);
      ctx.rotate(this.orb.rot || 0);
      ctx.drawImage(img, -9 * s, -9 * s, 18 * s, 18 * s);
      ctx.restore();
    }

    for (const pt of this.particles) this.drawParticle(ctx, pt);

    if (this.flashT > 0) {
      ctx.fillStyle = `rgba(255,255,255,${Math.min(0.8, this.flashT * 6)})`;
      ctx.fillRect(-20, -20, L.W + 40, L.H + 40);
    }
  }

  drawBackground(ctx, L) {
    const { W, H, sceneH } = L;
    const horizon = sceneH * 0.42;
    if (this.theme === 'lab') {
      ctx.fillStyle = '#dfe8ee';
      ctx.fillRect(-20, -20, W + 40, horizon + 20);
      ctx.fillStyle = '#c9d5de';
      for (let x = 0; x < W; x += 60) ctx.fillRect(x, 0, 3, horizon);
      ctx.fillStyle = '#9fd6f0';
      ctx.fillRect(W * 0.12, horizon * 0.25, W * 0.18, horizon * 0.45);
      ctx.fillRect(W * 0.68, horizon * 0.25, W * 0.18, horizon * 0.45);
      const g = ctx.createLinearGradient(0, horizon, 0, H);
      g.addColorStop(0, '#e6ecf0');
      g.addColorStop(1, '#c4ced6');
      ctx.fillStyle = g;
      ctx.fillRect(-20, horizon, W + 40, H - horizon + 20);
      ctx.fillStyle = '#8fa0ae';
      ctx.fillRect(-20, horizon - 4, W + 40, 6);
      return;
    }
    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, '#7cc6f5');
    sky.addColorStop(1, '#dff4ff');
    ctx.fillStyle = sky;
    ctx.fillRect(-20, -20, W + 40, horizon + 20);
    // clouds
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 4; i++) {
      const x = ((i * 0.31 + this.time * 0.006 * (1 + i * 0.3)) % 1.3 - 0.15) * W;
      const y = horizon * (0.18 + (i % 2) * 0.22);
      ctx.beginPath();
      ctx.ellipse(x, y, 34, 9, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 18, y - 6, 20, 9, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // hills
    ctx.fillStyle = '#9fd48a';
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.ellipse(W * (i / 4), horizon + 6, W * 0.2, horizon * 0.28, 0, Math.PI, 0);
      ctx.fill();
    }
    ctx.fillStyle = '#6fae62';
    for (let x = -10; x < W + 20; x += 22) {
      ctx.beginPath();
      ctx.ellipse(x, horizon + 2, 14, 12 + ((x * 7) % 9), 0, Math.PI, 0);
      ctx.fill();
    }
    const ground = ctx.createLinearGradient(0, horizon, 0, H);
    ground.addColorStop(0, '#b4e08e');
    ground.addColorStop(1, '#7fc862');
    ctx.fillStyle = ground;
    ctx.fillRect(-20, horizon, W + 40, H - horizon + 20);
    ctx.fillStyle = 'rgba(80,150,60,0.18)';
    for (let i = 1; i < 7; i++) {
      const y = horizon + (H - horizon) * Math.pow(i / 7, 1.6);
      ctx.fillRect(-20, y, W + 40, 2);
    }
  }

  drawPlatform(ctx, p) {
    const rx = p.size * 0.95, ry = p.size * 0.2;
    const lab = this.theme === 'lab';
    ctx.fillStyle = lab ? '#a9b5c0' : '#5f9e48';
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 3, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = lab ? '#d0d9e0' : '#94cf6c';
    ctx.beginPath(); ctx.ellipse(p.x, p.y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = lab ? '#e4eaee' : '#aede84';
    ctx.beginPath(); ctx.ellipse(p.x - rx * 0.1, p.y - ry * 0.15, rx * 0.7, ry * 0.6, 0, 0, Math.PI * 2); ctx.fill();
  }

  drawMon(ctx, side, p, which) {
    if (!side.mon || !side.visible || side.blink || side.scale <= 0.01) return;
    const art = this.game.monArt;
    const id = side.mon.species;
    const img = side.white ? art.white(id, which) : which === 'front' ? art.front(id) : art.back(id);
    const sc = (p.size / 64) * side.scale;
    const bob = side.scale === 1 && !side.dy ? Math.round(Math.sin(this.time * 2.4 + (which === 'front' ? 0 : 1.5)) * 1.2) : 0;
    const x = p.x + side.dx;
    const y = p.y + side.dy + bob;
    ctx.globalAlpha = side.alpha;
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(p.x + side.dx, p.y, p.size * 0.42 * side.scale, p.size * 0.09 * side.scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.drawImage(img, x - 38 * sc, y - 70 * sc, 76 * sc, 72 * sc);
    ctx.globalAlpha = 1;
  }

  drawParticle(ctx, pt) {
    const a = clamp(pt.life / pt.max, 0, 1);
    ctx.globalAlpha = Math.min(1, a * 1.6);
    ctx.fillStyle = pt.color;
    ctx.strokeStyle = pt.color;
    const s = pt.size;
    ctx.save();
    ctx.translate(pt.x, pt.y);
    ctx.rotate(pt.rot || 0);
    switch (pt.shape) {
      case 'circle':
        ctx.beginPath(); ctx.arc(0, 0, s / 2, 0, Math.PI * 2); ctx.fill(); break;
      case 'square':
        ctx.fillRect(-s / 2, -s / 2, s, s); break;
      case 'spark':
        ctx.lineWidth = Math.max(1.5, s / 4);
        ctx.beginPath(); ctx.moveTo(-s / 2, -s / 2); ctx.lineTo(0, -s / 8); ctx.lineTo(-s / 6, s / 8); ctx.lineTo(s / 2, s / 2); ctx.stroke(); break;
      case 'leaf':
        ctx.beginPath(); ctx.ellipse(0, 0, s / 2, s / 4, 0, 0, Math.PI * 2); ctx.fill(); break;
      case 'star':
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const r = i % 2 ? s / 5 : s / 2;
          const an = (i / 8) * Math.PI * 2;
          ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r);
        }
        ctx.closePath(); ctx.fill(); break;
      case 'ring':
        ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, s / 2, 0, Math.PI * 2); ctx.stroke(); break;
      case 'bubble':
        ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, s / 2, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#ffffff'; ctx.fillRect(-s / 4, -s / 4, s / 5, s / 5); break;
      case 'shard':
        ctx.beginPath(); ctx.moveTo(0, -s / 2); ctx.lineTo(s / 4, s / 2); ctx.lineTo(-s / 4, s / 2); ctx.closePath(); ctx.fill(); break;
      case 'arrowUp':
        ctx.beginPath(); ctx.moveTo(0, -s / 2); ctx.lineTo(s / 2, s / 4); ctx.lineTo(-s / 2, s / 4); ctx.closePath(); ctx.fill(); break;
      case 'arrowDown':
        ctx.beginPath(); ctx.moveTo(0, s / 2); ctx.lineTo(s / 2, -s / 4); ctx.lineTo(-s / 2, -s / 4); ctx.closePath(); ctx.fill(); break;
      default:
        ctx.fillRect(-s / 2, -s / 2, s, s);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // ------------------------------------------------------------------ effects

  burst(at, type, n = 14, speed = 160) {
    const fx = FX[type] || FX.neutral;
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2;
      const v = speed * (0.4 + rand() * 0.8);
      this.particles.push({
        x: at.x + (rand() - 0.5) * 10, y: at.y + (rand() - 0.5) * 10,
        vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, g: 180,
        life: 0.45 + rand() * 0.25, max: 0.7, size: 6 + rand() * 7,
        color: fx.colors[Math.floor(rand() * fx.colors.length)], shape: fx.shape, spin: (rand() - 0.5) * 10,
        grow: fx.shape === 'ring' ? 60 : 0,
      });
    }
  }

  stream(from, to, type, duration = 0.42) {
    const fx = FX[type] || FX.neutral;
    const count = 16;
    for (let i = 0; i < count; i++) {
      const delay = (i / count) * duration * 0.7;
      const travel = duration * 0.6;
      const jitter = 14;
      setTimeout(() => {
        this.particles.push({
          x: from.x + (rand() - 0.5) * jitter, y: from.y + (rand() - 0.5) * jitter,
          vx: (to.x - from.x) / travel + (rand() - 0.5) * 30, vy: (to.y - from.y) / travel + (rand() - 0.5) * 30,
          life: travel, max: travel * 1.2, size: 7 + rand() * 7,
          color: fx.colors[Math.floor(rand() * fx.colors.length)], shape: fx.shape, spin: 8,
        });
      }, delay * 1000);
    }
  }

  aura(side, type, up = true) {
    const c = this.center(side);
    const fx = FX[type] || FX.neutral;
    const L = this.layout();
    const w = L[side.name].size * 0.6;
    for (let i = 0; i < 12; i++) {
      this.particles.push({
        x: c.x + (rand() - 0.5) * w * 2, y: c.y + (up ? w * 0.6 : -w) + (rand() - 0.5) * 16,
        vx: 0, vy: up ? -90 - rand() * 50 : 90 + rand() * 40,
        life: 0.6 + rand() * 0.3, max: 0.9, size: 9 + rand() * 5,
        color: fx.colors[Math.floor(rand() * fx.colors.length)], shape: up ? 'arrowUp' : 'arrowDown',
      });
    }
  }

  statusFx(side, status) {
    const c = this.center(side);
    const type = STATUS_FX[status] || 'neutral';
    const fx = FX[type];
    for (let i = 0; i < 10; i++) {
      this.particles.push({
        x: c.x + (rand() - 0.5) * 50, y: c.y + (rand() - 0.5) * 30,
        vx: (rand() - 0.5) * 30, vy: -40 - rand() * 40,
        life: 0.7, max: 0.7, size: 8 + rand() * 5,
        color: fx.colors[Math.floor(rand() * fx.colors.length)], shape: status === 'slp' ? 'ring' : fx.shape, grow: status === 'slp' ? 10 : 0,
      });
    }
  }

  shake(amp = 6, dur = 0.3) { this.shakeAmp = amp; this.shakeT = dur; }

  async blink(side, dur = 0.45) {
    await this.tween(dur, (p) => { side.blink = p < 1 && Math.floor(p * dur / 0.07) % 2 === 0; });
    side.blink = false;
  }

  async animateHp(side, to, dur = 0.55) {
    const from = side.hpShown;
    await this.tween(dur, (p) => {
      side.hpShown = from + (to - from) * easeInOut(p);
      this.updateHud(side.name);
    });
  }

  async moveAnim(user, target, mv) {
    const type = mv.type;
    const dir = user.name === 'me' ? 1 : -1;
    const from = this.center(user), to = this.center(target);
    if (mv.cat === 'phys') {
      this.sfx('lunge');
      await this.tween(0.13, (p) => { user.dx = dir * 26 * easeOut(p); user.dy = -dir * 12 * easeOut(p); });
      this.burst(to, type, 16, 190);
      this.sfx('move:' + type);
      await this.tween(0.16, (p) => { user.dx = dir * 26 * (1 - p); user.dy = -dir * 12 * (1 - p); });
      user.dx = 0; user.dy = 0;
    } else {
      this.sfx('move:' + type);
      this.stream(from, to, type, 0.45);
      await this.wait(0.42);
      this.burst(to, type, 14, 150);
    }
  }

  // ------------------------------------------------------------------ flow

  async run() {
    const t = this.trainer;
    this.foe.mon = this.foeParty[0];
    const L = this.layout();
    if (t) {
      this.trainerShown = true;
      await this.tween(0.7, (p) => { this.trainerDx = (1 - easeOut(p)) * -L.W; });
      await this.say(`${t.name} wants to battle!`);
      await this.tween(0.35, (p) => { this.trainerDx = easeInOut(p) * L.W * 0.5; });
      this.trainerShown = false;
      await this.sendOut(this.foe, this.foeParty[0], `${t.name} sent out ${monName(this.foeParty[0])}!`);
    } else {
      this.foe.visible = true;
      this.foe.hpShown = this.foe.mon.hp;
      this.updateHud('foe');
      this.hud.foe.style.display = 'none';
      await this.tween(0.8, (p) => { this.foe.dx = (1 - easeOut(p)) * -L.W * 0.8; });
      this.hud.foe.style.display = '';
      this.game.dexSee(this.foe.mon.species);
      await this.say(`A wild ${monName(this.foe.mon)} appeared!`);
    }
    const first = this.party.find(isAlive);
    await this.sendOut(this.me, first, `Go! ${monName(first)}!`);

    while (!this.result) {
      const action = await this.playerAction();
      await this.doTurn(action);
    }
    await this.finish();
    return { result: this.result, evolutions: [...this.pendingEvolutions] };
  }

  async sendOut(side, mon, text) {
    side.mon = mon;
    side.resetVolatile();
    side.hpShown = mon.hp;
    side.dx = 0; side.dy = 0; side.alpha = 1;
    side.visible = true;
    side.scale = 0;
    side.white = true;
    if (side.name === 'me') this.participants.add(mon.uid);
    else this.game.dexSee(mon.species);
    this.updateHud(side.name);
    const talk = this.say(text);
    this.sfx('orbpop');
    const c = this.center(side);
    this.burst({ x: c.x, y: c.y + 10 }, 'neutral', 10, 120);
    await this.tween(0.35, (p) => { side.scale = easeOut(p); });
    side.white = false;
    await talk;
  }

  async playerAction() {
    for (;;) {
      const choice = await this.chooseMain();
      if (choice === 'fight') {
        const mv = await this.chooseMove();
        if (mv === null) continue;
        return { kind: 'move', slot: mv };
      }
      if (choice === 'bag') {
        this.hideMenus();
        const r = await this.game.ui.bagScreen({ battle: true, wild: this.kind === 'wild' });
        if (!r) continue;
        return { kind: 'item', ...r };
      }
      if (choice === 'party') {
        this.hideMenus();
        const idx = await this.game.ui.partyScreen({ mode: 'battle', activeUid: this.me.mon.uid });
        if (idx == null) continue;
        return { kind: 'switch', index: idx };
      }
      if (choice === 'run') {
        if (this.kind === 'trainer') {
          await this.say("There's no running from a trainer battle!");
          continue;
        }
        return { kind: 'run' };
      }
    }
  }

  movePriority(side, slot) {
    if (slot === 'struggle') return 0;
    return MOVES[side.mon.moves[slot].id].priority || 0;
  }

  async doTurn(action) {
    const foeAct = this.foeChoose();
    const order = [];
    if (action.kind !== 'move') {
      order.push(['me', action], ['foe', foeAct]);
    } else {
      const pm = this.movePriority(this.me, action.slot);
      const pf = this.movePriority(this.foe, foeAct.slot);
      let meFirst;
      if (pm !== pf) meFirst = pm > pf;
      else {
        const sm = this.stat(this.me, 'spe'), sf = this.stat(this.foe, 'spe');
        meFirst = sm === sf ? rand() < 0.5 : sm > sf;
      }
      order.push(...(meFirst ? [['me', action], ['foe', foeAct]] : [['foe', foeAct], ['me', action]]));
    }

    const startMon = { me: this.me.mon, foe: this.foe.mon };
    for (const [who, act] of order) {
      if (this.result) return;
      const side = this[who];
      // A monster that fainted or was replaced this turn doesn't act.
      if (side.mon !== startMon[who] || !isAlive(side.mon)) continue;
      if (who === 'me') await this.performPlayer(act);
      else await this.useMove(this.foe, this.me, act.slot);
      if (this.result) return;
      await this.checkFaints();
      if (this.result) return;
    }

    // End of turn: poison and burn.
    for (const side of [this.me, this.foe]) {
      const m = side.mon;
      if (!m || !isAlive(m) || this.result) continue;
      if (m.status === 'psn' || m.status === 'brn') {
        const dmg = Math.max(1, Math.floor(m.stats.hp / (m.status === 'psn' ? 8 : 16)));
        this.statusFx(side, m.status);
        m.hp = Math.max(0, m.hp - dmg);
        await this.animateHp(side, m.hp, 0.4);
        await this.say(`${this.label(side, true)} is hurt by its ${m.status === 'psn' ? 'poison' : 'burn'}!`);
        await this.checkFaints();
      }
    }

    // Wild monsters very rarely run away.
    if (!this.result && this.kind === 'wild' && isAlive(this.foe.mon) && !['slp', 'frz'].includes(this.foe.mon.status) && rand() < 0.02) {
      const L = this.layout();
      await this.say(`${this.label(this.foe, true)} fled!`, { hold: 0.2 });
      this.sfx('exit');
      await this.tween(0.4, (p) => { this.foe.dx = p * L.W * 0.5; this.foe.alpha = 1 - p; });
      this.foe.visible = false;
      this.result = 'fled';
    }
  }

  async performPlayer(act) {
    if (act.kind === 'move') {
      await this.useMove(this.me, this.foe, act.slot);
    } else if (act.kind === 'switch') {
      await this.withdraw(this.me);
      const mon = this.party[act.index];
      await this.sendOut(this.me, mon, `Go! ${monName(mon)}!`);
    } else if (act.kind === 'item') {
      if (act.item === 'orb') await this.throwOrb();
      else await this.useHealItem(act);
    } else if (act.kind === 'run') {
      this.runAttempts++;
      const mine = this.stat(this.me, 'spe'), theirs = this.stat(this.foe, 'spe');
      const chance = clamp(0.55 + (mine - theirs) / (2 * theirs) + 0.15 * (this.runAttempts - 1), 0.35, 1);
      if (rand() < chance) {
        this.sfx('exit');
        await this.say('Got away safely!');
        this.result = 'run';
      } else {
        await this.say("Couldn't get away!");
      }
    }
  }

  async withdraw(side) {
    await this.say(`Come back, ${monName(side.mon)}!`, { hold: 0.3 });
    side.white = true;
    await this.tween(0.3, (p) => { side.scale = 1 - p; });
    side.visible = false;
    side.white = false;
  }

  async useHealItem(act) {
    const item = this.game.items[act.item];
    const mon = this.party[act.target];
    this.game.useItem(act.item);
    const before = mon.hp;
    mon.hp = Math.min(mon.stats.hp, mon.hp + item.heal);
    this.sfx('heal');
    await this.say(`You used a ${item.name}.`, { hold: 0.5 });
    if (mon === this.me.mon) {
      this.aura(this.me, 'grass', true);
      await this.animateHp(this.me, mon.hp);
    }
    await this.say(`${monName(mon)} recovered ${mon.hp - before} HP!`);
  }

  // ------------------------------------------------------------------ moves

  async useMove(user, target, slot) {
    const mon = user.mon;
    const name = this.label(user, true);
    let mv;
    let slotObj = null;
    if (slot === 'struggle') mv = MOVES.struggle;
    else { slotObj = mon.moves[slot]; mv = MOVES[slotObj.id]; }

    // Status that can stop a move.
    if (mon.status === 'slp') {
      mon.sleepTurns = (mon.sleepTurns || 1) - 1;
      if (mon.sleepTurns > 0) {
        this.statusFx(user, 'slp');
        await this.say(`${name} is fast asleep.`);
        return;
      }
      mon.status = null;
      this.updateHud(user.name);
      await this.say(`${name} woke up!`);
    }
    if (mon.status === 'frz') {
      if (rand() < 0.2 || mv.type === 'fire') {
        mon.status = null;
        this.updateHud(user.name);
        await this.say(`${name} thawed out!`);
      } else {
        this.statusFx(user, 'frz');
        await this.say(`${name} is frozen solid!`);
        return;
      }
    }
    if (mon.status === 'par' && rand() < 0.25) {
      this.statusFx(user, 'par');
      await this.say(`${name} is paralyzed! It can't move!`);
      return;
    }
    if (user.confused > 0) {
      user.confused--;
      if (user.confused === 0) {
        await this.say(`${name} snapped out of its confusion!`);
      } else {
        this.statusFx(user, 'cnf');
        await this.say(`${name} is confused!`);
        if (rand() < 1 / 3) {
          const dmg = this.calcDamage(user, user, { type: 'neutral', cat: 'phys' }, 40, 1, false);
          await this.say('It hurt itself in its confusion!', { hold: 0.2 });
          await this.takeHit(user, dmg, 1, false);
          return;
        }
      }
    }

    if (slotObj) slotObj.pp = Math.max(0, slotObj.pp - 1);
    await this.say(`${name} used ${mv.name}!`, { hold: 0.35 });

    if (mv.acc != null && rand() * 100 >= mv.acc) {
      await this.say(`${name}'s attack missed!`);
      return;
    }

    if (mv.cat === 'status') {
      await this.statusMove(user, target, mv);
      return;
    }

    await this.moveAnim(user, target, mv);
    let power = mv.power;
    if (mv.hex && target.mon.status) power *= 2;
    const eff = effectiveness(mv.type, SPECIES[target.mon.species].types);
    const crit = rand() < (mv.crit ? 1 / 8 : 1 / 16);
    const dmg = this.calcDamage(user, target, mv, power, eff, crit);
    const dealt = Math.min(dmg, target.mon.hp);
    await this.takeHit(target, dmg, eff, crit);
    if (crit) await this.say('A critical hit!');
    if (eff > 1) await this.say("It's super effective!");
    else if (eff < 1) await this.say("It's not very effective...");

    if (mv.drain && isAlive(mon) && dealt > 0) {
      const heal = Math.max(1, Math.floor(dealt * mv.drain));
      mon.hp = Math.min(mon.stats.hp, mon.hp + heal);
      this.aura(user, 'grass', true);
      await this.animateHp(user, mon.hp, 0.4);
      await this.say(`${this.label(target, true)} had its energy drained!`);
    }
    if (mv.recoil && isAlive(mon)) {
      const r = Math.max(1, Math.floor(dealt * mv.recoil));
      await this.say(`${name} is hit with recoil!`, { hold: 0.2 });
      await this.takeHit(user, r, 1, false);
    }
    if (isAlive(target.mon)) {
      if (mv.effect && mv.effect.chance && rand() * 100 < mv.effect.chance) await this.inflict(target, mv.effect.status, false);
      if (mv.stages && mv.stages.chance && rand() * 100 < mv.stages.chance) {
        await this.applyStages(mv.stages.target === 'self' ? user : target, mv.stages.stats, false);
      }
    }
  }

  calcDamage(user, target, mv, power, eff, crit) {
    const L = user.mon.level;
    const phys = mv.cat === 'phys';
    const ak = phys ? 'atk' : 'spa', dk = phys ? 'def' : 'spd';
    let A = this.stat(user, ak);
    let D = this.stat(target, dk);
    if (crit) {
      A = Math.max(A, user.mon.stats[ak]);
      D = Math.min(D, target.mon.stats[dk]);
    }
    if (phys && user.mon.status === 'brn') A *= 0.5;
    const base = Math.floor(Math.floor((Math.floor((2 * L) / 5 + 2) * power * A) / D) / 50) + 2;
    const stab = SPECIES[user.mon.species].types.includes(mv.type) ? 1.5 : 1;
    const dmg = Math.floor(base * stab * eff * (crit ? 1.5 : 1) * (0.85 + rand() * 0.15));
    return Math.max(1, dmg);
  }

  async takeHit(side, dmg, eff, crit) {
    this.sfx(eff > 1 ? 'hitSuper' : eff < 1 ? 'hitWeak' : 'hit');
    this.shake(eff > 1 || crit ? 10 : 5, eff > 1 || crit ? 0.4 : 0.25);
    if (eff > 1 || crit) this.flashT = 0.12;
    const blink = this.blink(side);
    side.mon.hp = Math.max(0, side.mon.hp - dmg);
    await blink;
    await this.animateHp(side, side.mon.hp);
  }

  async statusMove(user, target, mv) {
    let did = false;
    if (mv.effect) {
      did = await this.inflict(target, mv.effect.status, true);
    }
    if (mv.stages) {
      const who = mv.stages.target === 'self' ? user : target;
      did = (await this.applyStages(who, mv.stages.stats, true)) || did;
    }
    if (!did && !mv.effect && !mv.stages) await this.say('But nothing happened!');
  }

  async inflict(side, status, primary) {
    const m = side.mon;
    const types = SPECIES[m.species].types;
    const name = this.label(side, true);
    if (status === 'cnf') {
      if (side.confused > 0) {
        if (primary) await this.say(`${name} is already confused!`);
        return false;
      }
      side.confused = 2 + Math.floor(rand() * 4);
      this.statusFx(side, 'cnf');
      this.sfx('status');
      await this.say(`${name} became confused!`);
      return true;
    }
    const immune = (status === 'brn' && types.includes('fire')) || (status === 'frz' && types.includes('ice')) ||
      (status === 'par' && types.includes('electric')) || (status === 'psn' && (types.includes('poison') || types.includes('metal')));
    if (m.status || immune) {
      if (primary) await this.say(immune ? `It doesn't affect ${this.label(side)}...` : 'But it failed!');
      return false;
    }
    m.status = status;
    if (status === 'slp') m.sleepTurns = 1 + Math.floor(rand() * 3);
    this.statusFx(side, status);
    this.sfx('status');
    this.updateHud(side.name);
    const msg = {
      psn: `${name} was poisoned!`,
      brn: `${name} was burned!`,
      slp: `${name} fell asleep!`,
      par: `${name} is paralyzed! It may be unable to move!`,
      frz: `${name} was frozen solid!`,
    }[status];
    await this.say(msg);
    return true;
  }

  async applyStages(side, stats, primary) {
    let any = false;
    for (const [k, delta] of Object.entries(stats)) {
      const cur = side.stages[k];
      const name = this.label(side, true);
      if ((delta > 0 && cur >= 6) || (delta < 0 && cur <= -6)) {
        if (primary) await this.say(`${name}'s ${STAT_NAMES[k]} won't go any ${delta > 0 ? 'higher' : 'lower'}!`);
        continue;
      }
      side.stages[k] = clamp(cur + delta, -6, 6);
      any = true;
      this.aura(side, delta > 0 ? 'water' : 'ghost', delta > 0);
      this.sfx(delta > 0 ? 'statup' : 'statdown');
      const how = delta >= 2 ? 'sharply rose' : delta > 0 ? 'rose' : delta <= -2 ? 'harshly fell' : 'fell';
      await this.say(`${name}'s ${STAT_NAMES[k]} ${how}!`);
    }
    return any;
  }

  // ------------------------------------------------------------------ AI

  foeChoose() {
    const mon = this.foe.mon;
    const opts = mon.moves.map((m, i) => ({ m, i })).filter((x) => x.m.pp > 0);
    if (!opts.length) return { kind: 'move', slot: 'struggle' };
    const target = this.me.mon;
    const tTypes = SPECIES[target.species].types;
    const myTypes = SPECIES[mon.species].types;
    const scored = opts.map(({ m, i }) => {
      const mv = MOVES[m.id];
      let score;
      if (mv.cat === 'status') {
        score = 2;
        if (mv.effect && mv.effect.status !== 'cnf' && !target.status) score = 30;
        if (mv.effect && mv.effect.status === 'cnf' && this.me.confused === 0) score = 22;
        if (mv.stages) {
          const who = mv.stages.target === 'self' ? this.foe : this.me;
          const [k, d] = Object.entries(mv.stages.stats)[0];
          const cur = who.stages[k];
          score = (d > 0 ? cur < 3 : cur > -3) ? 18 : 1;
        }
      } else {
        score = mv.power * effectiveness(mv.type, tTypes) * (myTypes.includes(mv.type) ? 1.5 : 1) * ((mv.acc || 100) / 100);
      }
      return { i, score };
    });
    if (this.kind === 'trainer' && rand() < 0.7) {
      scored.sort((a, b) => b.score - a.score);
      return { kind: 'move', slot: scored[0].i };
    }
    const total = scored.reduce((a, b) => a + b.score, 0);
    let r = rand() * total;
    for (const s of scored) { r -= s.score; if (r <= 0) return { kind: 'move', slot: s.i }; }
    return { kind: 'move', slot: scored[scored.length - 1].i };
  }

  // ------------------------------------------------------------------ fainting, EXP

  async faintAnim(side) {
    this.sfx('faint');
    const startDy = side.dy;
    await this.tween(0.5, (p) => { side.dy = startDy + p * 40; side.alpha = 1 - p; });
    side.visible = false;
    side.dy = 0; side.alpha = 1;
  }

  async checkFaints() {
    if (this.foe.mon && !isAlive(this.foe.mon) && this.foe.visible) {
      await this.faintAnim(this.foe);
      await this.say(`${this.label(this.foe, true)} fainted!`);
      await this.awardExp(this.foe.mon);
      this.foeIndex++;
      const next = this.foeParty[this.foeIndex];
      if (this.trainer && next) {
        this.participants = new Set(isAlive(this.me.mon) ? [this.me.mon.uid] : []);
        await this.sendOut(this.foe, next, `${this.trainer.name} sent out ${monName(next)}!`);
      } else {
        this.result = 'win';
        return;
      }
    }
    if (this.me.mon && !isAlive(this.me.mon) && this.me.visible) {
      await this.faintAnim(this.me);
      await this.say(`${monName(this.me.mon)} fainted!`);
      this.participants.delete(this.me.mon.uid);
      if (this.party.some(isAlive)) {
        const idx = await this.game.ui.partyScreen({ mode: 'battle', forced: true, activeUid: this.me.mon.uid });
        const mon = this.party[idx];
        await this.sendOut(this.me, mon, `Go! ${monName(mon)}!`);
      } else {
        this.result = 'lose';
      }
    }
  }

  async awardExp(foeMon) {
    const sp = SPECIES[foeMon.species];
    const alive = this.party.filter((m) => this.participants.has(m.uid) && isAlive(m));
    if (!alive.length) return;
    const total = Math.floor((sp.exp * foeMon.level) / 7 * (this.trainer ? 1.5 : 1));
    const each = Math.max(1, Math.floor(total / alive.length));
    for (const m of alive) {
      await this.say(`${monName(m)} gained ${each} EXP. Points!`, { hold: 0.5 });
      await this.giveExp(m, each);
    }
  }

  async giveExp(m, amount) {
    let remaining = amount;
    const active = m === this.me.mon;
    while (remaining > 0 && m.level < 100) {
      const need = expForLevel(m.level + 1) - m.exp;
      const step = Math.min(need, remaining);
      const from = expProgress(m);
      m.exp += step;
      remaining -= step;
      const to = m.exp >= expForLevel(m.level + 1) ? 1 : expProgress(m);
      if (active) {
        this.expAnimating = true;
        this.sfx('exp');
        await this.tween(0.5 * (to - from) + 0.1, (p) => this.setExpBar(from + (to - from) * p));
        this.expAnimating = false;
      }
      if (m.exp >= expForLevel(m.level + 1)) {
        m.level++;
        recalc(m);
        this.sfx('levelup');
        if (active) {
          this.me.hpShown = m.hp;
          this.setExpBar(0);
          this.aura(this.me, 'mythical', true);
        }
        this.updateHud('me');
        await this.say(`${monName(m)} grew to level ${m.level}!`, { wait: true });
        for (const id of movesAtLevel(m.species, m.level)) await this.game.learnMove(m, id, (t, o) => this.say(t, o));
        const evo = SPECIES[m.species].evo;
        if (evo && evo.level && m.level >= evo.level) this.pendingEvolutions.add(m.uid);
      }
    }
  }

  // ------------------------------------------------------------------ catching

  async throwOrb() {
    const g = this.game;
    g.useItem('orb');
    const L = this.layout();
    const foe = this.foe;
    const target = { x: L.foe.x, y: L.foe.y - L.foe.size * 0.45 };
    const start = { x: L.me.x + 20, y: L.me.y - L.me.size * 0.9 };
    this.orb = { x: start.x, y: start.y, rot: 0, visible: true };
    const talk = this.say(`${g.data.name} threw a Capture Orb!`, { hold: 0.2 });
    this.sfx('throw');
    await this.tween(0.55, (p) => {
      this.orb.x = start.x + (target.x - start.x) * p;
      this.orb.y = start.y + (target.y - start.y) * p - Math.sin(p * Math.PI) * L.sceneH * 0.35;
      this.orb.rot = p * 12;
    });
    this.orb.rot = 0;
    await talk;
    // Suck the monster in.
    foe.white = true;
    this.sfx('orbpop');
    this.burst(target, 'neutral', 10, 110);
    await this.tween(0.3, (p) => { foe.scale = 1 - p; });
    foe.visible = false;
    foe.white = false;
    const groundY = L.foe.y - 10;
    await this.tween(0.25, (p) => { this.orb.y = target.y + (groundY - target.y) * (p * p); });

    // Catch roll.
    const m = foe.mon;
    const sp = SPECIES[m.species];
    const statusBonus = m.status === 'slp' || m.status === 'frz' ? 2 : m.status ? 1.5 : 1;
    const a = ((3 * m.stats.hp - 2 * m.hp) * sp.catch * statusBonus) / (3 * m.stats.hp);
    const p = Math.min(1, a / 255);
    let shakes = 0;
    while (shakes < 4 && rand() < Math.pow(p, 0.25)) shakes++;
    const caught = shakes >= 4;

    for (let i = 0; i < Math.min(3, shakes); i++) {
      await this.wait(0.35);
      this.sfx('wobble');
      await this.tween(0.45, (q) => { this.orb.rot = Math.sin(q * Math.PI * 2) * 0.45; });
      this.orb.rot = 0;
    }
    await this.wait(0.35);

    if (caught) {
      this.sfx('caught');
      this.burst({ x: this.orb.x, y: this.orb.y - 10 }, 'mythical', 18, 140);
      await this.say(`Gotcha! ${monName(m)} was caught!`, { wait: true });
      const where = g.addCaughtMonster(m);
      if (where === 'box') await this.say(`${monName(m)} was sent to the PC Box.`);
      this.result = 'caught';
      return;
    }
    this.orb.visible = false;
    this.sfx('orbpop');
    this.burst({ x: this.orb.x, y: this.orb.y }, 'neutral', 12, 150);
    foe.visible = true;
    foe.white = true;
    await this.tween(0.25, (q) => { foe.scale = q; });
    foe.white = false;
    this.orb = null;
    const lines = ['Oh no! It broke free!', 'Aww! It appeared to be caught!', 'Aargh! Almost had it!', 'Shoot! It was so close, too!'];
    await this.say(lines[Math.min(3, shakes)]);
  }

  // ------------------------------------------------------------------ end

  async finish() {
    const t = this.trainer;
    this.hideMenus();
    if (this.result === 'win') {
      this.game.audio.playMusic('victory');
      if (t) {
        const L = this.layout();
        this.trainerShown = true;
        await this.tween(0.5, (p) => { this.trainerDx = (1 - easeOut(p)) * L.W * 0.5; });
        await this.say(`You defeated ${t.name}!`);
        for (const line of t.loseLines || []) await this.say(`${t.name}: ${this.game.ui.fmt(line)}`, { wait: true });
        if (t.prize) {
          this.game.data.money += t.prize;
          await this.say(`You got $${t.prize} for winning!`);
        }
      }
    } else if (this.result === 'lose' && t) {
      const L = this.layout();
      this.trainerShown = true;
      await this.tween(0.5, (p) => { this.trainerDx = (1 - easeOut(p)) * L.W * 0.5; });
      for (const line of t.winLines || []) await this.say(`${t.name}: ${this.game.ui.fmt(line)}`, { wait: true });
    }
    if (this.result === 'lose' && !this.opts.noBlackout) {
      const n = this.game.data.name;
      await this.say(`${n} has no more monsters that can fight!`);
      await this.say(`${n} blacked out!`, { wait: true });
    }
    // Stat stages and confusion wear off after battle.
    this.me.resetVolatile();
  }
}
