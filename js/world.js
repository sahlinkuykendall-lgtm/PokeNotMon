// The overworld: map loading, collision, the player, NPCs, warps and interactions.

import { TILE, WALK_SPEED, RUN_SPEED } from './config.js';
import { MAPS, TILES } from './maps.js';
import { trainerBattle, trainerTalk, trainerDefeated } from './story.js';
import { PRISM_CHANCE } from './monster.js';

const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };
const HB_W = 9;   // hitbox half-width
const HB_H = 10;  // hitbox height above the feet
const WALK_CYCLE = [1, 0, 2, 0];

function prepareMap(id) {
  const m = MAPS[id];
  if (m._ready) return m;
  m.id = id;
  m.h = m.tiles.length;
  m.w = m.tiles[0].length;
  m.tiles.forEach((row, i) => {
    if (row.length !== m.w) console.warn(`Map ${id}: row ${i} has width ${row.length}, expected ${m.w}`);
  });
  m.solid = new Uint8Array(m.w * m.h);
  for (let y = 0; y < m.h; y++) {
    for (let x = 0; x < m.w; x++) {
      const def = TILES[m.tiles[y][x]];
      if (!def || def.solid) m.solid[y * m.w + x] = 1;
    }
  }
  m.objectAt = new Map();
  for (const o of m.objects) {
    for (let y = o.y; y < o.y + o.h; y++) {
      for (let x = o.x; x < o.x + o.w; x++) {
        const isDoor = o.door && o.door[0] === x && o.door[1] === y;
        if (!isDoor) m.solid[y * m.w + x] = 1;
        m.objectAt.set(x + ',' + y, o);
      }
    }
  }
  m._ready = true;
  return m;
}

class Character {
  constructor(look, wx, wy, dir) {
    this.character = true;
    this.look = look;
    this.wx = wx;
    this.wy = wy;
    this.dir = dir || 'down';
    this.frame = 0;
    this.dist = 0;
    this.bob = 0;
  }
}

class NPC extends Character {
  constructor(def) {
    super(def.look, (def.x + 0.5) * TILE, (def.y + 0.8) * TILE, def.dir);
    this.def = def;
    this.home = { x: this.wx, y: this.wy };
    this.timer = 1 + Math.random() * 2.5;
    this.target = null;
    this.emote = 0;
    this.scripted = null;
    // Item balls and other objects use a sprite instead of a trainer look.
    if (def.sprite) { this.character = false; this.object = true; }
  }
}

// Wild monsters you can see walking around. Touching one starts a battle.
class Roamer {
  constructor(species, level, wx, wy) {
    this.monster = true;
    this.prism = Math.random() < PRISM_CHANCE;
    this.species = species;
    this.level = level;
    this.wx = wx; this.wy = wy;
    this.home = { x: wx, y: wy };
    this.dir = 'down';
    this.timer = Math.random() * 2;
    this.target = null;
    this.hop = 0;
  }
}

function pickWeighted(table) {
  const total = table.reduce((a, [, w]) => a + w, 0);
  let r = Math.random() * total;
  for (const [id, w] of table) { r -= w; if (r <= 0) return id; }
  return table[table.length - 1][0];
}

export class World {
  constructor(game) {
    this.game = game;
    this.map = null;
    this.player = new Character('p1', 0, 0, 'down');
    this.npcs = [];
    this.roamers = [];
    this.effects = [];
    this.grassShake = new Map();
    this.showPlayer = true;
    this.bumpTimer = 0;
    this.lastTileKey = null;
  }

  characters() {
    return this.showPlayer ? [...this.npcs, this.player] : this.npcs;
  }

  drawables() {
    return [...this.characters(), ...this.roamers];
  }

  load(id, ax, ay, dir) {
    const m = prepareMap(id);
    this.map = m;
    this.game.renderer.setMap(m);
    this.npcs = m.npcs.filter((n) => !(n.hideIf && n.hideIf(this.game))).map((n) => new NPC(n));
    this.roamers = [];
    const p = this.player;
    p.wx = ax * TILE;
    p.wy = ay * TILE;
    if (dir) p.dir = dir;
    p.frame = 0;
    this.effects = [];
    this.grassShake.clear();
    this.lastTileKey = this.tileKeyAt(p.wx, p.wy);
    this.spawnRoamers();
    this.game.renderer.updateCamera(p.wx, p.wy - 12, 0, true);
  }

  spawnRoamers() {
    const cfg = this.map.roamers;
    if (!cfg) return;
    const open = [];
    for (let y = 2; y < this.map.h - 2; y++) {
      for (let x = 2; x < this.map.w - 2; x++) {
        const ch = this.map.tiles[y][x];
        if ((ch === '.' || ch === ',') && !this.solidTile(x, y)) open.push([x, y]);
      }
    }
    const p = this.player;
    const far = open.filter(([x, y]) => Math.hypot((x + 0.5) * TILE - p.wx, (y + 0.8) * TILE - p.wy) > TILE * 6);
    const pool = far.length ? far : open;
    const place = (species, level) => {
      if (!pool.length) return;
      const [x, y] = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
      this.roamers.push(new Roamer(species, level, (x + 0.5) * TILE, (y + 0.8) * TILE));
    };
    for (let i = 0; i < cfg.count; i++) {
      const [lo, hi] = cfg.levels;
      place(pickWeighted(cfg.table), lo + Math.floor(Math.random() * (hi - lo + 1)));
    }
    if (cfg.rare && Math.random() < cfg.rare.chance) place(cfg.rare.species, cfg.rare.level);
  }

  removeRoamer(r) {
    this.roamers = this.roamers.filter((x) => x !== r);
  }

  tileKeyAt(wx, wy) {
    return Math.floor(wx / TILE) + ',' + Math.floor((wy - 4) / TILE);
  }

  solidTile(tx, ty) {
    const m = this.map;
    if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) return true;
    return m.solid[ty * m.w + tx] === 1;
  }

  blocked(self, x, y) {
    const x0 = x - HB_W, x1 = x + HB_W, y0 = y - HB_H, y1 = y;
    const tx0 = Math.floor(x0 / TILE), tx1 = Math.floor((x1 - 0.01) / TILE);
    const ty0 = Math.floor(y0 / TILE), ty1 = Math.floor((y1 - 0.01) / TILE);
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        if (this.solidTile(tx, ty)) return true;
      }
    }
    for (const c of this.characters()) {
      if (c === self) continue;
      if (Math.abs(c.wx - x) < HB_W * 2 - 2 && Math.abs(c.wy - y) < HB_H + 2) return true;
    }
    return false;
  }

  // Moves a character with wall sliding; nudges around corners so doors and
  // one-tile gaps are easy to walk into with free movement.
  moveChar(c, mx, my, assist) {
    let okX = true, okY = true;
    if (mx) { if (!this.blocked(c, c.wx + mx, c.wy)) c.wx += mx; else okX = false; }
    if (my) { if (!this.blocked(c, c.wx, c.wy + my)) c.wy += my; else okY = false; }
    if (!assist) return;
    if (!okX && Math.abs(my) < Math.abs(mx) * 0.5) this.nudge(c, 'y', mx, assist);
    if (!okY && Math.abs(mx) < Math.abs(my) * 0.5) this.nudge(c, 'x', my, assist);
  }

  nudge(c, axis, forward, maxStep) {
    for (let o = 1; o <= 14; o++) {
      for (const s of [-1, 1]) {
        const free = axis === 'x'
          ? !this.blocked(c, c.wx + s * o, c.wy + forward)
          : !this.blocked(c, c.wx + forward, c.wy + s * o);
        if (free) {
          const step = s * Math.min(o, maxStep);
          if (axis === 'x' && !this.blocked(c, c.wx + step, c.wy)) c.wx += step;
          if (axis === 'y' && !this.blocked(c, c.wx, c.wy + step)) c.wy += step;
          return;
        }
      }
    }
  }

  update(dt, input) {
    const p = this.player;
    const v = input.vec;
    const mag = Math.hypot(v.x, v.y);
    let moved = false;

    if (mag > 0.22) {
      const nx = v.x / mag, ny = v.y / mag;
      p.dir = Math.abs(nx) > Math.abs(ny) ? (nx < 0 ? 'left' : 'right') : (ny < 0 ? 'up' : 'down');
      const running = input.held.b;
      const speed = (running ? RUN_SPEED : WALK_SPEED) * (mag < 0.6 ? 0.55 : 1);
      const step = speed * dt;
      const bx = p.wx, by = p.wy;
      this.moveChar(p, nx * step, ny * step, step);
      const d = Math.hypot(p.wx - bx, p.wy - by);
      if (d > 0.05) {
        p.dist += d;
        moved = true;
        this.bumpTimer = 0;
      } else {
        this.bumpTimer -= dt;
        if (this.bumpTimer <= 0) { this.game.audio.sfx('bump'); this.bumpTimer = 0.45; }
      }
    } else {
      this.bumpTimer = 0;
    }
    p.frame = moved ? WALK_CYCLE[Math.floor(p.dist / 13) % 4] : 0;

    if (moved) {
      this.onPlayerMoved();
      if (this.checkTrainerSight()) return;
    }

    for (const n of this.npcs) this.updateNPC(n, dt);
    for (const r of this.roamers) this.updateRoamer(r, dt);
    this.updateEffects(dt);
    if (this.game.canBattle()) {
      for (const r of this.roamers) {
        if (Math.abs(r.wx - p.wx) < 20 && Math.abs(r.wy - p.wy) < 16) {
          this.removeRoamer(r);
          this.game.startWildBattle(r.species, r.level, r.prism);
          return;
        }
      }
    }
    this.game.renderer.updateCamera(p.wx, p.wy - 12, dt);

    if (input.consume('a')) this.interact();
  }

  onPlayerMoved() {
    const p = this.player;
    const key = this.tileKeyAt(p.wx, p.wy);
    if (key !== this.lastTileKey) {
      this.lastTileKey = key;
      const [tx, ty] = key.split(',').map(Number);
      const ch = this.map.tiles[ty] && this.map.tiles[ty][tx];
      if (ch && TILES[ch] && TILES[ch].tallGrass) this.rustle(tx, ty);
    }
    // Warps (doors, map edges)
    const fx = p.wx / TILE, fy = (p.wy - 4) / TILE;
    for (const w of this.map.warps) {
      if (fx >= w.x && fx < w.x + w.w && fy >= w.y && fy < w.y + w.h) {
        const ax = w.keepX != null ? fx - w.x + w.keepX : w.ax;
        this.game.warp(w.to, ax, w.ay, w.dir, w.sfx);
        return;
      }
    }
  }

  rustle(tx, ty) {
    this.grassShake.set(tx + ',' + ty, 0.35);
    this.game.audio.sfx('grass');
    for (let i = 0; i < 5; i++) {
      this.effects.push({
        wx: (tx + 0.5) * TILE + (Math.random() - 0.5) * 16,
        wy: (ty + 1) * TILE - 4,
        z: 10 + Math.random() * 6,
        vx: (Math.random() - 0.5) * 60,
        vz: 60 + Math.random() * 60,
        life: 0.5,
        color: Math.random() < 0.5 ? '#58bb4e' : '#8be07a',
      });
    }
    const enc = this.map.encounters;
    if (enc && this.game.canBattle() && Math.random() < enc.rate) {
      const [lo, hi] = enc.levels;
      this.game.startWildBattle(pickWeighted(enc.table), lo + Math.floor(Math.random() * (hi - lo + 1)));
    }
  }

  updateEffects(dt) {
    for (const [k, t] of this.grassShake) {
      if (t - dt <= 0) this.grassShake.delete(k); else this.grassShake.set(k, t - dt);
    }
    for (const fx of this.effects) {
      fx.life -= dt;
      fx.wx += fx.vx * dt;
      fx.z += fx.vz * dt;
      fx.vz -= 320 * dt;
    }
    this.effects = this.effects.filter((fx) => fx.life > 0 && fx.z > 0);
  }

  checkTrainerSight() {
    if (!this.game.canBattle()) return false;
    const p = this.player;
    const ptx = Math.floor(p.wx / TILE), pty = Math.floor((p.wy - 4) / TILE);
    for (const n of this.npcs) {
      const tr = n.def.trainer;
      if (!tr || trainerDefeated(this.game, n.def.id)) continue;
      const ntx = Math.floor(n.wx / TILE), nty = Math.floor((n.wy - 4) / TILE);
      const [dx, dy] = DIRS[n.dir];
      for (let i = 1; i <= tr.sight; i++) {
        const tx = ntx + dx * i, ty = nty + dy * i;
        if (this.solidTile(tx, ty)) break;
        if (tx === ptx && ty === pty) {
          this.game.runScript(() => trainerBattle(this.game, n, true));
          return true;
        }
      }
    }
    return false;
  }

  // Walks a trainer up to the player. Resolves when it arrives.
  approachPlayer(n) {
    const p = this.player;
    const [dx, dy] = DIRS[n.dir];
    let tx = n.wx, ty = n.wy;
    if (dx) tx = p.wx - dx * TILE;
    if (dy) ty = p.wy - dy * TILE;
    if (Math.hypot(tx - n.wx, ty - n.wy) < 4) return Promise.resolve();
    return new Promise((resolve) => { n.scripted = { x: tx, y: ty, resolve }; });
  }

  facePlayerTo(n) {
    const p = this.player;
    const dx = n.wx - p.wx, dy = n.wy - p.wy;
    p.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
    n.dir = OPPOSITE[p.dir];
    p.frame = 0;
  }

  // Runs while a script has control: NPCs can still walk and emotes still fade.
  tickScripted(dt) {
    for (const n of this.npcs) {
      if (n.emote > 0) n.emote = Math.max(0, n.emote - dt);
      if (n.scripted) this.stepScripted(n, dt);
    }
    this.updateEffects(dt);
    this.game.renderer.updateCamera(this.player.wx, this.player.wy - 12, dt);
  }

  stepScripted(n, dt) {
    const t = n.scripted;
    const dx = t.x - n.wx, dy = t.y - n.wy;
    const dist = Math.hypot(dx, dy);
    const step = Math.min(dist, 110 * dt);
    if (dist > 0.5) {
      n.wx += (dx / dist) * step;
      n.wy += (dy / dist) * step;
      n.dist += step;
      n.frame = WALK_CYCLE[Math.floor(n.dist / 13) % 4];
    }
    if (dist <= 0.5) {
      n.frame = 0;
      n.scripted = null;
      t.resolve();
    }
  }

  updateNPC(n, dt) {
    if (n.emote > 0) n.emote = Math.max(0, n.emote - dt);
    const r = n.def.wander || 0;
    if (!r) return;
    if (n.target) {
      const dx = n.target.x - n.wx, dy = n.target.y - n.wy;
      const dist = Math.hypot(dx, dy);
      const step = Math.min(dist, 52 * dt);
      const bx = n.wx, by = n.wy;
      if (dist > 0.5) this.moveChar(n, (dx / dist) * step, (dy / dist) * step, 0);
      const moved = Math.hypot(n.wx - bx, n.wy - by);
      n.dist += moved;
      n.frame = WALK_CYCLE[Math.floor(n.dist / 13) % 4];
      if (dist <= 0.5 || moved < 0.01) {
        n.target = null;
        n.frame = 0;
        n.timer = 1.2 + Math.random() * 2.8;
      }
      return;
    }
    n.timer -= dt;
    if (n.timer > 0) return;
    n.timer = 1 + Math.random() * 2;
    const dirs = Object.keys(DIRS);
    const dir = dirs[Math.floor(Math.random() * 4)];
    n.dir = dir;
    if (Math.random() < 0.35) return; // just look around
    const [ddx, ddy] = DIRS[dir];
    const tx = n.wx + ddx * TILE, ty = n.wy + ddy * TILE;
    if (Math.abs(tx - n.home.x) > r * TILE + 1 || Math.abs(ty - n.home.y) > r * TILE + 1) return;
    n.target = { x: tx, y: ty };
  }

  updateRoamer(r, dt) {
    if (r.target) {
      const dx = r.target.x - r.wx, dy = r.target.y - r.wy;
      const dist = Math.hypot(dx, dy);
      const step = Math.min(dist, 46 * dt);
      const bx = r.wx, by = r.wy;
      if (dist > 0.5) {
        const nx = r.wx + (dx / dist) * step, ny = r.wy + (dy / dist) * step;
        if (!this.solidTile(Math.floor(nx / TILE), Math.floor((ny - 4) / TILE))) { r.wx = nx; r.wy = ny; }
      }
      const moved = Math.hypot(r.wx - bx, r.wy - by);
      r.hop += moved;
      if (dist <= 0.5 || moved < 0.01) { r.target = null; r.timer = 0.8 + Math.random() * 2.2; r.hop = 0; }
      return;
    }
    r.timer -= dt;
    if (r.timer > 0) return;
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const [ddx, ddy] = dirs[Math.floor(Math.random() * 4)];
    const tx = r.wx + ddx * TILE, ty = r.wy + ddy * TILE;
    r.timer = 1 + Math.random() * 2;
    if (Math.abs(tx - r.home.x) > TILE * 3 || Math.abs(ty - r.home.y) > TILE * 3) return;
    const ch = this.map.tiles[Math.floor((ty - 4) / TILE)]?.[Math.floor(tx / TILE)];
    if (!ch || this.solidTile(Math.floor(tx / TILE), Math.floor((ty - 4) / TILE)) || TILES[ch].tallGrass) return;
    r.target = { x: tx, y: ty };
  }

  interact() {
    const p = this.player;
    const [dx, dy] = DIRS[p.dir];
    const px = p.wx + dx * 22;
    const py = p.wy - 6 + dy * 22;
    const findNpc = (x, y) => {
      let best = null, bestD = 1e9;
      for (const n of this.npcs) {
        const ddx = Math.abs(n.wx - x), ddy = Math.abs(n.wy - 6 - y);
        if (ddx < 20 && ddy < 20 && ddx + ddy < bestD) { best = n; bestD = ddx + ddy; }
      }
      return best;
    };

    let best = findNpc(px, py);
    // Talk across tables and counters, like in the classic games.
    if (!best && this.map.objectAt.has(Math.floor(px / TILE) + ',' + Math.floor(py / TILE))) {
      best = findNpc(p.wx + dx * 54, p.wy - 6 + dy * 54);
    }
    if (best) {
      best.dir = OPPOSITE[p.dir];
      best.target = null;
      best.frame = 0;
      if (best.def.trainer) { this.game.runScript(() => trainerTalk(this.game, best)); return; }
      if (best.def.script) { this.game.runScript(() => best.def.script(this.game, best)); return; }
      const lines = best.def.talk ? best.def.talk(this.game) : best.def.lines;
      this.game.ui.dialog(lines, { speaker: best.def.name });
      return;
    }

    const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
    const key = tx + ',' + ty;
    const text = this.map.texts[key];
    if (text) { this.game.ui.dialog(text); return; }
    const obj = this.map.objectAt.get(key);
    if (obj && obj.script) { this.game.runScript(() => obj.script(this.game)); return; }
    if (obj && obj.text) { this.game.ui.dialog(obj.text); return; }
    const ch = this.map.tiles[ty] && this.map.tiles[ty][tx];
    if (ch === '~') this.game.ui.dialog(['The water is calm and clear.']);
  }

  serialize() {
    const p = this.player;
    return { map: this.map.id, x: p.wx / TILE, y: p.wy / TILE, dir: p.dir };
  }
}
