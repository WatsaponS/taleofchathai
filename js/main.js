// TaleofChaThai — bootstrap, input handling, field movement layer (adapted from ChaThaiTheCat).
'use strict';

// ---- Field movement pacing (grid-locked, ~140ms/step) ----
let fieldStepLock = false;

function updateFieldDom(f) {
  const player = document.querySelector('.field-player');
  const layer = document.querySelector('.field-map-layer');
  if (!player || !layer) { render(); return; }
  player.style.left = (f.x * TILE_PX) + 'px';
  player.style.top = (f.y * TILE_PX) + 'px';
  const img = player.querySelector('.field-player-sprite');
  if (img) {
    img.classList.toggle('face-left', f.facing === 'left');
    f.walkFrame = (f.walkFrame + 1) % TRAINER_WALK_FRAMES;
    img.src = trainerWalkFrame(trainerOf(state.trainerId), f.walkFrame);
  }
  const cam = fieldCamera(f);
  layer.style.transform = `translate(${-cam.x}px, ${-cam.y}px)`;
}

function fieldEncounterFlash(done) {
  const vp = document.querySelector('.field-viewport');
  if (!vp) { done(); return; }
  uiState.animating = true;
  const fx = document.createElement('div');
  fx.className = 'field-encounter-flash';
  vp.appendChild(fx);
  playSfx('status');
  setTimeout(() => { uiState.animating = false; done(); }, 500);
}

// Shared "!"-freeze-then-battle beat for trainers, dojo leaders, bosses, and the champion.
function engageWithExclaim(npcId, startFn) {
  uiState.animating = true;
  const f = state.field;
  updateFieldDom(f);
  const npcEl = document.querySelector(`.field-npc[data-npc-id="${npcId}"]`);
  if (npcEl) {
    const ex = document.createElement('div');
    ex.className = 'field-exclaim';
    ex.textContent = '!';
    npcEl.appendChild(ex);
  }
  playSfx('exclaim');
  setTimeout(() => {
    uiState.animating = false;
    startFn();
    render();
  }, 750);
}

// ---- Battle move effects (particle bursts / lunge / shake / HP tween), themed per type — built
// from CSS + emoji primitives since no sprite-sheet FX assets exist for this project (docs-style
// homage to ChaThaiTheCat's move-FX, adapted rather than copied). ----
const TYPE_PARTICLE = {
  Normal: '⭐', Fire: '🔥', Water: '💧', Electric: '⚡', Grass: '🌿', Ice: '❄️',
  Fighting: '👊', Poison: '☠️', Ground: '💥', Flying: '🌪️', Psychic: '🔮', Bug: '🐛',
  Rock: '🪨', Ghost: '👻', Dragon: '🐉', Dark: '🌑', Steel: '⚙️', Fairy: '✨',
};
const STATUS_EMOJI = { burn: '🔥', atkDown: '⬇️', defDown: '🛡️', spdDown: '🐌', paralyze: '⚡', accDown: '💫' };
function typeFxColor(type) { return `hsl(${HUE[type] || 0}, 80%, 55%)`; }

function fxNode(container, cls, x, y) {
  const el = document.createElement('div');
  el.className = cls;
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  container.appendChild(el);
  return el;
}

function fxPointFor(container, targetEl) {
  const cRect = container.getBoundingClientRect();
  const tRect = targetEl.getBoundingClientRect();
  return { x: tRect.left - cRect.left + tRect.width * 0.5, y: tRect.top - cRect.top + tRect.height * 0.55 };
}

function spawnImpact(container, pt, type) {
  const flash = fxNode(container, 'fx-impact', pt.x, pt.y);
  flash.style.background = `radial-gradient(circle, ${typeFxColor(type)} 0%, transparent 70%)`;
  setTimeout(() => flash.remove(), 480);
  const glyph = TYPE_PARTICLE[type] || '💥';
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + Math.random() * 0.4;
    const dist = 28 + Math.random() * 16;
    const p = fxNode(container, 'fx-particle', pt.x, pt.y);
    p.textContent = glyph;
    p.style.setProperty('--fx-tx', (Math.cos(angle) * dist) + 'px');
    p.style.setProperty('--fx-ty', (Math.sin(angle) * dist) + 'px');
    setTimeout(() => p.remove(), 600);
  }
}

function spawnSparkle(container, pt) {
  for (let i = 0; i < 5; i++) {
    const p = fxNode(container, 'fx-sparkle', pt.x + (Math.random() * 40 - 20), pt.y + (Math.random() * 10 - 5));
    p.textContent = '✨';
    p.style.animationDelay = (i * 0.06) + 's';
    setTimeout(() => p.remove(), 900);
  }
}

function spawnStatusGlyph(spriteEl, emoji) {
  const g = document.createElement('div');
  g.className = 'fx-status-glyph';
  g.textContent = emoji;
  spriteEl.appendChild(g);
  setTimeout(() => g.remove(), 1000);
}

function spawnMiss(spriteEl) {
  const m = document.createElement('div');
  m.className = 'fx-miss';
  m.textContent = 'Miss!';
  spriteEl.appendChild(m);
  setTimeout(() => m.remove(), 700);
}

function battleSideEls(side) {
  const spriteEl = document.querySelector(side === 'player' ? '.battle-player-sprite' : '.battle-enemy-sprite');
  return {
    spriteEl,
    imgEl: spriteEl ? spriteEl.querySelector('.mon-img') : null,
    hudBar: document.querySelector(`.mon-hud-${side} .mon-hpbar-fill`),
    hudNum: document.querySelector(`.mon-hud-${side} .mon-hp-numbers`),
  };
}

function setHpBar(side, mon) {
  const els = battleSideEls(side);
  const ratio = Math.max(0, mon.curHP / mon.maxHP);
  if (els.hudBar) { els.hudBar.style.width = (ratio * 100) + '%'; els.hudBar.style.background = hpColor(ratio); }
  if (els.hudNum) els.hudNum.textContent = `${Math.max(0, mon.curHP)}/${mon.maxHP}`;
}

// Replays one already-computed beat (engine.js has already applied all the real state changes —
// this just visually re-tells what happened, in order, before the final render() shows the truth).
function playMoveBeat(beat, playerMon, enemyMon, onDone) {
  const field = document.querySelector('.battle-field');
  if (!field) { onDone(); return; }
  const atkSide = beat.side, defSide = atkSide === 'player' ? 'enemy' : 'player';
  const atk = battleSideEls(atkSide), def = battleSideEls(defSide);
  const defMon = defSide === 'player' ? playerMon : enemyMon;
  const atkMon = atkSide === 'player' ? playerMon : enemyMon;

  if (atk.spriteEl) atk.spriteEl.classList.add('fx-lunge');
  setTimeout(() => { if (atk.spriteEl) atk.spriteEl.classList.remove('fx-lunge'); }, 380);

  setTimeout(() => {
    if (beat.missed) {
      playSfx('bump');
      if (def.spriteEl) spawnMiss(def.spriteEl);
      setTimeout(onDone, 300);
      return;
    }
    if (beat.cat === 'heal') {
      playSfx('heal');
      if (atk.spriteEl) spawnSparkle(field, fxPointFor(field, atk.spriteEl));
      setHpBar(atkSide, atkMon);
      setTimeout(onDone, 400);
      return;
    }
    if (beat.cat === 'status') {
      playSfx('status');
      if (def.spriteEl) spawnStatusGlyph(def.spriteEl, STATUS_EMOJI[beat.statusApplied] || '❓');
      setTimeout(onDone, 500);
      return;
    }
    // damage beat
    playSfx(beat.mult > 1 ? 'superhit' : 'hit');
    if (def.spriteEl) {
      spawnImpact(field, fxPointFor(field, def.spriteEl), beat.moveType);
      if (def.imgEl) {
        def.imgEl.classList.add('fx-hitflash');
        setTimeout(() => def.imgEl && def.imgEl.classList.remove('fx-hitflash'), 320);
      }
    }
    const shakeCls = beat.mult > 1 ? 'fx-shake-big' : 'fx-shake';
    field.classList.add(shakeCls);
    setTimeout(() => field.classList.remove(shakeCls), 650);
    setHpBar(defSide, defMon);
    if (beat.defFainted) {
      playSfx('faint');
      setTimeout(() => { if (def.spriteEl) def.spriteEl.classList.add('fx-faint'); }, 250);
      setTimeout(onDone, 700);
    } else {
      setTimeout(onDone, 420);
    }
  }, 220);
}

function playBattleBeats(beats, playerMon, enemyMon, onDone) {
  if (!beats || !beats.length) { onDone(); return; }
  let i = 0;
  function next() {
    if (i >= beats.length) { onDone(); return; }
    playMoveBeat(beats[i++], playerMon, enemyMon, next);
  }
  next();
}

// The field viewport is a fixed 480x320 pixel-grid canvas (15x10 tiles at TILE_PX=32) — on a narrow
// mobile screen, plain CSS max-width:100% would only SHRINK THE OUTER BOX while the inner map layer
// (sized to the full map in real tile pixels, positioned via camera translate) keeps its full size
// and just gets cropped by overflow:hidden. That crops the RIGHT/BOTTOM edge of the intended view
// instead of scaling it down, which is what made the player sprite look shoved off-center on phones.
// Fix: the actual 480x320 content lives in .field-scale-wrap, and we scale THAT down via a measured
// transform so the whole scene shrinks uniformly instead of being cropped.
function applyFieldScale() {
  const vp = document.querySelector('.field-viewport');
  const wrap = document.querySelector('.field-scale-wrap');
  if (!vp || !wrap) return;
  const scale = vp.clientWidth / 480;
  wrap.style.transform = `scale(${scale})`;
}
window.addEventListener('resize', applyFieldScale);

function performFieldMove(dx, dy) {
  if (state.screen !== 'field' || !state.field) return;
  if (fieldStepLock || uiState.animating) return;
  const f = state.field;
  const hadDialogue = !!f.dialogue;
  const beforeMap = f.mapId;
  moveFieldPlayer(dx, dy);
  if (state.screen !== 'field') { render(); return; }           // stepped onto @exit
  if (hadDialogue || f.dialogue) { render(); return; }          // dialogue closed or opened
  if (f.mapId !== beforeMap) {                                  // warped to the linked screen
    render();
    playSfx('warp');
    const vp = document.querySelector('.field-viewport');
    if (vp) { vp.classList.add('warp-fade'); setTimeout(() => vp.classList.remove('warp-fade'), 450); }
    return;
  }
  if (f.pendingTrainer) { const id = f.pendingTrainer; engageWithExclaim(id, () => startTrainerBattle(id)); return; }
  if (f.pendingDojo) {
    const dojoId = f.pendingDojo;
    f.pendingDojo = null;
    engageWithExclaim('dojo_' + dojoId, () => startDojoBattle(dojoId));
    return;
  }
  if (f.pendingBoss) {
    const bossRegion = f.pendingBoss;
    f.pendingBoss = null;
    engageWithExclaim('boss_' + bossRegion, () => startFieldBossBattle(bossRegion));
    return;
  }
  if (f.pendingChampion) {
    f.pendingChampion = false;
    engageWithExclaim('champion_npc', () => startChampionBattle());
    return;
  }
  if (f.pendingEncounter) {
    f.pendingEncounter = false;
    updateFieldDom(f);
    fieldEncounterFlash(() => { confirmFieldEncounter(); render(); });
    return;
  }
  fieldStepLock = true;
  setTimeout(() => { fieldStepLock = false; }, 140);
  updateFieldDom(f);
}

// ---- Action dispatch ----

function handleAction(action, ds) {
  if (uiState.animating) return;
  switch (action) {
    case 'open-regionmap':
      state.screen = 'regionmap';
      break;
    case 'open-party': state.screen = 'party'; break;
    case 'open-storage': state.screen = 'storage'; break;
    case 'open-dex': state.screen = 'dex'; break;
    case 'open-evolution': state.screen = 'evolution'; break;
    case 'open-movepool': state.screen = 'movepool'; break;
    case 'open-guide': state.screen = 'guide'; break;
    case 'save-game': saveGame(); break;
    case 'toggle-mute': toggleSfxMute(); break;
    case 'dex-filter':
      uiState.dexFilter = ds.type || null;
      break;
    case 'open-status':
      uiState.statusUid = ds.uid;
      uiState.statusReturn = state.screen;
      state.screen = 'status';
      break;
    case 'close-status':
      state.screen = uiState.statusReturn || 'party';
      break;
    case 'set-lead': setLeadMon(ds.uid); break;
    case 'move-to-storage': moveMonToStorage(ds.uid); break;
    case 'move-to-party': moveMonToParty(ds.uid); break;
    case 'heal-party':
      healParty();
      playSfx('heal');
      pushLog('Your monsters feel refreshed!');
      break;
    case 'show-trainers': uiState.showTrainers = true; break;
    case 'pick-trainer':
      uiState.pickedTrainer = ds.trainer;
      uiState.showTrainers = false;
      uiState.showStarters = true;
      break;
    case 'back-to-trainers':
      uiState.showStarters = false;
      uiState.showTrainers = true;
      break;
    case 'pick-starter':
      newGame(ds.species, uiState.pickedTrainer);
      uiState.showStarters = false;
      uiState.showTrainers = false;
      uiState.pickedTrainer = null;
      break;
    case 'continue-game':
      loadGame();
      // Resume exactly where the save found the player — a restored state.field means they were
      // mid-walk, so drop straight back onto that tile instead of re-entering at the map's
      // entrance (that's what enterField() already does when state.field.region matches).
      if (state.field) state.screen = 'field';
      else if (!enterField(state.currentRegion)) state.screen = 'regionmap';
      break;
    case 'travel-region':
      travelToRegion(ds.region);
      break;
    case 'enter-field':
      if (!enterField(state.currentRegion)) pushLog('This region has no walkable screens yet.');
      break;
    case 'exit-field': exitField(); break;
    case 'field-move':
      performFieldMove(parseInt(ds.dx, 10), parseInt(ds.dy, 10));
      return;
    case 'close-dialogue':
      if (state.field) state.field.dialogue = null;
      break;
    case 'battle-move': {
      const b = state.battle;
      if (!b || b.over || b.awaitingSwitch) return;
      const playerMon = currentPlayerMon(), enemyMon = currentEnemyMon();
      battleTurn(ds.move);
      uiState.animating = true;
      playBattleBeats(b.lastBeats, playerMon, enemyMon, () => {
        uiState.animating = false;
        if (b.over && b.won) playSfx('win');
        render();
      });
      return; // DOM animates live via the beat sequencer; render() fires in its completion callback
    }
    case 'battle-catch':
      attemptCatch(ds.ball);
      if (state.battle && state.battle.caught) playSfx('catch');
      break;
    case 'battle-run': runAway(); break;
    case 'battle-open-switch': uiState.choosingSwitch = true; break;
    case 'battle-cancel-switch': uiState.choosingSwitch = false; break;
    case 'battle-voluntary-switch':
      uiState.choosingSwitch = false;
      voluntarySwitch(ds.uid);
      break;
    case 'battle-switch': switchPlayerMon(ds.uid); break;
    case 'battle-continue':
      uiState.choosingSwitch = false;
      endBattle();
      break;
    case 'battle-recruit-yes':
      resolveBossRecruit(true);
      playSfx('catch');
      endBattle();
      break;
    case 'battle-recruit-no':
      resolveBossRecruit(false);
      endBattle();
      break;
    default:
      return;
  }
  render();
}

// ---- Event wiring ----

document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled) return;
  handleAction(el.dataset.action, el.dataset);
});

// ---- Movement input: key-state tracking + a self-owned tick, feeding 8-direction grid movement
// (X/Y-style — playtest feedback §1.3). Native OS key-repeat has a slow initial delay and drops
// input during that gap, and doesn't let two keys combine into a diagonal — so instead we track
// which movement keys are currently held (keydown adds / keyup removes) and poll that set on our
// own interval. performFieldMove() already self-throttles actual steps via fieldStepLock, so
// polling faster than that just makes direction changes (and diagonals) feel immediate. ----
const KEY_DIRS = {
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
  w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
};
const heldKeys = new Set();
let joystickDir = { dx: 0, dy: 0 };

document.addEventListener('keydown', e => {
  if (!KEY_DIRS[e.key]) return;
  heldKeys.add(e.key);
  e.preventDefault();
});
document.addEventListener('keyup', e => heldKeys.delete(e.key));
window.addEventListener('blur', () => heldKeys.clear()); // alt-tabbing away must not leave a key "stuck" held

setInterval(() => {
  if (state.screen !== 'field' || !state.field) return;
  let dx = 0, dy = 0;
  for (const k of heldKeys) { dx += KEY_DIRS[k][0]; dy += KEY_DIRS[k][1]; }
  dx += joystickDir.dx; dy += joystickDir.dy;
  dx = Math.sign(dx); dy = Math.sign(dy);
  if (dx || dy) performFieldMove(dx, dy);
}, 60);

// ---- Virtual joystick (replaces the old 4-button D-pad — touch ergonomics, playtest §1.3/§3.5):
// drag the nub off-center, angle snaps to one of 8 directions, small deadzone at the center so a
// stray tap doesn't move the player. ----
function angleToDir8(dxPix, dyPix, radius) {
  const dist = Math.hypot(dxPix, dyPix);
  if (dist < radius * 0.25) return { dx: 0, dy: 0 };
  const deg = (Math.atan2(dyPix, dxPix) * 180 / Math.PI + 360) % 360;
  const table = [
    { dx: 1, dy: 0 }, { dx: 1, dy: 1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 1 },
    { dx: -1, dy: 0 }, { dx: -1, dy: -1 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 },
  ];
  return table[Math.round(deg / 45) % 8];
}

function joystickPoint(el, clientX, clientY) {
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
  const dxPix = clientX - cx, dyPix = clientY - cy;
  const radius = rect.width / 2;
  joystickDir = angleToDir8(dxPix, dyPix, radius);
  const nub = el.querySelector('.joystick-nub');
  if (nub) {
    const dist = Math.min(Math.hypot(dxPix, dyPix), radius * 0.7);
    const ang = Math.atan2(dyPix, dxPix);
    nub.style.transform = `translate(${Math.cos(ang) * dist}px, ${Math.sin(ang) * dist}px)`;
  }
}
function resetJoystick(el) {
  joystickDir = { dx: 0, dy: 0 };
  const nub = el.querySelector('.joystick-nub');
  if (nub) nub.style.transform = 'translate(0, 0)';
}

let joystickPointerId = null;
document.addEventListener('pointerdown', e => {
  const el = e.target.closest('.joystick');
  if (!el) return;
  e.preventDefault();
  joystickPointerId = e.pointerId;
  el.setPointerCapture(e.pointerId);
  joystickPoint(el, e.clientX, e.clientY);
});
document.addEventListener('pointermove', e => {
  if (joystickPointerId === null || e.pointerId !== joystickPointerId) return;
  const el = document.querySelector('.joystick');
  if (!el) return;
  joystickPoint(el, e.clientX, e.clientY);
});
['pointerup', 'pointercancel'].forEach(ev => document.addEventListener(ev, e => {
  if (joystickPointerId === null || e.pointerId !== joystickPointerId) return;
  joystickPointerId = null;
  const el = document.querySelector('.joystick');
  if (el) resetJoystick(el);
}));

render();
