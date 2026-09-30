import { Settings, SaveGame } from './save.js';
import { Layout } from './layout.js';
import { Input } from './input.js';
import { SpriteBank } from './sprites.js';
import { Renderer } from './render.js';
import { World } from './world.js';
import { UI } from './ui.js';
import { Audio } from './audio.js';
import { MAPS } from './maps.js';
import { TILE, AUTOSAVE_SECONDS } from './config.js';

const $ = (s) => document.querySelector(s);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

class Game {
  constructor() {
    this.settings = Settings.load();
    this.audio = Audio;
    this.state = 'boot';
    this.data = null;
    this.flags = {};
    this.time = 0;
    this.autosaveTimer = 0;
    this.transitioning = false;
  }

  boot() {
    this.sprites = new SpriteBank();
    this.renderer = new Renderer($('#game'), this.sprites);
    this.world = new World(this);
    this.ui = new UI(this);
    this.input = new Input(Layout);
    this.input.bind({ dpad: $('#dpad'), a: $('#btn-a'), b: $('#btn-b'), menu: $('#btn-menu') });
    Layout.init({
      stage: $('#stage'),
      view: $('#view'),
      getMode: () => this.settings.layout,
      onChange: () => this.renderer.resize(Layout.viewW, Layout.viewH, Layout.mode),
    });
    this.renderer.resize(Layout.viewW, Layout.viewH, Layout.mode);
    this.audio.setVolumes(this.settings.music, this.settings.sfx);
    this.installGuards();
    this.showTitle();
    this.last = performance.now();
    requestAnimationFrame((t) => this.frame(t));
  }

  installGuards() {
    // Keep iOS from scrolling, zooming or showing the magnifier while playing.
    document.addEventListener('touchmove', (e) => {
      if (!e.target.closest || !e.target.closest('.panel-screen, .menu, input')) e.preventDefault();
    }, { passive: false });
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('dblclick', (e) => e.preventDefault());
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    // Any tap wakes up audio (iOS requires a user gesture).
    const wake = () => { if (this.state !== 'title' || Audio.ready) Audio.unlock(); };
    document.addEventListener('pointerup', wake);
    document.addEventListener('touchend', wake);
    document.addEventListener('keydown', wake);
    // Save when the app is backgrounded (iOS may kill it without warning).
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.saveGame(false, true); });
    window.addEventListener('pagehide', () => this.saveGame(false, true));
  }

  // ------------------------------------------------------------------ flow

  async showTitle() {
    this.state = 'title';
    this.world.showPlayer = false;
    this.world.load('mossbrook', 13, 12, 'down');
    const save = SaveGame.load();
    this.ui.showTitle({
      save,
      onContinue: () => this.continueGame(),
      onNewGame: () => this.newGame(),
    });
  }

  async newGame() {
    const { name, look } = await this.ui.newGameFlow();
    this.data = { name, look, money: 500, playTime: 0 };
    this.flags = {};
    this.world.player.look = look;
    this.world.showPlayer = true;
    this.world.load('playerHouse', 2.5, 3.8, 'down');
    this.state = 'world';
    this.audio.playMusic(this.world.map.music);
    await wait(150);
    await this.ui.fade(false);
    this.saveGame(false);
    await this.ui.dialog([
      '{name} woke up feeling like today is the start of something big.',
      'Mom is waiting by the table.',
    ]);
  }

  async continueGame() {
    const s = SaveGame.load();
    if (!s) { this.newGame(); return; }
    this.data = { name: s.name, look: s.look, money: s.money || 0, playTime: s.playTime || 0 };
    this.flags = s.flags || {};
    this.world.player.look = s.look;
    this.world.showPlayer = true;
    if (MAPS[s.map]) this.world.load(s.map, s.x, s.y, s.dir);
    else this.world.load('playerHouse', 2.5, 3.8, 'down');
    this.state = 'world';
    this.audio.playMusic(this.world.map.music);
    await wait(150);
    await this.ui.fade(false);
    this.ui.banner(this.world.map.name);
  }

  async warp(to, ax, ay, dir, sfx) {
    if (this.transitioning) return;
    this.transitioning = true;
    this.audio.sfx(sfx || 'exit');
    await this.ui.fade(true);
    const prevName = this.world.map.name;
    this.world.load(to, ax, ay, dir);
    this.audio.playMusic(this.world.map.music);
    await wait(80);
    this.ui.fade(false);
    this.transitioning = false;
    if (this.world.map.name !== prevName && this.world.map.outdoor) this.ui.banner(this.world.map.name);
    this.saveGame(false);
  }

  // ------------------------------------------------------------------ saves & settings

  saveGame(manual, silent = false) {
    if (this.state !== 'world' || !this.data || !this.world.map) return;
    const ok = SaveGame.write({
      ...this.data,
      flags: this.flags,
      ...this.world.serialize(),
      mapName: this.world.map.name,
    });
    this.autosaveTimer = 0;
    if (manual) {
      if (ok) { this.audio.sfx('save'); this.ui.toast('💾 Game saved!'); }
      else { this.audio.sfx('error'); this.ui.toast('Could not save. Is Private Browsing on?'); }
    } else if (!silent) {
      this.ui.flashSaving();
    }
  }

  hasSave() { return !!SaveGame.load(); }

  deleteSave() {
    SaveGame.erase();
    this.data = null;
    this.state = 'boot';
    this.ui.toast('Save deleted');
    setTimeout(() => location.reload(), 700);
  }

  setSetting(key, value) {
    Settings.set(key, value);
    if (key === 'layout') Layout.apply();
    if (key === 'music' || key === 'sfx') this.audio.setVolumes(this.settings.music, this.settings.sfx);
  }

  // ------------------------------------------------------------------ loop

  frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    this.time += dt;
    const { input, ui, world, renderer } = this;
    input.update(dt);

    if (ui.blocking) {
      ui.update(dt, input);
    } else if (this.state === 'world' && !this.transitioning) {
      if (input.consume('menu')) ui.openPauseMenu();
      else world.update(dt, input);
    }

    if (this.state === 'world') {
      this.data.playTime += dt;
      if (!ui.blocking) {
        this.autosaveTimer += dt;
        if (this.autosaveTimer > AUTOSAVE_SECONDS) this.saveGame(false);
      } else {
        world.updateEffects(dt);
      }
    } else if (this.state === 'title' && world.map) {
      const t = this.time;
      for (const n of world.npcs) world.updateNPC(n, dt);
      renderer.updateCamera(
        TILE * (13 + Math.sin(t * 0.11) * 7),
        TILE * (12 + Math.sin(t * 0.07) * 6),
        dt * 0.4,
      );
    }

    renderer.draw(world, this.time, dt);
    input.endFrame();
    ui.viewTap = false;
    requestAnimationFrame((t) => this.frame(t));
  }
}

const game = new Game();
window.__game = game; // handy for debugging in the console
game.boot();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is optional */ });
  });
}
