// TaleofChaThai — game data: 18 types, moves, species (from asset manifests), regions, field maps
// Forked-and-adapted from ChaThaiTheCat patterns per docs/GAME_DESIGN.md — no cross-folder references.
'use strict';

// ---- 18 types (Pokémon Gen 6+ set) ----
const TYPES = ['Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice', 'Fighting', 'Poison', 'Ground',
  'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy'];

// Real Pokémon Gen 6+ type chart (docs/GAME_DESIGN.md §3.5) — TYPE_CHART[atk][def] = multiplier,
// unlisted = 1. Stored sparse; typeMultiplier() falls back to 1.
const TYPE_CHART = {
  Normal:   { Rock: .5, Steel: .5, Ghost: 0 },
  Fire:     { Grass: 2, Ice: 2, Bug: 2, Steel: 2, Fire: .5, Water: .5, Rock: .5, Dragon: .5 },
  Water:    { Fire: 2, Ground: 2, Rock: 2, Water: .5, Grass: .5, Dragon: .5 },
  Electric: { Water: 2, Flying: 2, Electric: .5, Grass: .5, Dragon: .5, Ground: 0 },
  Grass:    { Water: 2, Ground: 2, Rock: 2, Fire: .5, Grass: .5, Poison: .5, Flying: .5, Bug: .5, Dragon: .5, Steel: .5 },
  Ice:      { Grass: 2, Ground: 2, Flying: 2, Dragon: 2, Fire: .5, Water: .5, Ice: .5, Steel: .5 },
  Fighting: { Normal: 2, Ice: 2, Rock: 2, Dark: 2, Steel: 2, Flying: .5, Poison: .5, Bug: .5, Psychic: .5, Fairy: .5, Ghost: 0 },
  Poison:   { Grass: 2, Fairy: 2, Poison: .5, Ground: .5, Rock: .5, Ghost: .5, Steel: 0 },
  Ground:   { Fire: 2, Electric: 2, Poison: 2, Rock: 2, Steel: 2, Grass: .5, Bug: .5, Flying: 0 },
  Flying:   { Grass: 2, Fighting: 2, Bug: 2, Electric: .5, Rock: .5, Steel: .5 },
  Psychic:  { Fighting: 2, Poison: 2, Psychic: .5, Steel: .5, Dark: 0 },
  Bug:      { Grass: 2, Psychic: 2, Dark: 2, Fire: .5, Fighting: .5, Poison: .5, Flying: .5, Ghost: .5, Steel: .5, Fairy: .5 },
  Rock:     { Fire: 2, Ice: 2, Flying: 2, Bug: 2, Fighting: .5, Ground: .5, Steel: .5 },
  Ghost:    { Ghost: 2, Psychic: 2, Dark: .5, Normal: 0 },
  Dragon:   { Dragon: 2, Steel: .5, Fairy: 0 },
  Dark:     { Ghost: 2, Psychic: 2, Fighting: .5, Dark: .5, Fairy: .5 },
  Steel:    { Ice: 2, Rock: 2, Fairy: 2, Fire: .5, Water: .5, Electric: .5, Steel: .5 },
  Fairy:    { Fighting: 2, Dragon: 2, Dark: 2, Fire: .5, Poison: .5, Steel: .5 },
};

function typeMultiplier(moveType, defType1, defType2) {
  const row = TYPE_CHART[moveType] || {};
  let m = row[defType1] !== undefined ? row[defType1] : 1;
  if (defType2) m *= row[defType2] !== undefined ? row[defType2] : 1;
  return m;
}

// Accent hue per type — used for particles/FX tinting and the emoji-fallback sprite filter.
const HUE = {
  Normal: 0, Fire: 20, Water: 210, Electric: 50, Grass: 110, Ice: 190, Fighting: 15, Poison: 285,
  Ground: 35, Flying: 205, Psychic: 300, Bug: 80, Rock: 40, Ghost: 260, Dragon: 240, Dark: 270,
  Steel: 200, Fairy: 330,
};

// ---- Status effects (same 6-effect system as ChaThaiTheCat) ----
const STATUS_INFO = {
  burn:     { kind: 'dot',  dmg: 0.06,             name: 'Burn' },
  atkDown:  { kind: 'stat', stat: 'atk', mult: .7, name: 'ATK Down' },
  defDown:  { kind: 'stat', stat: 'def', mult: .7, name: 'DEF Down' },
  spdDown:  { kind: 'stat', stat: 'spd', mult: .7, name: 'SPD Down' },
  paralyze: { kind: 'skip', chance: .3,            name: 'Paralyze' },
  accDown:  { kind: 'acc',  mult: .7,              name: 'ACC Down' },
};
const STATUS_NAME = Object.fromEntries(Object.entries(STATUS_INFO).map(([k, v]) => [k, v.name]));

// ---- Moves — 18 types x 5 signature tiers + 2 shared (scratch/purr) = 92 moves ----
// Names flavored after real Pokémon moves per type (docs §3.3). Tier ladder mirrors ChaThaiTheCat:
// Lv1 Nip(10) / Lv16 Status / Lv22 Fang(18) / Lv28 purr(heal) / Lv36 Strike(26) / Lv44 Burst(40).
const MOVE_NAME_TABLE = {
  //         Nip            Status(effect)               Fang            Strike           Burst
  Normal:   ['Quick Tackle', ['Growl', 'atkDown'],       'Headbutt',     'Body Slam',     'Giga Impact'],
  Fire:     ['Ember Bite',  ['Smokescreen', 'accDown'],  'Fire Fang',    'Flame Wheel',   'Fire Blast'],
  Water:    ['Water Gun',   ['Rain Veil', 'accDown'],    'Aqua Fang',    'Aqua Tail',     'Hydro Pump'],
  Electric: ['Nuzzle Spark', ['Static Field', 'paralyze'], 'Thunder Fang', 'Spark Charge', 'Thunderbolt'],
  Grass:    ['Vine Lash',   ['Leech Spores', 'spdDown'], 'Leaf Blade',   'Seed Bomb',     'Solar Beam'],
  Ice:      ['Frost Nip',   ['Icy Mist', 'spdDown'],     'Ice Fang',     'Icicle Crash',  'Blizzard'],
  Fighting: ['Rock Smash',  ['Bulk Guard', 'defDown'],   'Cross Chop',   'Sky Uppercut',  'Close Combat'],
  Poison:   ['Acid Spit',   ['Toxic Haze', 'burn'],      'Poison Fang',  'Sludge Wave',   'Gunk Shot'],
  Ground:   ['Mud Slap',    ['Sand Attack', 'accDown'],  'Bone Rush',    'Bulldoze',      'Earthquake'],
  Flying:   ['Gust Peck',   ['Feather Dance', 'atkDown'], 'Wing Attack',  'Air Slash',     'Sky Attack'],
  Psychic:  ['Confusion',   ['Hypnosis Wave', 'spdDown'], 'Psybeam',      'Psycho Cut',    'Future Sight'],
  Bug:      ['Bug Bite',    ['String Shot', 'spdDown'],  'Fury Cutter',  'X-Scissor',     'Megahorn'],
  Rock:     ['Rock Throw',  ['Sandstorm Veil', 'accDown'], 'Rock Tomb',   'Rock Slide',    'Stone Edge'],
  Ghost:    ['Astonish',    ['Cursed Ward', 'atkDown'],  'Shadow Sneak', 'Shadow Punch',  'Shadow Ball'],
  Dragon:   ['Dragon Rage', ['Dragon Dance Hex', 'defDown'], 'Dragon Claw', 'Dragon Rush',  'Draco Meteor'],
  Dark:     ['Pursuit Bite', ['Fake Tears', 'defDown'],  'Crunch',       'Night Slash',   'Dark Pulse'],
  Steel:    ['Metal Claw',  ['Iron Screech', 'defDown'], 'Steel Fang',   'Iron Head',     'Meteor Mash'],
  Fairy:    ['Fairy Wind',  ['Charm Glow', 'atkDown'],   'Play Rough',   'Dazzling Gleam', 'Moonblast'],
};

const MOVES = {
  scratch: { name: 'Scratch', type: 'Normal', cat: 'damage', power: 8, acc: 1 },
  purr:    { name: 'Healing Purr', type: 'Normal', cat: 'heal', heal: 0.35, acc: 1 },
};
TYPES.forEach(t => {
  const [nip, status, fang, strike, burst] = MOVE_NAME_TABLE[t];
  MOVES[t + 'Nip']    = { name: nip,        type: t, cat: 'damage', power: 10, acc: 1 };
  MOVES[t + 'Status'] = { name: status[0],  type: t, cat: 'status', effect: status[1], turns: 3, acc: 0.9 };
  MOVES[t + 'Fang']   = { name: fang,       type: t, cat: 'damage', power: 18, acc: 0.95 };
  MOVES[t + 'Strike'] = { name: strike,     type: t, cat: 'damage', power: 26, acc: 0.9 };
  MOVES[t + 'Burst']  = { name: burst,      type: t, cat: 'damage', power: 40, acc: 0.8 };
});

// Levels spread evenly across the ~1-44 playthrough arc (first dojo is Lv9-13, champion is Lv40-43)
// so a new move lands roughly every 7-8 levels — like a real Pokémon movepool — instead of the old
// 1/1/16/22/28/36/44 spacing, which left a 15-level dead stretch with nothing but Scratch+Nip.
function lineMovepool(type) {
  return [
    { lvl: 1, move: 'scratch' },
    { lvl: 1, move: type + 'Nip' },
    { lvl: 8, move: type + 'Status' },
    { lvl: 15, move: type + 'Fang' },
    { lvl: 22, move: 'purr' },
    { lvl: 30, move: type + 'Strike' },
    { lvl: 38, move: type + 'Burst' },
  ];
}

// ---- Wild species — generated from assets/monsters-wild manifest (18 types x 5 lines x 2 stages).
// [category, baseSlug, evoSlug]; group (element/type folder) resolved via CATEGORY_GROUP below.
const CATEGORY_GROUP = {
  dark: 'element', electric: 'element', fire: 'element', grass: 'element', ice: 'element',
  poison: 'element', rock: 'element', steel: 'element', water: 'element',
  bug: 'type', dragon: 'type', fairy: 'type', fighting: 'type', flying: 'type', ghost: 'type',
  ground: 'type', normal: 'type', psychic: 'type',
};
const CATEGORY_TYPE = {
  normal: 'Normal', fire: 'Fire', water: 'Water', electric: 'Electric', grass: 'Grass', ice: 'Ice',
  fighting: 'Fighting', poison: 'Poison', ground: 'Ground', flying: 'Flying', psychic: 'Psychic',
  bug: 'Bug', rock: 'Rock', ghost: 'Ghost', dragon: 'Dragon', dark: 'Dark', steel: 'Steel', fairy: 'Fairy',
};

const WILD_LINES = [
  ['normal', 'street-pup', 'city-hound'], ['normal', 'field-mouse', 'granary-mouse'],
  ['normal', 'stripe-ferret', 'trail-ferret'], ['normal', 'barn-chick', 'rooster-guard'],
  ['normal', 'soft-cap-bear', 'great-cap-bear'],
  ['fire', 'ember-cub', 'cinder-grizzly'], ['fire', 'wick-mouse', 'lantern-rat'],
  ['fire', 'coal-chick', 'pyre-rooster'], ['fire', 'ash-lizard', 'magma-monitor'],
  ['fire', 'spark-ram', 'inferno-ram'],
  ['water', 'brook-otter', 'torrent-otter'], ['water', 'drop-axolotl', 'tide-axolotl'],
  ['water', 'puddle-duck', 'river-duck'], ['water', 'foam-crab', 'surge-crab'],
  ['water', 'ripple-eel', 'current-eel'],
  ['electric', 'plug-mouse', 'dynamo-rat'], ['electric', 'spark-hare', 'voltage-hare'],
  ['electric', 'coil-snake', 'tesla-serpent'], ['electric', 'flash-beetle', 'arc-beetle'],
  ['electric', 'static-pup', 'thunder-hound'],
  ['grass', 'bud-deer', 'canopy-stag'], ['grass', 'sprout-tortoise', 'orchard-tortoise'],
  ['grass', 'vine-monkey', 'jungle-sage'], ['grass', 'acorn-owl', 'oak-sentinel'],
  ['grass', 'reed-gator', 'mangrove-gator'],
  ['ice', 'frost-penguin', 'glacier-penguin'], ['ice', 'snow-fox', 'blizzard-fox'],
  ['ice', 'icicle-crab', 'iceberg-crab'], ['ice', 'rime-owl', 'tundra-owl'],
  ['ice', 'slush-seal', 'permafrost-seal'],
  ['fighting', 'jab-pup', 'dojo-hound'], ['fighting', 'palm-mole', 'iron-palm-mole'],
  ['fighting', 'kick-chick', 'talon-kicker'], ['fighting', 'belt-beetle', 'champion-beetle'],
  ['fighting', 'spar-cub', 'claw-master'],
  ['poison', 'toxin-newt', 'venom-newt'], ['poison', 'spore-rat', 'plague-rat'],
  ['poison', 'acid-slime', 'caustic-slime'], ['poison', 'sting-wasp', 'noxious-wasp'],
  ['poison', 'miasma-toad', 'blight-toad'],
  ['ground', 'dust-armadillo', 'dune-armadillo'], ['ground', 'clay-boar', 'terracotta-boar'],
  ['ground', 'burrow-hare', 'fault-hare'], ['ground', 'sand-skink', 'mesa-monitor'],
  ['ground', 'pebble-yak', 'plateau-yak'],
  ['flying', 'gust-sparrow', 'gale-falcon'], ['flying', 'kite-lizard', 'sky-sail-drake'],
  ['flying', 'cloud-moth', 'tempest-moth'], ['flying', 'fan-tail', 'cyclone-peacock'],
  ['flying', 'winglet-fox', 'zephyr-vulpine'],
  ['psychic', 'focus-kitten', 'oracle-lynx'], ['psychic', 'spoon-mite', 'mind-scarab'],
  ['psychic', 'dream-tapir', 'trance-tapir'], ['psychic', 'rune-owl', 'sigil-owl'],
  ['psychic', 'pulse-jelly', 'thought-medusa'],
  ['bug', 'twig-mantis', 'branch-mantis'], ['bug', 'button-ladybug', 'shield-ladybug'],
  ['bug', 'silk-worm', 'silk-emperor'], ['bug', 'needle-mosquito', 'lance-mosquito'],
  ['bug', 'lantern-ant', 'colony-lantern'],
  ['rock', 'chip-gecko', 'boulder-gecko'], ['rock', 'gravel-ram', 'granite-ram'],
  ['rock', 'ore-mole', 'bedrock-mole'], ['rock', 'shard-snail', 'monolith-snail'],
  ['rock', 'cobble-golem', 'menhir-golem'],
  ['ghost', 'candle-wisp', 'funeral-flame'], ['ghost', 'sheet-imp', 'shroud-phantom'],
  ['ghost', 'bone-pup', 'grave-hound'], ['ghost', 'bell-bat', 'chime-revenant'],
  ['ghost', 'mask-kit', 'shrine-apparition'],
  ['dragon', 'pebble-drake', 'crag-wyvern'], ['dragon', 'mist-wyrmling', 'tempest-dragon'],
  ['dragon', 'copper-dragonet', 'forge-drake'], ['dragon', 'mooncoil-hatchling', 'astral-wyrm'],
  ['dragon', 'thorn-dragonet', 'ancient-grove-dragon'],
  ['dark', 'gloom-raccoon', 'night-bandit'], ['dark', 'shade-pup', 'umbra-hound'],
  ['dark', 'cowl-crow', 'eclipse-raven'], ['dark', 'murk-slug', 'void-slug'],
  ['dark', 'dusk-weasel', 'nocturne-weasel'],
  ['steel', 'tin-mouse', 'alloy-rat'], ['steel', 'rivet-crab', 'forge-crab'],
  ['steel', 'gear-pup', 'engine-hound'], ['steel', 'blade-finch', 'razor-hawk'],
  ['steel', 'bolt-tortoise', 'bastion-tortoise'],
  ['fairy', 'glimmer-mouse', 'aurora-mouse'], ['fairy', 'petal-pixie', 'bloom-fae'],
  ['fairy', 'wish-lamb', 'dream-ewe'], ['fairy', 'dewdrop-imp', 'prism-sprite'],
  ['fairy', 'chime-bunny', 'carillon-hare'],
];

function slugToName(slug) {
  return slug.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
}
function slugToId(slug) { return slug.replace(/-/g, '_'); }
function wildAssetDir(category, slug) {
  return `assets/monsters-wild/${CATEGORY_GROUP[category]}/${category}/${slug}`;
}

// Per-type base stat templates (stage1); stage2 scales up. Slight per-line variation via index.
const TYPE_BASE = {
  Normal: { hp: 30, atk: 12, def: 11, spd: 12 }, Fire: { hp: 28, atk: 15, def: 9, spd: 13 },
  Water: { hp: 32, atk: 12, def: 12, spd: 10 }, Electric: { hp: 27, atk: 13, def: 9, spd: 16 },
  Grass: { hp: 31, atk: 12, def: 13, spd: 9 }, Ice: { hp: 30, atk: 13, def: 12, spd: 10 },
  Fighting: { hp: 29, atk: 16, def: 10, spd: 11 }, Poison: { hp: 30, atk: 12, def: 12, spd: 10 },
  Ground: { hp: 33, atk: 14, def: 13, spd: 7 }, Flying: { hp: 27, atk: 12, def: 9, spd: 17 },
  Psychic: { hp: 28, atk: 15, def: 9, spd: 13 }, Bug: { hp: 27, atk: 12, def: 11, spd: 13 },
  Rock: { hp: 32, atk: 13, def: 16, spd: 6 }, Ghost: { hp: 28, atk: 14, def: 10, spd: 13 },
  Dragon: { hp: 33, atk: 15, def: 12, spd: 11 }, Dark: { hp: 29, atk: 15, def: 10, spd: 13 },
  Steel: { hp: 30, atk: 12, def: 17, spd: 7 }, Fairy: { hp: 29, atk: 13, def: 11, spd: 12 },
};

const SPECIES = {};
const LINES_BY_TYPE = {}; // Type -> [stage1 speciesId x5] for encounters/dojo teams
const EVO_LEVEL = 20;

WILD_LINES.forEach(([category, baseSlug, evoSlug], i) => {
  const type = CATEGORY_TYPE[category];
  const lineIdx = i % 5;
  const t = TYPE_BASE[type];
  const v = lineIdx - 2; // -2..2 spread for per-line variety
  const dir1 = wildAssetDir(category, baseSlug), dir2 = wildAssetDir(category, evoSlug);
  const id1 = slugToId(baseSlug), id2 = slugToId(evoSlug);
  SPECIES[id1] = {
    id: id1, name: slugToName(baseSlug), type, stage: 1,
    base: { hp: t.hp + v, atk: t.atk + (v > 0 ? 1 : 0), def: t.def, spd: t.spd - (v < 0 ? 1 : 0) },
    evoLevel: EVO_LEVEL, evolvesTo: id2,
    movepool: lineMovepool(type), catchRate: 0.55, hue: HUE[type], line: baseSlug, isFusion: false,
    sprite: `${dir1}/${baseSlug}.png`, gif: `${dir1}/${baseSlug}-move.gif`,
  };
  SPECIES[id2] = {
    id: id2, name: slugToName(evoSlug), type, stage: 2,
    base: { hp: Math.round((t.hp + v) * 1.7), atk: Math.round(t.atk * 1.7) + (v > 0 ? 1 : 0), def: Math.round(t.def * 1.65), spd: Math.round(t.spd * 1.6) },
    evoLevel: null, evolvesTo: null,
    movepool: lineMovepool(type), catchRate: 0.3, hue: HUE[type], line: baseSlug, isFusion: false,
    sprite: `${dir2}/${evoSlug}.png`, gif: `${dir2}/${evoSlug}-move.gif`,
  };
  (LINES_BY_TYPE[type] = LINES_BY_TYPE[type] || []).push(id1);
});

// ---- Field bosses — 1 per type (assets/monsters-bosses). GIFs have a solid-white-background
// export bug (docs §3.6) so only the static .png is referenced; swap in gifs after re-export.
const FIELD_BOSS_DEFS = [
  ['Normal', 'apex-chimera'], ['Fire', 'caldera-emperor'], ['Water', 'abyssal-tide-monarch'],
  ['Electric', 'thundercoil-kaiser'], ['Grass', 'worldroot-elder'], ['Ice', 'absolute-zero-leviathan'],
  ['Fighting', 'warfist-behemoth'], ['Poison', 'plague-cauldron-hydra'], ['Ground', 'continent-maw'],
  ['Flying', 'tempest-roc-sovereign'], ['Psychic', 'astral-eye-hierophant'], ['Bug', 'hive-tyrant-mantis'],
  ['Rock', 'monolith-titan'], ['Ghost', 'graveking-nocturn'], ['Dragon', 'voidcrown-bahamut'],
  ['Dark', 'eclipse-devourer'], ['Steel', 'iron-cathedral-colossus'], ['Fairy', 'empress-luminara'],
];
const BOSS_BY_TYPE = {};
FIELD_BOSS_DEFS.forEach(([type, slug]) => {
  const id = slugToId(slug);
  const t = TYPE_BASE[type];
  SPECIES[id] = {
    id, name: slugToName(slug), type, stage: 'boss',
    base: { hp: Math.round(t.hp * 2.2), atk: Math.round(t.atk * 2.1), def: Math.round(t.def * 2), spd: Math.round(t.spd * 1.9) },
    evoLevel: null, evolvesTo: null,
    movepool: lineMovepool(type), catchRate: 0, hue: HUE[type], line: slug, isFusion: false,
    sprite: `assets/monsters-bosses/${slug}/${slug}.png`, gif: null,
  };
  BOSS_BY_TYPE[type] = id;
});

// ---- Player trainers (copied assets from ChaThaiTheCat; 8-frame walk flipbooks included) ----
const TRAINERS = [
  { id: 'kai', name: 'Kai', blurb: 'A cheerful explorer who always leads with a confident grin.', full: 'assets/player-trainers/kai-full.png', sd: 'assets/player-trainers/kai-sd.png' },
  { id: 'amara', name: 'Amara', blurb: 'A bold, fast-talking adventurer who never backs down from a challenge.', full: 'assets/player-trainers/amara-full.png', sd: 'assets/player-trainers/amara-sd.png' },
  { id: 'professor', name: 'Dr. Mira', blurb: 'A brilliant researcher who studies monster biology in the field.', full: 'assets/player-trainers/professor-full.png', sd: 'assets/player-trainers/professor-sd.png' },
  { id: 'leo', name: 'Leo', blurb: 'A laid-back backpacker who just wants to befriend every creature he meets.', full: 'assets/player-trainers/leo-full.png', sd: 'assets/player-trainers/leo-sd.png' },
  { id: 'ren', name: 'Ren', blurb: 'A quiet, mysterious wanderer with an affinity for the unseen.', full: 'assets/player-trainers/ren-full.png', sd: 'assets/player-trainers/ren-sd.png' },
];
const TRAINER_WALK_FRAMES = 8;
function trainerWalkFrame(trainer, n) {
  return `assets/player-trainers/walk/${trainer.id}-f${((n % TRAINER_WALK_FRAMES) + TRAINER_WALK_FRAMES) % TRAINER_WALK_FRAMES}.png`;
}

function npcSprite(slug) { return `assets/npc-trainers/${slug}/${slug}.png`; }

// ---- World regions — from assets/world-map/chathai-world-map.json (§2.1) ----
const WORLD_MAP = { image: 'assets/world-map/chathai-world-map.png', width: 1402, height: 1122 };
const START_REGION = 'normal';
const ENDGAME_ROUTE = ['normal', 'fighting', 'psychic', 'ice', 'dragon'];
const REGIONS = {
  flying:   { id: 'flying',   type: 'Flying',   center: [0.12, 0.09], zone: 'Northwest Cloud Isles' },
  dragon:   { id: 'dragon',   type: 'Dragon',   center: [0.27, 0.17], zone: 'Northwest Mountains' },
  ice:      { id: 'ice',      type: 'Ice',      center: [0.52, 0.12], zone: 'Northern Frostlands' },
  psychic:  { id: 'psychic',  type: 'Psychic',  center: [0.73, 0.18], zone: 'Northeast Observatory' },
  electric: { id: 'electric', type: 'Electric', center: [0.83, 0.32], zone: 'Eastern Neon City' },
  steel:    { id: 'steel',    type: 'Steel',    center: [0.67, 0.53], zone: 'Eastern Ironworks' },
  fire:     { id: 'fire',     type: 'Fire',     center: [0.88, 0.61], zone: 'Southeast Volcano' },
  ground:   { id: 'ground',   type: 'Ground',   center: [0.75, 0.62], zone: 'Southeast Badlands' },
  rock:     { id: 'rock',     type: 'Rock',     center: [0.67, 0.72], zone: 'Southern Quarry Gate' },
  poison:   { id: 'poison',   type: 'Poison',   center: [0.52, 0.80], zone: 'Southern Miasma Marsh' },
  dark:     { id: 'dark',     type: 'Dark',     center: [0.43, 0.72], zone: 'Southwest Umbra Forest' },
  ghost:    { id: 'ghost',    type: 'Ghost',    center: [0.48, 0.61], zone: 'Central Sunken Ruins' },
  water:    { id: 'water',    type: 'Water',    center: [0.17, 0.71], zone: 'Southwest Lagoon' },
  fairy:    { id: 'fairy',    type: 'Fairy',    center: [0.20, 0.37], zone: 'Western Moonpetal Glen' },
  grass:    { id: 'grass',    type: 'Grass',    center: [0.34, 0.52], zone: 'Western Verdant Canopy' },
  bug:      { id: 'bug',      type: 'Bug',      center: [0.39, 0.60], zone: 'Silkroot Thicket' },
  normal:   { id: 'normal',   type: 'Normal',   center: [0.49, 0.39], zone: 'Central Meadowcross' },
  fighting: { id: 'fighting', type: 'Fighting', center: [0.55, 0.35], zone: 'Central Dojo Heartland' },
};

// Which badge (by route order) unlocks travel to each main-route region. normal = start, free.
const REGION_UNLOCK = { normal: null, fighting: 'Meadow Badge', psychic: 'Valor Badge', ice: 'Mind Badge', dragon: 'Frost Badge' };

function regionMapImage(regionId, screen) {
  const cat = regionId;
  const group = CATEGORY_GROUP[cat];
  const slug = REGION_SCREENS[regionId] && REGION_SCREENS[regionId][screen - 1];
  return slug ? `assets/region-maps/${group}/${cat}/${slug}/${slug}.png` : null;
}
const REGION_SCREENS = {
  normal: ['meadowcross-village', 'oldmill-woodland'],
  fighting: ['dojo-valley', 'champion-colosseum'],
  psychic: ['dreamglass-sanctum', 'mindwave-observatory'],
  ice: ['frostglass-tundra', 'glacier-palace'],
  dragon: ['wyrmstone-highlands', 'skyfang-caldera'],
  // 13 exploration regions: screens exist as art but their FIELD_MAPS aren't authored yet (docs §7 item 4).
  fire: ['emberpeak-forge', 'cinderstep-village'],
  water: ['tidereef-lagoon', 'cascade-temple'],
  electric: ['thunder-grid', 'neon-bolt-city'],
  grass: ['verdant-canopy', 'ancient-garden'],
  ice2: null,
  steel: ['ironworks-citadel', 'magnetite-mine'],
  dark: ['eclipse-alley', 'umbra-forest'],
  poison: ['miasma-marsh', 'sporelab-ruins'],
  rock: ['monolith-quarry', 'crystal-cavern'],
  ground: ['dustroot-canyon', 'terracotta-badlands'],
  flying: ['cloudstep-isles', 'gale-cliff-aerie'],
  bug: ['honeycomb-thicket', 'silkroot-hollow'],
  ghost: ['whisper-graveyard', 'sunken-manor'],
  fairy: ['moonpetal-glen', 'prism-mushroom-grove'],
};

// ---- Dojos — 5 main-route gyms (docs §2.3). Leader art = themed NPC trainer sprites (§6.3). ----
const DOJOS = {
  normal:   { id: 'normal',   name: 'Meadow Dojo',  leader: 'Elder Naturalist', leaderSprite: npcSprite('elder-naturalist'), badge: 'Meadow Badge',
              team: [{ s: 'city_hound', lvl: 9 }, { s: 'rooster_guard', lvl: 11 }, { s: 'great_cap_bear', lvl: 13 }] },
  fighting: { id: 'fighting', name: 'Valor Dojo',   leader: 'Martial Student',  leaderSprite: npcSprite('martial-student'), badge: 'Valor Badge',
              team: [{ s: 'dojo_hound', lvl: 15 }, { s: 'talon_kicker', lvl: 17 }, { s: 'champion_beetle', lvl: 19 }] },
  psychic:  { id: 'psychic',  name: 'Mind Dojo',    leader: 'Stage Magician',   leaderSprite: npcSprite('psychic-magician'), badge: 'Mind Badge',
              team: [{ s: 'oracle_lynx', lvl: 21 }, { s: 'sigil_owl', lvl: 23 }, { s: 'thought_medusa', lvl: 25 }] },
  ice:      { id: 'ice',      name: 'Frost Dojo',   leader: 'Snow Ranger',      leaderSprite: npcSprite('snow-ranger'), badge: 'Frost Badge',
              team: [{ s: 'glacier_penguin', lvl: 27 }, { s: 'blizzard_fox', lvl: 29 }, { s: 'permafrost_seal', lvl: 31 }] },
  dragon:   { id: 'dragon',   name: 'Wyrm Dojo',    leader: 'Dragon Guardian',  leaderSprite: npcSprite('dragon-guardian'), badge: 'Wyrm Badge',
              team: [{ s: 'crag_wyvern', lvl: 33 }, { s: 'tempest_dragon', lvl: 35 }, { s: 'astral_wyrm', lvl: 37 }] },
};

// Final challenge — Veteran Champion at Skyfang Caldera, needs all 5 badges (docs §6.3 note).
const CHAMPION = {
  id: 'champion', name: 'Veteran Champion', sprite: npcSprite('veteran-champion'),
  team: [{ s: 'forge_drake', lvl: 40 }, { s: 'ancient_grove_dragon', lvl: 41 }, { s: 'voidcrown_bahamut', lvl: 43 }],
};

// Recruit-once field bosses (docs §3.7): one per authored region, standing on screen 2.
const FIELD_BOSSES = {
  normal:   { s: 'apex_chimera', lvl: 14, npcId: 'boss_normal' },
  fighting: { s: 'warfist_behemoth', lvl: 20, npcId: 'boss_fighting' },
  psychic:  { s: 'astral_eye_hierophant', lvl: 26, npcId: 'boss_psychic' },
  ice:      { s: 'absolute_zero_leviathan', lvl: 32, npcId: 'boss_ice' },
  dragon:   { s: 'voidcrown_bahamut', lvl: 38, npcId: 'boss_dragon' },
};

// ---- Encounters: each authored region rolls its own type's 5 stage-1 lines ----
function regionEncounters(regionId, min, max) {
  const type = REGIONS[regionId].type;
  return (LINES_BY_TYPE[type] || []).map(id1 => ({ s: id1, min, max, w: 1 }));
}
const REGION_ENCOUNTERS = {
  normal: regionEncounters('normal', 2, 6),
  fighting: regionEncounters('fighting', 12, 16),
  psychic: regionEncounters('psychic', 18, 22),
  ice: regionEncounters('ice', 24, 28),
  dragon: regionEncounters('dragon', 30, 35),
};
const ENCOUNTER_CHANCE = 0.12;

// ---- STARTERS: one from each of the first 3 route types so early matchups feel varied ----
const STARTERS = ['street_pup', 'jab_pup', 'focus_kitten'];

const STATUS_FLAVOR = {};

// FIELD_MAPS (24x32 tile screens authored from the region art) live in js/maps.js — kept as a
// separate file because 10 hand-drawn 32-row grids would drown the rest of this file.
