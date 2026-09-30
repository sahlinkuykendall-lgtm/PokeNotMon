// Unified input: the swipeable D-pad (acts like an analog stick), A/B/Menu buttons,
// and the keyboard (for desktop testing).

const NAV_DELAY = 0.34;
const NAV_REPEAT = 0.11;

export class Input {
  constructor(layout) {
    this.layout = layout;
    this.dpadVec = { x: 0, y: 0 };
    this.vec = { x: 0, y: 0 };
    this.held = { a: false, b: false, menu: false };
    this.touchHeld = { a: false, b: false, menu: false };
    this.just = { a: false, b: false, menu: false };
    this.keys = new Set();
    this.navDir = null;
    this.navTimer = 0;
    this.navQueue = [];
    this.dpadPointer = null;
    this.onAnyInput = null;
  }

  bind({ dpad, a, b, menu }) {
    this.dpad = dpad;
    this.knob = dpad.querySelector('.knob');
    this.arms = {
      up: dpad.querySelector('.arm.up'), down: dpad.querySelector('.arm.down'),
      left: dpad.querySelector('.arm.left'), right: dpad.querySelector('.arm.right'),
    };

    dpad.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      try { dpad.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      this.dpadPointer = e.pointerId;
      dpad.classList.add('active');
      this._dpadMove(e);
      this._poke();
    });
    dpad.addEventListener('pointermove', (e) => {
      if (e.pointerId === this.dpadPointer) { e.preventDefault(); this._dpadMove(e); }
    });
    const end = (e) => {
      if (e.pointerId !== this.dpadPointer) return;
      this.dpadPointer = null;
      this.dpadVec = { x: 0, y: 0 };
      dpad.classList.remove('active');
      this._renderDpad();
    };
    dpad.addEventListener('pointerup', end);
    dpad.addEventListener('pointercancel', end);
    dpad.addEventListener('lostpointercapture', end);

    this._bindButton(a, 'a');
    this._bindButton(b, 'b');
    this._bindButton(menu, 'menu');

    window.addEventListener('keydown', (e) => this._key(e, true));
    window.addEventListener('keyup', (e) => this._key(e, false));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.touchHeld = { a: false, b: false, menu: false };
    });
  }

  _poke() { if (this.onAnyInput) this.onAnyInput(); }

  _bindButton(el, name) {
    const pointers = new Set();
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      try { el.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      pointers.add(e.pointerId);
      if (!this.touchHeld[name]) this.just[name] = true;
      this.touchHeld[name] = true;
      el.classList.add('pressed');
      this._poke();
    });
    const up = (e) => {
      pointers.delete(e.pointerId);
      if (pointers.size === 0) {
        this.touchHeld[name] = false;
        el.classList.remove('pressed');
      }
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('lostpointercapture', up);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  _dpadMove(e) {
    const r = this.dpad.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    [dx, dy] = this.layout.mapVector(dx, dy);
    const radius = (Math.max(r.width, r.height) / 2) * 0.55;
    let x = dx / radius, y = dy / radius;
    const m = Math.hypot(x, y);
    if (m > 1) { x /= m; y /= m; }
    this.dpadVec = { x, y };
    this._renderDpad();
  }

  _renderDpad() {
    const { x, y } = this.dpadVec;
    const size = this.dpad.offsetWidth;
    this.knob.style.transform = `translate(${x * size * 0.3}px, ${y * size * 0.3}px)`;
    const m = Math.hypot(x, y);
    const on = { up: false, down: false, left: false, right: false };
    if (m > 0.25) {
      const ax = Math.abs(x) / m, ay = Math.abs(y) / m;
      if (ax > 0.38) on[x < 0 ? 'left' : 'right'] = true;
      if (ay > 0.38) on[y < 0 ? 'up' : 'down'] = true;
    }
    for (const k in on) this.arms[k].classList.toggle('on', on[k]);
  }

  _key(e, down) {
    const k = e.key;
    const map = {
      ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
      w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right',
    };
    const btn = {
      z: 'a', Z: 'a', Enter: 'a', ' ': 'a',
      x: 'b', X: 'b', Shift: 'b', Backspace: 'b',
      Escape: 'menu', m: 'menu', M: 'menu', Tab: 'menu',
    };
    if (e.target && e.target.tagName === 'INPUT') return;
    if (map[k]) {
      e.preventDefault();
      if (down) this.keys.add(map[k]); else this.keys.delete(map[k]);
      if (down) this._poke();
    } else if (btn[k]) {
      e.preventDefault();
      const name = btn[k];
      if (down && !e.repeat) { this.just[name] = true; this._poke(); }
      this.keys[down ? 'add' : 'delete']('btn:' + name);
    }
  }

  // Called once per frame before game logic.
  update(dt) {
    let kx = 0, ky = 0;
    if (this.keys.has('left')) kx -= 1;
    if (this.keys.has('right')) kx += 1;
    if (this.keys.has('up')) ky -= 1;
    if (this.keys.has('down')) ky += 1;
    if (kx || ky) {
      const m = Math.hypot(kx, ky);
      this.vec = { x: kx / m, y: ky / m };
    } else {
      this.vec = { ...this.dpadVec };
    }
    for (const n of ['a', 'b', 'menu']) this.held[n] = this.touchHeld[n] || this.keys.has('btn:' + n);

    // Discrete navigation (menus) with key-repeat.
    const { x, y } = this.vec;
    const m = Math.hypot(x, y);
    let dir = null;
    if (m > 0.5) dir = Math.abs(x) > Math.abs(y) ? (x < 0 ? 'left' : 'right') : (y < 0 ? 'up' : 'down');
    if (dir !== this.navDir) {
      this.navDir = dir;
      this.navTimer = NAV_DELAY;
      if (dir) this.navQueue.push(dir);
    } else if (dir) {
      this.navTimer -= dt;
      if (this.navTimer <= 0) { this.navTimer = NAV_REPEAT; this.navQueue.push(dir); }
    }
  }

  // Returns true once per press.
  consume(name) {
    if (this.just[name]) { this.just[name] = false; return true; }
    return false;
  }

  consumeNav() { return this.navQueue.shift() || null; }

  // Called at the end of each frame: unconsumed presses expire.
  endFrame() {
    this.just.a = this.just.b = this.just.menu = false;
    this.navQueue.length = 0;
  }

  clear() {
    this.endFrame();
  }
}
