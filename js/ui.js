// TaleofChaThai — UI rendering. Region Map (world-map art + pins) is the game's main menu (docs §4.4).
'use strict';

const uiState = {
  animating: false,
  choosingSwitch: false,
  showTrainers: false,
  showStarters: false,
  pickedTrainer: null,
  statusUid: null,
  statusReturn: null,
  dexFilter: null, // null = all, else one of TYPES
};

// Monster art: animated GIF when available (docs §3.2 — files are pre-transparent, browser loops
// them for free); static png for the fainted state, or when no gif exists (bosses, docs §3.6 bug),
// or when opts.idle is set. The -move.gif is a pacing animation that swings the pose left/right on
// its own (confirmed via per-frame center-of-mass) — CSS flip can't fix that, so contexts that need
// a *stable* facing (battle idle, Dex cards — playtest feedback §2.1/§3.4) use the static sprite
// with a light CSS bob instead of the always-moving GIF.
function spriteHTML(sp, opts) {
  opts = opts || {};
  const dead = opts.dead ? 'filter:grayscale(1)' : '';
  const src = (!opts.dead && !opts.idle && sp.gif) ? sp.gif : sp.sprite;
  if (src) return `<img class="mon-img" src="${src}" alt="${sp.name}" style="${dead}">`;
  return `<span style="filter:hue-rotate(${sp.hue}deg) ${dead}">🐾</span>`;
}

function hpColor(ratio) {
  if (ratio > 0.5) return '#4caf50';
  if (ratio > 0.2) return '#ffb300';
  return '#e53935';
}

function moveMetaText(m) {
  if (m.cat === 'damage') return `PWR ${m.power}`;
  if (m.cat === 'heal') return `Heals ${Math.round(m.heal * 100)}%`;
  return `Status: ${STATUS_NAME[m.effect]}`;
}

// Field-walking and battle get distinctly different BGM loops; nothing plays on the start screen
// so the AudioContext is only ever created after a real user gesture (picking a trainer/starter).
function bgmContextKey() {
  if (state.screen === 'start') return null;
  return state.screen === 'battle' ? 'battle' : 'field';
}

function render() {
  const app = document.getElementById('app');
  app.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.innerHTML = renderTopbar() + renderScreen();
  app.appendChild(wrap);
  const bgmKey = bgmContextKey();
  if (bgmKey) playBgm(bgmKey); else stopBgm();
  if (state.screen === 'field') applyFieldScale();
}

function renderTopbar() {
  if (state.screen === 'start') return '';
  return `
  <div id="topbar">
    <div class="title">🐈 TaleofChaThai</div>
    <div class="stats">🏅 ${state.badges.length}/5 &nbsp; 🍖 ${state.items.treat} &nbsp; 🌟 ${state.items.goldenTreat}</div>
    ${state.screen !== 'battle' ? `
    <div class="nav">
      <button data-action="open-regionmap">🗺️ Region Map</button>
      <button data-action="open-party">🐾 Party</button>
      <button data-action="open-storage">📦 Storage</button>
      <button data-action="open-dex">📕 MonsterDex</button>
      <button data-action="open-evolution">📖 Evolution</button>
      <button data-action="open-movepool">⚔️ Movepool</button>
      <button data-action="open-guide">📜 Guide</button>
      <button data-action="save-game">💾 Save</button>
      <button data-action="toggle-mute">${isSfxMuted() ? '🔇' : '🔊'}</button>
    </div>` : ''}
  </div>`;
}

function renderScreen() {
  switch (state.screen) {
    case 'start': return renderStart();
    case 'regionmap': return renderRegionMap();
    case 'field': return renderField();
    case 'battle': return renderBattle();
    case 'party': return renderParty();
    case 'storage': return renderStorage();
    case 'dex': return renderDex();
    case 'evolution': return renderEvolution();
    case 'movepool': return renderMovepool();
    case 'guide': return renderGuide();
    case 'status': return renderStatus();
    case 'congrats': return renderCongrats();
    default: return '';
  }
}

// ---------------- Start (trainer -> starter pick) ----------------

function renderStart() {
  if (uiState.showStarters) {
    return `
    <div class="screen start-screen">
      <h1>🐈 TaleofChaThai</h1>
      <p class="subtitle">Choose your first partner:</p>
      <div class="starter-row">
        ${STARTERS.map(s => `
          <div class="starter-choice" data-action="pick-starter" data-species="${s}">
            <div class="mon-sprite big">${spriteHTML(SPECIES[s])}</div>
            <div>${SPECIES[s].name}</div>
            <div class="type-tag type-${SPECIES[s].type}">${SPECIES[s].type}</div>
          </div>`).join('')}
      </div>
      <button data-action="back-to-trainers">◀ Back</button>
    </div>`;
  }
  if (uiState.showTrainers) {
    return `
    <div class="screen start-screen">
      <h1>🐈 TaleofChaThai</h1>
      <p class="subtitle">Choose who you'll play as:</p>
      <div class="trainer-row">
        ${TRAINERS.map(t => `
          <div class="trainer-choice" data-action="pick-trainer" data-trainer="${t.id}">
            <img class="trainer-full-img" src="${t.full}" alt="${t.name}">
            <div class="trainer-name">${t.name}</div>
            <div class="trainer-blurb">${t.blurb}</div>
          </div>`).join('')}
      </div>
    </div>`;
  }
  return `
  <div class="screen start-screen">
    <h1>🐈 TaleofChaThai</h1>
    <p class="subtitle">18 elements. One continent. Every tale begins in Meadowcross.</p>
    ${hasSave() ? '<button class="big" data-action="continue-game">Continue Journey</button>' : ''}
    <button class="big" data-action="show-trainers">New Journey</button>
  </div>`;
}

// ---------------- Region Map — the main menu (world map art + pins per docs §4.4) ----------------

function renderRegionMap() {
  const pins = Object.values(REGIONS).map(r => {
    const isHere = r.id === state.currentRegion;
    const authored = !!REGION_ENTRY_MAP[r.id];
    const check = canTravelTo(r.id);
    const visited = !!state.visited[r.id];
    const reachable = authored && check.ok;
    const cls = [
      'region-pin',
      `type-${r.type}`,
      isHere ? 'pin-here' : '',
      !authored ? 'pin-unbuilt' : (reachable ? (visited ? 'pin-visited' : 'pin-reachable') : 'pin-locked'),
    ].join(' ');
    const action = reachable ? `data-action="travel-region" data-region="${r.id}"` : '';
    const lockNote = !authored ? '🚧' : (!check.ok ? '🔒' : (visited ? '' : '✨'));
    return `
    <div class="${cls}" style="left:${r.center[0] * 100}%;top:${r.center[1] * 100}%" ${action}
         title="${r.zone}${!check.ok && authored ? ' — ' + check.why : ''}">
      ${isHere ? '<div class="pin-here-marker">📍</div>' : ''}
      <div class="pin-dot"></div>
      <div class="pin-label">${r.type} ${lockNote}</div>
    </div>`;
  }).join('');

  const routeInfo = ENDGAME_ROUTE.map((id, i) => {
    const dojo = DOJOS[id];
    const done = dojo && state.badges.includes(dojo.badge);
    return `<span class="route-step ${done ? 'route-done' : ''}">${i + 1}. ${REGIONS[id].type}${done ? ' 🏅' : ''}</span>`;
  }).join(' ➜ ');

  return `
  <div class="screen regionmap-screen">
    <div class="worldmap-wrap">
      <img class="worldmap-img" src="${WORLD_MAP.image}" alt="ChaThai continent">
      ${pins}
    </div>
    <p class="regionmap-hint">📍 you are here · ✨ new region to explore · 🔒 badge required · 🚧 uncharted (coming soon)</p>
    <div class="route-bar">Main route: ${routeInfo}</div>
    <div class="scene-actions">
      <button data-action="enter-field">🚶 Walk in ${REGIONS[state.currentRegion] ? REGIONS[state.currentRegion].zone : ''}</button>
      <button data-action="heal-party">💗 Rest &amp; Heal</button>
    </div>
    <div class="log-box">${state.log.slice(-3).map(l => `<div>${l}</div>`).join('') || '<div>Your tale awaits.</div>'}</div>
  </div>`;
}

// ---------------- Field (FireRed-style viewport, pixel art) ----------------

function renderField() {
  const f = state.field;
  if (!f) return '';
  const map = FIELD_MAPS[f.mapId];
  const trainer = trainerOf(state.trainerId);
  const cam = fieldCamera(f);
  const mapW = map.width * TILE_PX, mapH = map.height * TILE_PX;

  let tilesHTML = '';
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const ch = map.ground[y][x];
      if (ch === 'P' || ch === 'T') continue; // path & obstacles = bare pixel-art backdrop
      if (ch === 'G' || ch === 'C' || ch === 'W') {
        tilesHTML += `<div class="field-tile tile-${ch}" style="left:${x * TILE_PX}px;top:${y * TILE_PX}px"></div>`;
      }
    }
  }
  const warpsHTML = (map.warps || []).map(w => `
    <div class="field-tile tile-warp" style="left:${w.x * TILE_PX}px;top:${w.y * TILE_PX}px">${w.toMap === '@exit' ? '🚪' : '🌀'}</div>`).join('');

  const npcsHTML = (map.npcs || []).map(n => {
    if (n.kind === 'boss') {
      if (state.recruitedBosses[n.bossRegion]) return '';
      const sp = SPECIES[FIELD_BOSSES[n.bossRegion].s];
      return `<div class="field-npc field-npc-boss" data-npc-id="${n.id}" style="left:${n.x * TILE_PX}px;top:${n.y * TILE_PX}px">
        <img class="field-boss-img" src="${sp.sprite}" alt="${sp.name}"></div>`;
    }
    if (n.kind === 'dojo') {
      const dojo = DOJOS[n.dojoId];
      return `<div class="field-npc field-npc-dojo" data-npc-id="${n.id}" style="left:${n.x * TILE_PX}px;top:${n.y * TILE_PX}px">
        <img class="field-trainer-npc" src="${dojo.leaderSprite}" alt="${dojo.leader}"></div>`;
    }
    if (n.kind === 'champion') {
      return `<div class="field-npc field-npc-dojo" data-npc-id="${n.id}" style="left:${n.x * TILE_PX}px;top:${n.y * TILE_PX}px">
        <img class="field-trainer-npc" src="${n.sprite}" alt="${n.name}"></div>`;
    }
    if (n.sprite) {
      const defeated = n.kind === 'trainer' && f.defeatedTrainers.includes(n.id);
      return `<div class="field-npc ${defeated ? 'npc-defeated' : ''}" data-npc-id="${n.id}" style="left:${n.x * TILE_PX}px;top:${n.y * TILE_PX}px">
        <img class="field-trainer-npc" src="${n.sprite}" alt="${n.name || ''}"></div>`;
    }
    return `<div class="field-npc" data-npc-id="${n.id}" style="left:${n.x * TILE_PX}px;top:${n.y * TILE_PX}px">${n.emoji || '❔'}</div>`;
  }).join('');

  const playerHTML = `
    <div class="field-player" style="left:${f.x * TILE_PX}px;top:${f.y * TILE_PX}px">
      <div class="field-player-ring"></div>
      <img class="field-player-sprite ${f.facing === 'left' ? 'face-left' : ''}" src="${trainerWalkFrame(trainer, f.walkFrame)}" alt="${trainer.name}">
    </div>`;

  const dialogueHTML = f.dialogue ? `
    <div class="field-dialogue" data-action="close-dialogue">
      ${f.dialogue.name ? `<div class="field-dialogue-name">${f.dialogue.name}</div>` : ''}
      <div>${f.dialogue.text}</div>
      <div class="field-dialogue-hint">▼</div>
    </div>` : '';

  return `
  <div class="screen field-screen">
    <div class="field-zonename">${map.name}</div>
    <div class="field-viewport">
      <div class="field-scale-wrap">
        <div class="field-map-layer" style="width:${mapW}px;height:${mapH}px;background-image:url('${map.bg}');transform:translate(${-cam.x}px,${-cam.y}px)">
          ${tilesHTML}${warpsHTML}${npcsHTML}${playerHTML}
        </div>
        ${dialogueHTML}
      </div>
    </div>
    <div class="field-hint">Arrow keys / WASD or drag the stick — 8 directions, corners slide off walls. Grass &amp; crystal ground hide wild monsters — paths are safe. Bump into people (or bosses!) to interact. 🚪 leads back to the Region Map.</div>
    <div class="field-controls">
      <div class="joystick"><div class="joystick-nub"></div></div>
      <button class="field-leave" data-action="exit-field">🚪 Leave</button>
    </div>
    <div class="log-box">${state.log.slice(-2).map(l => `<div>${l}</div>`).join('') || '<div>You wander the wilds.</div>'}</div>
  </div>`;
}

// ---------------- Battle ----------------

function monHudHTML(mon, opts) {
  const ratio = Math.max(0, mon.curHP / mon.maxHP);
  return `
  <div class="mon-hud ${opts.side}">
    <div class="mon-hud-row">
      <span class="mon-hud-name">${speciesOf(mon).name}</span>
      <span class="mon-hud-lv">Lv${mon.level}</span>
    </div>
    <div class="mon-hpbar-track"><div class="mon-hpbar-fill" style="width:${ratio * 100}%;background:${hpColor(ratio)}"></div></div>
    ${opts.showNumbers ? `<div class="mon-hp-numbers">${mon.curHP}/${mon.maxHP}</div>` : ''}
    ${opts.showNumbers ? `<div class="mon-expbar-track"><div class="mon-expbar-fill" style="width:${Math.min(100, mon.exp / mon.expToNext * 100)}%"></div></div>` : ''}
    ${mon.status ? `<div class="mon-status-tag">${STATUS_NAME[mon.status.effect]}</div>` : ''}
  </div>`;
}

function renderBattle() {
  const b = state.battle;
  if (!b) return '';
  const player = currentPlayerMon();
  const enemy = currentEnemyMon();
  const enemySp = speciesOf(enemy);
  const playerSp = speciesOf(player);
  const logLines = b.log.slice(-3);
  const benchAlive = state.party.filter(m => m.curHP > 0 && m.uid !== b.playerUid);

  let menuHTML = '';
  if (b.over) {
    logLines.push(b.won ? (b.caught ? '🎉 Caught!' : '🏆 Victory!') : (b.ran ? 'You fled.' : '💀 Blackout...'));
    if (b.recruitOffer) {
      const rSp = SPECIES[b.recruitOffer.s];
      logLines.push(`Will you take ${rSp.name} into your party?`);
      menuHTML = `
        <button class="menu-btn wide" data-action="battle-recruit-yes">✅ Recruit ${rSp.name}</button>
        <button class="menu-btn wide" data-action="battle-recruit-no">🚫 Let it go</button>`;
    } else {
      menuHTML = `<button class="menu-btn wide" data-action="battle-continue">Continue</button>`;
    }
  } else if (b.awaitingSwitch) {
    logLines.push('Choose your next monster!');
    menuHTML = state.party.filter(m => m.curHP > 0).map(m => `
      <button class="menu-btn" data-action="battle-switch" data-uid="${m.uid}">${speciesOf(m).name} Lv${m.level}</button>`).join('');
  } else if (uiState.choosingSwitch) {
    logLines.push('Switch to which monster? (the enemy gets a free hit!)');
    menuHTML = benchAlive.map(m => `
      <button class="menu-btn" data-action="battle-voluntary-switch" data-uid="${m.uid}">${speciesOf(m).name} Lv${m.level} (${m.curHP}/${m.maxHP})</button>`).join('')
      + `<button class="menu-btn wide" data-action="battle-cancel-switch">✖ Cancel</button>`;
  } else {
    const moveButtons = player.moves.map(m => `<button class="menu-btn type-${MOVES[m].type}" data-action="battle-move" data-move="${m}">${MOVES[m].name}</button>`).join('');
    const switchButton = benchAlive.length ? `<button class="menu-btn" data-action="battle-open-switch">🔁 Switch</button>` : '';
    const catchButtons = b.wild ? `
      <button class="menu-btn" data-action="battle-catch" data-ball="treat" ${state.items.treat <= 0 ? 'disabled' : ''}>🍖 Treat (${state.items.treat})</button>
      <button class="menu-btn" data-action="battle-catch" data-ball="goldenTreat" ${state.items.goldenTreat <= 0 ? 'disabled' : ''}>🌟 Golden (${state.items.goldenTreat})</button>
      <button class="menu-btn" data-action="battle-run">🏃 Run</button>` : '';
    menuHTML = moveButtons + switchButton + catchButtons;
  }

  const bgMap = state.field ? FIELD_MAPS[state.field.mapId] : FIELD_MAPS[REGION_ENTRY_MAP[state.currentRegion]];
  const fieldStyle = bgMap
    ? `background:linear-gradient(to bottom, rgba(12,10,24,.55) 0%, rgba(12,10,24,.15) 45%, rgba(12,10,24,.6) 100%), url('${bgMap.bg}') center/cover`
    : '';

  return `
  <div class="screen battle-screen">
    <div class="battle-field" style="${fieldStyle}">
      <div class="battle-enemy-platform"></div>
      <div class="battle-player-platform"></div>
      <div class="battle-enemy-sprite">${spriteHTML(enemySp, { dead: enemy.curHP <= 0, idle: true })}</div>
      <div class="battle-player-sprite">${spriteHTML(playerSp, { dead: player.curHP <= 0, idle: true })}</div>
      ${monHudHTML(enemy, { side: 'mon-hud-enemy' })}
      ${monHudHTML(player, { side: 'mon-hud-player', showNumbers: true })}
    </div>
    <div class="battle-dialog-area">
      <div class="battle-textbox">${logLines.map(l => `<div>${l}</div>`).join('')}</div>
      <div class="battle-menu">${menuHTML}</div>
    </div>
  </div>`;
}

// ---------------- Party / Storage / Status ----------------

function monRowHTML(mon, actionName, showLead, isLead) {
  const sp = speciesOf(mon);
  const ratio = Math.max(0, mon.curHP / mon.maxHP);
  return `
  <div class="mon-card">
    <div class="mon-sprite">${spriteHTML(sp, { dead: mon.curHP <= 0 })}</div>
    <div class="mon-card-info">
      <div class="mon-name">${sp.name} <span class="mon-lvl">Lv${mon.level}</span> <span class="type-tag type-${sp.type}">${sp.type}</span></div>
      <div class="bar hp-bar"><div class="bar-fill" style="width:${ratio * 100}%;background:${hpColor(ratio)}"></div></div>
      <div class="mon-hp-text">${mon.curHP}/${mon.maxHP} HP</div>
    </div>
    <div class="mon-card-actions">
      <button data-action="open-status" data-uid="${mon.uid}">📊</button>
      ${showLead ? (isLead ? '<span class="lead-tag">★ Lead</span>' : `<button data-action="set-lead" data-uid="${mon.uid}">⬆️ Lead</button>`) : ''}
      ${actionName ? `<button data-action="${actionName}" data-uid="${mon.uid}">${actionName === 'move-to-storage' ? '📦' : '🎒'}</button>` : ''}
    </div>
  </div>`;
}

function renderParty() {
  return `
  <div class="screen">
    <h2>Your Party (${state.party.length}/6)</h2>
    <p class="hint">The Lead monster fights first — switching in battle also passes the lead.</p>
    ${state.party.map((m, i) => monRowHTML(m, null, true, i === 0)).join('')}
    <button data-action="open-regionmap">Back to Map</button>
  </div>`;
}

function renderStorage() {
  return `
  <div class="screen">
    <h2>Party (${state.party.length}/6)</h2>
    ${state.party.map((m, i) => monRowHTML(m, state.party.length > 1 ? 'move-to-storage' : null, true, i === 0)).join('')}
    <h2>Storage (${state.storage.length})</h2>
    ${state.storage.length ? state.storage.map(m => monRowHTML(m, 'move-to-party', false, false)).join('') : '<p>Empty.</p>'}
    <button data-action="open-regionmap">Back to Map</button>
  </div>`;
}

function dexNumberOf(speciesId) {
  const ids = Object.keys(SPECIES);
  const idx = ids.indexOf(speciesId);
  return idx >= 0 ? idx + 1 : 0;
}

function renderStatus() {
  const mon = [...state.party, ...state.storage].find(m => m.uid === uiState.statusUid);
  if (!mon) { state.screen = uiState.statusReturn || 'party'; return renderScreen(); }
  const sp = speciesOf(mon);
  const ratio = mon.curHP / mon.maxHP;
  return `
  <div class="screen status-screen">
    <div class="status-card">
      <div class="status-titlebar"><span>MONSTER STATUS</span><span>No.${String(dexNumberOf(sp.id)).padStart(3, '0')}</span></div>
      <div class="status-body">
        <div class="status-left">
          <div class="mon-sprite big">${spriteHTML(sp, { dead: mon.curHP <= 0 })}</div>
          <div class="status-name">${sp.name}</div>
          <div>Lv${mon.level}</div>
          <div class="type-tag type-${sp.type}">${sp.type}</div>
        </div>
        <div class="status-right">
          <div class="status-stat-row"><span>HP</span><div class="bar hp-bar"><div class="bar-fill" style="width:${Math.max(0, ratio * 100)}%;background:${hpColor(ratio)}"></div></div><span>${mon.curHP}/${mon.maxHP}</span></div>
          <div class="status-stat-row"><span>ATTACK</span><span>${mon.atk}</span></div>
          <div class="status-stat-row"><span>DEFENSE</span><span>${mon.def}</span></div>
          <div class="status-stat-row"><span>SPEED</span><span>${mon.spd}</span></div>
          <div class="status-stat-row"><span>EXP</span><span>${mon.exp} / next ${Math.max(0, mon.expToNext - mon.exp)}</span></div>
        </div>
      </div>
      <div class="status-moves">
        ${mon.moves.map(m => `
          <div class="status-move type-${MOVES[m].type}">
            <div>${MOVES[m].name}</div>
            <div class="status-move-meta">${moveMetaText(MOVES[m])}</div>
          </div>`).join('')}
      </div>
    </div>
    <button data-action="close-status">Back</button>
  </div>`;
}

// ---------------- MonsterDex (18-type filter chips, docs §4.1) ----------------

function renderDex() {
  const filter = uiState.dexFilter;
  const entries = Object.values(SPECIES).filter(sp => !filter || sp.type === filter);
  const chips = `<div class="dex-filters">
    <button class="chip ${!filter ? 'chip-on' : ''}" data-action="dex-filter" data-type="">All</button>
    ${TYPES.map(t => `<button class="chip type-${t} ${filter === t ? 'chip-on' : ''}" data-action="dex-filter" data-type="${t}">${t}</button>`).join('')}
  </div>`;
  const cards = entries.map(sp => `
    <div class="dex-card">
      <div class="dex-num">#${String(dexNumberOf(sp.id)).padStart(3, '0')}</div>
      <div class="mon-sprite">${spriteHTML(sp, { idle: true })}</div>
      <div class="dex-name">${sp.name}</div>
      <div class="type-tag type-${sp.type}">${sp.type}</div>
      <div class="dex-cat">${sp.stage === 'boss' ? '👊 Boss' : 'Stage ' + sp.stage}</div>
    </div>`).join('');
  return `
  <div class="screen">
    <h2>📕 MonsterDex</h2>
    <p class="hint">${Object.keys(SPECIES).length} monsters across 18 elements — 180 wild + 18 bosses.</p>
    ${chips}
    <div class="dex-grid">${cards}</div>
    <button data-action="open-regionmap">Back to Map</button>
  </div>`;
}

// ---------------- Evolution (chain-walked, not fixed-column — docs §4.2) ----------------

function evoStageHTML(sp) {
  return `
  <div class="evo-stage">
    <div class="mon-sprite">${spriteHTML(sp)}</div>
    <div class="evo-name">${sp.name}</div>
    <div class="type-tag type-${sp.type}">${sp.type}</div>
  </div>`;
}

function renderEvolution() {
  const sections = TYPES.map(t => {
    const lines = (LINES_BY_TYPE[t] || []).map(id1 => {
      const parts = [];
      let sp = SPECIES[id1];
      while (sp) {
        parts.push(evoStageHTML(sp));
        if (sp.evolvesTo) parts.push(`<div class="evo-arrow">➜<span class="evo-lvl">Lv${sp.evoLevel}</span></div>`);
        sp = sp.evolvesTo ? SPECIES[sp.evolvesTo] : null;
      }
      return `<div class="evo-line">${parts.join('')}</div>`;
    }).join('');
    return `<h3 class="section-title type-${t}">${t}</h3><div class="evo-lines">${lines}</div>`;
  }).join('');
  return `
  <div class="screen">
    <h2>📖 Evolution Chart</h2>
    <p class="hint">Every wild line evolves once at Lv${EVO_LEVEL}. Bosses don't evolve — they're already apex.</p>
    ${sections}
    <button data-action="open-regionmap">Back to Map</button>
  </div>`;
}

// ---------------- Movepool ----------------

function renderMovepool() {
  const sections = TYPES.map(t => {
    const pool = lineMovepool(t);
    const rows = pool.map(e => {
      const m = MOVES[e.move];
      return `<div class="moveinfo-row"><span class="moveinfo-lvl">Lv${e.lvl}</span><span>${m.name}</span><span class="moveinfo-meta">${moveMetaText(m)}</span></div>`;
    }).join('');
    const lines = (LINES_BY_TYPE[t] || []).map(id => SPECIES[id].name).join(', ');
    return `
    <div class="moveinfo-card">
      <div class="moveinfo-card-title type-${t}">${t}</div>
      <div class="moveinfo-lines">${lines}</div>
      ${rows}
    </div>`;
  }).join('');
  return `
  <div class="screen">
    <h2>⚔️ Movepool</h2>
    <p class="hint">Each element's lines share a learn ladder for now (per-line variety is a planned expansion — see docs §3.3). A monster keeps its 4 most recent moves.</p>
    <div class="moveinfo-grid">${sections}</div>
    <button data-action="open-regionmap">Back to Map</button>
  </div>`;
}

// ---------------- Guide ----------------

function renderGuide() {
  const cards = ENDGAME_ROUTE.map((id, i) => {
    const r = REGIONS[id];
    const dojo = DOJOS[id];
    const boss = FIELD_BOSSES[id];
    const enc = REGION_ENCOUNTERS[id] || [];
    const lvls = enc.length ? `Lv${enc[0].min}-${enc[0].max}` : '';
    return `
    <div class="guide-card">
      <h3>${i + 1}. ${r.zone} <span class="type-tag type-${r.type}">${r.type}</span></h3>
      <div>🐾 Wild: 5 evolving ${r.type} lines (${lvls})</div>
      <div>👊 Dojo: <b>${dojo.leader}</b> — ${dojo.team.map(m => `${SPECIES[m.s].name} Lv${m.lvl}`).join(', ')} → ${dojo.badge}</div>
      <div>🐉 Field boss: <b>${SPECIES[boss.s].name}</b> Lv${boss.lvl} — beat it once and you can recruit it!</div>
      ${REGION_UNLOCK[id] ? `<div>🔒 Unlocked by: ${REGION_UNLOCK[id]}</div>` : '<div>🏠 Starting region</div>'}
    </div>`;
  }).join('');
  return `
  <div class="screen">
    <h2>📜 Adventure Guide</h2>
    <p class="hint">Main route: ${ENDGAME_ROUTE.map(id => REGIONS[id].type).join(' ➜ ')} — then challenge the Veteran Champion at Skyfang Caldera with all 5 badges. 13 more regions await beyond the main route (coming soon).</p>
    ${cards}
    <button data-action="open-regionmap">Back to Map</button>
  </div>`;
}

// ---------------- Congrats ----------------

function renderCongrats() {
  const trainer = trainerOf(state.trainerId);
  return `
  <div class="screen congrats-screen">
    <h1>🎉 CONGRATULATIONS! 🎉</h1>
    <p>You defeated the Veteran Champion — the Tale of ChaThai is yours!</p>
    <img class="congrats-trainer" src="${trainer.full}" alt="${trainer.name}">
    <div class="congrats-party">${state.party.map(m => `<div class="mon-sprite">${spriteHTML(speciesOf(m))}</div>`).join('')}</div>
    <p>— The End (your journey continues…) —</p>
    <button class="big" data-action="open-regionmap">Continue Your Journey</button>
  </div>`;
}
