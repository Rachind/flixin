"use strict";

/* ---------------- Achievements ---------------- */
const ACHIEVEMENTS = [
  {id:'first_blood', name:'Первая кровь', desc:'Разбей первый ящик', reward:20, check:s=>s.totalObstaclesDestroyed>=1},
  {id:'corner_ace',  name:'Ас обгонов', desc:'Соверши 10 обгонов', reward:40, check:s=>s.totalOvertakes>=10},
  {id:'close_call',  name:'На волоске', desc:'20 опасных пролётов', reward:40, check:s=>s.totalNearMisses>=20},
  {id:'collector',   name:'Коллекционер', desc:'Открой 5 кораблей', reward:60, check:s=>Object.values(SAVE.owned).filter(Boolean).length>=5},
  {id:'architect',   name:'Архитектор', desc:'Сохрани свою трассу', reward:30, check:s=>(SAVE.customTracks||[]).length>=1},
  {id:'record_holder',name:'Рекордсмен', desc:'Побей рекорд на всех базовых трассах', reward:100, check:s=>TRACKS.every(t=>SAVE.bestTimes[t.id]!==undefined)},
  {id:'flawless',    name:'Без единой царапины', desc:'Финишируй без единого столкновения', reward:50, check:(s,extra)=>!!(extra&&extra.flawless)},
  {id:'marathoner',  name:'Марафонец', desc:'Пролети 50 км суммарно', reward:80, check:s=>s.totalDistance>=50000},
  {id:'racer_10',    name:'Гонщик', desc:'Финишируй в 10 гонках', reward:50, check:s=>s.totalRaces>=10},
  {id:'champion',    name:'Чемпион', desc:'Займи 1-е место 5 раз', reward:70, check:s=>s.wins>=5},
  {id:'duelist',     name:'Дуэлянт', desc:'Победи в ПВП-арене', reward:50, check:s=>(s.arenaWins||0)>=1},
  {id:'flawless_duel', name:'Безупречная дуэль', desc:'Победи в ПВП-арене, не пропустив ни одного попадания', reward:60, check:(s,extra)=>!!(extra&&extra.cleanArenaWin)},
  {id:'win_streak_3', name:'Серия побед', desc:'3 победы в ПВП-арене подряд', reward:70, check:s=>(s.arenaWinStreak||0)>=3},
];
function checkAchievements(extra){
  const unlocked=[];
  for(const a of ACHIEVEMENTS){
    if(SAVE.achievements.includes(a.id)) continue;
    if(a.check(SAVE.stats, extra)){
      SAVE.achievements.push(a.id);
      SAVE.credits += a.reward;
      unlocked.push(a);
    }
  }
  return unlocked;
}

/* ---------------- Daily challenge ---------------- */
const DAILY_POOL = [
  {id:'win_any', desc:'Финишируй 1-м в любой гонке', reward:60, check:r=>r.place===1},
  {id:'trick_150', desc:'Набери 150+ очков трюков за заезд', reward:60, check:r=>r.trickScore>=150},
  {id:'solo_finish', desc:'Финишируй соло-заездом', reward:40, check:r=>r.mode==='solo'},
  {id:'destroy_4', desc:'Разбей 4 ящика за один заезд', reward:50, check:r=>r.crateCount>=4},
  {id:'near_miss_4', desc:'4 опасных пролёта за один заезд', reward:50, check:r=>r.nearMissCount>=4},
  {id:'overtake_3', desc:'3 обгона за один заезд', reward:55, check:r=>r.overtakeCount>=3},
];
function todayKey(){
  const d=new Date();
  return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();
}
function ensureDailyChallenge(){
  const key = todayKey();
  if(!SAVE.dailyChallenge || SAVE.dailyChallenge.date!==key){
    const dayIndex = Math.floor(Date.now()/86400000) % DAILY_POOL.length;
    SAVE.dailyChallenge = { date:key, id:DAILY_POOL[dayIndex].id, completed:false };
    persistSave();
  }
  return DAILY_POOL.find(d=>d.id===SAVE.dailyChallenge.id);
}
function checkDailyChallenge(raceInfo){
  ensureDailyChallenge();
  if(SAVE.dailyChallenge.completed) return null;
  const def = DAILY_POOL.find(d=>d.id===SAVE.dailyChallenge.id);
  if(def && def.check(raceInfo)){
    SAVE.dailyChallenge.completed = true;
    SAVE.credits += def.reward;
    return def;
  }
  return null;
}

function drawShipMatrix(g, shape, colors, cell){
  drawPixelGridCentered(g, shape, colors, cell);
}
function drawAppearanceDecals(g, skin, cell, app){
  const geo = shapeGeometry(skin.shape);
  const accent = skin.colors.T;
  if(app.fins){
    const finLocalCol = geo.engineCol - 1.5;
    const lx = (finLocalCol-geo.centerCol)*cell;
    const topY = (geo.minRow-0.5-geo.centerRow)*cell;
    const botY = (geo.maxRow+0.5-geo.centerRow)*cell;
    g.fillStyle = accent;
    g.fillRect(lx-cell*0.4, topY-cell*0.4, cell*0.8, cell*0.8);
    g.fillRect(lx-cell*0.4, botY-cell*0.4, cell*0.8, cell*0.8);
  }
  if(app.stripe){
    const row = Math.round(geo.centerRow);
    for(let c=0;c<geo.W;c++){
      if(skin.shape[row][c] === 'B'){
        const lx=(c-geo.centerCol)*cell, ly=(row-geo.centerRow)*cell;
        g.fillStyle = 'rgba(0,0,0,0.55)';
        g.fillRect(lx-cell*0.22, ly-cell*0.5, cell*0.44, cell);
        g.fillStyle = '#ff3b3b';
        g.fillRect(lx-cell*0.14, ly-cell*0.5, cell*0.28, cell);
      }
    }
  }
  if(app.chrome){
    const tipR = Math.round(geo.centerRow);
    g.fillStyle = '#fff9c4';
    g.globalAlpha = 0.5 + Math.sin(performance.now()/160)*0.3;
    g.fillRect((geo.W-1-geo.centerCol-0.5)*cell, (tipR-geo.centerRow-0.5)*cell, cell, cell);
    g.globalAlpha = 1;
  }
  if(app.kit){
    const startCol = geo.engineCol+1, endCol = Math.round(geo.centerCol);
    const topY = (geo.minRow-0.5-geo.centerRow)*cell;
    const botY = (geo.maxRow+0.5-geo.centerRow)*cell;
    g.fillStyle = skin.colors.D;
    for(let c=startCol;c<=endCol;c++){
      const lx=(c-geo.centerCol)*cell;
      g.fillRect(lx-cell*0.5, topY-cell*0.32, cell+0.6, cell*0.32);
      g.fillRect(lx-cell*0.5, botY, cell+0.6, cell*0.32);
    }
    g.fillStyle = accent;
    g.fillRect((endCol-geo.centerCol-0.5)*cell, topY-cell*0.32, cell*0.5, cell*0.32);
    g.fillRect((endCol-geo.centerCol-0.5)*cell, botY, cell*0.5, cell*0.32);
  }
}
function drawTunedShip(g, skin, cell, app){
  app = app || {...APPEARANCE_DEFAULT};
  if(app.glow){
    g.save();
    g.shadowColor = skin.colors.T;
    g.shadowBlur = 4.5;
    drawShipMatrix(g, skin.shape, skin.colors, cell);
    g.shadowBlur = 0;
    g.restore();
  } else {
    drawShipMatrix(g, skin.shape, skin.colors, cell);
  }
  if(hasAnyAppearance(app)) drawAppearanceDecals(g, skin, cell, app);
}
/* ---------------- Hull damage overlay ---------------- */
// Hull cells of the sprite in a fixed per-ship random order: each hit marks the next few of them as
// scorched / holed / burning, so the damage builds up in place instead of jumping around.
const DAMAGE_COVERAGE = 0.6; // share of hull cells marked when the hull is about to give out
function getDamageCells(ship){
  const shape = ship.skin.shape;
  if(ship.damageCells && ship.damageCellsShape===shape) return ship.damageCells;
  const cells = [];
  for(let r=0;r<shape.length;r++){
    for(let c=0;c<shape[r].length;c++){
      const ch = shape[r][c];
      if(ch==='B' || ch==='T' || ch==='D') cells.push([r,c]);
    }
  }
  let seed = ship.damageSeed || 1;
  const rnd = ()=>{ seed = (seed*1103515245 + 12345) % 2147483648; return seed/2147483648; };
  for(let i=cells.length-1;i>0;i--){
    const j = Math.floor(rnd()*(i+1));
    [cells[i],cells[j]] = [cells[j],cells[i]];
  }
  ship.damageCells = cells;
  ship.damageCellsShape = shape;
  return cells;
}
function drawHullDamage(g, ship, cell){
  const dmg = hullDamage(ship);
  if(dmg<=0) return;
  const shape = ship.skin.shape;
  const H = shape.length, W = shape[0].length;
  const ox = -(W*cell)/2, oy = -(H*cell)/2;
  const cells = getDamageCells(ship);
  const n = Math.min(cells.length, Math.round(cells.length*DAMAGE_COVERAGE*dmg));
  const t = performance.now()/1000;
  const critical = ship.hull===1;
  for(let i=0;i<n;i++){
    const [r,c] = cells[i];
    const kind = i%3;
    if(kind===0){
      g.fillStyle = '#05070a'; // hole
    } else if(kind===1 || dmg<0.5){
      g.fillStyle = 'rgba(28,18,12,0.6)'; // scorch mark
    } else {
      const flick = 0.5 + 0.5*Math.sin(t*(critical?22:9) + i*1.7);
      g.fillStyle = flick>0.5 ? '#ff8c42' : '#c23b12'; // smouldering ember
    }
    g.fillRect(ox+c*cell-0.4, oy+r*cell-0.4, cell+0.8, cell+0.8);
  }
  if(critical && Math.sin(t*14)>0){
    g.globalAlpha = 0.25;
    drawPixelGrid(g, shape, {K:'#ff4d5e', B:'#ff4d5e', D:'#ff4d5e', T:'#ff4d5e'}, cell, ox, oy);
    g.globalAlpha = 1;
  }
}

function drawShip(g, ship){
  if(ship.destroyed) return;
  g.save();
  g.translate(ship.x, ship.y);
  g.rotate(ship.heading);
  const skin=ship.skin;
  const app = ship.isPlayer ? getAppearance(skin.id) : {...APPEARANCE_DEFAULT};
  const renderSkin = ship.isPlayer ? {...skin, colors:getRenderColors(skin, skin.id)} : skin;
  drawTunedShip(g, renderSkin, 4.2*skin.scale, app);
  drawHullDamage(g, ship, 4.2*skin.scale);
  g.restore();
}
