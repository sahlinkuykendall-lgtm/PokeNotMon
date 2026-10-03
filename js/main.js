import { Settings, SaveGame } from './save.js';
import { Layout } from './layout.js';
import { Input } from './input.js';
import { SpriteBank } from './sprites.js';
import { Renderer } from './render.js';
import { World } from './world.js';
import { UI } from './ui.js';
import { installScreens } from './screens.js';
import { Audio } from './audio.js';
import { MAPS } from './maps.js';
import { TILE, AUTOSAVE_SECONDS } from './config.js';
import { MonsterArt } from './monart.js';
import { Battle } from './battle.js';
import { SPECIES } from './data/monsters.js';
import { MOVES } from './data/moves.js';
import {
  ITEMS, PRISM_CHANCE, stoneEvolution, createMonster, healFully, isAlive, monName, recalc, movesAtLevel, reviveMonster, serializeMonster,
} from './monster.js';

installScreens(UI);

const $ = (s) => document.querySelector(s);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function freshData(name, look) {
  return {
    name, look, money: 500, playTime: 0,
    party: [], box: [], bag: {},
    dex: { seen: [], caught: [] },
  };
}

class Game {
  constructor() {
    this.settings = Settings.load();
    this.audio = Audio;
    this.items = ITEMS;
    this.state = 'boot';
    this.data = null;
    this.flags = {};
    this.time = 0;
    this.autosaveTimer = 0;
    this.transitioning = false;
    this.scriptRunning = false;
    this.battle = null;
  }

  boot() {
    this.sprites = new SpriteBank();
    this.monArt = new MonsterArt();
    this.renderer = new Renderer($('#game'), this.sprites, this.monArt);
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
    this.data = freshData(name, look);
    this.flags = {};
    this.world.player.look = look;
    this.world.showPlayer = true;
    this.state = 'world';
    this.world.load('playerHouse', 2.5, 3.8, 'down');
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
    const d = freshData(s.name, s.look);
    d.money = s.money || 0;
    d.playTime = s.playTime || 0;
    d.party = (s.party || []).map(reviveMonster);
    d.box = (s.box || []).map(reviveMonster);
    d.bag = s.bag || {};
    d.dex = s.dex || { seen: [], caught: [] };
    this.data = d;
    this.flags = s.flags || {};
    this.world.player.look = s.look;
    this.world.showPlayer = true;
    this.state = 'world';
    if (MAPS[s.map]) this.world.load(s.map, s.x, s.y, s.dir);
    else this.world.load('playerHouse', 2.5, 3.8, 'down');
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

  async runScript(fn) {
    if (this.scriptRunning) return;
    this.scriptRunning = true;
    try { await fn(); } finally { this.scriptRunning = false; }
  }

  // ------------------------------------------------------------------ monsters & items

  canBattle() {
    return this.state === 'world' && !this.transitioning && !this.battle && !this.scriptRunning &&
      !this.ui.blocking && this.data && this.data.party.some(isAlive);
  }

  dexSee(id, caught = false) {
    const dex = this.data.dex;
    if (!dex.seen.includes(id)) dex.seen.push(id);
    if (caught && !dex.caught.includes(id)) dex.caught.push(id);
  }

  addCaughtMonster(m) {
    this.dexSee(m.species, true);
    if (this.data.party.length < 6) { this.data.party.push(m); return 'party'; }
    this.data.box.push(m);
    return 'box';
  }

  giveMonster(m) { return this.addCaughtMonster(m); }

  addItem(id, n = 1) { this.data.bag[id] = (this.data.bag[id] || 0) + n; }

  useItem(id) {
    if (!this.data.bag[id]) return false;
    this.data.bag[id]--;
    if (this.data.bag[id] <= 0) delete this.data.bag[id];
    return true;
  }

  healParty() {
    for (const m of this.data.party) healFully(m);
  }

  // say(text, opts) shows a message; defaults to a dialog box.
  async learnMove(m, id, say = (t) => this.ui.dialog([t])) {
    if (m.moves.some((x) => x.id === id)) return;
    const mv = MOVES[id];
    const n = monName(m);
    if (m.moves.length < 4) {
      m.moves.push({ id, pp: mv.pp });
      this.audio.sfx('levelup');
      await say(`${n} learned ${mv.name}!`, { wait: true });
      return;
    }
    await say(`${n} wants to learn ${mv.name}.`, { wait: true });
    const c = await this.ui.ask([`But ${n} already knows four moves. Forget one to make room for ${mv.name}?`], ['Yes', 'No']);
    if (c === 0) {
      const idx = await this.ui.forgetMoveScreen(m, id);
      if (idx >= 0) {
        const old = MOVES[m.moves[idx].id].name;
        m.moves[idx] = { id, pp: mv.pp };
        await say(`1, 2, and... Poof! ${n} forgot ${old}.`);
        this.audio.sfx('levelup');
        await say(`And... ${n} learned ${mv.name}!`, { wait: true });
        return;
      }
    }
    await say(`${n} did not learn ${mv.name}.`);
  }

  onEvolved(m) {
    recalc(m);
  }

  // ------------------------------------------------------------------ battles

  startWildBattle(species, level, prism) {
    const theme = this.world.map.outdoor ? 'field' : 'lab';
    const isPrism = prism ?? Math.random() < PRISM_CHANCE;
    return this.startBattle({ foes: [createMonster(species, level, { prism: isPrism })], theme });
  }

  // Uses an evolution stone on a party monster (from the Bag).
  async useStone(itemId, m) {
    const into = stoneEvolution(m, itemId);
    if (!into) return false;
    this.useItem(itemId);
    const evolved = await this.ui.evolutionScreen(m, into, true);
    if (evolved) for (const id of movesAtLevel(m.species, m.level)) await this.learnMove(m, id);
    this.audio.playMusic(this.world.map.music);
    this.saveGame(false);
    return true;
  }

  async startBattle(opts) {
    if (this.battle) return { result: 'busy', evolutions: [] };
    this.transitioning = true;
    const stage = $('#stage');
    this.audio.playMusic(opts.trainer ? 'rival' : 'battle');
    this.audio.sfx('encounter');
    const fade = this.ui.fadeEl;
    fade.classList.add('flash');
    await wait(720);
    fade.classList.add('on');
    fade.classList.remove('flash');

    this.ui.bannerEl.classList.remove('show');
    this.battle = new Battle(this, opts);
    this.state = 'battle';
    stage.classList.add('in-battle');
    await wait(100);
    this.ui.fade(false);
    this.transitioning = false;

    const out = await this.battle.run();

    await this.ui.fade(true);
    this.battle.destroy();
    this.battle = null;
    stage.classList.remove('in-battle');
    this.state = 'world';
    const p = this.world.player;
    this.renderer.updateCamera(p.wx, p.wy - 12, 0, true);

    if (out.result === 'lose' && !opts.noBlackout) {
      await this.blackout();
      return out;
    }
    this.audio.playMusic(this.world.map.music);
    await wait(120);
    await this.ui.fade(false);

    for (const uid of out.evolutions) {
      const m = this.data.party.find((x) => x.uid === uid);
      const evo = m && SPECIES[m.species].evo;
      if (!m || !evo) continue;
      const evolved = await this.ui.evolutionScreen(m, evo.into);
      if (evolved) {
        for (const id of movesAtLevel(m.species, m.level)) await this.learnMove(m, id);
      }
      this.audio.playMusic(this.world.map.music);
    }
    this.saveGame(false);
    return out;
  }

  async blackout() {
    const lost = Math.floor(this.data.money * 0.1);
    this.data.money -= lost;
    this.healParty();
    const r = this.flags.respawn;
    if (r && MAPS[r.map]) this.world.load(r.map, r.x, r.y, r.dir);
    else this.world.load('playerHouse', 2.5, 3.8, 'down');
    this.audio.playMusic(this.world.map.music);
    await wait(500);
    await this.ui.fade(false);
    if (this.world.map.id === 'center') {
      await this.ui.dialog([
        "You're back! Your monsters were brought in fainted.",
        "We've restored them to full health. Please be careful out there!",
      ], { speaker: 'Nurse Clover' });
    } else {
      await this.ui.dialog([
        'Oh my! {name}, you look exhausted!',
        "Your monsters are all patched up now. Please be careful out there!",
      ], { speaker: 'Mom' });
    }
    if (lost) await this.ui.dialog([`(You dropped $${lost} while hurrying home...)`]);
    this.saveGame(false);
  }

  // ------------------------------------------------------------------ saves & settings

  saveGame(manual, silent = false) {
    if (this.state !== 'world' || !this.data || !this.world.map) return;
    const d = this.data;
    const ok = SaveGame.write({
      name: d.name, look: d.look, money: d.money, playTime: d.playTime,
      party: d.party.map(serializeMonster),
      box: d.box.map(serializeMonster),
      bag: d.bag,
      dex: d.dex,
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
    // Always schedule the next frame first so one error can't freeze the game.
    requestAnimationFrame((t) => this.frame(t));
    try {
      this.step(now);
    } catch (err) {
      console.error(err);
    }
  }

  step(now) {
    // timeScale is a debug hook for automated tests (fast-forward).
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000)) * (this.timeScale || 1);
    this.last = now;
    this.time += dt;
    const { input, ui, world, renderer } = this;
    input.update(dt);

    if (ui.blocking) {
      ui.update(dt, input);
    } else if (this.state === 'battle' && this.battle) {
      this.battle.update(dt, input);
    } else if (this.state === 'world' && !this.transitioning && !this.scriptRunning) {
      if (input.consume('menu')) ui.openPauseMenu();
      else world.update(dt, input);
    } else if (this.state === 'world' && this.scriptRunning) {
      world.tickScripted(dt);
    }

    if (this.state === 'world' || this.state === 'battle') this.data.playTime += dt;
    if (this.state === 'world') {
      if (!ui.blocking && !this.scriptRunning) {
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

    if (this.state === 'battle' && this.battle) this.battle.draw(renderer);
    else renderer.draw(world, this.time, dt);
    input.endFrame();
    ui.viewTap = false;
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
