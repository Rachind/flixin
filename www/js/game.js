"use strict";

/* ---------------- Particles ---------------- */
let particles = [];
function spawnParticles(x,y,count,opts){
  for(let i=0;i<count;i++){
    const ang = (opts.dirAngle!==undefined ? opts.dirAngle : Math.random()*Math.PI*2) + (Math.random()-0.5)*(opts.spread||Math.PI*2);
    const spd = (opts.minSpeed||20) + Math.random()*(opts.speedRange||60);
    particles.push({
      x,y, vx:Math.cos(ang)*spd, vy:Math.sin(ang)*spd,
      life: (opts.life||0.5)*(0.7+Math.random()*0.6),
      maxLife: opts.life||0.5,
      size: (opts.size||3)*(0.7+Math.random()*0.7),
      color: opts.color || '#ffffff',
    });
  }
}
function updateParticles(dt){
  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i];
    p.x+=p.vx*dt; p.y+=p.vy*dt;
    p.vx*=0.94; p.vy*=0.94;
    p.life-=dt;
    if(p.life<=0) particles.splice(i,1);
  }
}
function drawParticles(g){
  for(const p of particles){
    const a=clamp(p.life/p.maxLife,0,1);
    g.globalAlpha=a;
    g.fillStyle=p.color;
    const s=p.size*a+0.5;
    g.fillRect(p.x-s/2, p.y-s/2, s, s);
  }
  g.globalAlpha=1;
}

/* ---------------- Trick popups ---------------- */
const popupsEl = document.getElementById('trick-popups');
function spawnPopup(text){
  const d=document.createElement('div');
  d.className='popup';
  d.textContent=text;
  popupsEl.appendChild(d);
  setTimeout(()=>d.remove(), 1150);
}

/* ---------------- Ships (player + AI) ---------------- */
const SHIP_RADIUS = 15;
const MAX_SPEED = 460;
const BOOST_SPEED = 610;
const ACCEL_RATE = 1.55;
const TURN_RATE = 4.6;
const NEAR_MISS_MARGIN = 20;
const AI_NAMES = ['Рейвен','Тайфун'];
const PVP_RIVAL_NAME = 'Соперник';

/* ---------------- Game state machine ---------------- */
let STATE = 'menu'; // menu | countdown | racing | finished
let countdownTimer = 0;
let countdownPhase = 3;

const countdownEl=document.getElementById('countdown');
const countdownText=document.getElementById('countdown-text');
const hudEl=document.getElementById('hud');
const joyZoneEl=document.getElementById('joystick-zone');
const finishScreen=document.getElementById('finish-screen');
const statusTag=document.getElementById('status-tag');
const hitMarkerEl=document.getElementById('hit-marker');

function goToMenu(){
  finishScreen.classList.add('hidden');
  hudEl.classList.add('hidden');
  joyZoneEl.classList.add('hidden');
  fireBtnEl.classList.add('hidden');
  input.fireHeld=false;
  updateMenuSummary();
  updateCurrencyBadge();
  currencyBadge.classList.remove('hidden');
  modeScreen.classList.remove('hidden'); refreshDailyBanner();
  STATE='menu';
  stopEngineSound();
  startMusic('menu');
}

document.getElementById('start-btn').addEventListener('click', ()=>{
  playSfx('ui');
  resetRace();
  menuScreen.classList.add('hidden');
  currencyBadge.classList.add('hidden');
  hudEl.classList.remove('hidden');
  joyZoneEl.classList.remove('hidden');
  fireBtnEl.classList.toggle('hidden', raceMode!=='pvp');
  startMusic(getAllTracks()[selectedTrackIdx].id);
  if(!SAVE.seenTutorial){ showTutorial(); } else { startCountdown(); }
});
document.getElementById('retry-btn').addEventListener('click', ()=>{
  playSfx('ui');
  finishScreen.classList.add('hidden');
  resetRace();
  hudEl.classList.remove('hidden');
  joyZoneEl.classList.remove('hidden');
  fireBtnEl.classList.toggle('hidden', raceMode!=='pvp');
  startMusic(getAllTracks()[selectedTrackIdx].id);
  startCountdown();
});
document.getElementById('menu-btn').addEventListener('click', ()=>{ playSfx('ui'); goToMenu(); });

function startCountdown(){
  STATE='countdown';
  countdownPhase=3;
  countdownTimer=1.0;
  countdownEl.classList.remove('hidden');
  countdownText.textContent='3';
  countdownText.style.animation='none';
  void countdownText.offsetWidth;
  countdownText.style.animation='';
  playSfx('countdown');
  startEngineSound();
}

/* ---------------- Tutorial overlay (shown once, before the very first race) ---------------- */
function showTutorial(){
  document.getElementById('tutorial-screen').classList.remove('hidden');
}
document.getElementById('tutorial-ok').addEventListener('click', ()=>{
  playSfx('ui');
  document.getElementById('tutorial-screen').classList.add('hidden');
  SAVE.seenTutorial=true;
  persistSave();
  startCountdown();
});

/* ---------------- Update ---------------- */
function updateAI(sh, dt){
  const stats = sh.skin.stats;
  const baseSpeed = 380 * sh.aiSpeedVar * stats.speed;

  // rubber-band: fall behind -> AI speeds up a little, get too far ahead -> AI eases off
  // a PVP rival sticks closer and pushes harder, for a real head-to-head duel feel
  const gap = player.progress - sh.progress; // positive = AI is behind player
  const rubberBand = sh.isRival
    ? clamp(1 + gap/2200*0.22, 0.92, 1.24)
    : clamp(1 + gap/3200*0.18, 0.86, 1.18);

  const inTurb = turbulenceAt(sh.progress);
  const spd = (inTurb ? baseSpeed*0.82 : baseSpeed) * rubberBand;
  sh.progress = clamp(sh.progress + spd*dt, 0, TOTAL_LENGTH);

  // basic obstacle avoidance: look a bit ahead and steer away from solid pylons
  let avoidTarget = 0;
  for(const o of obstacles){
    if(!o.alive || o.destructible) continue;
    const ahead = o.s - sh.progress;
    if(ahead>0 && ahead<220){
      const dangerLateral = o.offset;
      if(Math.abs(sh.lateral - dangerLateral) < o.r+40){
        avoidTarget += (dangerLateral>0 ? -1 : 1) * (60 - Math.min(60, ahead*0.2));
      }
    }
  }
  sh.aiAvoidLateral = lerp(sh.aiAvoidLateral, avoidTarget, clamp(dt*4,0,1));

  const weave = Math.sin(raceTime*1.3 + sh.aiWeaveSeed) * (TRACK_HALF_WIDTH*0.35);
  sh.lateral = clamp(weave + sh.aiAvoidLateral, -(TRACK_HALF_WIDTH-28), TRACK_HALF_WIDTH-28);
  const tp = trackPointAt(sh.progress);
  sh.x = tp.pos.x + tp.normal.x*sh.lateral;
  sh.y = tp.pos.y + tp.normal.y*sh.lateral;
  const targetHeading = Math.atan2(tp.dir.y, tp.dir.x);
  sh.heading = angleLerp(sh.heading, targetHeading, clamp(6*dt,0,1));
  sh.segIndex = tp.segIndex;

  // AI can also break destructible crates it flies over (visual/gameplay parity)
  for(const o of obstacles){
    if(!o.alive || !o.destructible) continue;
    if(Math.hypot(sh.x-o.x, sh.y-o.y) < o.r+SHIP_RADIUS*0.7){
      o.alive=false;
      spawnParticles(o.x,o.y,10,{spread:Math.PI*2, minSpeed:50, speedRange:90, life:0.45, size:3, color:'#3ddbd0'});
    }
  }

  if(Math.random()<dt*14){
    spawnParticles(
      sh.x - Math.cos(sh.heading)*14, sh.y - Math.sin(sh.heading)*14,
      1, {dirAngle:sh.heading+Math.PI, spread:0.5, minSpeed:30, speedRange:40, life:0.35, size:3, color:sh.skin.colors.E}
    );
  }
}
