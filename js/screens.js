// Full-screen menus: party, summary, bag, starter choice, move learning, evolution.
// Installed onto the UI class by main.js.

import { ScreenLayer, el, escapeHtml, guardClicks } from './ui.js';
import { SPECIES, DEX_ORDER, STARTERS } from './data/monsters.js';
import { MOVES } from './data/moves.js';
import { TYPE_INFO, typeChip } from './data/types.js';
import {
  monName, monLabel, isAlive, STATUS_INFO, STAT_KEYS, STAT_NAMES, expToNext, expProgress, ITEMS, SHOP_STOCK, applyItem, stoneEvolution,
} from './monster.js';

function spriteCanvas(game, speciesId, cls = '', prism = false, shadow = false) {
  const c = document.createElement('canvas');
  c.width = 76; c.height = 72;
  c.className = 'mon-canvas ' + cls;
  c.getContext('2d').drawImage(shadow ? game.monArt.shadow(speciesId) : game.monArt.front(speciesId, prism), 0, 0);
  return c;
}

// Would this item do anything to this monster? (Checks on a copy.)
function itemWorks(itemId, m) {
  const it = ITEMS[itemId];
  if (it.stone) return !!stoneEvolution(m, itemId);
  return applyItem(itemId, { ...m }).ok;
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

// A -/+ quantity picker. Resolves with the amount or 0.
function quantity(ui, layer, title, price, max) {
  return new Promise((resolve) => {
    let n = 1;
    const back = el('div', 'sheet-back');
    const box = el('div', 'box sheet');
    box.innerHTML = `<div class="sheet-title">${escapeHtml(title)}</div>
      <div class="qty-row"><button class="big-btn" data-d="-1">−</button><span class="qty">1</span><button class="big-btn" data-d="1">+</button></div>
      <div class="qty-total"></div>
      <button class="big-btn primary" data-ok>Confirm</button><button class="big-btn" data-no>Cancel</button>`;
    const q = box.querySelector('.qty'), total = box.querySelector('.qty-total');
    const show = () => { q.textContent = n; total.textContent = `Total: $${n * price}`; };
    const done = (v) => { back.remove(); layer.onBack = saved; resolve(v); };
    const saved = layer.onBack;
    box.querySelectorAll('[data-d]').forEach((b) => b.addEventListener('click', () => {
      n = Math.max(1, Math.min(max, n + Number(b.dataset.d)));
      ui.game.audio.sfx('blip');
      show();
    }));
    box.querySelector('[data-ok]').addEventListener('click', () => done(n));
    box.querySelector('[data-no]').addEventListener('click', () => { ui.game.audio.sfx('back'); done(0); });
    layer.onBack = () => done(0);
    back.appendChild(box);
    layer.el.appendChild(back);
    guardClicks(box, 250);
    show();
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
          card.appendChild(spriteCanvas(g, m.species, '', m.prism));
          const info = el('div', 'pc-info');
          info.innerHTML = `
            <div class="pc-top"><b>${escapeHtml(monLabel(m))}</b><span>Lv${m.level}</span></div>
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
      const { node, layer } = openScreen(this, escapeHtml(monLabel(m)), { cls: 'summary' });
      const no = String(DEX_ORDER.indexOf(m.species) + 1).padStart(3, '0');
      const frac = m.hp / m.stats.hp;
      const body = el('div', 'summary-body');
      const left = el('div', 'box sum-left');
      left.appendChild(spriteCanvas(g, m.species, 'big', m.prism));
      if (m.prism) left.appendChild(el('div', 'prism-tag', '✨ Prism variant · stats +10%'));
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
      node.insertAdjacentHTML('beforeend', `<div class="money-chip">$${g.data.money}</div>`);
      const list = el('div', 'bag-list');
      node.appendChild(list);

      const render = () => {
        list.innerHTML = '';
        const ids = Object.keys(ITEMS).filter((id) => (g.data.bag[id] || 0) > 0 && (battle ? ITEMS[id].battle : true));
        if (!ids.length) list.appendChild(el('div', 'box bag-empty', battle ? 'No items you can use right now.' : 'Your bag is empty.'));
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
        if (battle && !it.battle) { g.audio.sfx('error'); this.toast("You can't use that in battle."); return; }
        const idx = await this.partyScreen({ mode: 'item', title: `Use ${it.name} on which monster?` });
        if (idx == null) return;
        const m = g.data.party[idx];
        if (!itemWorks(id, m)) { g.audio.sfx('error'); this.toast("It won't have any effect."); return; }
        if (battle) { layer.close({ item: id, target: idx }); return; }
        if (it.stone) {
          await g.useStone(id, m);
          render();
          return;
        }
        const r = applyItem(id, m);
        g.useItem(id);
        g.audio.sfx('heal');
        this.toast(r.msg);
        render();
      };

      render();
      return layer.promise.then((r) => r || null);
    },

    // --------------------------------------------------------------- dex
    dexScreen() {
      const g = this.game;
      const dex = g.data.dex;
      const { node, layer } = openScreen(this, '📖 Monster Dex');
      node.insertAdjacentHTML('beforeend', `<div class="dex-count">Seen ${dex.seen.length} · Caught ${dex.caught.length} · Total ${DEX_ORDER.length}</div>`);
      const grid = el('div', 'dex-grid');
      const cards = DEX_ORDER.map((id, i) => {
        const seen = dex.seen.includes(id);
        const caught = dex.caught.includes(id);
        const card = el('button', 'dex-card' + (seen ? '' : ' unseen'));
        card.appendChild(seen ? spriteCanvas(g, id) : spriteCanvas(g, id, '', false, true));
        card.insertAdjacentHTML('beforeend', `<span class="dex-no">${String(i + 1).padStart(3, '0')}${caught ? ' <i class="dex-caught">●</i>' : ''}</span><b>${seen ? SPECIES[id].name : '???'}</b>`);
        card.addEventListener('click', () => {
          if (!seen) { g.audio.sfx('error'); return; }
          g.audio.sfx('select');
          this.dexEntry(id, i, caught);
        });
        grid.appendChild(card);
        return card;
      });
      node.appendChild(grid);
      layer.setFocusables(cards);
      g.audio.sfx('select');
      return layer.promise;
    },

    dexEntry(id, i, caught) {
      const g = this.game;
      const sp = SPECIES[id];
      const { node, layer } = openScreen(this, `No.${String(i + 1).padStart(3, '0')} ${sp.name}`, { cls: 'summary' });
      const body = el('div', 'summary-body');
      const left = el('div', 'box sum-left');
      left.appendChild(spriteCanvas(g, id, 'big'));
      left.insertAdjacentHTML('beforeend', `<div class="pc-types">${sp.types.map(typeChip).join('')}</div>`);
      const right = el('div', 'box sum-right');
      if (caught) {
        const names = ['HP', 'Attack', 'Defense', 'Sp. Atk', 'Sp. Def', 'Speed'];
        right.innerHTML = `<div class="sum-dex">${escapeHtml(sp.dex)}</div>
          <div class="base-stats">${sp.base.map((v, k) => `<div><span>${names[k]}</span><div class="bs-bar"><div style="width:${Math.min(100, v / 1.3)}%"></div></div><b>${v}</b></div>`).join('')}</div>
          ${sp.evo ? `<div class="sum-small">Evolves into ${g.data.dex.seen.includes(sp.evo.into) ? SPECIES[sp.evo.into].name : '???'} ${sp.evo.level ? 'at level ' + sp.evo.level : 'with a ' + ITEMS[sp.evo.item].name}</div>` : ''}`;
      } else {
        right.innerHTML = '<div class="sum-dex">You have seen this monster, but not caught one yet. Catch it to learn more!</div>';
      }
      body.append(left, right);
      node.appendChild(body);
      return layer.promise;
    },

    // --------------------------------------------------------------- PC box
    boxScreen() {
      const g = this.game;
      const { node, layer } = openScreen(this, '💻 Monster Storage');
      const wrap = el('div', 'box-wrap');
      node.appendChild(wrap);

      const card = (m, where, i) => {
        const b = el('button', 'pcard mini' + (m.hp <= 0 ? ' fainted' : ''));
        b.appendChild(spriteCanvas(g, m.species, '', m.prism));
        b.insertAdjacentHTML('beforeend', `<div class="pc-info"><div class="pc-top"><b>${escapeHtml(monLabel(m))}</b><span>Lv${m.level}</span></div><div class="pc-types">${SPECIES[m.species].types.map(typeChip).join('')}</div></div>`);
        b.addEventListener('click', () => act(where, i));
        return b;
      };

      const render = () => {
        wrap.innerHTML = '';
        const party = g.data.party, box = g.data.box;
        const pa = el('div', 'box-col');
        pa.appendChild(el('h2', '', `Team ${party.length}/6`));
        const pb = el('div', 'box-col');
        pb.appendChild(el('h2', '', `PC Box (${box.length})`));
        const all = [];
        party.forEach((m, i) => { const c = card(m, 'party', i); pa.appendChild(c); all.push(c); });
        box.forEach((m, i) => { const c = card(m, 'box', i); pb.appendChild(c); all.push(c); });
        if (!box.length) pb.appendChild(el('div', 'box-empty', 'Empty. Deposit monsters here.'));
        wrap.append(pa, pb);
        layer.setFocusables(all);
      };

      const act = async (where, i) => {
        const party = g.data.party, box = g.data.box;
        const m = where === 'party' ? party[i] : box[i];
        g.audio.sfx('select');
        if (where === 'party') {
          const lastHealthy = party.filter(isAlive).length === 1 && isAlive(m);
          const v = await sheet(this, layer, monLabel(m), [
            { label: 'Deposit', value: 'dep', primary: true, disabled: party.length <= 1 || lastHealthy },
            { label: 'Summary', value: 'sum' },
            { label: 'Cancel', value: null },
          ]);
          if (v === 'dep') { box.push(party.splice(i, 1)[0]); this.toast(`${monName(m)} was stored in the PC Box.`); }
          else if (v === 'sum') await this.summaryScreen(m);
        } else {
          const v = await sheet(this, layer, monLabel(m), [
            { label: 'Withdraw', value: 'wd', primary: true, disabled: party.length >= 6 },
            { label: 'Summary', value: 'sum' },
            { label: 'Release', value: 'rel' },
            { label: 'Cancel', value: null },
          ]);
          if (v === 'wd') { party.push(box.splice(i, 1)[0]); this.toast(`${monName(m)} joined your team!`); }
          else if (v === 'sum') await this.summaryScreen(m);
          else if (v === 'rel') {
            const ok = await sheet(this, layer, `Release ${monName(m)}? This can't be undone.`, [
              { label: 'Yes, release it', value: 'yes' },
              { label: 'No', value: null, primary: true },
            ]);
            if (ok === 'yes') { box.splice(i, 1); this.toast(`Bye-bye, ${monName(m)}!`); }
          }
        }
        render();
      };

      render();
      return layer.promise;
    },

    // --------------------------------------------------------------- shop
    shopScreen() {
      const g = this.game;
      const { node, layer } = openScreen(this, '🛒 Shop');
      const money = el('div', 'money-chip');
      const tabs = el('div', 'seg shop-tabs');
      tabs.innerHTML = '<button data-t="buy" class="on">Buy</button><button data-t="sell">Sell</button>';
      const list = el('div', 'bag-list');
      node.append(money, tabs, list);
      let mode = 'buy';
      tabs.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
        mode = b.dataset.t;
        tabs.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
        g.audio.sfx('blip');
        render();
      }));

      const render = () => {
        money.textContent = `$${g.data.money}`;
        list.innerHTML = '';
        const ids = mode === 'buy' ? SHOP_STOCK : Object.keys(g.data.bag).filter((id) => g.data.bag[id] > 0);
        if (!ids.length) list.appendChild(el('div', 'box bag-empty', 'You have nothing to sell.'));
        const rows = ids.map((id) => {
          const it = ITEMS[id];
          const price = mode === 'buy' ? it.price : Math.floor(it.price / 2);
          const row = el('button', 'box bag-row');
          row.innerHTML = `<span class="bag-ico">${it.icon}</span><span class="bag-main"><b>${it.name}</b><small>${it.desc} · You have ${g.data.bag[id] || 0}</small></span><span class="bag-count">$${price}</span>`;
          row.addEventListener('click', () => trade(id, price));
          list.appendChild(row);
          return row;
        });
        layer.setFocusables(rows);
      };

      const trade = async (id, price) => {
        const it = ITEMS[id];
        g.audio.sfx('select');
        const max = mode === 'buy' ? Math.min(99, Math.floor(g.data.money / price)) : g.data.bag[id] || 0;
        if (max <= 0) { g.audio.sfx('error'); this.toast("You don't have enough money."); return; }
        const n = await quantity(this, layer, `${mode === 'buy' ? 'Buy' : 'Sell'} ${it.name}`, price, max);
        if (!n) return;
        if (mode === 'buy') {
          g.data.money -= n * price;
          g.addItem(id, n);
          if (id === 'orb' && n >= 10) { g.addItem('greatorb', 1); this.toast('Bonus: a free Great Orb!'); }
        } else {
          g.data.money += n * price;
          g.data.bag[id] -= n;
          if (g.data.bag[id] <= 0) delete g.data.bag[id];
        }
        g.audio.sfx('buy');
        render();
      };

      render();
      return layer.promise;
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
    evolutionScreen(m, intoId, noCancel = false) {
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
      show(art.front(fromId, m.prism));
      text.textContent = `What? ${oldName} is evolving!`;
      g.audio.stopMusic();
      g.audio.sfx('evolve');
      node.addEventListener('pointerup', () => { if (waiting) layer.close(!cancelled); });
      layer.onUpdate = (dt, input) => {
        t += dt;
        if (phase === 'intro' && t > 1.4) { phase = 'morph'; t = 0; }
        else if (phase === 'morph') {
          if (!noCancel && input.consume('b')) {
            cancelled = true;
            phase = 'done';
            show(art.front(fromId, m.prism));
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
            show(art.front(intoId, m.prism));
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
