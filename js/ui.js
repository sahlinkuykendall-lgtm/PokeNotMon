// DOM-based UI: dialog boxes, pause menu, trainer card, settings, title and new-game screens.

import { LOOKS } from './sprites.js';
import { formatPlayTime } from './save.js';
import { VERSION, PHASE } from './config.js';

const $ = (sel, root = document) => root.querySelector(sel);
export const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const TEXT_SPEED = { slow: 28, normal: 55, fast: 130 };
const NAMES = ['Rowan', 'Skye', 'Juno', 'Remy', 'Kit', 'Sage', 'Quinn', 'Ezra', 'Luna', 'Milo', 'Wren', 'Zara'];

// Newly shown buttons ignore taps briefly, so the tap that revealed them
// doesn't "fall through" and press whatever appeared under the finger.
export function guardClicks(node, ms = 400) {
  node.style.pointerEvents = 'none';
  setTimeout(() => { node.style.pointerEvents = ''; }, ms);
}

export function escapeHtml(s) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// ---------------------------------------------------------------------------
// Layers: whatever is on top of the stack gets the input.
// ---------------------------------------------------------------------------

class DialogLayer {
  constructor(ui, lines, opts = {}) {
    this.ui = ui;
    this.lines = lines.map((l) => [...ui.fmt(l)]);
    this.opts = opts;
    this.i = 0;
    this.shown = 0;
    this.blip = 0;
    this.el = el('div', 'box dialog');
    if (opts.speaker) this.el.appendChild(el('div', 'speaker', escapeHtml(opts.speaker)));
    this.textEl = el('div', 'text');
    this.moreEl = el('div', 'more');
    this.moreEl.style.display = 'none';
    this.el.append(this.textEl, this.moreEl);
    this.el.addEventListener('pointerdown', (e) => { e.stopPropagation(); this.tapped = true; });
    ui.overlay.appendChild(this.el);
    this.promise = new Promise((r) => { this.resolve = r; });
  }

  update(dt, input) {
    const line = this.lines[this.i];
    const tapped = this.tapped || this.ui.consumeViewTap();
    this.tapped = false;
    const advance = () => input.consume('a') || input.consume('b') || tapped;

    if (this.shown < line.length) {
      const cps = TEXT_SPEED[this.ui.game.settings.textSpeed] || 55;
      const before = Math.floor(this.shown);
      this.shown = advance() ? line.length : Math.min(line.length, this.shown + cps * dt);
      const now = Math.floor(this.shown);
      if (now !== before) {
        this.textEl.textContent = line.slice(0, now).join('');
        this.blip += now - before;
        if (this.blip >= 3) { this.blip = 0; this.ui.game.audio.sfx('text'); }
      }
      this.moreEl.style.display = 'none';
      return;
    }
    const last = this.i === this.lines.length - 1;
    if (last && this.opts.choices) {
      if (!this.choice) this.choice = new ChoiceBox(this.ui, this.el, this.opts.choices);
      const r = this.choice.update(input);
      if (r != null) this.close(r);
      return;
    }
    this.moreEl.style.display = 'block';
    if (advance()) {
      this.ui.game.audio.sfx('blip');
      if (last) { this.close(); return; }
      this.i++;
      this.shown = 0;
      this.textEl.textContent = '';
    }
  }

  close(result) {
    this.el.remove();
    this.ui.pop(this);
    this.resolve(result);
  }
}

class ChoiceBox {
  constructor(ui, parent, options) {
    this.ui = ui;
    this.options = options;
    this.focus = 0;
    this.el = el('div', 'box choices');
    this.items = options.map((label, i) => {
      const b = el('button', 'menu-item', escapeHtml(label));
      b.addEventListener('pointerdown', (e) => { e.stopPropagation(); this.picked = i; });
      this.el.appendChild(b);
      return b;
    });
    parent.appendChild(this.el);
    this.render();
  }
  render() { this.items.forEach((b, i) => b.classList.toggle('focus', i === this.focus)); }
  update(input) {
    if (this.picked != null) { this.ui.game.audio.sfx('select'); return this.picked; }
    const nav = input.consumeNav();
    if (nav === 'up' || nav === 'down') {
      this.focus = (this.focus + (nav === 'up' ? -1 : 1) + this.options.length) % this.options.length;
      this.ui.game.audio.sfx('blip');
      this.render();
    }
    if (input.consume('a')) { this.ui.game.audio.sfx('select'); return this.focus; }
    if (input.consume('b')) { this.ui.game.audio.sfx('back'); return this.options.length - 1; }
    return null;
  }
}

class MenuLayer {
  constructor(ui, items, opts = {}) {
    this.ui = ui;
    this.items = items;
    this.focus = 0;
    this.el = el('div', 'box menu');
    this.buttons = items.map((it, i) => {
      const b = el('button', 'menu-item');
      b.innerHTML = `<span class="ico">${it.icon || ''}</span><span>${escapeHtml(it.label)}</span>` +
        (it.soon ? `<span class="soon">${escapeHtml(it.soon)}</span>` : '');
      b.addEventListener('click', (e) => { e.stopPropagation(); this.focus = i; this.render(); this.activate(); });
      this.el.appendChild(b);
      return b;
    });
    ui.overlay.appendChild(this.el);
    this.render();
    this.onClose = opts.onClose;
  }
  render() { this.buttons.forEach((b, i) => b.classList.toggle('focus', i === this.focus)); }
  activate() {
    const it = this.items[this.focus];
    if (it.action) it.action(this);
  }
  update(dt, input) {
    const nav = input.consumeNav();
    if (nav === 'up' || nav === 'down') {
      this.focus = (this.focus + (nav === 'up' ? -1 : 1) + this.items.length) % this.items.length;
      this.ui.game.audio.sfx('blip');
      this.render();
    }
    if (input.consume('a')) this.activate();
    else if (input.consume('b') || input.consume('menu')) { this.ui.game.audio.sfx('back'); this.close(); }
  }
  close() {
    this.el.remove();
    this.ui.pop(this);
    if (this.onClose) this.onClose();
  }
}

class CardLayer {
  constructor(ui, html, onBuild) {
    this.ui = ui;
    this.el = el('div', 'box card', html);
    this.el.addEventListener('click', () => this.close());
    ui.overlay.appendChild(this.el);
    if (onBuild) onBuild(this.el);
    this.promise = new Promise((r) => { this.resolve = r; });
  }
  update(dt, input) {
    if (input.consume('a') || input.consume('b') || input.consume('menu') || this.ui.consumeViewTap()) this.close();
  }
  close() {
    if (this.closed) return;
    this.closed = true;
    this.ui.game.audio.sfx('back');
    this.el.remove();
    this.ui.pop(this);
    this.resolve();
  }
}

// Full-screen layers (title, settings, new game) are mostly touch-driven.
export class ScreenLayer {
  constructor(ui, node) {
    this.ui = ui;
    this.el = node;
    ui.screen.appendChild(node);
    ui.screen.classList.add('open');
    ui.stage.classList.add('screen-open');
    this.promise = new Promise((r) => { this.resolve = r; });
    this.focus = -1;
    this.focusables = [];
  }
  setFocusables(list) {
    this.focusables = list;
    this.focus = -1;
  }
  renderFocus() { this.focusables.forEach((b, i) => b.classList.toggle('focus', i === this.focus)); }
  update(dt, input) {
    if (this.onUpdate && this.onUpdate(dt, input)) return;
    const nav = input.consumeNav();
    if (this.focusables.length && (nav === 'up' || nav === 'down')) {
      const n = this.focusables.length;
      this.focus = this.focus < 0 ? 0 : (this.focus + (nav === 'up' ? -1 : 1) + n) % n;
      this.ui.game.audio.sfx('blip');
      this.renderFocus();
    }
    if (input.consume('a') && this.focus >= 0 && this.focusables[this.focus]) this.focusables[this.focus].click();
    if ((input.consume('b') || input.consume('menu')) && this.onBack) this.onBack();
  }
  close(result) {
    this.el.remove();
    this.ui.pop(this);
    if (!this.ui.layers.some((l) => l instanceof ScreenLayer)) {
      this.ui.screen.classList.remove('open');
      this.ui.stage.classList.remove('screen-open');
    }
    this.resolve(result);
  }
}

// ---------------------------------------------------------------------------

export class UI {
  constructor(game) {
    this.game = game;
    this.stage = $('#stage');
    this.overlay = $('#overlay');
    this.screen = $('#screen');
    this.fadeEl = $('#fade');
    this.toastEl = $('#toast');
    this.bannerEl = $('#banner');
    this.saveEl = $('#save-indicator');
    this.layers = [];
    this.viewTap = false;
    $('#view').addEventListener('pointerdown', () => { this.viewTap = true; });
  }

  get blocking() { return this.layers.length > 0; }
  get top() { return this.layers[this.layers.length - 1]; }
  push(layer) { this.layers.push(layer); this.viewTap = false; return layer; }
  pop(layer) { this.layers = this.layers.filter((l) => l !== layer); }

  consumeViewTap() {
    const t = this.viewTap;
    this.viewTap = false;
    return t;
  }

  update(dt, input) {
    const top = this.top;
    if (top) top.update(dt, input);
    this.viewTap = false;
  }

  fmt(text) {
    const d = this.game.data || {};
    return String(text).replaceAll('{name}', d.name || 'you').replaceAll('{rival}', 'Kai');
  }

  // ----- small helpers -----

  dialog(lines, opts) {
    const layer = this.push(new DialogLayer(this, Array.isArray(lines) ? lines : [lines], opts));
    return layer.promise;
  }

  ask(lines, choices, opts = {}) {
    return this.dialog(lines, { ...opts, choices });
  }

  fade(on) {
    this.fadeEl.classList.toggle('on', on);
    return wait(300);
  }

  toast(msg, ms = 1800) {
    this.toastEl.textContent = msg;
    this.toastEl.classList.add('show');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => this.toastEl.classList.remove('show'), ms);
  }

  banner(name) {
    this.bannerEl.textContent = name;
    this.bannerEl.classList.add('show');
    clearTimeout(this._bannerT);
    this._bannerT = setTimeout(() => this.bannerEl.classList.remove('show'), 2400);
  }

  flashSaving() {
    this.saveEl.classList.add('show');
    clearTimeout(this._saveT);
    this._saveT = setTimeout(() => this.saveEl.classList.remove('show'), 900);
  }

  // ----- pause menu -----

  openPauseMenu() {
    const g = this.game;
    g.audio.sfx('select');
    const soon = (phase) => () => { g.audio.sfx('error'); this.toast(`🚧 Coming in Phase ${phase}!`); };
    const noMonsters = () => { g.audio.sfx('error'); this.toast("You don't have any monsters yet!"); };
    const dex = g.data.dex;
    this.push(new MenuLayer(this, [
      { icon: '🐾', label: 'Monsters', action: () => (g.data.party.length ? this.partyScreen({ mode: 'field' }) : noMonsters()) },
      { icon: '📖', label: 'Dex', soon: `${dex.caught.length} caught`, action: () => { g.audio.sfx('select'); this.toast(`Seen ${dex.seen.length} · Caught ${dex.caught.length}. The full Dex arrives in Phase 3!`, 2600); } },
      { icon: '🎒', label: 'Bag', action: () => this.bagScreen({ battle: false }) },
      { icon: '🪪', label: g.data.name, action: () => this.openTrainerCard() },
      { icon: '💾', label: 'Save', action: () => { g.saveGame(true); } },
      { icon: '⚙️', label: 'Settings', action: () => this.openSettings() },
      { icon: '✖️', label: 'Close', action: (m) => { g.audio.sfx('back'); m.close(); } },
    ]));
  }

  openTrainerCard() {
    const g = this.game;
    g.audio.sfx('select');
    const d = g.data;
    const html = `
      <h2>Trainer Card</h2>
      <div class="trainer-card">
        <canvas width="34" height="42" style="width:85px;height:105px"></canvas>
        <div style="flex:1">
          <div class="row"><span>Name</span><b>${escapeHtml(d.name)}</b></div>
          <div class="row"><span>Money</span><b>$${d.money || 0}</b></div>
          <div class="row"><span>Dex</span><b>${d.dex ? d.dex.caught.length : 0} caught</b></div>
          <div class="row"><span>Play time</span><b>${formatPlayTime(d.playTime || 0)}</b></div>
        </div>
      </div>
      <div class="badges">${'<div class="badge"></div>'.repeat(8)}</div>
      <div class="hint">Tap to close</div>`;
    const layer = this.push(new CardLayer(this, html, (node) => {
      const c = node.querySelector('canvas');
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(g.sprites.trainer(d.look, 'down', 0).img, 0, 0);
    }));
    return layer.promise;
  }

  // ----- settings -----

  openSettings() {
    const g = this.game;
    const s = g.settings;
    g.audio.sfx('select');
    const node = el('div', 'panel-screen');
    node.innerHTML = `
      <h1>⚙️ Settings</h1>
      <button class="close-x" data-act="back" aria-label="Close">✕</button>
      <div class="box settings-list">
        <div class="setting"><span>Layout</span>
          <div class="seg" data-key="layout">
            <button data-v="landscape">Landscape</button><button data-v="portrait">Portrait</button>
          </div></div>
        <div class="setting"><span>Music</span><input type="range" min="0" max="100" data-key="music"></div>
        <div class="setting"><span>Sound effects</span><input type="range" min="0" max="100" data-key="sfx"></div>
        <div class="setting"><span>Text speed</span>
          <div class="seg" data-key="textSpeed">
            <button data-v="slow">Slow</button><button data-v="normal">Normal</button><button data-v="fast">Fast</button>
          </div></div>
        <div class="setting"><span>Save data</span><button class="danger" data-act="delete">Delete save</button></div>
      </div>
      <div class="screen-actions"><button class="big-btn primary" data-act="back">Done</button></div>
      <div class="small-note">
        Tip: on iPhone, open this page in Safari, tap <b>Share</b> → <b>Add to Home Screen</b> to play fullscreen like an app.
        If the ringer switch is on silent, iPhone mutes game audio.<br>PokeNotMon v${VERSION} · Phase ${PHASE}
      </div>`;
    const layer = this.push(new ScreenLayer(this, node));

    const refresh = () => {
      node.querySelectorAll('.seg').forEach((seg) => {
        seg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', s[seg.dataset.key] === b.dataset.v));
      });
    };
    node.querySelectorAll('.seg button').forEach((b) => {
      b.addEventListener('click', () => {
        const key = b.parentElement.dataset.key;
        g.setSetting(key, b.dataset.v);
        g.audio.sfx('blip');
        refresh();
      });
    });
    node.querySelectorAll('input[type=range]').forEach((r) => {
      r.value = Math.round(s[r.dataset.key] * 100);
      r.addEventListener('input', () => g.setSetting(r.dataset.key, Number(r.value) / 100));
      r.addEventListener('change', () => g.audio.sfx('blip'));
    });
    const del = node.querySelector('[data-act=delete]');
    let armed = false;
    del.addEventListener('click', () => {
      if (!g.hasSave()) { this.toast('There is no save data.'); return; }
      if (!armed) { armed = true; del.textContent = 'Tap again to confirm'; g.audio.sfx('error'); return; }
      g.deleteSave();
    });
    const back = () => { g.audio.sfx('back'); layer.close(); };
    node.querySelectorAll('[data-act=back]').forEach((b) => b.addEventListener('click', back));
    layer.onBack = back;
    layer.setFocusables([...node.querySelectorAll('.seg button, .danger, .big-btn[data-act=back]')]);
    refresh();
    return layer.promise;
  }

  // ----- title -----

  showTitle({ save, onContinue, onNewGame }) {
    const g = this.game;
    const node = el('div', 'title-screen');
    const standalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
    node.innerHTML = `
      <div class="logo">Poke<span>Not</span>Mon</div>
      <div class="tagline">CATCH · TRAIN · BATTLE</div>
      <div class="tap">Tap to start</div>
      <div class="title-buttons" style="display:none"></div>
      <div class="title-footer">
        ${standalone ? '' : '<span class="tip">📲 Share → Add to Home Screen for fullscreen</span>'}
        v${VERSION} · Phase ${PHASE} of 6
      </div>`;
    const layer = this.push(new ScreenLayer(this, node));
    const buttons = node.querySelector('.title-buttons');
    const tap = node.querySelector('.tap');
    let started = false;

    const showMenu = () => {
      started = true;
      g.audio.unlock();
      g.audio.sfx('start');
      g.audio.playMusic('title');
      tap.style.display = 'none';
      buttons.style.display = 'flex';
      buttons.innerHTML = '';
      const list = [];
      if (save) {
        const b = el('button', 'big-btn primary',
          `Continue<small>${escapeHtml(save.name)} · ${escapeHtml(save.mapName || '')} · ${formatPlayTime(save.playTime || 0)}</small>`);
        b.addEventListener('click', async () => { g.audio.sfx('select'); await this.fade(true); layer.close(); onContinue(); });
        list.push(b);
      }
      const ng = el('button', 'big-btn' + (save ? '' : ' primary'), 'New Game');
      ng.addEventListener('click', async () => {
        g.audio.sfx('select');
        if (save) {
          const really = await this.confirmScreen('Start a new game? Your current save will be replaced when you next save.');
          if (!really) return;
        }
        layer.close();
        onNewGame();
      });
      list.push(ng);
      const st = el('button', 'big-btn', 'Settings');
      st.addEventListener('click', () => this.openSettings());
      list.push(st);
      list.forEach((b) => buttons.appendChild(b));
      guardClicks(buttons);
      layer.setFocusables(list);
    };
    node.addEventListener('pointerup', () => { if (!started) showMenu(); });
    layer.onUpdate = (dt, input) => {
      if (!started) {
        if (input.consume('a') || input.consume('menu')) showMenu();
        return true;
      }
      return false;
    };
    return layer.promise;
  }

  confirmScreen(message) {
    const node = el('div', 'panel-screen');
    node.style.justifyContent = 'center';
    node.innerHTML = `<div class="box card" style="position:static;transform:none">
        <p style="margin:0 0 14px">${escapeHtml(message)}</p>
        <div class="screen-actions" style="justify-content:flex-end;margin:0">
          <button class="big-btn" data-v="0">Cancel</button>
          <button class="big-btn primary" data-v="1">Yes</button>
        </div></div>`;
    const layer = this.push(new ScreenLayer(this, node));
    node.querySelectorAll('[data-v]').forEach((b) => b.addEventListener('click', () => {
      this.game.audio.sfx(b.dataset.v === '1' ? 'select' : 'back');
      layer.close(b.dataset.v === '1');
    }));
    layer.onBack = () => layer.close(false);
    layer.setFocusables([...node.querySelectorAll('[data-v]')]);
    return layer.promise;
  }

  // ----- new game -----

  newGameFlow() {
    const g = this.game;
    const node = el('div', 'panel-screen');
    node.style.justifyContent = 'center';
    node.innerHTML = `<div class="intro-stage"></div>`;
    const stageEl = node.querySelector('.intro-stage');
    const layer = this.push(new ScreenLayer(this, node));
    let result = { name: '', look: 'p1' };

    const profCanvas = () => {
      const c = document.createElement('canvas');
      c.width = 34; c.height = 42;
      c.className = 'prof-portrait';
      const ctx = c.getContext('2d');
      ctx.drawImage(g.sprites.trainer('prof', 'down', 0).img, 0, 0);
      return c;
    };

    // Shows lines one at a time in a box; resolves when done.
    const talk = (lines) => new Promise((resolve) => {
      stageEl.innerHTML = '';
      stageEl.appendChild(profCanvas());
      const box = el('div', 'box intro-text');
      const text = el('div');
      const more = el('div', 'more');
      box.append(text, more);
      stageEl.appendChild(box);
      let i = 0, shown = 0, chars = [...this.fmt(lines[0])];
      const advance = () => {
        if (shown < chars.length) { shown = chars.length; return; }
        g.audio.sfx('blip');
        i++;
        if (i >= lines.length) { layer.onUpdate = null; resolve(); return; }
        chars = [...this.fmt(lines[i])];
        shown = 0;
      };
      node.onpointerup = advance;
      layer.onUpdate = (dt, input) => {
        const cps = TEXT_SPEED[g.settings.textSpeed] || 55;
        if (input.consume('a') || input.consume('b')) advance();
        if (layer.onUpdate) {
          const before = Math.floor(shown);
          shown = Math.min(chars.length, shown + cps * dt);
          if (Math.floor(shown) !== before) text.textContent = chars.slice(0, Math.floor(shown)).join('');
          more.style.display = shown >= chars.length ? 'block' : 'none';
        }
        return true;
      };
    });

    const pickLook = () => new Promise((resolve) => {
      node.onpointerup = null;
      stageEl.innerHTML = '<h1>Which one are you?</h1>';
      const grid = el('div', 'look-grid');
      const cards = ['p1', 'p2', 'p3', 'p4'].map((id) => {
        const card = el('button', 'look');
        const c = document.createElement('canvas');
        c.width = 34; c.height = 42;
        c.getContext('2d').drawImage(g.sprites.trainer(id, 'down', 0).img, 0, 0);
        card.appendChild(c);
        card.appendChild(el('span', '', LOOKS[id].label));
        card.addEventListener('click', () => { result.look = id; g.audio.sfx('blip'); render(); });
        grid.appendChild(card);
        return { id, card };
      });
      const ok = el('button', 'big-btn primary', 'This is me!');
      ok.addEventListener('click', () => { g.audio.sfx('select'); resolve(); });
      const render = () => cards.forEach(({ id, card }) => card.classList.toggle('on', id === result.look));
      stageEl.append(grid, ok);
      guardClicks(stageEl);
      render();
      layer.setFocusables([...cards.map((c) => c.card), ok]);
      layer.onUpdate = null;
    });

    const pickName = () => new Promise((resolve) => {
      stageEl.innerHTML = '<h1>What\'s your name?</h1>';
      const row = el('div', 'name-row');
      const input = el('input');
      input.maxLength = 10;
      input.autocomplete = 'off';
      input.setAttribute('autocapitalize', 'words');
      input.setAttribute('spellcheck', 'false');
      input.value = NAMES[Math.floor(Math.random() * NAMES.length)];
      const dice = el('button', '', '🎲');
      dice.addEventListener('click', () => { input.value = NAMES[Math.floor(Math.random() * NAMES.length)]; g.audio.sfx('blip'); });
      row.append(input, dice);
      const ok = el('button', 'big-btn primary', 'Done');
      const done = () => {
        const name = input.value.trim().replace(/\s+/g, ' ').slice(0, 10);
        if (!name) { g.audio.sfx('error'); input.focus(); return; }
        input.blur();
        window.scrollTo(0, 0);
        result.name = name;
        g.audio.sfx('select');
        resolve();
      };
      ok.addEventListener('click', done);
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') done(); });
      stageEl.append(row, ok);
      guardClicks(stageEl);
      layer.setFocusables([ok]);
    });

    (async () => {
      await talk([
        'Hello there! Welcome to the world of PokeNotMon!',
        'My name is Hazel. Around here, people call me the Monster Professor.',
        'This world is full of creatures we call monsters. Some live alongside people. Others battle for glory.',
        'And a few... well, a few are still a mystery. Even to me.',
        'But enough about me. Tell me about yourself!',
      ]);
      await pickLook();
      await pickName();
      await talk([
        '{name}! What a great name.',
        'Your very own adventure is about to unfold.',
        'A world of monsters, rivals, and gyms awaits. Let\'s go!',
      ]);
      await this.fade(true);
      layer.close(result);
    })();

    return layer.promise.then(() => result);
  }
}
