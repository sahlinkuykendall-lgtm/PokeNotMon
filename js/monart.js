// Draws every monster as pixel art from the `art` description in data/monsters.js.
// Front sprites face the viewer; back sprites show the monster from behind.

import { makeCanvas, pixelize, shade } from './sprites.js';
import { SPECIES } from './data/monsters.js';

const EYE = '#1d1a2a';
const W = 76, H = 72; // 64px art plus room for wings, crests and the outline

function painter(g) {
  return {
    ell(x, y, rx, ry, c, rot = 0) {
      g.fillStyle = c;
      g.beginPath();
      g.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), rot, 0, Math.PI * 2);
      g.fill();
    },
    circ(x, y, r, c) { this.ell(x, y, r, r, c); },
    poly(pts, c) {
      g.fillStyle = c;
      g.beginPath();
      g.moveTo(pts[0], pts[1]);
      for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
      g.closePath();
      g.fill();
    },
    rect(x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); },
    arc(x, y, rx, ry, a0, a1, c, w) {
      g.strokeStyle = c;
      g.lineWidth = w;
      g.beginPath();
      g.ellipse(x, y, rx, ry, 0, a0, a1);
      g.stroke();
    },
    // Mirror helper: draws fn at x and at 64 - x.
    sym(fn) { fn(1); fn(-1); },
  };
}

function palette(art) {
  const p = { ...art.pal };
  p.dark = p.dark || shade(p.main, -0.28);
  p.light = p.light || shade(p.main, 0.35);
  p.belly = p.belly || shade(p.main, 0.5);
  p.accent = p.accent || '#ffd23f';
  p.accent2 = p.accent2 || shade(p.accent, -0.2);
  return p;
}

// Anchor points for each body plan (in a 64x64 box, feet at y≈61).
const PLAN = {
  quad: { head: { x: 32, y: 25, r: 13 }, body: { x: 32, y: 45, rx: 17, ry: 11 }, tail: { x: 47, y: 40 } },
  biped: { head: { x: 32, y: 21, r: 12 }, body: { x: 32, y: 42, rx: 12, ry: 13 }, tail: { x: 42, y: 50 } },
  bird: { head: { x: 32, y: 28, r: 11 }, body: { x: 32, y: 42, rx: 15, ry: 15 }, tail: { x: 40, y: 54 } },
  blob: { head: { x: 32, y: 38, r: 16 }, body: { x: 32, y: 45, rx: 19, ry: 15 }, tail: { x: 48, y: 48 } },
  frog: { head: { x: 32, y: 36, r: 14 }, body: { x: 32, y: 47, rx: 19, ry: 12 }, tail: { x: 48, y: 48 } },
  kettle: { head: { x: 32, y: 40, r: 14 }, body: { x: 32, y: 46, rx: 17, ry: 14 }, tail: { x: 48, y: 46 } },
};

// ---------------------------------------------------------------------------
// Parts
// ---------------------------------------------------------------------------

function flame(d, x, y, s, p, lean = 0) {
  d.poly([x - 6 * s, y, x - 7 * s + lean, y - 8 * s, x - 3 * s + lean, y - 6 * s, x + lean, y - 15 * s, x + 3 * s + lean, y - 7 * s, x + 7 * s + lean, y - 10 * s, x + 6 * s, y], p.accent2);
  d.poly([x - 3.5 * s, y, x - 3 * s + lean, y - 6 * s, x + lean * 0.8, y - 10 * s, x + 3 * s + lean, y - 5 * s, x + 3.5 * s, y], p.accent);
}

function bolt(d, x, y, s, c) {
  d.poly([x, y, x + 4 * s, y - 7 * s, x + 1 * s, y - 7 * s, x + 6 * s, y - 16 * s, x - 1 * s, y - 6 * s, x + 2 * s, y - 6 * s, x - 3 * s, y], c);
}

function drawTail(d, art, p, A) {
  const t = A.tail;
  switch (art.tail) {
    case 'flame':
      d.rect(t.x - 3, t.y - 2, 5, 6, p.main);
      flame(d, t.x + 2, t.y, 1.05, p, 2);
      break;
    case 'bolt':
      d.poly([t.x - 4, t.y + 4, t.x + 4, t.y - 2, t.x + 6, t.y + 2, t.x, t.y + 7], p.main);
      bolt(d, t.x + 3, t.y + 1, 1.1, p.accent);
      break;
    case 'leaf':
      d.rect(t.x - 2, t.y - 2, 4, 4, p.accent);
      d.ell(t.x + 6, t.y - 7, 5, 9, p.accent2, 0.7);
      d.ell(t.x + 6, t.y - 7, 1, 7, p.accent, 0.7);
      break;
    case 'fluffy':
      d.ell(t.x + 4, t.y - 6, 7, 11, p.main, 0.5);
      d.ell(t.x + 7, t.y - 13, 5, 5, p.belly, 0.5);
      break;
    case 'fin':
      d.poly([t.x - 4, t.y, t.x + 10, t.y - 10, t.x + 7, t.y + 1, t.x + 12, t.y + 8, t.x - 2, t.y + 5], p.accent);
      break;
    default:
      break;
  }
}

function drawWings(d, art, p, A, back) {
  const b = A.body;
  if (art.wings === 'feather') {
    d.sym((m) => {
      const x = 32 + m * (b.rx + 4);
      d.ell(x, b.y - 12, 9, 15, p.main, m * 0.6);
      d.ell(x + m * 4, b.y - 18, 5, 10, p.light, m * 0.7);
      for (let i = 0; i < 3; i++) d.ell(x + m * (6 + i * 2), b.y - 4 + i * 3, 3, 6, p.belly, m * 0.9);
    });
  } else if (art.wings === 'bat') {
    d.sym((m) => {
      const x0 = 32 + m * 8;
      d.poly([x0, b.y - 10, x0 + m * 26, b.y - 28, x0 + m * 24, b.y - 12, x0 + m * 29, b.y - 8, x0 + m * 20, b.y - 4, x0 + m * 22, b.y + 2, x0 + m * 6, b.y], p.dark);
      d.poly([x0 + m * 4, b.y - 9, x0 + m * 22, b.y - 22, x0 + m * 18, b.y - 8, x0 + m * 5, b.y - 3], p.accent2);
    });
  } else if (art.wings === 'moth') {
    d.sym((m) => {
      d.ell(32 + m * 17, b.y - 14, 12, 10, p.accent2, m * -0.4);
      d.ell(32 + m * 15, b.y + 2, 8, 7, p.accent2, m * 0.3);
      d.circ(32 + m * 19, b.y - 15, 3.5, p.accent);
      d.circ(32 + m * 15, b.y + 2, 2.2, p.accent);
    });
  }
  if (!back && art.wings) { /* wings drawn behind in front view */ }
}

function drawEars(d, art, p, A) {
  const h = A.head;
  switch (art.ears) {
    case 'pointy':
      d.sym((m) => {
        d.poly([32 + m * (h.r - 11), h.y - h.r + 5, 32 + m * (h.r - 3), h.y - h.r - 9, 32 + m * (h.r + 1), h.y - h.r + 7], p.main);
        d.poly([32 + m * (h.r - 7), h.y - h.r + 4, 32 + m * (h.r - 3.5), h.y - h.r - 4, 32 + m * (h.r - 1), h.y - h.r + 5], p.accent2);
      });
      break;
    case 'long':
      d.sym((m) => {
        d.ell(32 + m * 5, h.y - h.r - 9, 3.6, 12, p.main, m * 0.15);
        d.ell(32 + m * 5, h.y - h.r - 8, 1.6, 9, p.accent2, m * 0.15);
      });
      break;
    case 'round':
      d.sym((m) => {
        d.circ(32 + m * (h.r - 3), h.y - h.r + 3, 5, p.main);
        d.circ(32 + m * (h.r - 3), h.y - h.r + 3, 2.5, p.accent);
      });
      break;
    case 'fin':
      d.sym((m) => {
        d.poly([32 + m * (h.r - 2), h.y - 4, 32 + m * (h.r + 11), h.y - 13, 32 + m * (h.r + 8), h.y + 1, 32 + m * (h.r - 1), h.y + 5], p.accent === '#ffd23f' ? p.dark : p.accent);
        d.poly([32 + m * (h.r + 11), h.y - 13, 32 + m * (h.r + 6), h.y - 9, 32 + m * (h.r + 8), h.y - 5], p.accent === '#ffd23f' ? p.accent : p.accent2);
      });
      break;
    default:
      break;
  }
}

function drawCrest(d, art, p, A) {
  const h = A.head;
  const top = h.y - h.r;
  switch (art.crest) {
    case 'flame':
      flame(d, 32, top + 5, 0.9, p, 1);
      break;
    case 'bolt':
      d.poly([23, top + 6, 20, top - 8, 27, top - 1, 28, top - 11, 34, top - 1, 38, top - 12, 39, top - 1, 46, top - 7, 42, top + 6], p.accent);
      d.poly([25, top + 4, 22, top - 4, 28, top + 1], p.accent2);
      break;
    case 'leaf':
      d.rect(31, top - 5, 2, 7, '#5a8a3a');
      d.ell(26, top - 6, 6, 3.2, p.accent2, -0.5);
      d.ell(38, top - 6, 6, 3.2, p.accent2, 0.5);
      break;
    case 'ice':
      for (let i = -2; i <= 2; i++) {
        const x = 32 + i * 5;
        const hgt = 9 - Math.abs(i) * 2;
        d.poly([x - 3, top + 4, x, top - hgt, x + 3, top + 4], p.accent2);
      }
      break;
    case 'tuft':
      for (let i = -1; i <= 1; i++) d.ell(32 + i * 3, top - 2, 2, 5, p.accent2, i * 0.5);
      break;
    case 'gem':
      d.poly([32, h.y - 11, 35, h.y - 7, 32, h.y - 3, 29, h.y - 7], p.accent);
      d.rect(31, h.y - 9, 1.5, 2, '#ffffff');
      break;
    case 'antenna':
      d.sym((m) => {
        d.poly([32 + m * 3, top + 3, 32 + m * 9, top - 10, 32 + m * 10, top - 9, 32 + m * 5, top + 4], p.accent);
        d.circ(32 + m * 10, top - 10, 2.6, p.accent2);
      });
      break;
    case 'star':
      d.poly([32, top - 10, 34, top - 4, 40, top - 4, 35, top, 37, top + 6, 32, top + 2, 27, top + 6, 29, top, 24, top - 4, 30, top - 4], p.accent2);
      break;
    default:
      break;
  }
  if (art.horns) {
    d.sym((m) => d.poly([32 + m * 5, top + 3, 32 + m * 9, top - 7, 32 + m * 10, top + 5], '#f4ecd8'));
  }
}

function drawFace(d, art, p, A) {
  const h = A.head;
  const big = art.eyes === 'big';
  const ex = big ? 7 : 6;
  const ey = art.body === 'blob' || art.body === 'kettle' ? h.y + 4 : art.body === 'frog' ? h.y - 3 : h.y;
  d.sym((m) => {
    const x = 32 + m * ex;
    if (art.body === 'frog') {
      d.circ(32 + m * 9, ey - 1, 6, p.main);
      d.circ(32 + m * 9, ey - 1, 4, '#ffffff');
      d.ell(32 + m * 9, ey - 0.5, 2, 2.8, EYE);
      return;
    }
    if (big) {
      d.ell(x, ey, 3.6, 4.6, EYE);
      d.rect(x - 2, ey - 3, 2, 2, '#ffffff');
    } else {
      d.ell(x, ey, 2.4, 3.2, EYE);
      d.rect(x - 1.5, ey - 2.5, 1.6, 1.6, '#ffffff');
    }
    if (art.eyes === 'fierce') {
      d.poly([x - m * 4, ey - 6, x + m * 3, ey - 3.5, x + m * 3, ey - 2, x - m * 4, ey - 4.5], EYE);
    }
    if (art.cheeks) d.ell(32 + m * (ex + 4), ey + 4, 2.4, 1.6, art.cheeks);
  });
  // mouth / muzzle
  if (art.body === 'quad') {
    d.ell(32, h.y + 7, 6.5, 4.5, p.belly);
    d.rect(30.5, h.y + 4, 3, 2, EYE);
    d.rect(29, h.y + 8, 6, 1.3, shade(p.main, -0.45));
  } else if (art.body === 'bird' || (art.extras || []).includes('beak')) {
    d.poly([28.5, ey + 3, 35.5, ey + 3, 32, ey + 8], p.accent);
  } else if (art.body === 'frog') {
    d.rect(25, h.y + 6, 14, 1.5, p.accent2);
  } else {
    d.poly([29.5, ey + 6, 34.5, ey + 6, 32, ey + 8.5], shade(p.main, -0.5));
  }
}

function drawExtrasFront(d, art, p, A) {
  const b = A.body, h = A.head;
  const ex = art.extras || [];
  if (ex.includes('spots')) {
    d.circ(b.x - 9, b.y - 2, 2.6, p.accent);
    d.circ(b.x + 10, b.y + 1, 2, p.accent);
    d.circ(b.x + 4, b.y - 8, 1.8, p.accent);
  }
  if (ex.includes('plates')) {
    d.rect(b.x - 8, b.y - 7, 16, 5, p.accent);
    d.rect(b.x - 8, b.y - 7, 16, 1.5, p.accent2);
  }
  if (ex.includes('headband')) {
    d.rect(32 - h.r + 1, h.y - 7, h.r * 2 - 2, 3, p.accent);
    d.poly([32 + h.r - 2, h.y - 7, 32 + h.r + 6, h.y - 2, 32 + h.r + 4, h.y, 32 + h.r - 2, h.y - 4], p.accent);
  }
  if (ex.includes('gloves')) {
    const gc = p.glove || p.accent;
    d.circ(19, b.y + 4, 5, gc);
    d.circ(45, b.y + 4, 5, gc);
    d.rect(17, b.y + 1, 4, 1.5, shade(gc, 0.3));
    d.rect(43, b.y + 1, 4, 1.5, shade(gc, 0.3));
  }
  if (ex.includes('claws')) {
    d.sym((m) => {
      for (let i = 0; i < 3; i++) d.poly([32 + m * (15 + i * 2), b.y + 5, 32 + m * (16 + i * 2), b.y + 9, 32 + m * (17 + i * 2), b.y + 5], '#f4ecd8');
    });
  }
}

// ---------------------------------------------------------------------------
// Body plans
// ---------------------------------------------------------------------------

function drawBody(d, art, p, A, back) {
  const b = A.body, h = A.head;
  const ex = art.extras || [];
  switch (art.body) {
    case 'quad': {
      d.rect(15, 47, 7, 13, p.dark);
      d.rect(42, 47, 7, 13, p.dark);
      if (ex.includes('shell')) {
        d.ell(32, b.y - 5, b.rx + 3, b.ry + 5, p.shell || p.dark);
        d.ell(32, b.y - 9, b.rx - 4, b.ry - 2, shade(p.shell || p.dark, 0.2));
        if (ex.includes('thorns')) for (let i = -2; i <= 2; i++) d.poly([32 + i * 7 - 3, b.y - 13, 32 + i * 7, b.y - 21 + Math.abs(i), 32 + i * 7 + 3, b.y - 13], '#e6dcb0');
        if (ex.includes('tree')) {
          d.rect(40, b.y - 30, 4, 16, '#7a4b2a');
          d.circ(42, b.y - 34, 10, p.accent);
          d.circ(38, b.y - 37, 6, p.accent2);
        }
      }
      d.ell(b.x, b.y, b.rx, b.ry, p.main);
      d.ell(b.x, b.y - 6, b.rx - 4, 4, p.light);
      if (!back) d.ell(b.x, b.y + 4, 9, 6, p.belly);
      d.rect(22, 49, 7, 12, p.main);
      d.rect(35, 49, 7, 12, p.main);
      d.rect(22, 58, 7, 3, p.light);
      d.rect(35, 58, 7, 3, p.light);
      if (ex.includes('cloudMane')) {
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 2;
          d.circ(h.x + Math.cos(a) * (h.r + 2), h.y + 2 + Math.sin(a) * (h.r + 1), 6, p.mane || p.accent);
        }
      }
      if (ex.includes('flameMane')) {
        for (let i = -2; i <= 2; i++) flame(d, 32 + i * 6, h.y + h.r + 3, 0.6, p, i);
      }
      d.circ(h.x, h.y, h.r, p.main);
      d.ell(h.x - 4, h.y - 6, 6, 3.5, p.light);
      break;
    }
    case 'biped': {
      d.ell(25, 59, 6, 3.5, p.dark);
      d.ell(39, 59, 6, 3.5, p.dark);
      d.rect(21, 47, 8, 11, p.main);
      d.rect(35, 47, 8, 11, p.main);
      d.ell(b.x, b.y, b.rx, b.ry, p.main);
      if (!back) d.ell(b.x, b.y + 3, b.rx - 4, b.ry - 4, p.belly);
      else d.ell(b.x, b.y - 4, b.rx - 4, 4, p.light);
      d.ell(19, b.y - 1, 4, 7.5, p.main, -0.35);
      d.ell(45, b.y - 1, 4, 7.5, p.main, 0.35);
      if (ex.includes('flameMane')) for (let i = -2; i <= 2; i++) flame(d, 32 + i * 5, h.y + h.r + 3, 0.55, p, i);
      d.circ(h.x, h.y, h.r, p.main);
      d.ell(h.x - 4, h.y - 5, 5, 3, p.light);
      break;
    }
    case 'bird': {
      d.sym((m) => d.ell(32 + m * 15, b.y - 1, 7, 12, p.dark, m * 0.35));
      d.ell(b.x, b.y, b.rx, b.ry, p.main);
      if (!back) d.ell(b.x, b.y + 5, 10, 9, p.belly);
      d.rect(27, 55, 2, 6, p.accent);
      d.rect(35, 55, 2, 6, p.accent);
      d.rect(25, 60, 6, 1.5, p.accent);
      d.rect(33, 60, 6, 1.5, p.accent);
      d.circ(h.x, h.y, h.r, p.main);
      d.ell(h.x - 3, h.y - 5, 5, 3, p.light);
      break;
    }
    case 'blob': {
      const y = art.float ? b.y - 6 : b.y;
      if (art.float) d.poly([22, y + 8, 42, y + 8, 36, y + 18, 32, y + 14, 28, y + 20], p.belly);
      d.ell(b.x, y, b.rx, b.ry, p.main);
      d.ell(b.x - 6, y - 8, 7, 4, p.light);
      if (!back && !art.float) d.ell(b.x, y + 7, 11, 5, p.belly);
      if (!art.float) {
        d.ell(24, 60, 5, 2.5, p.dark);
        d.ell(40, 60, 5, 2.5, p.dark);
      }
      break;
    }
    case 'frog': {
      d.sym((m) => d.ell(32 + m * 17, 52, 8, 6, p.dark));
      d.ell(b.x, b.y, b.rx, b.ry, p.main);
      if (!back) d.ell(b.x, b.y + 4, 12, 7, p.belly);
      d.ell(24, 59, 5, 2.5, p.dark);
      d.ell(40, 59, 5, 2.5, p.dark);
      if (back) d.sym((m) => d.circ(32 + m * 9, h.y - 4, 6, p.main));
      break;
    }
    case 'kettle': {
      d.poly([18, 44, 5, 32, 9, 30, 21, 40], p.accent2);
      d.arc(32, 32, 11, 9, Math.PI, Math.PI * 2, p.accent2, 3.5);
      d.ell(b.x, b.y, b.rx, b.ry, p.main);
      d.ell(b.x - 6, b.y - 6, 5, 4, p.belly);
      d.ell(32, 33, 11, 3.5, p.accent2);
      d.circ(32, 29, 3, p.accent);
      d.rect(22, 58, 5, 3, p.accent2);
      d.rect(37, 58, 5, 3, p.accent2);
      break;
    }
    default:
      break;
  }
}

function drawMonster(g, speciesId, back) {
  const sp = SPECIES[speciesId];
  const art = sp.art;
  const p = palette(art);
  const A = PLAN[art.body];
  const d = painter(g);
  const s = art.size || 1;
  g.save();
  g.translate(6, 7);
  g.translate(32, 62);
  g.scale(s, s);
  g.translate(-32, -62);

  if (!back) {
    if (art.wings) drawWings(d, art, p, A, back);
    drawTail(d, art, p, A);
    drawBody(d, art, p, A, back);
    drawEars(d, art, p, A);
    drawCrest(d, art, p, A);
    drawFace(d, art, p, A);
    drawExtrasFront(d, art, p, A);
  } else {
    drawBody(d, art, p, A, back);
    // Back shading: a darker ridge down the spine and the back of the head.
    const sh = shade(p.main, -0.14);
    if (art.body === 'quad' || art.body === 'biped') {
      d.ell(A.body.x, A.body.y + 2, A.body.rx - 6, A.body.ry - 3, sh);
      d.ell(A.head.x, A.head.y + 4, A.head.r - 4, A.head.r - 6, sh);
      d.rect(A.head.x - 1.5, A.head.y - A.head.r + 3, 3, A.head.r + 4, shade(p.main, -0.24));
    }
    drawEars(d, art, p, A);
    drawCrest(d, art, p, A);
    if (art.body === 'bird' || art.body === 'blob') d.ell(A.head.x, A.head.y + 2, A.head.r - 4, 3, shade(p.main, -0.12));
    if ((art.extras || []).includes('gloves')) {
      const gc = p.glove || p.accent;
      d.circ(19, A.body.y + 4, 5, gc);
      d.circ(45, A.body.y + 4, 5, gc);
    }
    drawTail(d, art, p, A);
    if (art.wings) drawWings(d, art, p, A, back);
  }
  g.restore();
}

// ---------------------------------------------------------------------------

function tint(src, color) {
  const c = makeCanvas(src.width, src.height);
  const g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
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

// Recolors a sprite for Prism variants by rotating the hue of colorful pixels.
function prismize(src) {
  const c = makeCanvas(src.width, src.height);
  const g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  const img = g.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const r = d[i] / 255, gg = d[i + 1] / 255, b = d[i + 2] / 255;
    const max = Math.max(r, gg, b), min = Math.min(r, gg, b);
    const l = (max + min) / 2;
    const delta = max - min;
    if (delta < 0.08) continue; // keep outlines, whites and greys
    const sat = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    let h;
    if (max === r) h = ((gg - b) / delta) % 6;
    else if (max === gg) h = (b - r) / delta + 2;
    else h = (r - gg) / delta + 4;
    h = (h * 60 + 150 + 360) % 360;
    const C = (1 - Math.abs(2 * l - 1)) * Math.min(1, sat * 1.1);
    const X = C * (1 - Math.abs(((h / 60) % 2) - 1));
    const m0 = l - C / 2;
    const [r1, g1, b1] = h < 60 ? [C, X, 0] : h < 120 ? [X, C, 0] : h < 180 ? [0, C, X] : h < 240 ? [0, X, C] : h < 300 ? [X, 0, C] : [C, 0, X];
    d[i] = Math.round((r1 + m0) * 255);
    d[i + 1] = Math.round((g1 + m0) * 255);
    d[i + 2] = Math.round((b1 + m0) * 255);
  }
  g.putImageData(img, 0, 0);
  return c;
}

export class MonsterArt {
  constructor() { this.cache = new Map(); }

  _get(key, make) {
    let v = this.cache.get(key);
    if (!v) { v = make(); this.cache.set(key, v); }
    return v;
  }

  front(id, prism = false) {
    if (prism) return this._get('pf:' + id, () => prismize(this.front(id)));
    return this._get('f:' + id, () => {
      const c = makeCanvas(W, H);
      drawMonster(c.getContext('2d'), id, false);
      return pixelize(c, '#1d1a2a');
    });
  }

  back(id, prism = false) {
    if (prism) return this._get('pb:' + id, () => prismize(this.back(id)));
    return this._get('b:' + id, () => {
      const c = makeCanvas(W, H);
      drawMonster(c.getContext('2d'), id, true);
      return mirror(pixelize(c, '#1d1a2a'));
    });
  }

  white(id, which = 'front') { return this._get('w:' + which + id, () => tint(this[which](id), '#ffffff')); }
  red(id, which = 'front') { return this._get('r:' + which + id, () => tint(this[which](id), '#ff6a6a')); }
  shadow(id) { return this._get('s:' + id, () => tint(this.front(id), '#2a2d44')); }

  // For the overworld: the front sprite drawn at about half size.
  overworld(id, prism = false) {
    return this._get('o:' + id + (prism ? 'p' : ''), () => ({
      img: this.front(id, prism), ax: 38, ay: 70,
      scale: Math.max(0.45, Math.min(0.8, 0.52 / (SPECIES[id].art.size || 1))),
    }));
  }

  orb() {
    return this._get('orb', () => {
      const c = makeCanvas(18, 18);
      const g = c.getContext('2d');
      const d = painter(g);
      d.circ(9, 9, 8, '#f4f4f4');
      g.save();
      g.beginPath(); g.rect(0, 0, 18, 9); g.clip();
      d.circ(9, 9, 8, '#2fb3c9');
      g.restore();
      d.rect(1, 8, 16, 2, '#2a2d44');
      d.circ(9, 9, 3, '#2a2d44');
      d.circ(9, 9, 2, '#ffd23f');
      d.rect(5, 4, 3, 2, '#9ae8f5');
      return pixelize(c, '#1d1a2a');
    });
  }
}
