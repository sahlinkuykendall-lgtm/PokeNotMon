// 2.5D renderer.
// The ground is painted once per map into a flat top-down buffer, then drawn to the
// screen in thin horizontal strips, each scaled by its distance from the camera
// (a "Mode 7"-style perspective). Trees, buildings and characters are upright
// billboards placed on that ground, scaled by depth and sorted back-to-front.

import { TILE, PERSP, VIEW_TILES } from './config.js';
import { makeCanvas, paintGround, hash } from './sprites.js';
import { TILES } from './maps.js';

const STRIP = 2; // backing pixels per ground strip
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class Renderer {
  constructor(canvas, sprites, monArt) {
    this.canvas = canvas;
    this.monArt = monArt;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.sprites = sprites;
    this.cam = { x: 0, y: 0 };
    this.map = null;
    this.ground = null;
    this.pad = 0;
    this.statics = [];
    this.waterTiles = [];
    this.waterFrame = 0;
    this.waterTimer = 0;
    this.shake = 0;
    this.k = 1;
    this.gw = 1; this.gh = 1;
  }

  resize(cssW, cssH, mode) {
    const rs = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.round(cssW * rs));
    this.canvas.height = Math.max(1, Math.round(cssH * rs));
    const vt = VIEW_TILES[mode] || VIEW_TILES.landscape;
    const zoom = Math.min(cssW / (vt.w * TILE), cssH / (vt.h * TILE));
    this.k = zoom * rs;
    this.gw = this.canvas.width / this.k;
    this.gh = this.canvas.height / this.k;
    this.X0 = this.gw / 2;
    this.Y0 = this.gh * PERSP.FOCUS_Y;
    this.strips = [];
    for (let by = 0; by < this.canvas.height; by += STRIP) {
      const h = Math.min(STRIP, this.canvas.height - by);
      const dy0 = this.invY(by / this.k);
      const dy1 = this.invY((by + h) / this.k);
      const dym = this.invY((by + h / 2) / this.k);
      this.strips.push({ by, h, dy0, dy1, s: PERSP.D / (PERSP.D - dym) });
    }
    this.dyTop = this.invY(0);
    this.dyBottom = this.invY(this.gh);
    this.ctx.imageSmoothingEnabled = false;
  }

  // Screen y (game px) -> world dy relative to the camera.
  invY(gy) {
    const yp = (gy - this.Y0) / PERSP.K;
    return (yp * PERSP.D) / (PERSP.D + yp);
  }

  project(wx, wy) {
    const dx = wx - this.cam.x;
    const dy = wy - this.cam.y;
    const s = PERSP.D / (PERSP.D - dy);
    return { x: this.X0 + dx * s, y: this.Y0 + dy * s * PERSP.K, s };
  }

  tileChar(tx, ty) {
    const m = this.map;
    const inside = tx >= 0 && ty >= 0 && tx < m.w && ty < m.h;
    if (!inside && !m.outdoor) return null;
    const cx = clamp(tx, 0, m.w - 1);
    const cy = clamp(ty, 0, m.h - 1);
    return m.tiles[cy][cx];
  }

  groundAt(tx, ty) {
    const ch = this.tileChar(tx, ty);
    return ch && TILES[ch] ? TILES[ch].ground : null;
  }

  setMap(map) {
    this.map = map;
    const P = (this.pad = map.outdoor ? 8 : 3);
    const W = map.w + P * 2;
    const H = map.h + P * 2;
    const buf = makeCanvas(W * TILE, H * TILE);
    const g = buf.getContext('2d');
    this.ground = buf;
    this.groundCtx = g;
    this.waterTiles = [];
    this.statics = [];

    for (let ty = -P; ty < map.h + P; ty++) {
      for (let tx = -P; tx < map.w + P; tx++) {
        const ch = this.tileChar(tx, ty);
        if (!ch) continue;
        const def = TILES[ch];
        if (!def) continue;
        const px = (tx + P) * TILE, py = (ty + P) * TILE;
        paintGround(g, def.ground, px, py, tx, ty, (dx, dy) => this.groundAt(tx + dx, ty + dy), 0);
        if (def.ground === 'water') this.waterTiles.push([tx, ty]);
        if (def.obj) {
          let name = def.obj;
          if (name === 'tree' && hash(tx, ty, 11) < 0.35) name = 'tree2';
          if (name === 'wall') name = 'wall_' + (map.wallStyle || 'home');
          this.statics.push({ kind: def.obj, name, wx: (tx + 0.5) * TILE, wy: (ty + 1) * TILE, tx, ty });
        }
      }
    }
    // Baked shadows under trees and buildings.
    g.fillStyle = 'rgba(10, 30, 10, 0.16)';
    for (const b of this.statics) {
      if (b.kind === 'tree' || b.kind === 'pine') {
        g.beginPath();
        g.ellipse(b.wx + P * TILE + 3, b.wy + P * TILE - 5, 19, 9, 0, 0, Math.PI * 2);
        g.fill();
      }
    }
    for (const o of map.objects) {
      this.statics.push({ kind: 'object', name: o.sprite, wx: (o.x + o.w / 2) * TILE, wy: (o.y + o.h) * TILE });
      if (map.outdoor) {
        g.fillStyle = 'rgba(10, 30, 10, 0.2)';
        g.fillRect((o.x + P) * TILE + 6, (o.y + o.h + P) * TILE - 2, o.w * TILE, 7);
      }
    }
    this.statics.sort((a, b) => a.wy - b.wy || a.wx - b.wx);
  }

  animateWater(dt) {
    if (!this.waterTiles.length) return;
    this.waterTimer += dt;
    if (this.waterTimer < 0.45) return;
    this.waterTimer = 0;
    this.waterFrame = (this.waterFrame + 1) % 4;
    const P = this.pad;
    for (const [tx, ty] of this.waterTiles) {
      paintGround(this.groundCtx, 'water', (tx + P) * TILE, (ty + P) * TILE, tx, ty,
        (dx, dy) => this.groundAt(tx + dx, ty + dy), this.waterFrame);
    }
  }

  // Keeps the camera inside the map (with a little breathing room).
  updateCamera(tx, ty, dt, snap = false) {
    const m = this.map;
    if (!m) return;
    const mw = m.w * TILE, mh = m.h * TILE;
    const margin = m.outdoor ? TILE * 1.5 : TILE * 0.5;
    const contentTop = m.outdoor ? -margin : -TILE * 2.4; // interiors: show the back wall
    const contentBottom = mh + margin;
    const halfW = this.X0;
    let cx, cy;
    if (mw + margin * 2 <= halfW * 2) cx = mw / 2;
    else cx = clamp(tx, halfW - margin, mw - halfW + margin);
    const minY = contentTop - this.dyTop;
    const maxY = contentBottom - this.dyBottom;
    if (minY >= maxY) cy = (contentTop + contentBottom) / 2 - (this.dyTop + this.dyBottom) / 2;
    else cy = clamp(ty, minY, maxY);
    if (snap) { this.cam.x = cx; this.cam.y = cy; return; }
    const f = 1 - Math.exp(-dt * 9);
    this.cam.x += (cx - this.cam.x) * f;
    this.cam.y += (cy - this.cam.y) * f;
  }

  drawGround(ox, oy) {
    const ctx = this.ctx;
    const B = this.ground;
    const P = this.pad * TILE;
    const W = this.canvas.width;
    const iw = B.width, ih = B.height;
    for (const st of this.strips) {
      let sy = this.cam.y + st.dy0 + P;
      let sh = st.dy1 - st.dy0;
      let sw = this.gw / st.s;
      let sx = this.cam.x - this.X0 / st.s + P;
      let dx = ox, dy = st.by + oy, dw = W, dh = st.h;
      // Clip the source rect to the buffer (Safari won't draw out-of-bounds rects).
      if (sx < 0) { const f = -sx / sw; dx += dw * f; dw -= dw * f; sw += sx; sx = 0; }
      if (sx + sw > iw) { const f = (sx + sw - iw) / sw; dw -= dw * f; sw = iw - sx; }
      if (sy < 0) { const f = -sy / sh; dy += dh * f; dh -= dh * f; sh += sy; sy = 0; }
      if (sy + sh > ih) { const f = (sy + sh - ih) / sh; dh -= dh * f; sh = ih - sy; }
      if (sw <= 0 || sh <= 0 || dw <= 0 || dh <= 0) continue;
      ctx.drawImage(B, sx, sy, sw, sh, dx, dy, dw, dh);
    }
  }

  drawSprite(spr, p, bob = 0) {
    const s = p.s * (spr.scale || 1);
    const w = spr.img.width * s, h = spr.img.height * s;
    const x = p.x - spr.ax * s;
    const y = p.y - spr.ay * s - bob * p.s;
    if (x > this.gw || x + w < 0 || y > this.gh || y + h < 0) return;
    this.ctx.drawImage(spr.img, x, y, w, h);
  }

  draw(world, time, dt) {
    const ctx = this.ctx;
    const map = this.map;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = map ? map.bg : '#000';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    if (!map) return;

    this.animateWater(dt);
    let sx = 0, sy = 0;
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt);
      sx = (Math.random() - 0.5) * 8 * this.shake * this.k;
      sy = (Math.random() - 0.5) * 8 * this.shake * this.k;
    }
    this.drawGround(sx, sy);

    ctx.setTransform(this.k, 0, 0, this.k, sx, sy);
    ctx.imageSmoothingEnabled = false;

    const list = [];
    const dyMin = this.dyTop - 8;
    const dyMax = this.dyBottom + 220;
    for (const b of this.statics) {
      const dy = b.wy - this.cam.y;
      if (dy < dyMin || dy > dyMax) continue;
      list.push(b);
    }
    for (const c of world.drawables()) {
      const dy = c.wy - this.cam.y;
      if (dy < dyMin || dy > dyMax) continue;
      list.push(c);
    }
    list.sort((a, b) => a.wy - b.wy);

    const sprites = this.sprites;
    for (const b of list) {
      const p = this.project(b.wx, b.wy);
      if (!(p.s > 0)) continue;
      if (b.object) {
        const spr = sprites.get(b.def.sprite);
        if (spr) this.drawSprite(spr, p, Math.abs(Math.sin(time * 2)) * 1.5);
        continue;
      }
      if (b.monster) {
        const spr = this.monArt.overworld(b.species, b.prism);
        if (b.prism && Math.random() < 0.08) {
          world.effects.push({ wx: b.wx + (Math.random() - 0.5) * 24, wy: b.wy, z: 10 + Math.random() * 20, vx: 0, vz: 20, life: 0.5, color: Math.random() < 0.5 ? '#fff6a0' : '#ffffff' });
        }
        const hop = Math.abs(Math.sin(b.hop / 9)) * 5 + Math.abs(Math.sin(time * 2 + b.home.x)) * 1.2;
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y - 1 * p.s, 12 * p.s, 4.5 * p.s * PERSP.K, 0, 0, Math.PI * 2);
        ctx.fill();
        this.drawSprite(spr, p, hop);
        continue;
      }
      if (b.character) {
        const spr = sprites.trainer(b.look, b.dir, b.frame);
        ctx.fillStyle = 'rgba(0,0,0,0.24)';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y - 1 * p.s, 11 * p.s, 4.5 * p.s * PERSP.K, 0, 0, Math.PI * 2);
        ctx.fill();
        this.drawSprite(spr, p, b.bob || 0);
        if (b.emote > 0) {
          const e = sprites.get('emote');
          const pop = b.emote > 1.1 ? 1 : Math.min(1, (1.1 - b.emote) * 8);
          this.drawSprite(e, { x: p.x, y: p.y - 42 * p.s, s: p.s * 1.7 * Math.max(0.3, pop) });
        }
        continue;
      }
      let name = b.name;
      if (b.kind === 'tallgrass') {
        const shaking = world.grassShake.get(b.tx + ',' + b.ty);
        const f = shaking ? Math.floor(time * 14) % 2 : Math.floor(time * 1.4 + b.tx * 0.37 + b.ty * 0.61) % 2;
        name = 'tallgrass' + f;
      }
      const spr = sprites.get(name);
      if (spr) this.drawSprite(spr, p);
    }

    // Particles (grass rustle, etc.)
    for (const fx of world.effects) {
      const p = this.project(fx.wx, fx.wy);
      if (!(p.s > 0)) continue;
      ctx.fillStyle = fx.color;
      const size = 3 * p.s;
      ctx.fillRect(p.x - size / 2, p.y - fx.z * p.s - size / 2, size, size);
    }

    // Atmospheric haze toward the horizon.
    if (map.outdoor) {
      const grad = ctx.createLinearGradient(0, 0, 0, this.gh * 0.35);
      grad.addColorStop(0, 'rgba(190, 225, 255, 0.34)');
      grad.addColorStop(1, 'rgba(190, 225, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, this.gw, this.gh * 0.35);
    } else {
      const grad = ctx.createLinearGradient(0, this.gh * 0.75, 0, this.gh);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.25)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, this.gh * 0.75, this.gw, this.gh * 0.25);
    }
  }
}
