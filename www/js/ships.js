"use strict";

/* ---------------- Ship skins ---------------- */
const SHAPE_ROUNDED = [
"......KK..........",
"....KKBBKK........",
"...KBBBBBBKKK.....",
"KDDKBBBBBTBBBKKKK.",
"KDDKBBBBTBTBBBBBBL",
"KDDKBBBBBBBBBKKKK.",
"...KBBBBBBKKK.....",
"....KKBBKK........",
"......KK..........",
];
const SHAPE_NEEDLE = [
"..................",
"..................",
"...KKKKKK.........",
"KDBKBBBBTKKKKK....",
"KDBKBBBTBTBBBBKKKL",
"KDBKBBBBBKKKKK....",
"...KKKKKK.........",
"..................",
"..................",
];
const SHAPE_BLOCK = [
".....KKKKK........",
"....KBBBBBKK......",
"...KBBBBBBBK......",
"KDDDBBBBBBTBKKK...",
"KDDDBBBBBTBTBBBL..",
"KDDDBBBBBBBBKKK...",
"...KBBBBBBBK......",
"....KBBBBBKK......",
".....KKKKK........",
];
const SHAPE_DART = [
"....................",
"....................",
"....KK..............",
"KDKKBBKTKKKKKKKKKK..",
"KDKBBBTBTBBBBBBBBBKL",
"KDKKBBKKKKKKKKKKKK..",
"....KK..............",
"....................",
"....................",
];
const SHAPE_SAUCER = [
"....................",
".......KKKK.........",
".....KKBBBBKKK......",
"KDDDKBBBBBBBTBK.....",
"KDDDBBBBBBBTBTBL....",
"KDDDKBBBBBBBBBK.....",
".....KKBBBBKKK......",
".......KKKK.........",
"....................",
];

const SKINS = [
  { id:'arrow',  name:'Стрела',   desc:'Сбалансированный старт', shape:SHAPE_ROUNDED, scale:1.05, price:0,
    colors:{K:'#05070a', B:'#c7d0d9', D:'#3d434b', T:'#2fd7cc', L:'#fff6d8', E:'#ff8c42'},
    stats:{speed:1.00, accel:1.00, handling:1.00, durability:1.00} },
  { id:'blade',  name:'Клинок',   desc:'Острый гоночный корпус', shape:SHAPE_NEEDLE, scale:1.0, price:150,
    colors:{K:'#2a0a0f', B:'#e63946', D:'#7a1620', T:'#a8dadc', L:'#ffffff', E:'#5bc0eb'},
    stats:{speed:1.12, accel:1.05, handling:0.95, durability:0.85} },
  { id:'hammer', name:'Молот',    desc:'Тяжёлый, прочный',       shape:SHAPE_BLOCK,  scale:1.3, price:220,
    colors:{K:'#1c0f06', B:'#4a3524', D:'#2b1c10', T:'#ff8500', L:'#e0a458', E:'#ffb703'},
    stats:{speed:0.88, accel:0.85, handling:0.80, durability:1.35} },
  { id:'spark',  name:'Искра',    desc:'Маленький и юркий',      shape:SHAPE_ROUNDED, scale:0.72, price:120,
    colors:{K:'#07131a', B:'#1b4965', D:'#0d2a3d', T:'#f9dc5c', L:'#bee9e8', E:'#f2a541'},
    stats:{speed:0.95, accel:1.15, handling:1.30, durability:0.75} },
  { id:'aurora', name:'Аврора',   desc:'Дорогой футуристичный',  shape:SHAPE_NEEDLE, scale:1.12, price:380,
    colors:{K:'#8a7020', B:'#e5e5e5', D:'#b8b8b8', T:'#ffd166', L:'#ffffff', E:'#ffffff'},
    stats:{speed:1.15, accel:1.10, handling:1.05, durability:0.95} },
  { id:'volt',   name:'Вольт',    desc:'Энергетический корпус',  shape:SHAPE_BLOCK,  scale:0.92, price:260,
    colors:{K:'#000000', B:'#161821', D:'#0c0d14', T:'#ff5da2', L:'#c77dff', E:'#c77dff'},
    stats:{speed:1.05, accel:1.20, handling:1.10, durability:0.80} },
  { id:'dart',   name:'Дротик',   desc:'Сверхбыстрый, хрупкий',  shape:SHAPE_DART, scale:1.02, price:300,
    colors:{K:'#0a1a2e', B:'#8fd3ff', D:'#1a3a52', T:'#ffe066', L:'#ffffff', E:'#63e6ff'},
    stats:{speed:1.25, accel:0.90, handling:0.85, durability:0.60} },
  { id:'ufo',    name:'НЛО',      desc:'Инопланетные технологии', shape:SHAPE_SAUCER, scale:0.98, price:340,
    colors:{K:'#1a0a2e', B:'#7de08a', D:'#0d1a10', T:'#ff2e63', L:'#e0ff4f', E:'#7de08a'},
    stats:{speed:1.00, accel:1.00, handling:1.25, durability:1.00} },
  { id:'phoenix',name:'Феникс',   desc:'Огненный корпус',        shape:SHAPE_ROUNDED, scale:1.08, price:200,
    colors:{K:'#2a0800', B:'#ff5722', D:'#7a2200', T:'#ffd54f', L:'#fff9c4', E:'#ffca28'},
    stats:{speed:1.08, accel:1.10, handling:1.00, durability:0.90} },
  { id:'levi',   name:'Левиафан', desc:'Тяжёлый глубинный танк', shape:SHAPE_BLOCK,  scale:1.22, price:300,
    colors:{K:'#000814', B:'#003049', D:'#001220', T:'#00b4d8', L:'#90e0ef', E:'#48cae4'},
    stats:{speed:0.85, accel:0.80, handling:0.75, durability:1.50} },
  { id:'comet',  name:'Комета',   desc:'Ледяной хвост, максимум скорости', shape:SHAPE_DART, scale:0.95, price:360,
    colors:{K:'#021a1f', B:'#c8fbff', D:'#0a3a44', T:'#00e5ff', L:'#ffffff', E:'#7dfcff'},
    stats:{speed:1.28, accel:0.95, handling:0.90, durability:0.55} },
  { id:'shadow', name:'Тень',     desc:'Скрытный и стремительный', shape:SHAPE_NEEDLE, scale:1.0, price:280,
    colors:{K:'#000000', B:'#1a1a22', D:'#0a0a10', T:'#8a5cff', L:'#c9b8ff', E:'#8a5cff'},
    stats:{speed:1.10, accel:1.08, handling:1.08, durability:0.90} },
  { id:'titan',  name:'Титан',    desc:'Максимальная прочность', shape:SHAPE_SAUCER, scale:1.15, price:260,
    colors:{K:'#0a0e14', B:'#8d99ae', D:'#2b2d3a', T:'#ef233c', L:'#edf2f4', E:'#ef233c'},
    stats:{speed:0.90, accel:0.85, handling:0.95, durability:1.45} },
];
let selectedSkinIdx = 0;

/* ---------------- Tuning (spend credits to permanently upgrade YOUR ship) ---------------- */
const UPGRADE_STATS = ['speed','accel','handling','durability'];
const UPGRADE_LABELS = { speed:'Скорость', accel:'Разгон', handling:'Управление', durability:'Прочность' };
const UPGRADE_MAX_LEVEL = 5;
const UPGRADE_BUMP = 0.035; // per level, added on top of the ship's base stat
function upgradeCost(level){ return 60 + level*45; }
function getUpgradeLevels(shipId){
  const u = SAVE.upgrades && SAVE.upgrades[shipId];
  return { speed:0, accel:0, handling:0, durability:0, ...(u||{}) };
}
function getEffectiveStats(skin){
  const lv = getUpgradeLevels(skin.id);
  const out = {};
  for(const k of UPGRADE_STATS) out[k] = skin.stats[k] + lv[k]*UPGRADE_BUMP;
  return out;
}
function buyUpgrade(shipId, stat){
  if(!SAVE.upgrades) SAVE.upgrades={};
  if(!SAVE.upgrades[shipId]) SAVE.upgrades[shipId]={speed:0,accel:0,handling:0,durability:0};
  const lv = SAVE.upgrades[shipId][stat]||0;
  if(lv>=UPGRADE_MAX_LEVEL) return false;
  const cost = upgradeCost(lv);
  if(SAVE.credits<cost) return false;
  SAVE.credits -= cost;
  SAVE.upgrades[shipId][stat] = lv+1;
  persistSave();
  updateCurrencyBadge();
  return true;
}

/* ---------------- Appearance (cosmetic, fully independent of stat tuning) ---------------- */
const APPEARANCE_ITEMS = [
  {id:'glow',   name:'Неоновый контур',   desc:'Светящийся контур вокруг корпуса', price:80},
  {id:'fins',   name:'Кормовые плавники', desc:'Пара доп. плавников у двигателя',  price:110},
  {id:'stripe', name:'Гоночная полоса',   desc:'Акцентная полоса по корпусу',      price:130},
  {id:'chrome', name:'Хромированный нос', desc:'Мерцающий кончик носа',            price:150},
  {id:'kit',    name:'Аэродинамический обвес', desc:'Накладки и спойлер по бортам корпуса', price:170},
];
const APPEARANCE_DEFAULT = {glow:false,fins:false,stripe:false,chrome:false,kit:false};
function getAppearance(shipId){
  const a = SAVE.appearance && SAVE.appearance[shipId];
  return { ...APPEARANCE_DEFAULT, ...(a||{}) };
}
function hasAnyAppearance(app){ return app.glow||app.fins||app.stripe||app.chrome||app.kit; }
function buyAppearance(shipId, itemId){
  const item = APPEARANCE_ITEMS.find(i=>i.id===itemId);
  if(!item) return false;
  if(!SAVE.appearance) SAVE.appearance={};
  if(!SAVE.appearance[shipId]) SAVE.appearance[shipId]={...APPEARANCE_DEFAULT};
  if(SAVE.appearance[shipId][itemId]) return false;
  if(SAVE.credits<item.price) return false;
  SAVE.credits -= item.price;
  SAVE.appearance[shipId][itemId] = true;
  persistSave();
  updateCurrencyBadge();
  return true;
}
/* ---------------- Hull paint (free color choice, fully independent of everything else) ---------------- */
const PAINT_COLORS = ['#c7d0d9','#ff5252','#ffca28','#66bb6a','#26c6da','#42a5f5','#ab47bc','#ff8a3d','#ff4fa3','#ffffff'];
function getHullColor(shipId){
  const c = SAVE.hullColor && SAVE.hullColor[shipId];
  return c || null; // null = use the ship's default body color
}
function setHullColor(shipId, hex){
  if(!SAVE.hullColor) SAVE.hullColor={};
  SAVE.hullColor[shipId] = hex;
  persistSave();
}
function resetHullColor(shipId){
  if(SAVE.hullColor) delete SAVE.hullColor[shipId];
  persistSave();
}
function getRenderColors(skin, shipId){
  const custom = getHullColor(shipId);
  if(!custom) return skin.colors;
  return { ...skin.colors, B: custom };
}
function shapeGeometry(shape){
  const H=shape.length, W=shape[0].length;
  let minRow=H, maxRow=-1, engineCol=W;
  for(let r=0;r<H;r++){
    for(let c=0;c<W;c++){
      const ch=shape[r][c];
      if(ch==='B'){ if(r<minRow) minRow=r; if(r>maxRow) maxRow=r; }
      if(ch==='D'){ if(c<engineCol) engineCol=c; }
    }
  }
  if(maxRow<0){ minRow=0; maxRow=H-1; }
  if(engineCol===W) engineCol=0;
  return { W, H, centerCol:(W-1)/2, centerRow:(H-1)/2, minRow, maxRow, engineCol };
}
