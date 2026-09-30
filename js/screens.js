// Full-screen menus: party, summary, bag, starter choice, move learning, evolution.
// Installed onto the UI class by main.js.

import { ScreenLayer, el, escapeHtml, guardClicks } from './ui.js';
import { SPECIES, DEX_ORDER, STARTERS } from './data/monsters.js';
import { MOVES } from './data/moves.js';
import { TYPE_INFO, typeChip } from './data/types.js';
import { monName, isAlive, STATUS_INFO, STAT_KEYS, STAT_NAMES, expToNext, expProgress, ITEMS } from './monster.js';

function spriteCanvas(game, speciesId, cls = '') {
  const c = document.createElement('canvas');
  c.width = 76; c.height = 72;
  c.className = 'mon-canvas ' + cls;
  c.getContext('2d').drawImage(game.monArt.front(speciesId), 0, 0);
  return c;
}

function hpColor(frac) { return frac > 0.5 ? '#4ccf5a' : frac > 0.2 ? '#f2c230' : '#e8483c'; }

function statusChip(m) {
  if (!m.hp) return '<span class="stchip" style="background:#6a6a78">FNT</span>';
  const s = STATUS_INFO[m.status];
  return s ? `<span class="stchip" style="background:${s.color}">${s.label}</span>` : '';
}

function openScreen(ui, title, { closable = true, cls = '' } = {}) {
  const node = el('div', 'panel-screen game-screen ' + cls);
  node.innerHTML = `<h1>${title}</h1>`;
  const layer = ui.push(new ScreenLayer(ui, node));
  if (closable) {
    const x = el('button', 'close-x', '✕');
    x.setAttribute('aria-label', 'Close');
    x.addEventListener('click', () => { ui.game.audio.sfx('back'); layer.close(null); });
    node.appendChild(x);
    layer.onBack = () => { ui.game.audio.sfx('back'); layer.close(null); };
  }
  return { node, layer };
}

// A small pop-up list of choices on top of a screen. Resolves with the value or null.
function sheet(ui, layer, title, options) {
  return new Promise((resolve) => {
    const back = el('div', 'sheet-back');
    const box = el('div', 'box sheet');
    if (title) box.appendChild(el('div', 'sheet-title', title));
    const saved = { f: layer.focusables, onBack: layer.onBack };
    const done = (v) => {
      back.remove();
      layer.focusables = saved.f;
      layer.onBack = saved.onBack;
      layer.focus = -1;
      resolve(v);
    };
    const buttons = options.map((o) => {
      const b = el('button', 'big-btn' + (o.primary ? ' primary' : ''), escapeHtml(o.label));
      if (o.disabled) b.classList.add('disabled');
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        if (o.disabled) { ui.game.audio.sfx('error'); return; }
        ui.game.audio.sfx(o.value == null ? 'back' : 'select');
        done(o.value);
      });
      box.appendChild(b);
      return b;
    });
    back.addEventListener('click', (e) => { if (e.target === back) { ui.game.audio.sfx('back'); done(null); } });
    back.appendChild(box);
    layer.el.appendChild(back);
    guardClicks(box, 250);
    layer.setFocusables(buttons);
    layer.onBack = () => { ui.game.audio.sfx('back'); done(null); };
  });
}

export function installScreens(UI) {
  Object.assign(UI.prototype, {
    // --------------------------------------------------------------- party
    // mode: 'field' | 'battle' | 'item'. Resolves with a party index or null.
    partyScreen({ mode = 'field', forced = false, activeUid = null, title } = {}) {
      const g = this.game;
      const party = g.data.party;
      const heading = title || (mode === 'battle' ? (forced ? 'Choose a monster to send out' : 'Monsters') : mode === 'item' ? 'Use on which monster?' : 'Monsters');
      const { node, layer } = openScreen(this, heading, { closable: !forced });
      const grid = el('div', 'party-grid');
      node.appendChild(grid);
      let swapFrom = null;

      const render = () => {
        grid.innerHTML = '';
        const cards = party.map((m, i) => {
          const sp = SPECIES[m.species];
          const frac = m.hp / m.stats.hp;
          const card = el('button', 'pcard' + (m.hp <= 0 ? ' fainted' : '') + (m.uid === activeUid ? ' active' : '') + (swapFrom === i ? ' swapping' : ''));
          card.appendChild(spriteCanvas(g, m.species));
          const info = el('div', 'pc-info');
          info.innerHTML = `
            <div class="pc-top"><b>${escapeHtml(monName(m))}</b><span>Lv${m.level}</span></div>
            <div class="pc-types">${sp.types.map(typeChip).join('')}</div>
            <div class="hpbar"><div class="fill" style="width:${(frac * 100).toFixed(1)}%;background:${hpColor(frac)}"></div></div>
            <div class="pc-hp"><span>${m.hp} / ${m.stats.hp}</span>${statusChip(m)}</div>`;
          card.appendChild(info);
          card.addEventListener('click', () => onPick(i));
          grid.appendChild(card);
          return card;
        });
        layer.setFocusables(cards);
        guardClicks(grid, 200);
      };

      const onPick = async (i) => {
        const m = party[i];
        g.audio.sfx('select');
        if (mode === 'item') { layer.close(i); return; }
        if (swapFrom != null) {
          if (swapFrom !== i) {
            [party[swapFrom], party[i]] = [party[i], party[swapFrom]];
            g.audio.sfx('select');
          }
          swapFrom = null;
          render();
          return;
        }
        if (mode === 'battle') {
          const canSend = m.hp > 0 && m.uid !== activeUid;
          const v = await sheet(this, layer, monName(m), [
            { label: 'Send out', value: 'send', primary: true, disabled: !canSend },
            { label: 'Summary', value: 'summary' },
            { label: 'Cancel', value: null },
          ]);
          if (v === 'send') layer.close(i);
          else if (v === 'summary') await this.summaryScreen(m);
          return;
        }
        const v = await sheet(this, layer, monName(m), [
          { label: 'Summary', value: 'summary', primary: true },
          { label: 'Switch order', value: 'swap', disabled: party.length < 2 },
          { label: 'Cancel', value: null },
        ]);
        if (v === 'summary') await this.summaryScreen(m);
        else if (v === 'swap') { swapFrom = i; render(); this.toast('Now tap the monster to swap with.'); }
      };

      render();
      return layer.promise.then((r) => (r == null ? null : r));
    },

    // --------------------------------------------------------------- summary
    summaryScreen(m) {
      const g = this.game;
      const sp = SPECIES[m.species];
      const { node, layer } = openScreen(this, escapeHtml(monName(m)), { cls: 'summary' });
      const no = String(DEX_ORDER.indexOf(m.species) + 1).padStart(3, '0');
      const frac = m.hp / m.stats.hp;
      const body = el('div', 'summary-body');
      const left = el('div', 'box sum-left');
      left.appendChild(spriteCanvas(g, m.species, 'big'));
      left.insertAdjacentHTML('beforeend', `
        <div class="sum-id">No.${no} · Lv${m.level} ${statusChip(m)}</div>
        <div class="pc-types">${sp.types.map(typeChip).join('')}</div>
        <div class="hpbar"><div class="fill" style="width:${(frac * 100).toFixed(1)}%;background:${hpColor(frac)}"></div></div>
        <div class="sum-small">HP ${m.hp} / ${m.stats.hp}</div>
        <div class="expbar"><div class="fill" style="width:${(expProgress(m) * 100).toFixed(1)}%"></div></div>
        <div class="sum-small">${m.level >= 100 ? 'Max level' : `${expToNext(m)} EXP to next level`}</div>`);
      const right = el('div', 'box sum-right');
      right.innerHTML = `
        <div class="sum-stats">${STAT_KEYS.filter((k) => k !== 'hp').map((k) => `<div><span>${STAT_NAMES[k]}</span><b>${m.stats[k]}</b></div>`).join('')}</div>
        <div class="sum-moves">${m.moves.map((mv) => {
          const d = MOVES[mv.id];
          return `<div class="sum-move" style="--tc:${TYPE_INFO[d.type].color}"><b>${d.name}</b><span>${TYPE_INFO[d.type].name} · ${d.cat === 'status' ? 'Status' : 'Pow ' + d.power} · PP ${mv.pp}/${d.pp}</span></div>`;
        }).join('')}</div>
        <div class="sum-dex">${escapeHtml(sp.dex)}</div>`;
      body.append(left, right);
      node.appendChild(body);
      g.audio.sfx('select');
      return layer.promise;
    },

    // --------------------------------------------------------------- bag
    // Resolves with { item, target } for battle use, or null.
    bagScreen({ battle = false, wild = false } = {}) {
      const g = this.game;
      const { node, layer } = openScreen(this, '🎒 Bag');
      const list = el('div', 'bag-list');
      node.appendChild(list);

      const render = () => {
        list.innerHTML = '';
        const ids = Object.keys(ITEMS).filter((id) => (g.data.bag[id] || 0) > 0);
        if (!ids.length) list.appendChild(el('div', 'box bag-empty', 'Your bag is empty.'));
        const rows = ids.map((id) => {
          const it = ITEMS[id];
          const row = el('button', 'box bag-row');
          row.innerHTML = `<span class="bag-ico">${it.icon}</span><span class="bag-main"><b>${it.name}</b><small>${it.desc}</small></span><span class="bag-count">×${g.data.bag[id]}</span>`;
          row.addEventListener('click', () => use(id));
          list.appendChild(row);
          return row;
        });
        layer.setFocusables(rows);
      };

      const use = async (id) => {
        const it = ITEMS[id];
        g.audio.sfx('select');
        if (it.catch) {
          if (!battle) { g.audio.sfx('error'); this.toast("You can't use that here."); return; }
          if (!wild) { g.audio.sfx('error'); this.toast("You can't catch another trainer's monster!"); return; }
          layer.close({ item: id });
          return;
        }
        if (it.heal) {
          const idx = await this.partyScreen({ mode: 'item', title: `Use ${it.name} on which monster?` });
          if (idx == null) return;
          const m = g.data.party[idx];
          if (m.hp <= 0 || m.hp >= m.stats.hp) { g.audio.sfx('error'); this.toast("It won't have any effect."); return; }
          if (battle) { layer.close({ item: id, target: idx }); return; }
          const before = m.hp;
          m.hp = Math.min(m.stats.hp, m.hp + it.heal);
          g.useItem(id);
          g.audio.sfx('heal');
          this.toast(`${monName(m)} recovered ${m.hp - before} HP!`);
          render();
        }
      };

      render();
      return layer.promise.then((r) => r || null);
    },

    // --------------------------------------------------------------- starter
    starterScreen() {
      const g = this.game;
      const { node, layer } = openScreen(this, 'Choose your partner!', { closable: false });
      const row = el('div', 'starter-row');
      const cards = STARTERS.map((id) => {
        const sp = SPECIES[id];
        const card = el('button', 'box starter-card');
        card.appendChild(spriteCanvas(g, id, 'big'));
        card.insertAdjacentHTML('beforeend', `<b>${sp.name}</b><div class="pc-types">${sp.types.map(typeChip).join('')}</div><small>${escapeHtml(sp.dex)}</small>`);
        card.addEventListener('click', async () => {
          g.audio.sfx('select');
          const v = await sheet(this, layer, `Choose ${sp.name}, the ${TYPE_INFO[sp.types[0]].name}-type monster?`, [
            { label: `Yes, ${sp.name}!`, value: 'yes', primary: true },
            { label: 'Let me think...', value: null },
          ]);
          if (v === 'yes') layer.close(id);
        });
        row.appendChild(card);
        return card;
      });
      node.appendChild(row);
      guardClicks(row);
      layer.setFocusables(cards);
      return layer.promise;
    },

    // --------------------------------------------------------------- learn move
    // Resolves with the index of the move to forget, or -1 to give up.
    forgetMoveScreen(m, newId) {
      const g = this.game;
      const { node, layer } = openScreen(this, `Forget which move?`, { closable: false });
      const nm = MOVES[newId];
      const list = el('div', 'forget-list');
      const moveRow = (id, pp, cls) => {
        const d = MOVES[id];
        const b = el('button', 'box sum-move ' + cls);
        b.style.setProperty('--tc', TYPE_INFO[d.type].color);
        b.innerHTML = `<b>${d.name}</b><span>${TYPE_INFO[d.type].name} · ${d.cat === 'status' ? 'Status' : 'Pow ' + d.power} · PP ${pp}/${d.pp}</span><small>${escapeHtml(d.desc)}</small>`;
        return b;
      };
      const buttons = m.moves.map((mv, i) => {
        const b = moveRow(mv.id, mv.pp, '');
        b.addEventListener('click', () => { g.audio.sfx('select'); layer.close(i); });
        list.appendChild(b);
        return b;
      });
      list.appendChild(el('div', 'forget-new-label', `New move for ${escapeHtml(monName(m))}:`));
      const nb = moveRow(newId, nm.pp, 'new-move');
      list.appendChild(nb);
      const keep = el('button', 'big-btn', `Don't learn ${nm.name}`);
      keep.addEventListener('click', () => { g.audio.sfx('back'); layer.close(-1); });
      list.appendChild(keep);
      node.appendChild(list);
      guardClicks(list);
      layer.setFocusables([...buttons, keep]);
      layer.onBack = () => layer.close(-1);
      return layer.promise;
    },

    // --------------------------------------------------------------- evolution
    evolutionScreen(m, intoId) {
      const g = this.game;
      const node = el('div', 'evo-screen');
      const c = document.createElement('canvas');
      c.width = 76; c.height = 72;
      c.className = 'mon-canvas evo';
      const text = el('div', 'box evo-text');
      node.append(c, text);
      const layer = this.push(new ScreenLayer(this, node));
      const ctx = c.getContext('2d');
      const art = g.monArt;
      const oldName = monName(m);
      const fromId = m.species;
      let t = 0;
      let phase = 'intro';
      let cancelled = false;
      let waiting = false;
      const show = (img) => { ctx.clearRect(0, 0, 76, 72); ctx.drawImage(img, 0, 0); };
      show(art.front(fromId));
      text.textContent = `What? ${oldName} is evolving!`;
      g.audio.stopMusic();
      g.audio.sfx('evolve');
      node.addEventListener('pointerup', () => { if (waiting) layer.close(!cancelled); });
      layer.onUpdate = (dt, input) => {
        t += dt;
        if (phase === 'intro' && t > 1.4) { phase = 'morph'; t = 0; }
        else if (phase === 'morph') {
          if (input.consume('b')) {
            cancelled = true;
            phase = 'done';
            show(art.front(fromId));
            text.textContent = `Huh? ${oldName} stopped evolving!`;
            g.audio.sfx('back');
            waiting = true;
            return true;
          }
          const freq = 1.5 + t * t * 1.4;
          const which = Math.sin(t * freq * Math.PI) > 0;
          show(which ? art.white(fromId) : art.white(intoId));
          if (Math.random() < 0.3) g.audio.sfx('sparkle');
          if (t > 4.2) {
            phase = 'done';
            m.species = intoId;
            g.onEvolved(m);
            show(art.front(intoId));
            node.classList.add('flash');
            g.audio.sfx('caught');
            text.textContent = `Congratulations! Your ${oldName} evolved into ${SPECIES[intoId].name}!`;
            g.dexSee(intoId, true);
            setTimeout(() => { waiting = true; }, 600);
          }
        } else if (phase === 'done' && waiting && (input.consume('a') || input.consume('b'))) {
          layer.close(!cancelled);
        }
        return true;
      };
      return layer.promise;
    },
  });
}
