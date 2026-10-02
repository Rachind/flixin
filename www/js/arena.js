"use strict";

/* ---------------- Arena (PvP duel) ---------------- */
// Arena size presets (half-side of the square arena, world units); the camera always fits the whole arena
const ARENA_SIZES = {
  small:  { label:'Малая',   half:200 },
  medium: { label:'Средняя', half:260 },
  large:  { label:'Большая', half:340 },
};
let arenaHalf = ARENA_SIZES.medium.half;
const ARENA_BULLET_SPEED = 900;
const ARENA_BULLET_LIFE = 1.1;
const ARENA_FIRE_COOLDOWN = 0.38;
let arenaBullets = [];

// Opponent difficulty tiers — tuned via playtesting (see turnRate/fireLo-Hi/spread below)
const PVP_DIFFICULTIES = {
  easy:   { label:'Легко',  speedVar:0.55, turnRate:1.8, fireLo:4.5, fireHi:7.0, spread:0.55, desiredRange:150, strafe:0.15, headStart:3.2 },
  normal: { label:'Обычно', speedVar:0.68, turnRate:3.2, fireLo:3.5, fireHi:5.5, spread:0.40, desiredRange:180, strafe:0.30, headStart:2.2 },
  hard:   { label:'Сложно', speedVar:1.10, turnRate:7.0, fireLo:1.1, fireHi:1.8, spread:0.10, desiredRange:230, strafe:0.80, headStart:0.5 },
};
let arenaDiff = PVP_DIFFICULTIES.normal;

// Power-ups: a single pickup spawns at the arena centre and whoever reaches it first gets the buff
const ARENA_POWERUP_INTERVAL = 9;
const ARENA_POWERUP_RADIUS = 20;
const ARENA_SHIELD_DURATION = 3.0;
const ARENA_BOOST_DURATION = 3.0;
const ARENA_BOOST_MULT = 1.4;
let arenaPowerup = null;
let arenaPowerupTimer = 0;

function makeShip(isPlayer, skin, name){
  return {
    isPlayer, skin, name,
    x:0, y:0, heading:0, speed:0,
    progress:0, lateral:0, segIndex:0,
    slipTimer:0, slipActive:false,
    speedPenalty:1,
    trickScore:0,
    finished:false, finishTime:0,
    aiWeaveSeed: Math.random()*100,
    aiSpeedVar: 0.9+Math.random()*0.22,
    lastWallSpark:-99,
    aiAvoidLateral:0,
    crateCount:0, nearMissCount:0, overtakeCount:0, hadCollision:false,
    isRival:false,
    arenaScore:0, fireCooldown:0, hitFlash:0, shieldTime:0, boostTime:0,
    hull:0, hullMax:0, lastHullHit:-99, destroyed:false,
    damageSeed: Math.floor(Math.random()*1e6),
  };
}

let player, aiShips, ships, finishOrder, prevRanking;
let raceTime = 0;
let shakeTime = 0;
let camera = {x:0,y:0};

function resetRace(){
  const skin = SKINS[selectedSkinIdx];
  player = makeShip(true, skin, 'Ты');
  aiShips = [];
  if(raceMode==='pvp'){
    // a single tough, evenly-matched rival for a 1-on-1 duel
    let rivalSkin = SKINS[(selectedSkinIdx+1)%SKINS.length];
    for(const s of SKINS){
      if(s.id===skin.id) continue;
      const total = s.stats.speed+s.stats.accel+s.stats.handling+s.stats.durability;
      const curTotal = rivalSkin.stats.speed+rivalSkin.stats.accel+rivalSkin.stats.handling+rivalSkin.stats.durability;
      const playerTotal = skin.stats.speed+skin.stats.accel+skin.stats.handling+skin.stats.durability;
      if(Math.abs(total-playerTotal) < Math.abs(curTotal-playerTotal)) rivalSkin = s;
    }
    const rival = makeShip(false, rivalSkin, PVP_RIVAL_NAME);
    rival.isRival = true;
    arenaDiff = PVP_DIFFICULTIES[SAVE.pvpDifficulty] || PVP_DIFFICULTIES.normal;
    arenaHalf = (ARENA_SIZES[SAVE.pvpArenaSize] || ARENA_SIZES.medium).half;
    rival.aiSpeedVar = arenaDiff.speedVar;
    aiShips.push(rival);
  } else for(let i=0;i<SAVE.bots;i++){
    const aiSkin = SKINS[(selectedSkinIdx+1+i*2)%SKINS.length];
    aiShips.push(makeShip(false, aiSkin, AI_NAMES[i%AI_NAMES.length]));
  }
  ships = [player, ...aiShips];
  // the player's hull depends on their (upgraded) durability; the duel rival's on its ship's base stat.
  // Bots on a track never crash into anything, so they get no hull.
  const hullBase = raceMode==='pvp' ? HULL_HITS_ARENA : HULL_HITS_RACE;
  initHull(player, getEffectiveStats(skin).durability, hullBase);
  if(raceMode==='pvp') initHull(aiShips[0], aiShips[0].skin.stats.durability, hullBase);
  wreckTimer = 0;
  buildHullBar();

  if(raceMode==='pvp'){
    // square-arena duel: start on opposite sides, facing each other
    arenaBullets = [];
    const d = arenaHalf*0.62;
    player.x = -d; player.y = 0; player.heading = 0; player.speed = 0;
    player.finished=false; player.trickScore=0; player.arenaScore=0;
    player.fireCooldown=0; player.hitFlash=0; player.shieldTime=0; player.boostTime=0;
    const rival = aiShips[0];
    rival.x = d; rival.y = 0; rival.heading = Math.PI; rival.speed = 0;
    rival.finished=false; rival.trickScore=0; rival.arenaScore=0;
    rival.fireCooldown = ARENA_FIRE_COOLDOWN*arenaDiff.headStart; // a head start before the rival can shoot
    rival.hitFlash=0; rival.shieldTime=0; rival.boostTime=0;
    arenaPowerup = null;
    arenaPowerupTimer = ARENA_POWERUP_INTERVAL*0.55;
    obstacles = [];
    hudPlaceLbl.textContent='Ты'; hudScoreLbl.textContent='Соперник';
    finishScoreLbl.textContent='Счёт дуэли';
    progressWrap.classList.add('hidden');
    statusTag.className='';
  } else {
    const startTp = trackPointAt(20);
    const startHeading = Math.atan2(startTp.dir.y, startTp.dir.x);
    const offsets = [0, -55, 55];
    ships.forEach((sh,i)=>{
      const s0 = 20 - i*18;
      const tp = trackPointAt(Math.max(0,s0));
      sh.x = tp.pos.x + tp.normal.x*offsets[i];
      sh.y = tp.pos.y + tp.normal.y*offsets[i];
      sh.heading = startHeading;
      sh.speed = 0;
      sh.progress = Math.max(0,s0);
      sh.lateral = offsets[i];
      sh.finished=false;
      sh.trickScore=0;
    });
    resetObstacles();
    hudPlaceLbl.textContent='Место'; hudScoreLbl.textContent='Очки';
    finishScoreLbl.textContent='Очки за трюки';
    progressWrap.classList.remove('hidden');
  }

  particles = [];
  finishOrder = [];
  prevRanking = null;
  raceTime = 0;
  shakeTime = 0;
  camera = {x:player.x, y:player.y};

  ghostRecording = [];
  ghostLastSample = -99;
  if(raceMode==='pvp'){
    ghostPlayback = null;
  } else {
    const trackId = getAllTracks()[selectedTrackIdx].id;
    const savedGhost = SAVE.bestGhosts && SAVE.bestGhosts[trackId];
    ghostPlayback = savedGhost && savedGhost.path && savedGhost.path.length>1 ? savedGhost : null;
  }
  isNewBest = false;
}

/* ---------------- Arena (PvP duel): free movement inside a square, weapons, wreck the rival's hull to win ---------------- */
function updateArenaShip(dt){
  emitDamageFx(player, dt);
  if(player.destroyed) return;
  const stats = getEffectiveStats(player.skin);
  let jx=input.jx, jy=input.jy;
  if(Math.abs(jx)<0.001 && Math.abs(jy)<0.001){
    const kv=keyboardVec(); jx=kv.x; jy=kv.y;
  }
  const mag = clamp(Math.hypot(jx,jy),0,1);

  if(mag>0.12){
    const desired = Math.atan2(jy,jx);
    player.heading = angleLerp(player.heading, desired, clamp(TURN_RATE*stats.handling*mag*dt,0,1));
  }

  const boostMul = player.boostTime>0 ? ARENA_BOOST_MULT : 1;
  const targetSpeed = MAX_SPEED*stats.speed*mag*boostMul;
  player.speed = lerp(player.speed, targetSpeed, clamp(ACCEL_RATE*stats.accel*dt,0,1));
  updateEngineSound(player.speed, MAX_SPEED*stats.speed);

  let nx = player.x + Math.cos(player.heading)*player.speed*dt;
  let ny = player.y + Math.sin(player.heading)*player.speed*dt;
  const lim = arenaHalf - SHIP_RADIUS*1.2;
  let hitWall=false;
  if(nx<-lim||nx>lim){ nx=clamp(nx,-lim,lim); hitWall=true; }
  if(ny<-lim||ny>lim){ ny=clamp(ny,-lim,lim); hitWall=true; }
  if(hitWall){
    player.speed *= 0.55;
    if(raceTime - player.lastWallSpark > 0.15){
      player.lastWallSpark = raceTime;
      spawnParticles(nx,ny,7,{spread:Math.PI*2, minSpeed:60, speedRange:90, life:0.4, size:3, color:'#ffe08a'});
      shakeTime = Math.max(shakeTime, 0.12);
      playSfx('wallhit');
      hapticPulse(12);
    }
  }
  player.x = nx; player.y = ny;

  player.fireCooldown -= dt;
  if(input.fireHeld && player.fireCooldown<=0){
    fireArenaBullet(player, player.heading);
    player.fireCooldown = ARENA_FIRE_COOLDOWN;
  }
  if(player.hitFlash>0) player.hitFlash = Math.max(0, player.hitFlash-dt);

  if(mag>0.15 && Math.random()<dt*20){
    spawnParticles(
      player.x - Math.cos(player.heading)*16, player.y - Math.sin(player.heading)*16,
      1, {dirAngle:player.heading+Math.PI, spread:0.45, minSpeed:40, speedRange:60, life:0.4, size:3.5, color:player.skin.colors.E}
    );
  }
  if(player.boostTime>0 && Math.random()<dt*30){
    spawnParticles(
      player.x - Math.cos(player.heading)*16, player.y - Math.sin(player.heading)*16,
      1, {dirAngle:player.heading+Math.PI, spread:0.3, minSpeed:70, speedRange:70, life:0.3, size:3, color:'#ffd166'}
    );
  }
}

function updateArenaAI(sh, dt){
  emitDamageFx(sh, dt);
  if(sh.destroyed) return;
  const stats = sh.skin.stats;
  const dx = player.x - sh.x, dy = player.y - sh.y;
  const dist = Math.hypot(dx,dy) || 1;
  const angToPlayer = Math.atan2(dy,dx);

  // keep the gun roughly trained on the player — turret speed set by difficulty
  sh.heading = angleLerp(sh.heading, angToPlayer, clamp(arenaDiff.turnRate*dt,0,1));

  // drift around a preferred firing range — radius/aggressiveness set by difficulty
  const desiredRange = arenaDiff.desiredRange;
  const rangeError = clamp((dist-desiredRange)/140, -1, 1);
  const radialX = dx/dist, radialY = dy/dist;
  const tangX = -radialY, tangY = radialX;
  const strafeDir = Math.sin(raceTime*1.4 + sh.aiWeaveSeed) > 0 ? 1 : -1;
  let mx = radialX*rangeError + tangX*strafeDir*arenaDiff.strafe;
  let my = radialY*rangeError + tangY*strafeDir*arenaDiff.strafe;
  const mmag = Math.hypot(mx,my)||1;
  mx/=mmag; my/=mmag;

  // a live power-up pulls the AI toward the arena centre to contest it
  if(arenaPowerup){
    const pdist = Math.hypot(sh.x,sh.y)||1;
    const seekWeight = 0.5;
    mx = mx*(1-seekWeight) + (-sh.x/pdist)*seekWeight;
    my = my*(1-seekWeight) + (-sh.y/pdist)*seekWeight;
    const mmag2 = Math.hypot(mx,my)||1;
    mx/=mmag2; my/=mmag2;
  }

  const boostMul = sh.boostTime>0 ? ARENA_BOOST_MULT : 1;
  const targetSpeed = MAX_SPEED*stats.speed*sh.aiSpeedVar*0.42*boostMul;
  sh.speed = lerp(sh.speed, targetSpeed, clamp(ACCEL_RATE*stats.accel*dt,0,1));

  let nx = sh.x + mx*sh.speed*dt;
  let ny = sh.y + my*sh.speed*dt;
  const lim = arenaHalf - SHIP_RADIUS*1.2;
  nx = clamp(nx,-lim,lim);
  ny = clamp(ny,-lim,lim);
  sh.x = nx; sh.y = ny;

  sh.fireCooldown -= dt;
  if(sh.fireCooldown<=0 && dist < arenaHalf*2.6 && !player.destroyed){
    fireArenaBullet(sh, angToPlayer + (Math.random()-0.5)*arenaDiff.spread);
    sh.fireCooldown = ARENA_FIRE_COOLDOWN*(arenaDiff.fireLo + Math.random()*(arenaDiff.fireHi-arenaDiff.fireLo));
  }
  if(sh.hitFlash>0) sh.hitFlash = Math.max(0, sh.hitFlash-dt);

  if(Math.random()<dt*14){
    spawnParticles(
      sh.x - Math.cos(sh.heading)*14, sh.y - Math.sin(sh.heading)*14,
      1, {dirAngle:sh.heading+Math.PI, spread:0.5, minSpeed:30, speedRange:40, life:0.35, size:3, color:sh.skin.colors.E}
    );
  }
  if(sh.boostTime>0 && Math.random()<dt*30){
    spawnParticles(
      sh.x - Math.cos(sh.heading)*14, sh.y - Math.sin(sh.heading)*14,
      1, {dirAngle:sh.heading+Math.PI, spread:0.3, minSpeed:70, speedRange:70, life:0.3, size:3, color:'#ffd166'}
    );
  }
}

function fireArenaBullet(owner, angle){
  arenaBullets.push({
    x: owner.x + Math.cos(angle)*(SHIP_RADIUS+6),
    y: owner.y + Math.sin(angle)*(SHIP_RADIUS+6),
    vx: Math.cos(angle)*ARENA_BULLET_SPEED,
    vy: Math.sin(angle)*ARENA_BULLET_SPEED,
    life: ARENA_BULLET_LIFE,
    owner,
    color: owner.isPlayer ? '#3ddbd0' : '#ff4d5e',
  });
  playSfx('laser');
}

function updateArenaBullets(dt){
  for(let i=arenaBullets.length-1;i>=0;i--){
    const b = arenaBullets[i];
    b.x += b.vx*dt; b.y += b.vy*dt; b.life -= dt;
    let dead = b.life<=0 || Math.abs(b.x)>arenaHalf+40 || Math.abs(b.y)>arenaHalf+40;
    if(!dead){
      const target = b.owner===player ? aiShips[0] : player;
      if(target && !target.destroyed && Math.hypot(b.x-target.x, b.y-target.y) < SHIP_RADIUS+4){
        dead = true;
        if(target.shieldTime>0){
          spawnParticles(b.x,b.y,9,{spread:Math.PI*2, minSpeed:50, speedRange:80, life:0.3, size:2.5, color:'#3ddbd0'});
          playSfx('shieldBlock');
        } else {
          registerArenaHit(b.owner, target);
        }
      }
    }
    if(dead) arenaBullets.splice(i,1);
  }
}

function registerArenaHit(shooter, target){
  target.hitFlash = 0.35;
  shooter.arenaScore++;
  target.lastHullHit = -99; // every bullet counts, no grace period in the arena
  if(damageHull(target)){
    if(shooter.isPlayer){
      hitMarkerEl.classList.remove('show');
      void hitMarkerEl.offsetWidth;
      hitMarkerEl.classList.add('show');
    }
    return;
  }
  spawnParticles(target.x, target.y, 14, {spread:Math.PI*2, minSpeed:70, speedRange:110, life:0.45, size:3, color:shooter.isPlayer?'#3ddbd0':'#ff4d5e'});
  shakeTime = Math.max(shakeTime, 0.18);
  playSfx('hit');
  hapticPulse(shooter.isPlayer ? 15 : 25);
  spawnPopup(shooter.isPlayer ? ('Попадание! '+shooter.arenaScore+'/'+target.hullMax) : 'Попадание соперника!');
  if(shooter.isPlayer){
    hitMarkerEl.classList.remove('show');
    void hitMarkerEl.offsetWidth;
    hitMarkerEl.classList.add('show');
  }
}

function updateArenaPowerup(dt){
  if(!arenaPowerup){
    arenaPowerupTimer -= dt;
    if(arenaPowerupTimer<=0){
      arenaPowerup = { type: Math.random()<0.5 ? 'shield' : 'boost' };
    }
  } else {
    for(const sh of ships){
      if(Math.hypot(sh.x, sh.y) < ARENA_POWERUP_RADIUS+SHIP_RADIUS){
        if(arenaPowerup.type==='shield') sh.shieldTime = ARENA_SHIELD_DURATION;
        else sh.boostTime = ARENA_BOOST_DURATION;
        spawnParticles(0,0,16,{spread:Math.PI*2, minSpeed:60, speedRange:110, life:0.5, size:3.5, color: arenaPowerup.type==='shield' ? '#3ddbd0' : '#ffd166'});
        playSfx(arenaPowerup.type==='shield' ? 'shieldUp' : 'boost');
        if(sh.isPlayer) spawnPopup(arenaPowerup.type==='shield' ? 'Щит!' : 'Ускорение!');
        shakeTime = Math.max(shakeTime, 0.1);
        arenaPowerup = null;
        arenaPowerupTimer = ARENA_POWERUP_INTERVAL;
        break;
      }
    }
  }
  if(player.shieldTime>0) player.shieldTime = Math.max(0, player.shieldTime-dt);
  if(player.boostTime>0) player.boostTime = Math.max(0, player.boostTime-dt);
  const rival = aiShips[0];
  if(rival){
    if(rival.shieldTime>0) rival.shieldTime = Math.max(0, rival.shieldTime-dt);
    if(rival.boostTime>0) rival.boostTime = Math.max(0, rival.boostTime-dt);
  }
}

let ghostRecording = [];
let ghostLastSample = -99;
let ghostPlayback = null;
let isNewBest = false;
const GHOST_SAMPLE_DT = 0.12;

function sampleGhost(){
  if(raceTime - ghostLastSample >= GHOST_SAMPLE_DT){
    ghostLastSample = raceTime;
    ghostRecording.push([Math.round(raceTime*100)/100, Math.round(player.x), Math.round(player.y), Math.round(player.heading*100)/100]);
  }
}
function getGhostPose(t){
  if(!ghostPlayback || !ghostPlayback.path || ghostPlayback.path.length<2) return null;
  const path = ghostPlayback.path;
  if(t<=path[0][0]) return {x:path[0][1], y:path[0][2], heading:path[0][3]};
  const last = path[path.length-1];
  if(t>=last[0]) return {x:last[1], y:last[2], heading:last[3]};
  let lo=0, hi=path.length-1;
  while(hi-lo>1){
    const mid=(lo+hi)>>1;
    if(path[mid][0]<=t) lo=mid; else hi=mid;
  }
  const a=path[lo], b=path[hi];
  const span=(b[0]-a[0])||1;
  const f=(t-a[0])/span;
  return { x:lerp(a[1],b[1],f), y:lerp(a[2],b[2],f), heading:angleLerp(a[3],b[3],f) };
}

function updatePlayer(dt){
  emitDamageFx(player, dt);
  if(player.destroyed) return;
  const stats = getEffectiveStats(player.skin);
  let jx=input.jx, jy=input.jy;
  if(Math.abs(jx)<0.001 && Math.abs(jy)<0.001){
    const kv=keyboardVec(); jx=kv.x; jy=kv.y;
  }
  const mag = clamp(Math.hypot(jx,jy),0,1);

  const prevProj = projectToTrack(player.x, player.y);
  const inTurb = turbulenceAt(prevProj.progress);

  let bestGap = Infinity;
  for(const other of aiShips){
    const diff = other.progress - player.progress;
    const latDiff = Math.abs(other.lateral - player.lateral);
    if(diff>0 && diff<150 && latDiff<75) bestGap=Math.min(bestGap,diff);
  }
  const wasSlipActive = player.slipActive;
  if(bestGap<Infinity){ player.slipTimer = Math.min(player.slipTimer+dt, 2); }
  else { player.slipTimer = Math.max(player.slipTimer-dt*1.6, 0); }
  player.slipActive = player.slipTimer>0.55;
  if(player.slipActive && !wasSlipActive){ playSfx('boost'); }

  if(mag>0.12){
    const desired = Math.atan2(jy,jx);
    player.heading = angleLerp(player.heading, desired, clamp(TURN_RATE*stats.handling*mag*dt,0,1));
  }

  player.speedPenalty = Math.min(1, player.speedPenalty + dt*0.9);

  const targetSpeed = (player.slipActive?BOOST_SPEED:MAX_SPEED) * stats.speed * player.speedPenalty;
  player.speed = lerp(player.speed, targetSpeed, clamp(ACCEL_RATE*stats.accel*dt,0,1));
  updateEngineSound(player.speed, MAX_SPEED*stats.speed);

  let vx=Math.cos(player.heading)*player.speed;
  let vy=Math.sin(player.heading)*player.speed;

  if(inTurb){
    const n = TRACK.normals[prevProj.segIndex];
    const force = Math.sin(raceTime*8 + 3.1) * 260 + (Math.random()-0.5)*180;
    vx += n.x*force*dt*6;
    vy += n.y*force*dt*6;
  }

  let nx = player.x + vx*dt;
  let ny = player.y + vy*dt;

  let proj = projectToTrack(nx,ny);

  if(Math.abs(proj.lateral) > TRACK_HALF_WIDTH-SHIP_RADIUS*0.4){
    const sign = Math.sign(proj.lateral)||1;
    const clampedLat = sign*(TRACK_HALF_WIDTH-SHIP_RADIUS*0.4);
    const tp = trackPointAt(proj.progress);
    nx = tp.pos.x + tp.normal.x*clampedLat;
    ny = tp.pos.y + tp.normal.y*clampedLat;
    const impactSpeed = Math.abs(vx*tp.normal.x + vy*tp.normal.y); // speed into the wall, not along it
    const durabilityRelief = 1 - clamp((stats.durability-1)*0.5, -0.3, 0.5);
    player.speedPenalty = Math.min(player.speedPenalty, clamp(0.5*durabilityRelief,0.25,0.85));
    player.speed *= clamp(0.6*durabilityRelief,0.4,0.9);
    player.hadCollision = true;
    if(impactSpeed >= WALL_IMPACT_MIN_SPEED && damageHull(player)) return;
    if(raceTime - player.lastWallSpark > 0.15){
      player.lastWallSpark = raceTime;
      spawnParticles(nx,ny,7,{spread:Math.PI*2, minSpeed:60, speedRange:90, life:0.4, size:3, color:'#ffe08a'});
      shakeTime = Math.max(shakeTime, 0.15);
      playSfx('wallhit');
      hapticPulse(15);
    }
    proj = projectToTrack(nx,ny);
  }

  player.x = nx; player.y = ny;
  player.progress = proj.progress;
  player.lateral = proj.lateral;
  player.segIndex = proj.segIndex;

  for(const o of obstacles){
    if(!o.alive) continue;
    const dist = Math.hypot(player.x-o.x, player.y-o.y);
    const hitDist = o.r+SHIP_RADIUS*0.7;
    if(dist < hitDist){
      if(o.destructible){
        o.alive=false;
        spawnParticles(o.x,o.y,16,{spread:Math.PI*2, minSpeed:60, speedRange:120, life:0.55, size:4, color:'#3ddbd0'});
        addTrick('Обломки!', 20);
        player.crateCount++;
        player.speed *= 0.9;
        playSfx('crateBreak');
        hapticPulse(10);
      } else {
        const nx2=(player.x-o.x)/(dist||1), ny2=(player.y-o.y)/(dist||1);
        player.x = o.x + nx2*hitDist;
        player.y = o.y + ny2*hitDist;
        const durabilityRelief = 1 - clamp((stats.durability-1)*0.5, -0.3, 0.5);
        player.speedPenalty = Math.min(player.speedPenalty, clamp(0.32*durabilityRelief,0.18,0.7));
        player.speed *= clamp(0.4*durabilityRelief,0.25,0.75);
        player.hadCollision = true;
        spawnParticles(player.x,player.y,10,{spread:Math.PI*2, minSpeed:70, speedRange:100, life:0.45, size:3, color:'#ff9a4d'});
        shakeTime = Math.max(shakeTime, 0.25);
        playSfx('crash');
        hapticPulse(35);
        if(damageHull(player)) return;
      }
    } else if(dist < hitDist+NEAR_MISS_MARGIN && player.speed>MAX_SPEED*0.55 && raceTime-o.lastNearMiss>1.0){
      o.lastNearMiss = raceTime;
      addTrick('Опасный пролёт!', 30);
      player.nearMissCount++;
    }
  }

  if(Math.random()<dt*20){
    spawnParticles(
      player.x - Math.cos(player.heading)*16, player.y - Math.sin(player.heading)*16,
      1, {dirAngle:player.heading+Math.PI, spread:0.45, minSpeed:40, speedRange:60, life:0.4, size:3.5, color:player.skin.colors.E}
    );
  }
  if(player.slipActive && Math.random()<dt*30){
    spawnParticles(player.x,player.y,1,{spread:Math.PI*2, minSpeed:10, speedRange:30, life:0.5, size:2.5, color:'#3ddbd0'});
  }

  sampleGhost();
}

function addTrick(label, points){
  player.trickScore += points;
  spawnPopup(label+' +'+points);
  playSfx('trick');
  hapticPulse(8);
}

function checkOvertakes(){
  const ranking = ships.slice().sort((a,b)=>b.progress-a.progress);
  if(prevRanking){
    const newIdx = ranking.indexOf(player);
    const oldIdx = prevRanking.indexOf(player);
    if(newIdx<oldIdx){
      addTrick('Обгон!', 100);
      player.overtakeCount++;
    }
  }
  prevRanking = ranking;
  return ranking;
}

function checkFinish(){
  for(const sh of ships){
    if(sh.finished) continue;
    if(sh.progress >= TOTAL_LENGTH-0.5){
      sh.finished = true;
      sh.finishTime = raceTime;
      finishOrder.push(sh);
      if(sh.isPlayer) endRace();
    }
  }
}

function endRace(){
  STATE='finished';
  hudEl.classList.add('hidden');
  joyZoneEl.classList.add('hidden');
  stopEngineSound();
  if(player.destroyed){ endWreckedRace(); return; }
  finishTitleEl.textContent = 'Финиш';
  const place = finishOrder.indexOf(player)+1;
  const total = ships.length;
  let placementBonus;
  if(total===1) placementBonus=40;
  else if(total===2) placementBonus = place===1?70:25;
  else placementBonus = place===1?80: place===2?45:20;
  const earned = 20 + Math.round(player.trickScore*0.5) + placementBonus;
  SAVE.credits += earned;

  const trackId = getAllTracks()[selectedTrackIdx].id;
  const prevBest = SAVE.bestTimes[trackId];
  isNewBest = (prevBest===undefined) || raceTime < prevBest;
  if(isNewBest){
    SAVE.bestTimes[trackId] = raceTime;
    SAVE.bestGhosts[trackId] = { skinId: player.skin.id, path: ghostRecording };
  }

  // lifetime stats
  const st = SAVE.stats;
  st.totalRaces++;
  st.totalDistance += TOTAL_LENGTH;
  st.totalCreditsEarned += earned;
  st.totalObstaclesDestroyed += player.crateCount;
  st.totalOvertakes += player.overtakeCount;
  st.totalNearMisses += player.nearMissCount;
  st.raceCountByShip[player.skin.id] = (st.raceCountByShip[player.skin.id]||0)+1;
  if(place===1) st.wins++;

  const newAchievements = checkAchievements({flawless: !player.hadCollision});
  const dailyResult = checkDailyChallenge({
    trackId, place, trickScore:player.trickScore, mode:raceMode,
    crateCount:player.crateCount, nearMissCount:player.nearMissCount, overtakeCount:player.overtakeCount,
  });
  persistSave();

  document.getElementById('finish-place').textContent = place+' / '+total;
  document.getElementById('finish-time').textContent = fmtTime(raceTime);
  document.getElementById('finish-score').textContent = player.trickScore;
  document.getElementById('finish-earned').textContent = '+'+earned+' ₡';
  document.getElementById('retry-btn').textContent = 'Ещё раз';
  const bestRow = document.getElementById('finish-best-row');
  const bestEl = document.getElementById('finish-best');
  if(isNewBest){
    bestEl.textContent = 'Новый рекорд!';
    bestEl.classList.add('gold');
    playSfx('newbest');
    hapticPulse([30,40,30,40,60]);
  } else {
    bestEl.textContent = fmtTime(prevBest);
    bestEl.classList.remove('gold');
    playSfx('finish');
    hapticPulse(20);
  }
  bestRow.classList.remove('hidden');

  const unlockBox = document.getElementById('finish-unlocks');
  unlockBox.innerHTML='';
  unlockBox.classList.add('hidden');
  const unlockLines=[];
  if(dailyResult) unlockLines.push('Задание дня: '+dailyResult.desc+' (+'+dailyResult.reward+' ₡)');
  newAchievements.forEach(a=>unlockLines.push('Ачивка: '+a.name+' (+'+a.reward+' ₡)'));
  if(unlockLines.length){
    unlockBox.classList.remove('hidden');
    unlockLines.forEach(line=>{
      const row=document.createElement('div');
      row.className='unlock-line';
      row.textContent=line;
      unlockBox.appendChild(row);
    });
  }
  finishScreen.classList.remove('hidden');
}

/* The player's hull gave out before the finish line: no place, no record, only a small consolation payout */
function endWreckedRace(){
  const earned = 10 + Math.round(player.trickScore*0.25);
  SAVE.credits += earned;
  const st = SAVE.stats;
  st.totalRaces++;
  st.totalDistance += Math.round(player.progress);
  st.totalCreditsEarned += earned;
  st.totalObstaclesDestroyed += player.crateCount;
  st.totalOvertakes += player.overtakeCount;
  st.totalNearMisses += player.nearMissCount;
  st.raceCountByShip[player.skin.id] = (st.raceCountByShip[player.skin.id]||0)+1;
  const newAchievements = checkAchievements({flawless:false});
  persistSave();

  finishTitleEl.textContent = 'Корабль разрушен';
  document.getElementById('finish-place').textContent = 'Сход';
  document.getElementById('finish-time').textContent = fmtTime(raceTime);
  document.getElementById('finish-score').textContent = player.trickScore;
  document.getElementById('finish-earned').textContent = '+'+earned+' ₡';
  document.getElementById('finish-best-row').classList.add('hidden');
  document.getElementById('retry-btn').textContent = 'Ещё раз';

  const unlockBox = document.getElementById('finish-unlocks');
  unlockBox.innerHTML='';
  unlockBox.classList.toggle('hidden', !newAchievements.length);
  newAchievements.forEach(a=>{
    const row=document.createElement('div');
    row.className='unlock-line';
    row.textContent='Ачивка: '+a.name+' (+'+a.reward+' ₡)';
    unlockBox.appendChild(row);
  });
  playSfx('finish');
  finishScreen.classList.remove('hidden');
}

function endArenaMatch(playerWon){
  STATE='finished';
  hudEl.classList.add('hidden');
  joyZoneEl.classList.add('hidden');
  fireBtnEl.classList.add('hidden');
  input.fireHeld=false;
  stopEngineSound();

  const earned = playerWon ? 90 : 25;
  SAVE.credits += earned;

  const rivalScore = aiShips[0].arenaScore;
  finishTitleEl.textContent = 'Финиш';
  const cleanWin = playerWon && rivalScore===0;

  const st = SAVE.stats;
  st.totalRaces++;
  st.totalCreditsEarned += earned;
  st.raceCountByShip[player.skin.id] = (st.raceCountByShip[player.skin.id]||0)+1;
  if(playerWon){ st.wins++; st.arenaWins = (st.arenaWins||0)+1; st.arenaWinStreak = (st.arenaWinStreak||0)+1; }
  else { st.arenaWinStreak = 0; }

  const newAchievements = checkAchievements({flawless:false, cleanArenaWin:cleanWin});
  persistSave();

  document.getElementById('finish-place').textContent = playerWon ? 'Победа!' : 'Поражение';
  document.getElementById('finish-time').textContent = fmtTime(raceTime);
  document.getElementById('finish-score').textContent = player.arenaScore+' : '+rivalScore;
  document.getElementById('finish-earned').textContent = '+'+earned+' ₡';
  document.getElementById('finish-best-row').classList.add('hidden');
  document.getElementById('retry-btn').textContent = 'Реванш';

  const unlockBox = document.getElementById('finish-unlocks');
  unlockBox.innerHTML='';
  unlockBox.classList.add('hidden');
  if(newAchievements.length){
    unlockBox.classList.remove('hidden');
    newAchievements.forEach(a=>{
      const row=document.createElement('div');
      row.className='unlock-line';
      row.textContent='Ачивка: '+a.name+' (+'+a.reward+' ₡)';
      unlockBox.appendChild(row);
    });
  }

  if(playerWon){ playSfx('newbest'); hapticPulse([30,40,30,40,60]); }
  else { playSfx('finish'); hapticPulse(20); }

  finishScreen.classList.remove('hidden');
}
