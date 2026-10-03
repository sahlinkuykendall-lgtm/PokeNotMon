// All art is drawn in code as pixel art, then cleaned up (hard alpha + dark outline)
// so it reads like hand-made 32x32 sprites.

import { TILE } from './config.js';

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

export function hash(x, y, s = 0) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 982451653)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function shade(hex, amt) {
  const [r, g, b] = hexToRgb(hex);
  const f = (v) => Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
  return '#' + [f(r), f(g), f(b)].map((v) => v.toString(16).padStart(2, '0')).join('');
}

// Hard-edged alpha + 1px outline around the shape.
export function pixelize(c, outline = '#1d1a2a', cut = 110) {
  const ctx = c.getContext('2d');
  const w = c.width, h = c.height;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 3; i < d.length; i += 4) d[i] = d[i] >= cut ? 255 : 0;
  if (outline) {
    const [r, g, b] = hexToRgb(outline);
    const solid = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) solid[i] = d[i * 4 + 3] ? 1 : 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (solid[i]) continue;
        if ((x > 0 && solid[i - 1]) || (x < w - 1 && solid[i + 1]) ||
            (y > 0 && solid[i - w]) || (y < h - 1 && solid[i + w])) {
          d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = 255;
        }
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function mirror(src) {
  const c = makeCanvas(src.width, src.height);
  const g = c.getContext('2d');
  g.translate(src.width, 0);
  g.scale(-1, 1);
  g.drawImage(src, 0, 0);
  return c;
}

function circle(g, x, y, r, col) {
  g.fillStyle = col;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
}

function ellipse(g, x, y, rx, ry, col) {
  g.fillStyle = col;
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  g.fill();
}

function poly(g, pts, col) {
  g.fillStyle = col;
  g.beginPath();
  g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  g.closePath();
  g.fill();
}

// ---------------------------------------------------------------------------
// Ground tiles (painted into the big per-map ground buffer)
// ---------------------------------------------------------------------------

export const GROUND_COLORS = {
  grass: '#7cc862',
  grassDark: '#62ad4d',
  path: '#dcc08a',
  sand: '#eedc9e',
  water: '#4fa6e0',
  wood: '#c98f55',
  labfloor: '#e6ebef',
  dark: '#2a2433',
  wallbase: '#6a5a4a',
};

const PATHLIKE = new Set(['path']);

// nb(dx, dy) returns the ground type of a neighbouring tile.
export function paintGround(g, type, px, py, tx, ty, nb, frame = 0) {
  const R = (col, x, y, w, h) => { g.fillStyle = col; g.fillRect(px + x, py + y, w, h); };
  const T = TILE;
  switch (type) {
    case 'grass':
    case 'flowers':
    case 'grassDark': {
      const base = type === 'grassDark' ? GROUND_COLORS.grassDark : GROUND_COLORS.grass;
      const dark = type === 'grassDark' ? '#4f9640' : '#63b04c';
      const light = type === 'grassDark' ? '#74bd5c' : '#98da78';
      R(base, 0, 0, T, T);
      for (let i = 0; i < 6; i++) {
        const x = Math.floor(hash(tx, ty, i) * 28) + 1;
        const y = Math.floor(hash(tx, ty, i + 20) * 28) + 2;
        R(dark, x, y, 1, 2); R(dark, x + 2, y, 1, 2); R(dark, x + 1, y + 1, 1, 2);
      }
      for (let i = 0; i < 4; i++) {
        const x = Math.floor(hash(tx, ty, i + 40) * 30);
        const y = Math.floor(hash(tx, ty, i + 60) * 30);
        R(light, x, y, 2, 1);
      }
      if (type === 'flowers') {
        const cols = ['#f25c54', '#ffd23f', '#ffffff', '#ff8fc7', '#8fb8ff'];
        for (let i = 0; i < 3; i++) {
          const x = 4 + Math.floor(hash(tx, ty, i + 80) * 22);
          const y = 4 + Math.floor(hash(tx, ty, i + 90) * 22);
          const col = cols[Math.floor(hash(tx, ty, i + 99) * cols.length)];
          R('#3f8a35', x + 1, y + 3, 1, 3);
          R(col, x, y + 1, 3, 1); R(col, x + 1, y, 1, 3);
          R('#fff3a0', x + 1, y + 1, 1, 1);
        }
      }
      break;
    }
    case 'path': {
      R(GROUND_COLORS.path, 0, 0, T, T);
      for (let i = 0; i < 5; i++) {
        const x = Math.floor(hash(tx, ty, i + 5) * 29);
        const y = Math.floor(hash(tx, ty, i + 15) * 29);
        R('#c7a771', x, y, 2, 2);
        R('#ecd6a4', x + 1, y - 1 < 0 ? 0 : y - 1, 2, 1);
      }
      // Soft grass fringe on edges that meet grass.
      const edges = [[0, -1], [0, 1], [-1, 0], [1, 0]];
      for (const [dx, dy] of edges) {
        const n = nb(dx, dy);
        if (PATHLIKE.has(n) || n === 'sand' || n === 'mat' || n == null) continue;
        const grassCol = n === 'grassDark' ? GROUND_COLORS.grassDark : GROUND_COLORS.grass;
        for (let i = 0; i < T; i += 2) {
          const depth = 2 + Math.floor(hash(tx * 7 + dx, ty * 7 + dy, i) * 3);
          if (dy === -1) { R(grassCol, i, 0, 2, depth); R('#c2a26c', i, depth, 2, 1); }
          if (dy === 1) { R(grassCol, i, T - depth, 2, depth); R('#c2a26c', i, T - depth - 1, 2, 1); }
          if (dx === -1) { R(grassCol, 0, i, depth, 2); R('#c2a26c', depth, i, 1, 2); }
          if (dx === 1) { R(grassCol, T - depth, i, depth, 2); R('#c2a26c', T - depth - 1, i, 1, 2); }
        }
      }
      break;
    }
    case 'sand': {
      R(GROUND_COLORS.sand, 0, 0, T, T);
      for (let i = 0; i < 6; i++) {
        R('#dcc585', Math.floor(hash(tx, ty, i) * 30), Math.floor(hash(tx, ty, i + 9) * 30), 1, 1);
      }
      break;
    }
    case 'water': {
      R(GROUND_COLORS.water, 0, 0, T, T);
      R('#469bd4', 0, 16, T, 16);
      for (let i = 0; i < 3; i++) {
        const y = 4 + i * 10 + Math.floor(hash(tx, ty, i) * 4);
        const x = (Math.floor(hash(tx, ty, i + 30) * 24) + frame * 3) % 26;
        R('#8fd0f5', x, y, 6, 1);
        R('#bfe6fb', x + 1, y - 1, 3, 1);
      }
      const edges = [[0, -1], [0, 1], [-1, 0], [1, 0]];
      for (const [dx, dy] of edges) {
        const n = nb(dx, dy);
        if (n === 'water' || n == null) continue;
        const foam = frame % 2 ? '#d9f1fc' : '#b7e3f8';
        if (dy === -1) { R('#d6c188', 0, 0, T, 3); R(foam, 0, 3, T, 2); }
        if (dy === 1) { R(foam, 0, T - 4, T, 2); R('#d6c188', 0, T - 2, T, 2); }
        if (dx === -1) { R('#d6c188', 0, 0, 3, T); R(foam, 3, 0, 2, T); }
        if (dx === 1) { R(foam, T - 5, 0, 2, T); R('#d6c188', T - 3, 0, 3, T); }
      }
      break;
    }
    case 'wood':
    case 'mat':
    case 'rug': {
      R(GROUND_COLORS.wood, 0, 0, T, T);
      for (let y = 0; y < T; y += 8) {
        R('#a8703e', 0, y + 7, T, 1);
        const seam = Math.floor(hash(tx, ty, y) * 30);
        R('#b17b46', seam, y, 1, 7);
        R('#d6a06a', 0, y, T, 1);
      }
      if (type === 'mat') {
        R('#8a2a24', 3, 6, T - 6, T - 10);
        R('#c8423a', 5, 8, T - 10, T - 14);
        R('#e0685e', 5, 8, T - 10, 2);
      }
      if (type === 'rug') {
        R('#4a63b0', 0, 0, T, T);
        R('#6b86d6', 3, 3, T - 6, T - 6);
        for (let i = 6; i < T - 6; i += 6) R('#f2d06b', i, 6, 2, T - 12);
        const e = [[0, -1], [0, 1], [-1, 0], [1, 0]];
        for (const [dx, dy] of e) {
          if (nb(dx, dy) === 'rug') continue;
          if (dy === -1) R('#f2d06b', 0, 0, T, 2);
          if (dy === 1) R('#f2d06b', 0, T - 2, T, 2);
          if (dx === -1) R('#f2d06b', 0, 0, 2, T);
          if (dx === 1) R('#f2d06b', T - 2, 0, 2, T);
        }
      }
      break;
    }
    case 'labfloor': {
      const a = (tx + ty) % 2 === 0;
      R(a ? '#e9eef2' : '#d7dfe5', 0, 0, T, T);
      R('#c3cdd6', 0, T - 1, T, 1); R('#c3cdd6', T - 1, 0, 1, T);
      R('#ffffff', 2, 2, 5, 1);
      break;
    }
    case 'wallbase':
      R(GROUND_COLORS.wallbase, 0, 0, T, T);
      break;
    case 'dark':
      R(GROUND_COLORS.dark, 0, 0, T, T);
      R('#3a3346', 0, 0, T, 2);
      break;
    default:
      break;
  }
}

// ---------------------------------------------------------------------------
// Billboard objects (upright sprites standing on the ground)
// Each sprite: { img, ax, ay } where (ax, ay) is the anchor = the point that
// touches the ground (bottom-center of the object's footprint).
// ---------------------------------------------------------------------------

function tree(variant = 0) {
  const c = makeCanvas(50, 66);
  const g = c.getContext('2d');
  g.translate(1, 1);
  // trunk
  g.fillStyle = '#7a4b2a'; g.fillRect(19, 40, 10, 18);
  g.fillStyle = '#5a3620'; g.fillRect(25, 40, 4, 18);
  g.fillStyle = '#7a4b2a'; g.fillRect(16, 55, 16, 3);
  // canopy
  const pal = variant === 1
    ? ['#2e7449', '#3f9460', '#5bb77a', '#8ad8a3']
    : ['#2d7a3c', '#3f9b47', '#58ba55', '#8be07a'];
  circle(g, 24, 26, 21, pal[0]);
  circle(g, 13, 32, 11, pal[0]);
  circle(g, 35, 32, 11, pal[0]);
  circle(g, 22, 23, 17, pal[1]);
  circle(g, 19, 18, 10, pal[2]);
  circle(g, 15, 14, 3, pal[3]);
  for (let i = 0; i < 22; i++) {
    const x = 8 + Math.floor(hash(i, variant, 3) * 32);
    const y = 8 + Math.floor(hash(i, variant, 7) * 30);
    g.fillStyle = hash(i, 1) > 0.5 ? pal[0] : pal[2];
    g.fillRect(x, y, 2, 2);
  }
  g.fillStyle = shade(pal[0], -0.25);
  g.fillRect(8, 40, 32, 2);
  pixelize(c, '#163a1f');
  return { img: c, ax: 25, ay: 58 };
}

function pine() {
  const c = makeCanvas(42, 70);
  const g = c.getContext('2d');
  g.translate(1, 1);
  g.fillStyle = '#6a4226'; g.fillRect(17, 52, 7, 10);
  const tiers = [[20, 2, 8, 20], [20, 12, 13, 32], [20, 24, 17, 46], [20, 36, 19, 56]];
  for (const [cx, top, half, bottom] of tiers) {
    poly(g, [cx, top, cx + half, bottom, cx - half, bottom], '#2a6a4a');
    poly(g, [cx, top + 3, cx + half - 5, bottom - 2, cx - half + 2, bottom - 2], '#3a8a5e');
    poly(g, [cx - 1, top + 5, cx - 6, bottom - 5, cx - half + 5, bottom - 4], '#57ad78');
  }
  pixelize(c, '#153526');
  return { img: c, ax: 21, ay: 62 };
}

function tallGrass(frame) {
  const c = makeCanvas(34, 28);
  const g = c.getContext('2d');
  g.translate(1, 1);
  g.fillStyle = '#2f8030'; g.fillRect(0, 19, 32, 7);
  const blades = [[2, 7], [7, 3], [12, 8], [16, 2], [21, 6], [26, 3], [30, 8]];
  blades.forEach(([x, top], i) => {
    const lean = (frame ? 2 : -1) * (i % 2 ? 1 : -1) * 0.7;
    const col = i % 2 ? '#3fa03b' : '#58bb4e';
    poly(g, [x - 3, 26, x + 3, 26, x + lean + 0.5, top], col);
    poly(g, [x - 1, 22, x + 1, 22, x + lean + 0.5, top + 3], '#7fd46d');
  });
  pixelize(c, '#1c5421');
  return { img: c, ax: 17, ay: 27 };
}

function fence() {
  const c = makeCanvas(34, 30);
  const g = c.getContext('2d');
  g.translate(1, 1);
  g.fillStyle = '#d7b27a'; g.fillRect(0, 9, 32, 4); g.fillRect(0, 17, 32, 4);
  g.fillStyle = '#b78d55'; g.fillRect(0, 12, 32, 1); g.fillRect(0, 20, 32, 1);
  g.fillStyle = '#e6c894'; g.fillRect(3, 3, 6, 24); g.fillRect(23, 3, 6, 24);
  g.fillStyle = '#b78d55'; g.fillRect(7, 3, 2, 24); g.fillRect(27, 3, 2, 24);
  g.fillStyle = '#f2dcb0'; g.fillRect(3, 3, 6, 2); g.fillRect(23, 3, 6, 2);
  pixelize(c, '#5a3b1c');
  return { img: c, ax: 17, ay: 28 };
}

function sign() {
  const c = makeCanvas(34, 34);
  const g = c.getContext('2d');
  g.translate(1, 1);
  g.fillStyle = '#7a4d2a'; g.fillRect(13, 16, 6, 16);
  g.fillStyle = '#c8955a'; g.fillRect(2, 2, 28, 18);
  g.fillStyle = '#e0b27a'; g.fillRect(2, 2, 28, 3);
  g.fillStyle = '#8a5a2e';
  g.fillRect(6, 8, 20, 2); g.fillRect(6, 13, 14, 2);
  pixelize(c, '#3e2512');
  return { img: c, ax: 17, ay: 31 };
}

function rock() {
  const c = makeCanvas(34, 28);
  const g = c.getContext('2d');
  g.translate(1, 1);
  ellipse(g, 16, 16, 15, 10, '#8a9099');
  ellipse(g, 14, 13, 11, 7, '#a9afb7');
  ellipse(g, 11, 10, 4, 2, '#d0d5da');
  g.fillStyle = '#6e747c'; g.fillRect(4, 22, 24, 3);
  pixelize(c, '#3b3f46');
  return { img: c, ax: 17, ay: 26 };
}

function barrier() {
  const c = makeCanvas(34, 32);
  const g = c.getContext('2d');
  g.translate(1, 1);
  g.fillStyle = '#6d6d78'; g.fillRect(3, 12, 4, 18); g.fillRect(25, 12, 4, 18);
  g.fillStyle = '#fff'; g.fillRect(0, 6, 32, 10);
  g.fillStyle = '#f0782a';
  for (let x = -8; x < 32; x += 10) poly(g, [x, 16, x + 5, 16, x + 13, 6, x + 8, 6], '#f0782a');
  g.fillStyle = '#ffd23f'; g.fillRect(14, 0, 4, 5);
  pixelize(c, '#2a2a33');
  return { img: c, ax: 17, ay: 30 };
}

function house(roof, wall = '#f3e6c4') {
  const W = 128, H = 138;
  const c = makeCanvas(W + 2, H + 2);
  const g = c.getContext('2d');
  g.translate(1, 1);
  const roofDark = shade(roof, -0.22);
  const roofLight = shade(roof, 0.25);
  // walls
  g.fillStyle = wall; g.fillRect(4, 78, 120, 60);
  g.fillStyle = shade(wall, -0.1); g.fillRect(4, 128, 120, 10);
  g.fillStyle = '#9a6a42'; g.fillRect(4, 78, 5, 60); g.fillRect(119, 78, 5, 60);
  // roof
  poly(g, [0, 86, 128, 86, 116, 12, 12, 12], roof);
  g.save();
  g.beginPath(); g.moveTo(0, 86); g.lineTo(128, 86); g.lineTo(116, 12); g.lineTo(12, 12); g.closePath(); g.clip();
  for (let y = 20; y < 86; y += 9) {
    g.fillStyle = roofDark; g.fillRect(0, y, 128, 2);
    for (let x = (y / 9) % 2 ? 4 : 12; x < 128; x += 16) g.fillRect(x, y - 7, 2, 7);
  }
  g.restore();
  g.fillStyle = roofLight; g.fillRect(12, 10, 104, 5);
  g.fillStyle = roofDark; g.fillRect(0, 84, 128, 4);
  // chimney
  g.fillStyle = '#a0584a'; g.fillRect(90, 0, 14, 26);
  g.fillStyle = '#7e4034'; g.fillRect(90, 6, 14, 2); g.fillRect(90, 14, 14, 2);
  g.fillStyle = '#c47868'; g.fillRect(88, 0, 18, 3);
  // eave shadow
  g.fillStyle = shade(wall, -0.3); g.fillRect(4, 88, 120, 4);
  // windows
  const win = (x, y) => {
    g.fillStyle = '#ffffff'; g.fillRect(x - 2, y - 2, 28, 22);
    g.fillStyle = '#86c9ee'; g.fillRect(x, y, 24, 18);
    g.fillStyle = '#b6e2f7'; g.fillRect(x + 2, y + 2, 6, 4);
    g.fillStyle = '#ffffff'; g.fillRect(x + 11, y, 2, 18); g.fillRect(x, y + 8, 24, 2);
    g.fillStyle = '#8a5a3a'; g.fillRect(x - 3, y + 20, 30, 3);
  };
  win(80, 98);
  // door (tile column 1 => x 32..64)
  g.fillStyle = '#6b3f20'; g.fillRect(36, 98, 24, 40);
  g.fillStyle = '#8f5a30'; g.fillRect(38, 100, 20, 38);
  g.fillStyle = '#7a4a26'; g.fillRect(41, 104, 14, 12); g.fillRect(41, 120, 14, 14);
  g.fillStyle = '#ffd23f'; g.fillRect(53, 120, 3, 3);
  g.fillStyle = '#b8b0a0'; g.fillRect(33, 135, 30, 3);
  // flower box
  g.fillStyle = '#7a4a26'; g.fillRect(14, 122, 16, 6);
  g.fillStyle = '#f25c54'; g.fillRect(15, 118, 3, 3); g.fillRect(24, 118, 3, 3);
  g.fillStyle = '#ffd23f'; g.fillRect(20, 117, 3, 3);
  pixelize(c, '#2a1d17');
  return { img: c, ax: 65, ay: 139 };
}

function lab() {
  const W = 160, H = 158;
  const c = makeCanvas(W + 2, H + 2);
  const g = c.getContext('2d');
  g.translate(1, 1);
  const wall = '#eef1f4';
  g.fillStyle = wall; g.fillRect(4, 74, 152, 84);
  g.fillStyle = '#d5dbe2'; g.fillRect(4, 146, 152, 12);
  g.fillStyle = '#b9c4cf';
  for (let x = 40; x < 156; x += 40) g.fillRect(x, 80, 2, 66);
  // roof
  poly(g, [0, 82, 160, 82, 148, 18, 12, 18], '#3f8597');
  g.fillStyle = '#34707f';
  for (let y = 28; y < 82; y += 10) g.fillRect(0, y, 160, 2);
  g.fillStyle = '#5fa8b9'; g.fillRect(12, 16, 136, 5);
  g.fillStyle = '#2b5a66'; g.fillRect(0, 80, 160, 4);
  // roof gear: dish + vent
  g.fillStyle = '#9aa6b2'; g.fillRect(118, 4, 4, 16);
  ellipse(g, 120, 6, 10, 5, '#d9e0e6');
  ellipse(g, 120, 5, 6, 2, '#b2bcc6');
  g.fillStyle = '#c0c8d0'; g.fillRect(30, 6, 22, 12);
  g.fillStyle = '#8b96a1'; g.fillRect(30, 9, 22, 2); g.fillRect(30, 13, 22, 2);
  // eave shadow
  g.fillStyle = '#c3ccd4'; g.fillRect(4, 84, 152, 4);
  // windows
  const win = (x, y, w) => {
    g.fillStyle = '#5a6a78'; g.fillRect(x - 2, y - 2, w + 4, 30);
    g.fillStyle = '#7fc6ea'; g.fillRect(x, y, w, 26);
    g.fillStyle = '#b8e3f6'; g.fillRect(x + 3, y + 3, 8, 5);
    g.fillStyle = '#5a6a78'; g.fillRect(x + w / 2 - 1, y, 2, 26);
  };
  win(12, 104, 40); win(108, 104, 40);
  // sign
  g.fillStyle = '#2b3a4a'; g.fillRect(56, 90, 48, 16);
  g.fillStyle = '#7ee0ff';
  g.font = 'bold 12px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('LAB', 80, 99);
  // sliding glass door (tile column 2 => x 64..96)
  g.fillStyle = '#5a6a78'; g.fillRect(64, 110, 32, 48);
  g.fillStyle = '#9ad4ee'; g.fillRect(67, 113, 12, 45); g.fillRect(81, 113, 12, 45);
  g.fillStyle = '#d6f0fb'; g.fillRect(69, 115, 3, 12); g.fillRect(83, 115, 3, 12);
  g.fillStyle = '#b8c2cc'; g.fillRect(60, 155, 40, 3);
  pixelize(c, '#1f2a36');
  return { img: c, ax: 81, ay: 159 };
}

function wall(style) {
  const c = makeCanvas(32, 76);
  const g = c.getContext('2d');
  if (style === 'lab') {
    g.fillStyle = '#44525f'; g.fillRect(0, 0, 32, 8);
    g.fillStyle = '#dfe8ee'; g.fillRect(0, 8, 32, 60);
    g.fillStyle = '#c9d5de'; g.fillRect(0, 36, 32, 2); g.fillRect(31, 8, 1, 60);
    g.fillStyle = '#8fa0ae'; g.fillRect(0, 68, 32, 8);
  } else {
    g.fillStyle = '#5a4636'; g.fillRect(0, 0, 32, 8);
    g.fillStyle = '#efe2c0'; g.fillRect(0, 8, 32, 60);
    g.fillStyle = '#e2d0a4';
    for (let x = 2; x < 32; x += 8) g.fillRect(x, 8, 3, 60);
    g.fillStyle = '#d4b98a'; g.fillRect(0, 8, 32, 2);
    g.fillStyle = '#9a7456'; g.fillRect(0, 68, 32, 8);
    g.fillStyle = '#b58c6a'; g.fillRect(0, 68, 32, 2);
  }
  return { img: c, ax: 16, ay: 76 };
}

function furniture(kind) {
  let c, g, ax, ay;
  const start = (w, h) => { c = makeCanvas(w + 2, h + 2); g = c.getContext('2d'); g.translate(1, 1); ax = (w + 2) / 2; ay = h + 1; };
  const R = (col, x, y, w, h) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  switch (kind) {
    case 'bed':
      start(32, 60);
      R('#8a5a3a', 1, 0, 30, 16); R('#a8724a', 3, 2, 26, 4);
      R('#f4f4f4', 2, 12, 28, 46); R('#ffffff', 5, 14, 22, 9); R('#dcdcdc', 5, 21, 22, 2);
      R('#5a8ad8', 2, 28, 28, 30); R('#7ba6ec', 2, 28, 28, 4); R('#4a74bc', 2, 54, 28, 4);
      R('#8a5a3a', 1, 56, 30, 4);
      break;
    case 'tv':
      start(32, 44);
      R('#5a4a3a', 4, 30, 24, 14); R('#6e5c49', 6, 32, 20, 3);
      R('#3a3a44', 2, 6, 28, 24); R('#6ac0e8', 5, 9, 22, 17); R('#b6e6f8', 7, 11, 6, 3);
      R('#3a3a44', 10, 0, 2, 6); R('#3a3a44', 20, 0, 2, 6);
      break;
    case 'pc':
      start(32, 46);
      R('#a0703f', 0, 28, 32, 6); R('#7d5530', 2, 34, 4, 12); R('#7d5530', 26, 34, 4, 12);
      R('#d9dee4', 5, 6, 22, 18); R('#3b8fd0', 8, 9, 16, 11); R('#9ad4f8', 9, 10, 5, 3);
      R('#c0c7cf', 13, 24, 6, 4); R('#e6e9ed', 6, 26, 14, 3);
      break;
    case 'table':
      start(64, 40);
      R('#8a5a33', 6, 22, 5, 18); R('#8a5a33', 53, 22, 5, 18);
      R('#b07a48', 0, 8, 64, 16); R('#c99562', 0, 8, 64, 4); R('#8a5a33', 0, 22, 64, 3);
      R('#ffffff', 20, 3, 8, 7); R('#e0e0e0', 20, 8, 8, 2);
      R('#f25c54', 38, 4, 10, 5);
      break;
    case 'plant':
      start(32, 46);
      R('#c8703a', 9, 32, 14, 14); R('#a8582a', 9, 32, 14, 3);
      ellipse(g, 16, 20, 12, 10, '#3f9b47');
      ellipse(g, 10, 14, 6, 8, '#58ba55');
      ellipse(g, 22, 12, 6, 9, '#4aa84e');
      ellipse(g, 16, 8, 4, 7, '#6cc760');
      break;
    case 'bookshelf':
      start(32, 64);
      R('#7a4a2a', 0, 0, 32, 64); R('#5a3620', 2, 2, 28, 60);
      for (let s = 0; s < 3; s++) {
        const y = 4 + s * 20;
        R('#8f5a34', 2, y + 16, 28, 3);
        for (let x = 3; x < 29;) {
          const w = 3 + Math.floor(hash(x, s, 4) * 3);
          const h = 11 + Math.floor(hash(x, s, 5) * 5);
          const cols = ['#d8434f', '#4b6db5', '#f2c94c', '#3f9b47', '#9b59b6', '#e88a3c'];
          R(cols[Math.floor(hash(x, s, 6) * cols.length)], x, y + 16 - h, Math.min(w, 29 - x), h);
          x += w + 1;
        }
      }
      break;
    case 'machine':
      start(64, 58);
      R('#8f9ba8', 0, 6, 64, 52); R('#b6c0ca', 0, 6, 64, 5);
      R('#1f2a36', 6, 14, 30, 22); R('#5ee89a', 9, 17, 24, 16);
      R('#2b8a5a', 11, 22, 20, 2); R('#2b8a5a', 11, 27, 14, 2);
      R('#e0525e', 44, 16, 6, 6); R('#ffd23f', 54, 16, 6, 6); R('#5b8def', 44, 26, 16, 5);
      R('#6e7a86', 4, 44, 56, 10); R('#58636e', 8, 47, 48, 2);
      R('#ffd23f', 28, 0, 8, 6);
      break;
    case 'labtable':
      start(64, 40);
      R('#9aa6b2', 6, 22, 5, 18); R('#9aa6b2', 53, 22, 5, 18);
      R('#f4f6f8', 0, 10, 64, 14); R('#ffffff', 0, 10, 64, 3); R('#c3ccd4', 0, 22, 64, 3);
      [[14, '#f0782a'], [32, '#4fa6e0'], [50, '#58ba55']].forEach(([x, col]) => {
        circle(g, x, 8, 6, col);
        R('#ffffff', x - 6, 8, 12, 5);
        R('#2a2a33', x - 6, 7, 12, 2);
        R('#fff', x - 1, 6, 3, 3);
      });
      break;
    case 'counter':
      start(32, 40);
      R('#c7d0d8', 0, 8, 32, 32); R('#e6ebef', 0, 8, 32, 5); R('#9aa6b2', 0, 36, 32, 4);
      break;
    default:
      start(32, 32);
      R('#f0f', 0, 0, 32, 32);
  }
  pixelize(c, kind === 'counter' ? null : '#231a18');
  return { img: c, ax, ay };
}

function monsterCenter() {
  const W = 160, H = 152;
  const c = makeCanvas(W + 2, H + 2);
  const g = c.getContext('2d');
  g.translate(1, 1);
  g.fillStyle = '#fbf6f2'; g.fillRect(4, 70, 152, 82);
  g.fillStyle = '#eee2dc'; g.fillRect(4, 140, 152, 12);
  g.fillStyle = '#e8606a'; g.fillRect(4, 70, 152, 8);
  // roof
  poly(g, [0, 76, 160, 76, 146, 14, 14, 14], '#e8505c');
  g.fillStyle = '#c63c48';
  for (let y = 24; y < 76; y += 10) g.fillRect(0, y, 160, 2);
  g.fillStyle = '#f48a92'; g.fillRect(14, 12, 132, 5);
  g.fillStyle = '#a82e3a'; g.fillRect(0, 74, 160, 4);
  // big sign with a heart
  g.fillStyle = '#ffffff'; g.fillRect(60, 24, 40, 34);
  g.fillStyle = '#e8505c';
  circle(g, 74, 36, 7, '#e8505c'); circle(g, 86, 36, 7, '#e8505c');
  poly(g, [67, 38, 93, 38, 80, 52], '#e8505c');
  g.fillStyle = '#ffffff'; g.fillRect(77, 34, 6, 12); g.fillRect(74, 37, 12, 6);
  // windows
  const win = (x) => {
    g.fillStyle = '#c8b8b0'; g.fillRect(x - 2, 90, 34, 28);
    g.fillStyle = '#9ad4ee'; g.fillRect(x, 92, 30, 24);
    g.fillStyle = '#d6f0fb'; g.fillRect(x + 3, 95, 7, 5);
  };
  win(14); win(116);
  // door (tile column 2 => x 64..96)
  g.fillStyle = '#c8b8b0'; g.fillRect(64, 104, 32, 48);
  g.fillStyle = '#9ad4ee'; g.fillRect(67, 107, 12, 45); g.fillRect(81, 107, 12, 45);
  g.fillStyle = '#d6f0fb'; g.fillRect(69, 109, 3, 12); g.fillRect(83, 109, 3, 12);
  g.fillStyle = '#e8606a'; g.fillRect(60, 98, 40, 5);
  g.fillStyle = '#d8ccc6'; g.fillRect(60, 149, 40, 3);
  pixelize(c, '#3a1d22');
  return { img: c, ax: 81, ay: 153 };
}

function wideCounter(tiles) {
  const W = tiles * 32;
  const c = makeCanvas(W + 2, 42);
  const g = c.getContext('2d');
  g.translate(1, 1);
  g.fillStyle = '#f4ecea'; g.fillRect(0, 8, W, 32);
  g.fillStyle = '#ffffff'; g.fillRect(0, 8, W, 6);
  g.fillStyle = '#e8606a'; g.fillRect(0, 22, W, 4);
  g.fillStyle = '#d8ccc6'; g.fillRect(0, 36, W, 4);
  pixelize(c, '#4a2a2e');
  return { img: c, ax: W / 2 + 1, ay: 41 };
}

function centerWall() {
  const c = makeCanvas(32, 76);
  const g = c.getContext('2d');
  g.fillStyle = '#a83a46'; g.fillRect(0, 0, 32, 8);
  g.fillStyle = '#fbf2ee'; g.fillRect(0, 8, 32, 60);
  g.fillStyle = '#f6dcd8'; g.fillRect(0, 40, 32, 28);
  g.fillStyle = '#e8606a'; g.fillRect(0, 38, 32, 3);
  g.fillStyle = '#c8a8a4'; g.fillRect(0, 68, 32, 8);
  return { img: c, ax: 16, ay: 76 };
}

function emoteBubble() {
  const c = makeCanvas(20, 24);
  const g = c.getContext('2d');
  g.translate(1, 1);
  g.fillStyle = '#ffffff';
  g.fillRect(1, 0, 16, 16);
  poly(g, [6, 15, 12, 15, 7, 21], '#ffffff');
  g.fillStyle = '#e8343c';
  g.fillRect(7, 2, 4, 8);
  g.fillRect(7, 12, 4, 3);
  pixelize(c, '#1d1a2a');
  return { img: c, ax: 10, ay: 23 };
}

function itemBall() {
  const c = makeCanvas(18, 18);
  const g = c.getContext('2d');
  g.translate(1, 1);
  circle(g, 8, 8, 7.5, '#f4f4f4');
  g.save(); g.beginPath(); g.rect(0, 0, 16, 8); g.clip();
  circle(g, 8, 8, 7.5, '#e8505c');
  g.restore();
  g.fillStyle = '#2a2d44'; g.fillRect(0, 7, 16, 2);
  circle(g, 8, 8, 2.6, '#2a2d44');
  circle(g, 8, 8, 1.5, '#ffffff');
  g.fillStyle = '#ffb0b8'; g.fillRect(4, 3, 3, 2);
  pixelize(c, '#1d1a2a');
  return { img: c, ax: 9, ay: 16 };
}

// ---------------------------------------------------------------------------
// Trainers / NPC characters (34x42 canvas, feet at the bottom)
// ---------------------------------------------------------------------------

export const LOOKS = {
  p1: { label: 'Blaze', hairStyle: 'cap', hair: '#2b2320', hat: '#d8403a', brim: '#a82f2a', skin: '#f5c9a0', shirt: '#d8403a', shirt2: '#f4f4f4', pants: '#3b5aa8', shoes: '#2a2a2a' },
  p2: { label: 'Fern', hairStyle: 'long', hair: '#7a4a2a', band: '#3fae5a', skin: '#f1c29a', shirt: '#f2c94c', shirt2: '#e89a2c', pants: '#2f2f3a', shoes: '#b0413e' },
  p3: { label: 'Volt', hairStyle: 'spiky', hair: '#f0d060', skin: '#e8b88f', shirt: '#3a7bd5', shirt2: '#9fd0ff', pants: '#5b5f6b', shoes: '#e8e8e8' },
  p4: { label: 'Nova', hairStyle: 'ponytail', hair: '#b05cc8', skin: '#8d5a3b', shirt: '#f4f4f4', shirt2: '#9b59b6', pants: '#3a2f4a', shoes: '#9b59b6' },
  mom: { hairStyle: 'bun', hair: '#6b3e26', skin: '#f5c9a0', shirt: '#e88aa8', shirt2: '#ffffff', pants: '#6a4a7a', shoes: '#4a3a3a' },
  prof: { hairStyle: 'bun', hair: '#b9bac4', skin: '#f1c29a', shirt: '#5b8c5a', shirt2: '#5b8c5a', coat: '#f7f7f7', glasses: '#3a3a4a', pants: '#4a4a5a', shoes: '#3a3a3a' },
  kai: { hairStyle: 'spiky', hair: '#2c3e8f', skin: '#f1c29a', shirt: '#f08a2c', shirt2: '#2a2a2a', pants: '#2a2a3a', shoes: '#f0f0f0' },
  kid: { hairStyle: 'short', hair: '#3a2a1a', skin: '#f5c9a0', shirt: '#57b35a', shirt2: '#ffffff', pants: '#3b5aa8', shoes: '#333333' },
  girl: { hairStyle: 'long', hair: '#e0a040', skin: '#f5d0b0', shirt: '#e85a8a', shirt2: '#ffffff', pants: '#f4f4f4', shoes: '#e85a8a' },
  oldman: { hairStyle: 'bald', hair: '#dcdcdc', skin: '#e8b890', shirt: '#8a6a4a', shirt2: '#6a4a2a', pants: '#5a5a5a', shoes: '#333333' },
  hiker: { hairStyle: 'cap', hat: '#7a5a2a', brim: '#5a3f1a', hair: '#3a2a1a', skin: '#d8a070', shirt: '#6a8a3a', shirt2: '#e0c070', pants: '#5a4a3a', shoes: '#3a2a1a' },
  guard: { hairStyle: 'cap', hat: '#2a3a6a', brim: '#1a2448', hair: '#2a2a2a', skin: '#c89070', shirt: '#2a3a6a', shirt2: '#ffd23f', pants: '#1f2a4a', shoes: '#222222' },
  nurse: { hairStyle: 'bun', hair: '#f08aa0', skin: '#f5d0b0', shirt: '#ffffff', shirt2: '#e8606a', pants: '#ffffff', shoes: '#e8606a', coat: '#ffffff' },
  clerk: { hairStyle: 'short', hair: '#2a2a3a', skin: '#e8b88f', shirt: '#4b8ec8', shirt2: '#ffffff', pants: '#2f3a4a', shoes: '#222222' },
  youngster: { hairStyle: 'cap', hat: '#3a7bd5', brim: '#2c5fa8', hair: '#3a2a1a', skin: '#f5c9a0', shirt: '#f2c94c', shirt2: '#ffffff', pants: '#3b5aa8', shoes: '#d8403a' },
  camper: { hairStyle: 'short', hair: '#6b3e26', skin: '#d8a070', shirt: '#4a8a3a', shirt2: '#e0c070', pants: '#7a6a4a', shoes: '#3a2a1a' },
  aide: { hairStyle: 'short', hair: '#4a3020', skin: '#f1c29a', shirt: '#5b8def', shirt2: '#ffffff', coat: '#f7f7f7', glasses: '#3a3a4a', pants: '#3a3a4a', shoes: '#333333' },
};

function drawTrainer(L, dir, frame) {
  const c = makeCanvas(34, 42);
  const g = c.getContext('2d');
  g.translate(1, 1);
  const R = (col, x, y, w, h) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const d = dir === 'right' ? 'left' : dir;
  const up = frame ? -1 : 0; // walking bob
  const side = d === 'left';
  const eye = '#23202c';

  // Legs
  if (!side) {
    const lLift = frame === 1 ? 2 : 0;
    const rLift = frame === 2 ? 2 : 0;
    R(L.pants, 11, 30, 4, 6 - lLift); R(L.shoes, 11, 35 - lLift, 4, 3);
    R(L.pants, 17, 30, 4, 6 - rLift); R(L.shoes, 17, 35 - rLift, 4, 3);
  } else {
    const off = frame === 1 ? 2 : frame === 2 ? -2 : 0;
    R(shade(L.pants, -0.25), 15 - off, 30, 4, 6); R(shade(L.shoes, -0.25), 14 - off, 35, 5, 3);
    R(L.pants, 13 + off, 30, 4, 6); R(L.shoes, 12 + off, 35, 5, 3);
  }

  // Body
  const armSwing = frame === 1 ? 1 : frame === 2 ? -1 : 0;
  if (!side) {
    if (L.coat) {
      R(L.coat, 8, 21 + up, 16, 13);
      R(L.shirt, 13, 21 + up, 6, 7);
      R(shade(L.coat, -0.12), 15, 28 + up, 2, 6);
    } else {
      R(L.shirt, 9, 21 + up, 14, 10);
      if (d === 'down') { R(L.shirt2, 14, 21 + up, 4, 2); R(L.shirt2, 15, 23 + up, 2, 7); }
      else R(shade(L.shirt, -0.15), 9, 29 + up, 14, 2);
    }
    const sleeve = L.coat || L.shirt;
    R(sleeve, 6, 22 + up + armSwing, 3, 6); R(L.skin, 6, 28 + up + armSwing, 3, 3);
    R(sleeve, 23, 22 + up - armSwing, 3, 6); R(L.skin, 23, 28 + up - armSwing, 3, 3);
  } else {
    const body = L.coat || L.shirt;
    R(body, 11, 21 + up, 10, L.coat ? 13 : 10);
    R(shade(body, -0.2), 14 + armSwing, 22 + up, 4, 6);
    R(L.skin, 14 + armSwing, 28 + up, 4, 3);
  }

  // Head
  R(L.skin, 8, 6 + up, 16, 15);
  g.clearRect(8, 6 + up, 1, 1); g.clearRect(23, 6 + up, 1, 1);
  g.clearRect(8, 20 + up, 1, 1); g.clearRect(23, 20 + up, 1, 1);

  // Face
  if (d === 'down') {
    R(eye, 11, 12 + up, 2, 4); R(eye, 19, 12 + up, 2, 4);
    R('#ffffff', 11, 12 + up, 1, 1); R('#ffffff', 19, 12 + up, 1, 1);
    R('#f09a8a', 9, 17 + up, 2, 1); R('#f09a8a', 21, 17 + up, 2, 1);
    R(shade(L.skin, -0.3), 15, 18 + up, 2, 1);
    if (L.glasses) {
      R(L.glasses, 10, 11 + up, 4, 1); R(L.glasses, 18, 11 + up, 4, 1); R(L.glasses, 14, 12 + up, 4, 1);
    }
  } else if (side) {
    R(eye, 10, 12 + up, 2, 4); R('#ffffff', 10, 12 + up, 1, 1);
    R('#f09a8a', 9, 17 + up, 2, 1);
    if (L.glasses) R(L.glasses, 8, 11 + up, 6, 1);
  }

  // Hair / hats
  const H = L.hair;
  const style = L.hairStyle;
  if (style === 'cap') {
    if (d === 'down') {
      R(H, 7, 9 + up, 2, 5); R(H, 23, 9 + up, 2, 5);
      R(L.hat, 7, 2 + up, 18, 7); R(L.brim, 6, 8 + up, 20, 2);
      R('#ffffff', 14, 4 + up, 4, 3);
    } else if (d === 'up') {
      R(H, 7, 8 + up, 18, 9);
      R(L.hat, 7, 2 + up, 18, 8); R(shade(L.hat, -0.2), 7, 8 + up, 18, 2);
    } else {
      R(H, 15, 8 + up, 10, 9);
      R(L.hat, 8, 2 + up, 17, 7); R(L.brim, 3, 8 + up, 11, 2);
    }
  } else if (style === 'bald') {
    if (d === 'down') { R(H, 7, 10 + up, 2, 5); R(H, 23, 10 + up, 2, 5); }
    else if (d === 'up') R(H, 8, 11 + up, 16, 5);
    else R(H, 17, 10 + up, 7, 5);
  } else {
    // base hair
    if (d === 'down') {
      R(H, 7, 3 + up, 18, 6);
      R(H, 7, 8 + up, 3, 6); R(H, 22, 8 + up, 3, 6);
      R(H, 10, 8 + up, 3, 2); R(H, 15, 8 + up, 4, 1); R(H, 19, 8 + up, 2, 2);
      R(shade(H, 0.25), 11, 4 + up, 6, 1);
    } else if (d === 'up') {
      R(H, 7, 3 + up, 18, 15);
      R(shade(H, 0.2), 11, 4 + up, 8, 1);
    } else {
      R(H, 7, 3 + up, 18, 6);
      R(H, 15, 8 + up, 10, 10);
      R(H, 7, 8 + up, 4, 2);
      R(shade(H, 0.25), 10, 4 + up, 6, 1);
    }
    if (style === 'spiky') {
      for (const x of [7, 11, 15, 19]) poly(g, [x, 5 + up, x + 3, -1 + up, x + 6, 5 + up], H);
      if (d === 'left') poly(g, [22, 6 + up, 27, 8 + up, 23, 12 + up], H);
    } else if (style === 'long') {
      if (d === 'down') { R(H, 5, 8 + up, 4, 15); R(H, 23, 8 + up, 4, 15); }
      else if (d === 'up') R(H, 5, 3 + up, 22, 21);
      else R(H, 14, 8 + up, 12, 16);
    } else if (style === 'ponytail') {
      if (d === 'down') R(H, 24, 9 + up, 3, 11);
      else if (d === 'up') { R(H, 13, 17 + up, 6, 9); R(L.shirt2, 13, 16 + up, 6, 2); }
      else { R(H, 24, 8 + up, 4, 12); R(L.shirt2, 23, 8 + up, 2, 3); }
    } else if (style === 'bun') {
      circle(g, 16, 2 + up, 4, H);
    }
    if (L.band) {
      if (d === 'down') R(L.band, 7, 5 + up, 18, 3);
      else if (d === 'up') R(L.band, 7, 5 + up, 18, 3);
      else { R(L.band, 7, 5 + up, 18, 3); R(L.band, 24, 7 + up, 3, 5); }
    }
  }

  pixelize(c, '#1f1b2a');
  return dir === 'right' ? mirror(c) : c;
}

// ---------------------------------------------------------------------------
// Public sprite bank
// ---------------------------------------------------------------------------

export class SpriteBank {
  constructor() {
    this.cache = new Map();
    this.objects = {
      tree: tree(0),
      tree2: tree(1),
      pine: pine(),
      tallgrass0: tallGrass(0),
      tallgrass1: tallGrass(1),
      fence: fence(),
      sign: sign(),
      rock: rock(),
      barrier: barrier(),
      house_red: house('#d0453b'),
      house_blue: house('#3b6fc4', '#f4ecd8'),
      lab: lab(),
      wall_home: wall('home'),
      wall_lab: wall('lab'),
      wall_center: centerWall(),
      center: monsterCenter(),
      counter2: wideCounter(2),
      counter4: wideCounter(4),
      emote: emoteBubble(),
      itemball: itemBall(),
    };
    for (const k of ['bed', 'tv', 'pc', 'table', 'plant', 'bookshelf', 'machine', 'labtable', 'counter']) {
      this.objects[k] = furniture(k);
    }
  }

  get(name) { return this.objects[name]; }

  trainer(lookId, dir, frame) {
    const key = `${lookId}:${dir}:${frame}`;
    let s = this.cache.get(key);
    if (!s) {
      s = { img: drawTrainer(LOOKS[lookId] || LOOKS.p1, dir, frame), ax: 17, ay: 39 };
      this.cache.set(key, s);
    }
    return s;
  }
}
