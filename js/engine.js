// TaleofChaThai — engine: state, monsters, battle, catch, field walking, save/load
// Adapted from ChaThaiTheCat's proven engine patterns (docs §5) for the 18-type system.
'use strict';

const SAVE_KEY = 'taleofchathai_save_v1';
let uidCounter = 1;
function nextUid() { return 'm' + (uidCounter++); }

const state = {
  screen: 'start', // start | regionmap | field | battle | party | storage | dex | evolution | movepool | guide | status | congrats
  currentRegion: START_REGION,
  trainerId: null,
  party: [],
  storage: [],
  badges: [],
  items: { treat: 5, goldenTreat: 1 },
  visited: {},            // { regionId: true } — §11-style fast-travel gate, on from day one (docs §4.4)
  recruitedBosses: {},    // { bossRegion: true } — recruit-once field bosses (docs §3.7)
  championCleared: false,
  battle: null,
  field: null, // { region, mapId, x, y, facing, walkFrame, defeatedTrainers, dialogue, pendingTrainer, pendingDojo, pendingBoss, pendingChampion, pendingEncounter }
  log: [],
};

function pushLog(msg) {
  state.log.push(msg);
  if (state.log.length > 200) state.log.shift();
}

// ---------------- Stats / monsters ----------------

function calcStats(base, level) {
  return {
    maxHP: Math.floor(base.hp * (1 + level * 0.12)) + level,
    atk: Math.floor(base.atk * (1 + level * 0.09)),
    def: Math.floor(base.def * (1 + level * 0.09)),
    spd: Math.floor(base.spd * (1 + level * 0.09)),
  };
}

function movesKnownAt(species, level) {
  const learned = species.movepool.filter(m => m.lvl <= level).map(m => m.move);
  return learned.slice(-4);
}

function createMon(speciesId, level) {
  const sp = SPECIES[speciesId];
  const stats = calcStats(sp.base, level);
  return {
    uid: nextUid(), speciesId, level,
    exp: 0, expToNext: level * 20,
    curHP: stats.maxHP, maxHP: stats.maxHP,
    atk: stats.atk, def: stats.def, spd: stats.spd,
    moves: movesKnownAt(sp, level),
    status: null,
  };
}

function createEnemyMon(speciesId, level) { return createMon(speciesId, level); }

function speciesOf(mon) { return SPECIES[mon.speciesId]; }

function effectiveStat(mon, stat) {
  const s = mon.status;
  if (s && STATUS_INFO[s.effect] && STATUS_INFO[s.effect].kind === 'stat' && STATUS_INFO[s.effect].stat === stat) {
    return Math.max(1, Math.floor(mon[stat] * STATUS_INFO[s.effect].mult));
  }
  return mon[stat];
}

function recomputeStatsKeepRatio(mon) {
  const sp = speciesOf(mon);
  const wasFainted = mon.curHP <= 0;
  const ratio = mon.curHP / mon.maxHP;
  const stats = calcStats(sp.base, mon.level);
  mon.maxHP = stats.maxHP; mon.atk = stats.atk; mon.def = stats.def; mon.spd = stats.spd;
  mon.curHP = wasFainted ? 0 : Math.max(1, Math.round(mon.maxHP * ratio));
}

function gainExp(mon, amount) {
  mon.exp += amount;
  const msgs = [];
  while (mon.exp >= mon.expToNext) {
    mon.exp -= mon.expToNext;
    mon.level++;
    mon.expToNext = mon.level * 20;
    recomputeStatsKeepRatio(mon);
    msgs.push(`${speciesOf(mon).name} grew to Lv${mon.level}!`);
    const sp = speciesOf(mon);
    const known = movesKnownAt(sp, mon.level);
    if (JSON.stringify(known) !== JSON.stringify(mon.moves)) {
      mon.moves = known;
      msgs.push(`${sp.name} updated its moves!`);
    }
    if (sp.evolvesTo && sp.evoLevel && mon.level >= sp.evoLevel) {
      const evo = SPECIES[sp.evolvesTo];
      mon.speciesId = evo.id;
      recomputeStatsKeepRatio(mon);
      mon.moves = movesKnownAt(evo, mon.level);
      msgs.push(`What?! ${sp.name} evolved into ${evo.name}!`);
    }
  }
  return msgs;
}

function firstAlive(list) { return list.find(m => m.curHP > 0) || null; }
function healParty() { state.party.forEach(m => { m.curHP = m.maxHP; m.status = null; }); }

// ---------------- Battle ----------------

function applyMove(attacker, defender, moveId) {
  const mv = MOVES[moveId];
  const atkSp = speciesOf(attacker);
  const s = attacker.status;
  if (s && STATUS_INFO[s.effect].kind === 'skip' && Math.random() < STATUS_INFO[s.effect].chance) {
    return { text: `${atkSp.name} is paralyzed and can't move!`, dmg: 0 };
  }
  let acc = mv.acc;
  if (s && STATUS_INFO[s.effect].kind === 'acc') acc *= STATUS_INFO[s.effect].mult;
  if (Math.random() > acc) return { text: `${atkSp.name}'s ${mv.name} missed!`, dmg: 0 };

  if (mv.cat === 'heal') {
    const amount = Math.round(attacker.maxHP * mv.heal);
    attacker.curHP = Math.min(attacker.maxHP, attacker.curHP + amount);
    return { text: `${atkSp.name} used ${mv.name} — restored ${amount} HP!`, heal: amount };
  }
  if (mv.cat === 'status') {
    defender.status = { effect: mv.effect, turnsLeft: mv.turns };
    return { text: `${atkSp.name} used ${mv.name}! ${speciesOf(defender).name} is hit by ${STATUS_NAME[mv.effect]}!`, statusApplied: mv.effect };
  }
  const defSp = speciesOf(defender);
  const mult = typeMultiplier(mv.type, defSp.type, defSp.type2);
  const stab = mv.type === atkSp.type ? 1.2 : 1;
  const raw = (effectiveStat(attacker, 'atk') * mv.power / Math.max(1, effectiveStat(defender, 'def'))) * 0.9;
  const dmg = Math.max(1, Math.round(raw * mult * stab * (0.9 + Math.random() * 0.2)));
  defender.curHP = Math.max(0, defender.curHP - dmg);
  let note = '';
  if (mult > 1) note = " It's super effective!";
  else if (mult === 0) note = ' It had no effect...';
  else if (mult < 1) note = " It's not very effective...";
  return { text: `${atkSp.name} used ${mv.name}! ${mult === 0 ? '' : dmg + ' damage.'}${note}`, dmg, mult };
}

function tickStatus(mon, log) {
  const s = mon.status;
  if (!s) return;
  const info = STATUS_INFO[s.effect];
  if (info.kind === 'dot') {
    const dmg = Math.max(1, Math.round(mon.maxHP * info.dmg));
    mon.curHP = Math.max(0, mon.curHP - dmg);
    log.push(`${speciesOf(mon).name} is hurt by ${info.name}! (${dmg})`);
  }
  s.turnsLeft--;
  if (s.turnsLeft <= 0) { log.push(`${speciesOf(mon).name}'s ${info.name} wore off.`); mon.status = null; }
}

function startWildBattle(regionId) {
  const table = REGION_ENCOUNTERS[regionId];
  if (!table || !table.length) return;
  const pick = table[Math.floor(Math.random() * table.length)];
  const lvl = pick.min + Math.floor(Math.random() * (pick.max - pick.min + 1));
  const player = firstAlive(state.party);
  if (!player) { pushLog('Your party has no monsters able to fight!'); return; }
  const enemy = createEnemyMon(pick.s, lvl);
  state.battle = {
    wild: true, dojoId: null, enemyTeam: [enemy], idx: 0,
    playerUid: player.uid, log: [`A wild ${speciesOf(enemy).name} (Lv${lvl}) appears!`],
    over: false, awaitingSwitch: false, rewardGiven: false, returnScreen: state.screen,
    recruitOffer: null,
  };
  state.screen = 'battle';
}

function startDojoBattle(dojoId) {
  const dojo = DOJOS[dojoId];
  if (!dojo) return;
  const player = firstAlive(state.party);
  if (!player) { pushLog('Your party has no monsters able to fight!'); return; }
  state.battle = {
    wild: false, dojoId, enemyTeam: dojo.team.map(t => createEnemyMon(t.s, t.lvl)), idx: 0,
    playerUid: player.uid, log: [`${dojo.leader} wants to battle! (${dojo.name})`],
    over: false, awaitingSwitch: false, rewardGiven: false, returnScreen: state.screen,
    recruitOffer: null,
  };
  state.screen = 'battle';
}

function startFieldBossBattle(bossRegion) {
  const def = FIELD_BOSSES[bossRegion];
  if (!def || state.recruitedBosses[bossRegion]) return;
  const player = firstAlive(state.party);
  if (!player) { pushLog('Your party has no monsters able to fight!'); return; }
  state.battle = {
    wild: false, dojoId: null, bossRegion, enemyTeam: [createEnemyMon(def.s, def.lvl)], idx: 0,
    playerUid: player.uid, log: [`${SPECIES[def.s].name} attacks!`],
    over: false, awaitingSwitch: false, rewardGiven: false, returnScreen: state.screen,
    recruitOffer: null,
  };
  state.screen = 'battle';
}

function startChampionBattle() {
  if (state.badges.length < 5) { pushLog('You need all 5 badges to challenge the Champion!'); return; }
  const player = firstAlive(state.party);
  if (!player) { pushLog('Your party has no monsters able to fight!'); return; }
  state.battle = {
    wild: false, dojoId: 'champion', enemyTeam: CHAMPION.team.map(t => createEnemyMon(t.s, t.lvl)), idx: 0,
    playerUid: player.uid, log: [`${CHAMPION.name} accepts your challenge!`],
    over: false, awaitingSwitch: false, rewardGiven: false, returnScreen: state.screen,
    recruitOffer: null,
  };
  state.screen = 'battle';
}

function currentPlayerMon() {
  if (!state.battle) return null;
  return state.party.find(m => m.uid === state.battle.playerUid) || null;
}
function currentEnemyMon() {
  if (!state.battle) return null;
  const idx = Math.min(state.battle.idx, state.battle.enemyTeam.length - 1);
  return state.battle.enemyTeam[idx];
}

function battleTurn(moveId) {
  const b = state.battle;
  if (!b || b.over || b.awaitingSwitch) return;
  const player = currentPlayerMon();
  const enemy = currentEnemyMon();
  if (!player || !enemy) return;
  const beats = []; // structured replay of what happened this turn, for the UI's animated beat sequencer
  const enemyMoves = enemy.moves && enemy.moves.length ? enemy.moves : movesKnownAt(speciesOf(enemy), enemy.level);
  const enemyMove = enemyMoves[Math.floor(Math.random() * enemyMoves.length)] || 'scratch';
  const order = effectiveStat(player, 'spd') >= effectiveStat(enemy, 'spd')
    ? [[player, enemy, moveId, 'player'], [enemy, player, enemyMove, 'enemy']]
    : [[enemy, player, enemyMove, 'enemy'], [player, enemy, moveId, 'player']];
  for (const [atk, def, mv, side] of order) {
    if (atk.curHP <= 0 || def.curHP <= 0) continue;
    const defHpBefore = def.curHP;
    const atkHpBefore = atk.curHP;
    const result = applyMove(atk, def, mv);
    b.log.push(result.text);
    beats.push({
      side, moveId: mv, moveType: MOVES[mv].type, cat: MOVES[mv].cat,
      missed: !result.dmg && !result.heal && !result.statusApplied && !MOVES[mv].heal && MOVES[mv].cat === 'damage',
      dmg: result.dmg || 0, mult: result.mult === undefined ? 1 : result.mult,
      heal: result.heal || 0, statusApplied: result.statusApplied || null,
      defHpBefore, defHpAfter: def.curHP, atkHpBefore, atkHpAfter: atk.curHP,
      defFainted: def.curHP <= 0 && defHpBefore > 0,
    });
  }
  tickStatus(player, b.log);
  tickStatus(enemy, b.log);
  b.lastBeats = beats;
  if (enemy.curHP <= 0) {
    b.log.push(`${speciesOf(enemy).name} fainted!`);
    const share = Math.max(1, Math.round(enemy.level * 80 / state.party.length));
    state.party.forEach(m => gainExp(m, share).forEach(msg => b.log.push(msg)));
    b.log.push(`Your party gained ${share} EXP each!`);
    advanceEnemyOrEndBattle();
  }
  if (!b.over && player.curHP <= 0) {
    b.log.push(`${speciesOf(player).name} fainted!`);
    if (firstAlive(state.party)) b.awaitingSwitch = true;
    else { b.log.push('You have no more monsters... Blackout!'); b.over = true; b.lost = true; }
  }
}

function advanceEnemyOrEndBattle() {
  const b = state.battle;
  b.idx++;
  if (b.idx >= b.enemyTeam.length) {
    b.over = true;
    b.won = true;
    if (!b.rewardGiven) {
      b.rewardGiven = true;
      if (b.dojoId && b.dojoId !== 'champion') {
        const dojo = DOJOS[b.dojoId];
        if (!state.badges.includes(dojo.badge)) {
          state.badges.push(dojo.badge);
          b.log.push(`You earned the ${dojo.badge}!`);
        } else {
          b.log.push(`You defeated ${dojo.leader} again!`);
        }
      } else if (b.dojoId === 'champion') {
        state.championCleared = true;
        b.log.push(`You defeated the ${CHAMPION.name}! You are the Champion of ChaThai!`);
      } else if (b.bossRegion) {
        // §3.7 — recruit-once boss: offer to join, then the boss leaves the field for good.
        b.recruitOffer = { s: FIELD_BOSSES[b.bossRegion].s, lvl: FIELD_BOSSES[b.bossRegion].lvl, bossRegion: b.bossRegion };
        b.log.push(`${SPECIES[b.recruitOffer.s].name} bows, humbled by your strength...`);
      } else if (b.trainerNpc) {
        b.log.push(`You defeated ${b.trainerName}!`);
        if (state.field && !state.field.defeatedTrainers.includes(b.trainerNpc)) {
          state.field.defeatedTrainers.push(b.trainerNpc);
        }
      }
    }
  } else {
    b.log.push(`${speciesOf(b.enemyTeam[b.idx]).name} is sent out!`);
    b.enemyAdvanced = true;
  }
}

function resolveBossRecruit(accept) {
  const b = state.battle;
  if (!b || !b.recruitOffer) return;
  const { s, lvl, bossRegion } = b.recruitOffer;
  state.recruitedBosses[bossRegion] = true; // recruited OR declined — either way it leaves the field (recruit-once, docs §3.7)
  if (accept) {
    const mon = createMon(s, lvl);
    const toParty = state.party.length < 6;
    (toParty ? state.party : state.storage).push(mon);
    pushLog(`${SPECIES[s].name} joined your ${toParty ? 'party' : 'storage'}!`);
  } else {
    pushLog(`${SPECIES[s].name} vanished into the wilds.`);
  }
  b.recruitOffer = null;
}

function switchPlayerMon(uid) {
  const b = state.battle;
  if (!b) return;
  const mon = state.party.find(m => m.uid === uid);
  if (!mon || mon.curHP <= 0) return;
  b.playerUid = uid;
  b.awaitingSwitch = false;
  b.log.push(`Go, ${speciesOf(mon).name}!`);
  setLeadMon(uid);
}

function voluntarySwitch(uid) {
  const b = state.battle;
  if (!b || b.over || b.awaitingSwitch) return;
  const target = state.party.find(m => m.uid === uid);
  if (!target || target.curHP <= 0 || target.uid === b.playerUid) return;
  const prev = currentPlayerMon();
  b.playerUid = uid;
  setLeadMon(uid);
  b.log.push(`${speciesOf(prev).name}, come back! Go, ${speciesOf(target).name}!`);
  const enemy = currentEnemyMon();
  if (enemy && enemy.curHP > 0) {
    const moves = enemy.moves && enemy.moves.length ? enemy.moves : movesKnownAt(speciesOf(enemy), enemy.level);
    b.log.push(applyMove(enemy, target, moves[Math.floor(Math.random() * moves.length)] || 'scratch').text);
    if (target.curHP <= 0) {
      b.log.push(`${speciesOf(target).name} fainted!`);
      if (firstAlive(state.party)) b.awaitingSwitch = true;
      else { b.log.push('Blackout!'); b.over = true; b.lost = true; }
    }
  }
}

function attemptCatch(ball) {
  const b = state.battle;
  if (!b || !b.wild || b.over) return;
  if (state.items[ball] <= 0) return;
  state.items[ball]--;
  const enemy = currentEnemyMon();
  const sp = speciesOf(enemy);
  const hpFactor = 1 - (enemy.curHP / enemy.maxHP) * 0.6;
  const ballBonus = ball === 'goldenTreat' ? 1.8 : 1;
  const chance = Math.min(0.95, sp.catchRate * hpFactor * ballBonus);
  if (Math.random() < chance) {
    enemy.curHP = enemy.maxHP;
    enemy.status = null;
    const toParty = state.party.length < 6;
    (toParty ? state.party : state.storage).push(enemy);
    b.log.push(`Gotcha! ${sp.name} was caught${toParty ? '' : ' (sent to storage)'}!`);
    b.over = true; b.won = true; b.caught = true;
  } else {
    b.log.push(`${sp.name} broke free!`);
    const moves = enemy.moves.length ? enemy.moves : ['scratch'];
    const player = currentPlayerMon();
    b.log.push(applyMove(enemy, player, moves[Math.floor(Math.random() * moves.length)]).text);
    if (player.curHP <= 0) {
      b.log.push(`${speciesOf(player).name} fainted!`);
      if (firstAlive(state.party)) b.awaitingSwitch = true;
      else { b.log.push('Blackout!'); b.over = true; b.lost = true; }
    }
  }
}

function runAway() {
  const b = state.battle;
  if (!b || !b.wild) return;
  b.log.push('Got away safely!');
  b.over = true; b.ran = true;
}

function endBattle() {
  const b = state.battle;
  let returnScreen = (b && b.returnScreen) || 'regionmap';
  const championCleared = !!(b && b.dojoId === 'champion' && b.won);
  if (b && (b.lost || (b.over && !b.won && !b.ran))) {
    healParty();
    state.currentRegion = START_REGION;
    state.field = null;
    returnScreen = 'regionmap';
  }
  state.party.forEach(m => { m.status = null; });
  state.storage.forEach(m => { m.status = null; });
  state.battle = null;
  state.screen = championCleared ? 'congrats' : returnScreen;
}

// ---------------- Party management ----------------

function setLeadMon(uid) {
  const idx = state.party.findIndex(m => m.uid === uid);
  if (idx <= 0) return;
  const [mon] = state.party.splice(idx, 1);
  state.party.unshift(mon);
}
function moveMonToStorage(uid) {
  if (state.party.length <= 1) return;
  const idx = state.party.findIndex(m => m.uid === uid);
  if (idx < 0) return;
  state.storage.push(state.party.splice(idx, 1)[0]);
}
function moveMonToParty(uid) {
  if (state.party.length >= 6) return;
  const idx = state.storage.findIndex(m => m.uid === uid);
  if (idx < 0) return;
  state.party.push(state.storage.splice(idx, 1)[0]);
}

// ---------------- Field walking (FireRed-style, same architecture as ChaThaiTheCat) ----------------

function fieldMap(f) { return FIELD_MAPS[(f || state.field).mapId]; }
function tileAt(map, x, y) {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return 'T';
  return map.ground[y][x];
}
function fieldNpcAt(map, x, y) {
  return (map.npcs || []).find(n => {
    if (n.kind === 'boss' && state.recruitedBosses[n.bossRegion]) return false; // recruited bosses leave the field
    return n.x === x && n.y === y;
  }) || null;
}
function fieldWarpAt(map, x, y) { return (map.warps || []).find(w => w.x === x && w.y === y) || null; }

function fieldCamera(f) {
  const map = fieldMap(f);
  const mapW = map.width * TILE_PX, mapH = map.height * TILE_PX;
  const viewW = FIELD_VIEW_W * TILE_PX, viewH = FIELD_VIEW_H * TILE_PX;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  return {
    x: clamp((f.x + 0.5) * TILE_PX - viewW / 2, 0, Math.max(0, mapW - viewW)),
    y: clamp((f.y + 0.5) * TILE_PX - viewH / 2, 0, Math.max(0, mapH - viewH)),
  };
}

const DELTA_OF_FACING = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

// Sprites only have 4 facing directions, so a diagonal step (X/Y-style 8-dir grid movement)
// falls back to its vertical axis when present (matches how most top-down games resolve this).
function facingFromDelta(dx, dy) {
  if (dy !== 0) return dy < 0 ? 'up' : 'down';
  if (dx !== 0) return dx < 0 ? 'left' : 'right';
  return null;
}

function stepPassable(map, x, y) {
  return WALKABLE_TILES.includes(tileAt(map, x, y)) && !fieldNpcAt(map, x, y);
}

function trainerSightHit(map, f, npc) {
  if (npc.kind !== 'trainer' || f.defeatedTrainers.includes(npc.id)) return false;
  const d = DELTA_OF_FACING[npc.facing] || DELTA_OF_FACING.down;
  for (let i = 1; i <= (npc.sightRange || 3); i++) {
    const sx = npc.x + d[0] * i, sy = npc.y + d[1] * i;
    if (f.x === sx && f.y === sy) return true;
    if (!WALKABLE_TILES.includes(tileAt(map, sx, sy)) || fieldNpcAt(map, sx, sy)) return false;
  }
  return false;
}

function enterField(regionId) {
  const mapId = REGION_ENTRY_MAP[regionId];
  const map = FIELD_MAPS[mapId];
  if (!map) return false;
  // Resume in place if a walk session for this region is still live (ChaThaiTheCat §12 fix, kept from day one).
  if (state.field && state.field.region === regionId) {
    state.screen = 'field';
    return true;
  }
  state.visited[regionId] = true;
  state.field = {
    region: regionId, mapId,
    x: map.entry.x, y: map.entry.y,
    facing: 'up', walkFrame: 0,
    defeatedTrainers: [],
    dialogue: null, pendingTrainer: null, pendingDojo: null, pendingBoss: null, pendingChampion: false,
    pendingEncounter: false,
  };
  state.screen = 'field';
  return true;
}

function exitField() {
  if (state.field) state.currentRegion = state.field.region;
  state.field = null;
  state.screen = 'regionmap';
}

function moveFieldPlayer(dx, dy) {
  const f = state.field;
  if (!f) return;
  if (f.pendingTrainer || f.pendingDojo || f.pendingBoss || f.pendingChampion || f.pendingEncounter) return;
  if (f.dialogue) { f.dialogue = null; return; }
  const facing = facingFromDelta(dx, dy);
  if (facing) f.facing = facing;
  const map = fieldMap(f);

  // Diagonal (X/Y-style 8-dir grid) step: only cut the corner if BOTH orthogonal neighbors are
  // also open (blocks squeezing diagonally through a wall corner). If the diagonal itself is
  // blocked but one axis is clear, slide along that axis instead of just refusing the input.
  if (dx !== 0 && dy !== 0) {
    const diagOpen = stepPassable(map, f.x + dx, f.y) && stepPassable(map, f.x, f.y + dy);
    if (!diagOpen) {
      if (stepPassable(map, f.x + dx, f.y)) dy = 0;
      else if (stepPassable(map, f.x, f.y + dy)) dx = 0;
      else return;
    }
  }

  const nx = f.x + dx, ny = f.y + dy;
  const npc = fieldNpcAt(map, nx, ny);
  if (npc) {
    if (npc.kind === 'trainer' && !f.defeatedTrainers.includes(npc.id)) f.pendingTrainer = npc.id;
    else if (npc.kind === 'dojo') f.pendingDojo = npc.dojoId;
    else if (npc.kind === 'boss') f.pendingBoss = npc.bossRegion;
    else if (npc.kind === 'champion') {
      if (state.badges.length >= 5) f.pendingChampion = true;
      else f.dialogue = { name: npc.name, text: `${npc.text} (You have ${state.badges.length}/5 badges.)` };
    }
    else f.dialogue = { name: npc.name || null, text: npc.text || '...' };
    return;
  }
  const tile = tileAt(map, nx, ny);
  if (!WALKABLE_TILES.includes(tile)) return;
  f.x = nx; f.y = ny;
  const warp = fieldWarpAt(map, nx, ny);
  if (warp) {
    if (warp.toMap === '@exit') { exitField(); return; }
    f.mapId = warp.toMap;
    f.x = warp.toX; f.y = warp.toY;
    return;
  }
  for (const t of (map.npcs || [])) {
    if (trainerSightHit(map, f, t)) { f.pendingTrainer = t.id; return; }
  }
  if (ENCOUNTER_TILES.includes(tile) && Math.random() < ENCOUNTER_CHANCE) {
    f.pendingEncounter = true;
  }
}

function confirmFieldEncounter() {
  const f = state.field;
  if (!f) return;
  f.pendingEncounter = false;
  startWildBattle(f.region);
}

function startTrainerBattle(npcId) {
  const f = state.field;
  if (!f) return;
  const npc = (fieldMap(f).npcs || []).find(n => n.id === npcId);
  f.pendingTrainer = null;
  if (!npc) return;
  const player = firstAlive(state.party);
  if (!player) { pushLog('Your party has no monsters able to fight!'); return; }
  state.battle = {
    wild: false, dojoId: null, trainerNpc: npc.id, trainerName: npc.name,
    enemyTeam: npc.team.map(t => createEnemyMon(t.s, t.lvl)), idx: 0,
    playerUid: player.uid, log: [`${npc.name} wants to battle!`],
    over: false, awaitingSwitch: false, rewardGiven: false, returnScreen: 'field',
    recruitOffer: null,
  };
  state.screen = 'battle';
}

// ---------------- Region travel (fast-travel gated by visited + badges from day one) ----------------

function canTravelTo(regionId) {
  const region = REGIONS[regionId];
  if (!region) return { ok: false, why: 'Unknown region.' };
  if (!REGION_ENTRY_MAP[regionId]) return { ok: false, why: 'This region is still uncharted (coming soon).' };
  const need = REGION_UNLOCK[regionId];
  if (need && !state.badges.includes(need)) return { ok: false, why: `Needs the ${need}.` };
  return { ok: true };
}

function travelToRegion(regionId) {
  const check = canTravelTo(regionId);
  if (!check.ok) { pushLog(check.why); return false; }
  if (state.field && state.field.region !== regionId) state.field = null; // abandon old walk session on real travel
  state.currentRegion = regionId;
  return enterField(regionId);
}

// ---------------- Save / Load ----------------

function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      party: state.party, storage: state.storage, badges: state.badges, items: state.items,
      visited: state.visited, recruitedBosses: state.recruitedBosses, championCleared: state.championCleared,
      currentRegion: state.currentRegion, trainerId: state.trainerId, uidCounter,
      field: state.field, // remember the exact tile/map the player was standing on (fixes "always restarts at the entrance")
    }));
    pushLog('Game saved.');
  } catch (e) { pushLog('Save failed: ' + e.message); }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    state.party = data.party || [];
    state.storage = data.storage || [];
    state.badges = data.badges || [];
    state.items = data.items || { treat: 5, goldenTreat: 1 };
    state.visited = data.visited || {};
    state.recruitedBosses = data.recruitedBosses || {};
    state.championCleared = !!data.championCleared;
    state.currentRegion = data.currentRegion || START_REGION;
    state.trainerId = data.trainerId || TRAINERS[0].id;
    uidCounter = data.uidCounter || 1;
    state.field = data.field || null; // resume exactly where the player left off, not the map entry point
    return true;
  } catch (e) { return false; }
}

function hasSave() { return !!localStorage.getItem(SAVE_KEY); }

function newGame(starterId, trainerId) {
  state.party = [createMon(starterId, 5)];
  state.storage = [];
  state.badges = [];
  state.items = { treat: 5, goldenTreat: 1 };
  state.visited = {};
  state.recruitedBosses = {};
  state.championCleared = false;
  state.currentRegion = START_REGION;
  state.trainerId = trainerId || TRAINERS[0].id;
  pushLog(`Welcome to the Tale of ChaThai! ${speciesOf(state.party[0]).name} joins you!`);
  enterField(START_REGION); // start walking immediately — no menu screen first (ChaThaiTheCat §10.1 lesson)
}

function trainerOf(id) { return TRAINERS.find(t => t.id === id) || TRAINERS[0]; }
