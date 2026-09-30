const SAVE_KEY = 'pokenotmon.save.v1';
const SETTINGS_KEY = 'pokenotmon.settings.v1';

const DEFAULT_SETTINGS = {
  layout: 'landscape', // 'landscape' | 'portrait'
  music: 0.6,
  sfx: 0.8,
  textSpeed: 'normal', // 'slow' | 'normal' | 'fast'
};

function get(key) { try { return localStorage.getItem(key); } catch { return null; } }
function set(key, value) { try { localStorage.setItem(key, value); return true; } catch { return false; } }
function del(key) { try { localStorage.removeItem(key); } catch { /* ignore */ } }

export const Settings = {
  data: { ...DEFAULT_SETTINGS },
  load() {
    const raw = get(SETTINGS_KEY);
    if (raw) {
      try { Object.assign(this.data, JSON.parse(raw)); } catch { /* corrupted: keep defaults */ }
    }
    return this.data;
  },
  set(key, value) {
    this.data[key] = value;
    set(SETTINGS_KEY, JSON.stringify(this.data));
  },
};

export const SaveGame = {
  load() {
    const raw = get(SAVE_KEY);
    if (!raw) return null;
    try {
      const data = JSON.parse(raw);
      return data && data.version ? data : null;
    } catch { return null; }
  },
  write(data) {
    return set(SAVE_KEY, JSON.stringify({ ...data, version: 1, savedAt: Date.now() }));
  },
  erase() { del(SAVE_KEY); },
};

export function formatPlayTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}
