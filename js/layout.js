// Sizes the game "stage" to the screen. If the chosen layout (landscape/portrait)
// doesn't match how the phone is held (e.g. rotation lock is on), the whole stage
// is rotated 90° with CSS so the game still works.

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const Layout = {
  rotation: 0,
  mode: 'landscape',
  stageW: 0, stageH: 0,
  viewW: 0, viewH: 0,

  init({ stage, view, getMode, onChange }) {
    this.stage = stage;
    this.view = view;
    this.getMode = getMode;
    this.onChange = onChange;
    this.probe = document.createElement('div');
    this.probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;' +
      'padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);';
    document.body.appendChild(this.probe);

    const again = () => this.apply();
    window.addEventListener('resize', again);
    window.addEventListener('orientationchange', () => {
      again();
      setTimeout(again, 250);
      setTimeout(again, 700);
    });
    if (window.visualViewport) window.visualViewport.addEventListener('resize', again);
    this.apply();
  },

  readSafe() {
    const cs = getComputedStyle(this.probe);
    return {
      t: parseFloat(cs.paddingTop) || 0,
      r: parseFloat(cs.paddingRight) || 0,
      b: parseFloat(cs.paddingBottom) || 0,
      l: parseFloat(cs.paddingLeft) || 0,
    };
  },

  apply() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const wantLand = this.getMode() === 'landscape';
    const devLand = vw > vh;
    const env = this.readSafe();
    const st = this.stage.style;

    let sw, sh, rot = 0;
    // Safe-area insets expressed in stage coordinates.
    let safe = { t: env.t, r: env.r, b: env.b, l: env.l };
    if (devLand === wantLand) {
      sw = vw; sh = vh;
      st.transform = '';
    } else {
      sw = vh; sh = vw;
      if (wantLand) {
        rot = 90; // device held upright, game turned clockwise
        st.transform = `translate(${vw}px,0) rotate(90deg)`;
        safe = { t: env.r, r: env.b, b: env.l, l: env.t };
      } else {
        rot = -90;
        st.transform = `translate(0,${vh}px) rotate(-90deg)`;
        safe = { t: env.l, r: env.t, b: env.r, l: env.b };
      }
    }
    st.width = sw + 'px';
    st.height = sh + 'px';
    this.stage.classList.toggle('landscape', wantLand);
    this.stage.classList.toggle('portrait', !wantLand);
    this.stage.classList.toggle('rotated', rot !== 0);
    st.setProperty('--safe-t', safe.t + 'px');
    st.setProperty('--safe-r', safe.r + 'px');
    st.setProperty('--safe-b', safe.b + 'px');
    st.setProperty('--safe-l', safe.l + 'px');

    let viewW = sw, viewH = sh;
    if (wantLand) {
      const dpad = Math.round(clamp(sh * 0.36, 116, 160));
      st.setProperty('--dpad', dpad + 'px');
      st.setProperty('--btn', Math.round(dpad * 0.44) + 'px');
      st.setProperty('--side', (dpad + 40 + Math.max(safe.l, safe.r)) + 'px');
    } else {
      const ctrlH = Math.round(clamp(sh * 0.38, 220, 330)) + safe.b;
      viewH = sh - ctrlH;
      const dpad = Math.round(clamp((ctrlH - safe.b) * 0.62, 120, 165));
      st.setProperty('--ctrl-h', ctrlH + 'px');
      st.setProperty('--view-h', viewH + 'px');
      st.setProperty('--dpad', dpad + 'px');
      st.setProperty('--btn', Math.round(dpad * 0.46) + 'px');
    }

    const changed = sw !== this.stageW || sh !== this.stageH || rot !== this.rotation ||
      viewW !== this.viewW || viewH !== this.viewH;
    this.rotation = rot;
    this.mode = wantLand ? 'landscape' : 'portrait';
    this.stageW = sw; this.stageH = sh;
    this.viewW = viewW; this.viewH = viewH;
    if (changed && this.onChange) this.onChange();
  },

  // Converts a movement vector measured on the physical screen into stage space.
  mapVector(dx, dy) {
    if (this.rotation === 90) return [dy, -dx];
    if (this.rotation === -90) return [-dy, dx];
    return [dx, dy];
  },
};
