"use strict";

/* ---------------- HUD update ---------------- */
const hudPlace=document.getElementById('hud-place');
const hudTime=document.getElementById('hud-time');
const hudScore=document.getElementById('hud-score');
const hudPlaceLbl=document.getElementById('hud-place-lbl');
const hudScoreLbl=document.getElementById('hud-score-lbl');
const finishScoreLbl=document.getElementById('finish-score-lbl');
const progressFill=document.getElementById('progress-fill');
const progressWrap=document.getElementById('progress-wrap');
let aiMarkerEls = [];
function ensureAiMarkers(){
  aiMarkerEls = aiShips.map(()=>{
    const m=document.createElement('div'); m.className='ai-marker';
    progressWrap.appendChild(m);
    return m;
  });
}
function clearAiMarkers(){
  aiMarkerEls.forEach(m=>m.remove());
  aiMarkerEls=[];
}

function updateHud(ranking){
  const place = ranking.indexOf(player)+1;
  hudPlace.textContent = place+'/'+ships.length;
  hudTime.textContent = fmtTime(raceTime);
  hudScore.textContent = player.trickScore;
  progressFill.style.width = (clamp(player.progress/TOTAL_LENGTH,0,1)*100)+'%';
  aiShips.forEach((sh,i)=>{
    if(aiMarkerEls[i]) aiMarkerEls[i].style.left = (clamp(sh.progress/TOTAL_LENGTH,0,1)*100)+'%';
  });
  if(player.slipActive){ statusTag.textContent='Слипстрим!'; statusTag.className='boost'; }
  else if(turbulenceAt(player.progress)){ statusTag.textContent='Турбулентность'; statusTag.className='turb'; }
  else { statusTag.className=''; }
}

function updateArenaHud(){
  const rival = aiShips[0];
  hudPlace.textContent = player.arenaScore+'/'+rival.hullMax;
  hudTime.textContent = fmtTime(raceTime);
  hudScore.textContent = rival.arenaScore+'/'+player.hullMax;
  if(player.shieldTime>0){ statusTag.textContent='Щит!'; statusTag.className='boost'; }
  else if(player.boostTime>0){ statusTag.textContent='Ускорение!'; statusTag.className='boost'; }
  else { statusTag.className=''; }
}

/* ---------------- Rendering ---------------- */
let stars = [];
function initStars(){
  stars=[];
  for(let i=0;i<160;i++){
    stars.push({x:(Math.random()-0.5)*4000, y:(Math.random()-0.5)*4000, layer: Math.random()<0.5?0:1, size: Math.random()<0.8?1:2});
  }
}
initStars();

function drawBackground(g,cx,cy,w,h){
  g.fillStyle='#05060b';
  g.fillRect(0,0,w,h);
  for(const st of stars){
    const par = st.layer===0?0.35:0.6;
    let sx = ((st.x - cx*par) % w + w) % w;
    let sy = ((st.y - cy*par) % h + h) % h;
    g.globalAlpha = st.layer===0?0.35:0.7;
    g.fillStyle = st.layer===0? '#3a4a66':'#bcd6ff';
    g.fillRect(sx,sy,st.size,st.size);
  }
  g.globalAlpha=1;
}

function drawSegmentQuad(g,i){
  const wp0=TRACK.waypoints[i], wp1=TRACK.waypoints[i+1];
  const n=TRACK.normals[i];
  const hw=TRACK_HALF_WIDTH;
  const theme=TRACK_THEME;
  const len=TRACK.lengths[i]; const d=TRACK.dirs[i];
  // Detail elements are inset from both ends of the segment so they don't
  // draw on top of the rounded corner shells (drawTrackShell handles those).
  const inset = Math.min(CORNER_RADIUS*0.9, len*0.35);

  // fine panel ticks
  g.strokeStyle='rgba(120,150,180,0.10)';
  g.lineWidth=2;
  for(let s=inset; s<=len-inset; s+=70){
    const cx=wp0.x+d.x*s, cy=wp0.y+d.y*s;
    g.beginPath();
    g.moveTo(cx+n.x*hw, cy+n.y*hw);
    g.lineTo(cx-n.x*hw, cy-n.y*hw);
    g.stroke();
  }
  g.strokeStyle='rgba(120,170,190,0.08)';
  g.beginPath(); g.moveTo(wp0.x,wp0.y); g.lineTo(wp1.x,wp1.y); g.stroke();

  // structural cross-struts (thicker, sparser, with end rivets)
  g.strokeStyle='rgba(10,14,22,0.55)';
  g.lineWidth=7;
  for(let s=Math.max(110,inset); s<len-inset; s+=300){
    const cx=wp0.x+d.x*s, cy=wp0.y+d.y*s;
    g.beginPath();
    g.moveTo(cx+n.x*hw, cy+n.y*hw);
    g.lineTo(cx-n.x*hw, cy-n.y*hw);
    g.stroke();
    g.fillStyle='rgba(200,220,230,0.55)';
    g.fillRect(cx+n.x*hw*0.55-2, cy+n.y*hw*0.55-2, 4,4);
    g.fillRect(cx-n.x*hw*0.55-2, cy-n.y*hw*0.55-2, 4,4);
  }

  // glass observation panels along the walls
  for(let s=Math.max(170,inset); s<len-inset; s+=230){
    const cx=wp0.x+d.x*s, cy=wp0.y+d.y*s;
    const glassLen=46, glassDepth=16;
    for(const side of [1,-1]){
      const ax=cx+n.x*hw*side, ay=cy+n.y*hw*side;
      const bx=ax - n.x*glassDepth*side, by=ay - n.y*glassDepth*side;
      g.fillStyle=theme.glass;
      g.beginPath();
      g.moveTo(ax - d.x*glassLen/2, ay - d.y*glassLen/2);
      g.lineTo(ax + d.x*glassLen/2, ay + d.y*glassLen/2);
      g.lineTo(bx + d.x*glassLen/2, by + d.y*glassLen/2);
      g.lineTo(bx - d.x*glassLen/2, by - d.y*glassLen/2);
      g.closePath(); g.fill();
      g.strokeStyle='rgba(255,255,255,0.25)'; g.lineWidth=1;
      g.stroke();
    }
  }

  // turbulence overlay
  const segStartS=TRACK.cum[i];
  for(const z of TURBULENCE_ZONES){
    const zs=Math.max(z.start,segStartS), ze=Math.min(z.end,segStartS+len);
    if(ze<=zs) continue;
    const t0=zs-segStartS, t1=ze-segStartS;
    const a1={x:wp0.x+d.x*t0, y:wp0.y+d.y*t0};
    const a2={x:wp0.x+d.x*t1, y:wp0.y+d.y*t1};
    const b1={x:a1.x+n.x*hw,y:a1.y+n.y*hw}, b2={x:a2.x+n.x*hw,y:a2.y+n.y*hw};
    const b3={x:a2.x-n.x*hw,y:a2.y-n.y*hw}, b4={x:a1.x-n.x*hw,y:a1.y-n.y*hw};
    const pulse=0.14+0.10*Math.sin(raceTime*5);
    g.fillStyle=`rgba(${theme.turb},${pulse.toFixed(3)})`;
    g.beginPath();
    g.moveTo(b1.x,b1.y); g.lineTo(b2.x,b2.y); g.lineTo(b3.x,b3.y); g.lineTo(b4.x,b4.y);
    g.closePath(); g.fill();
  }

  // finish line (last segment only)
  if(i===TRACK.lengths.length-1){
    const fs = len-40;
    if(fs>=0){
      const fa={x:wp0.x+d.x*fs,y:wp0.y+d.y*fs};
      const cols=10;
      for(let cIdx=0;cIdx<cols;cIdx++){
        const tOff = (cIdx/cols-0.5)*2*hw;
        g.fillStyle = (cIdx%2===0) ? '#e7edf3' : '#0d1220';
        g.fillRect(fa.x - n.y*20 + n.x*tOff, fa.y + n.x*20 + n.y*tOff, 20, hw*2/cols+1);
      }
    }
  }

  // rivets
  g.fillStyle='rgba(180,210,220,0.5)';
  for(let s=inset;s<=len-inset;s+=46){
    const cx=wp0.x+d.x*s, cy=wp0.y+d.y*s;
    g.fillRect(cx+n.x*hw-1.5, cy+n.y*hw-1.5, 3,3);
    g.fillRect(cx-n.x*hw-1.5, cy-n.y*hw-1.5, 3,3);
  }
}

function presentPixelBuffer(){
  const w=canvas.width/DPR, h=canvas.height/DPR;
  ctx.clearRect(0,0,w,h);
  ctx.drawImage(pixelCanvas, 0,0, w,h);
}

function render(){
  const pw=pixelCanvas.width, ph=pixelCanvas.height;
  const lookAhead = 90;
  const targetCamX = player.x + Math.cos(player.heading)*lookAhead;
  const targetCamY = player.y + Math.sin(player.heading)*lookAhead;
  camera.x = lerp(camera.x, targetCamX, 0.06);
  camera.y = lerp(camera.y, targetCamY, 0.06);

  drawBackground(pctx, camera.x, camera.y, pw, ph);

  let shakeX=0, shakeY=0;
  if(shakeTime>0 && !SAVE.settings.reduceShake){
    shakeX=(Math.random()-0.5)*(10/PIXEL_K)*shakeTime/0.25;
    shakeY=(Math.random()-0.5)*(10/PIXEL_K)*shakeTime/0.25;
  }
  if(shakeTime>0) shakeTime=Math.max(0,shakeTime-1/60);

  const ZOOM=1.15/PIXEL_K;
  pctx.save();
  pctx.translate(pw/2+shakeX, ph/2+shakeY);
  pctx.scale(ZOOM,ZOOM);
  pctx.translate(-camera.x, -camera.y);

  drawTrackShell(pctx);
  for(let i=0;i<TRACK.lengths.length;i++) drawSegmentQuad(pctx,i);
  for(const o of obstacles) if(o.alive) drawObstacle(pctx,o);
  drawParticles(pctx);
  if(ghostPlayback && STATE==='racing'){
    const pose = getGhostPose(raceTime);
    if(pose){
      const ghostSkin = SKINS.find(s=>s.id===ghostPlayback.skinId) || player.skin;
      pctx.save();
      pctx.globalAlpha=0.38;
      pctx.translate(pose.x,pose.y);
      pctx.rotate(pose.heading);
      drawShipMatrix(pctx, ghostSkin.shape, ghostSkin.colors, 4.2*ghostSkin.scale);
      pctx.restore();
      pctx.globalAlpha=1;
    }
  }
  for(const sh of ships) drawShip(pctx, sh);

  pctx.restore();
  presentPixelBuffer();
}

function drawArena(g){
  const h = arenaHalf;
  g.fillStyle = '#0a0f1a';
  g.fillRect(-h,-h,h*2,h*2);

  g.strokeStyle = 'rgba(61,219,208,0.1)';
  g.lineWidth = 2;
  const step = h/4;
  for(let gx=-h; gx<=h+0.01; gx+=step){
    g.beginPath(); g.moveTo(gx,-h); g.lineTo(gx,h); g.stroke();
  }
  for(let gy=-h; gy<=h+0.01; gy+=step){
    g.beginPath(); g.moveTo(-h,gy); g.lineTo(h,gy); g.stroke();
  }

  g.strokeStyle = '#3ddbd0';
  g.lineWidth = 6;
  g.strokeRect(-h,-h,h*2,h*2);

  g.fillStyle = '#ffd166';
  const cs = 14;
  [[-h,-h],[h,-h],[-h,h],[h,h]].forEach(([cx,cy])=>{
    g.fillRect(cx-cs/2, cy-cs/2, cs, cs);
  });
}

/* Player's aiming sight: a laser line along the current heading, plus a reticle
   marker that turns red ("locked") when roughly lined up on the opponent. */
function drawPlayerSight(g){
  const ang = player.heading;
  const dx = Math.cos(ang), dy = Math.sin(ang);
  const h = arenaHalf;
  let tMax = h*3;
  if(dx>0.0001) tMax = Math.min(tMax, (h-player.x)/dx);
  else if(dx<-0.0001) tMax = Math.min(tMax, (-h-player.x)/dx);
  if(dy>0.0001) tMax = Math.min(tMax, (h-player.y)/dy);
  else if(dy<-0.0001) tMax = Math.min(tMax, (-h-player.y)/dy);
  tMax = Math.max(40, tMax);

  const rival = aiShips[0];
  let locked=false, rdist=170;
  if(rival){
    const rdx=rival.x-player.x, rdy=rival.y-player.y;
    rdist = Math.hypot(rdx,rdy)||1;
    const rang = Math.atan2(rdy,rdx);
    const diff = Math.abs(((rang-ang+Math.PI*3)%(Math.PI*2))-Math.PI);
    if(diff < 0.09) locked = true;
  }

  const color = locked ? '#ff4d5e' : '#3ddbd0';
  const startD = SHIP_RADIUS+10;

  g.save();
  g.globalAlpha = 0.45;
  g.strokeStyle = color;
  g.lineWidth = 1.6;
  g.setLineDash([6,7]);
  g.beginPath();
  g.moveTo(player.x+dx*startD, player.y+dy*startD);
  g.lineTo(player.x+dx*tMax, player.y+dy*tMax);
  g.stroke();
  g.setLineDash([]);
  g.globalAlpha = 1;

  const markD = clamp(locked ? rdist : 170, startD+10, tMax);
  g.translate(player.x+dx*markD, player.y+dy*markD);
  g.rotate(Math.PI/4);
  g.strokeStyle = color;
  g.lineWidth = 2;
  g.strokeRect(-5,-5,10,10);
  g.restore();
}

function drawArenaBullets(g){
  for(const b of arenaBullets){
    const ang = Math.atan2(b.vy,b.vx);
    g.save();
    g.translate(b.x,b.y);
    g.rotate(ang);
    g.shadowColor = b.color;
    g.shadowBlur = 6;
    g.fillStyle = b.color;
    g.fillRect(-7,-1.6,14,3.2);
    g.shadowBlur = 0;
    g.restore();
  }
}

function drawArenaPowerup(g){
  if(!arenaPowerup) return;
  const pulse = 0.5+0.5*Math.sin(raceTime*6);
  const color = arenaPowerup.type==='shield' ? '#3ddbd0' : '#ffd166';
  g.save();
  g.translate(0,0);
  g.rotate(raceTime*1.5);
  g.strokeStyle = color;
  g.globalAlpha = 0.5+0.3*pulse;
  g.lineWidth = 2.5;
  const r = 14+pulse*2;
  g.strokeRect(-r,-r,r*2,r*2);
  g.restore();

  g.save();
  g.globalAlpha = 1;
  g.fillStyle = color;
  if(arenaPowerup.type==='shield'){
    g.fillRect(-6,-8,12,4);
    g.fillRect(-6,-8,4,12);
    g.fillRect(2,-8,4,12);
    g.fillRect(-4,4,8,4);
  } else {
    g.beginPath();
    g.moveTo(-2,-9); g.lineTo(4,-2); g.lineTo(0,-2); g.lineTo(3,9); g.lineTo(-5,0); g.lineTo(-1,0);
    g.closePath();
    g.fill();
  }
  g.restore();
}

function renderArena(){
  const pw=pixelCanvas.width, ph=pixelCanvas.height;
  camera.x = lerp(camera.x, 0, 0.08);
  camera.y = lerp(camera.y, 0, 0.08);

  drawBackground(pctx, camera.x, camera.y, pw, ph);

  let shakeX=0, shakeY=0;
  if(shakeTime>0 && !SAVE.settings.reduceShake){
    shakeX=(Math.random()-0.5)*(10/PIXEL_K)*shakeTime/0.25;
    shakeY=(Math.random()-0.5)*(10/PIXEL_K)*shakeTime/0.25;
  }
  if(shakeTime>0) shakeTime=Math.max(0,shakeTime-1/60);

  const zoom = Math.min(pw,ph) / (arenaHalf*2*1.15);
  pctx.save();
  pctx.translate(pw/2+shakeX, ph/2+shakeY);
  pctx.scale(zoom,zoom);
  pctx.translate(-camera.x, -camera.y);

  drawArena(pctx);
  drawArenaPowerup(pctx);
  drawPlayerSight(pctx);
  drawParticles(pctx);
  drawArenaBullets(pctx);
  for(const sh of ships){
    pctx.save();
    if(sh.hitFlash>0){
      pctx.shadowColor = '#ffffff';
      pctx.shadowBlur = 8*clamp(sh.hitFlash/0.35,0,1);
    }
    drawShip(pctx, sh);
    pctx.restore();
    if(sh.shieldTime>0){
      pctx.save();
      pctx.globalAlpha = 0.55+0.25*Math.sin(raceTime*10);
      pctx.strokeStyle = '#3ddbd0';
      pctx.lineWidth = 2;
      pctx.beginPath();
      pctx.arc(sh.x, sh.y, SHIP_RADIUS+6, 0, Math.PI*2);
      pctx.stroke();
      pctx.restore();
    }
  }

  pctx.restore();
  presentPixelBuffer();
}
