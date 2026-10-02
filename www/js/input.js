"use strict";

/* ---------------- Pause ---------------- */
const pauseScreen=document.getElementById('pause-screen');
document.getElementById('pause-btn').addEventListener('click', ()=>{
  if(STATE!=='racing') return;
  playSfx('ui');
  isPaused=true;
  stopEngineSound();
  pauseScreen.classList.remove('hidden');
});
document.getElementById('resume-btn').addEventListener('click', ()=>{
  playSfx('ui');
  pauseScreen.classList.add('hidden');
  isPaused=false;
  lastTime=performance.now();
  startEngineSound();
});
document.getElementById('pause-menu-btn').addEventListener('click', ()=>{
  playSfx('ui');
  isPaused=false;
  pauseScreen.classList.add('hidden');
  goToMenu();
});

/* ---------------- Input: virtual joystick ---------------- */
const input = { jx:0, jy:0, fireHeld:false };
const joyZone = document.getElementById('joystick-zone');
const joyBase = document.getElementById('joystick-base');
const joyKnob = document.getElementById('joystick-knob');
let joyPointerId = null;
let joyCenter = {x:0,y:0};
const JOY_RADIUS = 52;

function joyCenterFromBase(){
  const r = joyBase.getBoundingClientRect();
  return { x:r.left+r.width/2, y:r.top+r.height/2 };
}
function setKnob(dx,dy){
  joyKnob.style.transform = `translate(${dx}px, ${dy}px)`;
}
function joyStart(e){
  if(joyPointerId!==null) return;
  joyPointerId = e.pointerId;
  joyCenter = joyCenterFromBase();
  joyMove(e);
}
function joyMove(e){
  if(e.pointerId!==joyPointerId) return;
  let dx=e.clientX-joyCenter.x, dy=e.clientY-joyCenter.y;
  const len=Math.hypot(dx,dy);
  if(len>JOY_RADIUS){ dx=dx/len*JOY_RADIUS; dy=dy/len*JOY_RADIUS; }
  setKnob(dx*0.65, dy*0.65);
  const sens = SAVE.settings.sensitivity||1;
  input.jx = clamp((dx/JOY_RADIUS)*sens,-1,1);
  input.jy = clamp((dy/JOY_RADIUS)*sens,-1,1);
}
function joyEnd(e){
  if(e.pointerId!==joyPointerId) return;
  joyPointerId=null;
  setKnob(0,0);
  input.jx=0; input.jy=0;
}
joyZone.addEventListener('pointerdown', e=>{ joyZone.setPointerCapture(e.pointerId); joyStart(e); });
joyZone.addEventListener('pointermove', joyMove);
joyZone.addEventListener('pointerup', joyEnd);
joyZone.addEventListener('pointercancel', joyEnd);

/* keyboard fallback (desktop testing) */
const KEYS={ArrowUp:0,ArrowDown:0,ArrowLeft:0,ArrowRight:0,w:0,a:0,s:0,d:0};
window.addEventListener('keydown', e=>{ if(e.key in KEYS) KEYS[e.key]=1; });
window.addEventListener('keyup', e=>{ if(e.key in KEYS) KEYS[e.key]=0; });
function keyboardVec(){
  let x=(KEYS.ArrowRight||KEYS.d) - (KEYS.ArrowLeft||KEYS.a);
  let y=(KEYS.ArrowDown||KEYS.s) - (KEYS.ArrowUp||KEYS.w);
  const len=Math.hypot(x,y);
  if(len>1){ x/=len; y/=len; }
  return {x,y};
}

/* ---------------- Input: arena fire button (PvP duel) ---------------- */
const fireBtnEl = document.getElementById('fire-btn');
fireBtnEl.addEventListener('pointerdown', e=>{ e.preventDefault(); input.fireHeld=true; fireBtnEl.setPointerCapture(e.pointerId); });
fireBtnEl.addEventListener('pointerup', ()=>{ input.fireHeld=false; });
fireBtnEl.addEventListener('pointercancel', ()=>{ input.fireHeld=false; });
window.addEventListener('keydown', e=>{ if(e.code==='Space') input.fireHeld=true; });
window.addEventListener('keyup', e=>{ if(e.code==='Space') input.fireHeld=false; });
