"use strict";

/* ---------------- Main loop ---------------- */
let isPaused = false;
let lastTime=performance.now();
function frame(now){
  let dt=(now-lastTime)/1000;
  dt=Math.min(dt,0.033);
  lastTime=now;

  if(isPaused){
    requestAnimationFrame(frame);
    return;
  }

  if(STATE==='countdown'){
    countdownTimer-=dt;
    if(countdownTimer<=0){
      countdownPhase--;
      if(countdownPhase>0){
        countdownText.textContent=String(countdownPhase);
        countdownTimer=1.0;
        playSfx('countdown');
      } else if(countdownPhase===0){
        countdownText.textContent='СТАРТ!';
        countdownTimer=0.7;
        playSfx('go');
      } else {
        countdownEl.classList.add('hidden');
        if(raceMode==='pvp'){ clearAiMarkers(); } else { clearAiMarkers(); ensureAiMarkers(); }
        STATE='racing';
      }
    }
    if(raceMode==='pvp') renderArena(); else render();
  } else if(STATE==='racing'){
    raceTime+=dt;
    if(raceMode==='pvp'){
      updateArenaShip(dt);
      updateArenaAI(aiShips[0], dt);
      updateArenaBullets(dt);
      updateArenaPowerup(dt);
      updateParticles(dt);
      if(STATE==='racing'){
        updateArenaHud();
        renderArena();
      }
    } else {
      updatePlayer(dt);
      for(const sh of aiShips) updateAI(sh,dt);
      updateParticles(dt);
      const ranking = checkOvertakes();
      checkFinish();
      if(STATE==='racing'){
        updateHud(ranking);
        render();
      }
    }
  } else if(STATE==='menu' || STATE==='hangar' || STATE==='track'){
    camera.x = lerp(camera.x, 400, 0.01);
    camera.y = lerp(camera.y, 0, 0.01);
    const pw=pixelCanvas.width, ph=pixelCanvas.height;
    drawBackground(pctx, camera.x, camera.y, pw, ph);
    presentPixelBuffer();
  }

  requestAnimationFrame(frame);
}

/* ---------------- Boot ---------------- */
async function boot(){
  await loadSave();
  selectedSkinIdx = Math.max(0, SKINS.findIndex(s=>s.id===SAVE.selectedSkin));
  loadTrackByIndex(SAVE.selectedTrack||0);
  renderLogo();
  updateMenuSummary();
  updateCurrencyBadge();
  applyJoystickSize();
  grantPendingGifts();
  updateCurrencyBadge();
  startMusic('menu');
  requestAnimationFrame(frame);
}
boot();
