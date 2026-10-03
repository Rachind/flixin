"use strict";

/* ---------------- Track mini-schematic (for track cards) ---------------- */
function drawTrackSchematic(cv, def, theme){
  const g=cv.getContext('2d');
  g.imageSmoothingEnabled=false;
  const w=cv.width, h=cv.height;
  g.clearRect(0,0,w,h);
  const built = buildTrack(def);
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  for(const p of built.waypoints){
    minX=Math.min(minX,p.x); maxX=Math.max(maxX,p.x);
    minY=Math.min(minY,p.y); maxY=Math.max(maxY,p.y);
  }
  const pad=6;
  const sx=(w-pad*2)/Math.max(1,(maxX-minX));
  const sy=(h-pad*2)/Math.max(1,(maxY-minY));
  const s=Math.min(sx,sy);
  const ox=pad-minX*s + (w-pad*2-(maxX-minX)*s)/2;
  const oy=pad-minY*s + (h-pad*2-(maxY-minY)*s)/2;
  g.strokeStyle=theme.wall; g.lineWidth=5; g.lineCap='round'; g.lineJoin='round';
  g.beginPath();
  built.waypoints.forEach((p,i)=>{ const x=p.x*s+ox, y=p.y*s+oy; if(i===0) g.moveTo(x,y); else g.lineTo(x,y); });
  g.stroke();
  g.strokeStyle=theme.glow.replace(/[\d.]+\)$/,'0.9)'); g.lineWidth=2;
  g.stroke();
  const p0=built.waypoints[0], pN=built.waypoints[built.waypoints.length-1];
  g.fillStyle='#3ddbd0';
  g.fillRect(p0.x*s+ox-2, p0.y*s+oy-2, 4,4);
  g.fillStyle='#ff8c42';
  g.fillRect(pN.x*s+ox-2, pN.y*s+oy-2, 4,4);
}

/* ---------------- Menu: ship grid (hangar) ---------------- */
function buildShipGrid(){
  const grid=document.getElementById('ship-grid');
  grid.innerHTML='';
  SKINS.forEach((skin,idx)=>{
    const owned = !!SAVE.owned[skin.id];
    const card=document.createElement('div');
    card.className='ship-card'+(idx===selectedSkinIdx && owned?' selected':'')+(!owned?' locked':'');
    const cv=document.createElement('canvas');
    cv.width=120; cv.height=76;
    const g=cv.getContext('2d');
    g.imageSmoothingEnabled=false;
    g.save();
    g.translate(60,38);
    const app = owned ? getAppearance(skin.id) : {...APPEARANCE_DEFAULT};
    const appCount = APPEARANCE_ITEMS.filter(i=>app[i.id]).length;
    const renderSkin = owned ? {...skin, colors:getRenderColors(skin, skin.id)} : skin;
    drawTunedShip(g, renderSkin, 5.0*skin.scale, app);
    g.restore();
    card.appendChild(cv);
    const nm=document.createElement('div'); nm.className='sname'; nm.textContent=skin.name;
    card.appendChild(nm);
    if(owned && appCount>0){
      const tag=document.createElement('div'); tag.className='tuning-tag'; tag.textContent='Тюнинг ×'+appCount;
      card.appendChild(tag);
    }
    const statsRow=document.createElement('div'); statsRow.className='stat-bars';
    const statDefs=[['speed','СК'],['accel','РЗ'],['handling','УП'],['durability','ПР']];
    statDefs.forEach(([key,label])=>{
      const val = clamp((skin.stats[key]-0.55)/(1.5-0.55),0.06,1);
      const bar=document.createElement('div'); bar.className='stat-bar';
      const fill=document.createElement('div'); fill.className='stat-bar-fill'; fill.style.width=(val*100)+'%';
      bar.appendChild(fill);
      const lbl=document.createElement('span'); lbl.className='stat-bar-lbl'; lbl.textContent=label;
      bar.prepend(lbl);
      statsRow.appendChild(bar);
    });
    card.appendChild(statsRow);
    const perk=PERKS[skin.perk];
    const pk=document.createElement('div'); pk.className='sperk'; pk.textContent=perk.name;
    pk.title=perk.desc;
    card.appendChild(pk);
    const ds=document.createElement('div'); ds.className='sdesc'; ds.textContent=perk.desc;
    card.appendChild(ds);
    if(!owned){
      const price=document.createElement('div'); price.className='sprice'; price.textContent='₡ '+skin.price;
      card.appendChild(price);
      const lock=document.createElement('div'); lock.className='lock-badge';
      card.appendChild(lock);
    }
    card.addEventListener('click', ()=>{
      playSfx('ui');
      if(owned){ selectShip(idx); }
      else { buyShip(idx, card); }
    });
    grid.appendChild(card);
  });
}
function selectShip(idx){
  selectedSkinIdx = idx;
  SAVE.selectedSkin = SKINS[idx].id;
  persistSave();
  buildShipGrid();
  updateMenuSummary();
}
function buyShip(idx, cardEl){
  const skin=SKINS[idx];
  if(SAVE.credits < skin.price){
    if(cardEl){ cardEl.classList.remove('insufficient'); void cardEl.offsetWidth; cardEl.classList.add('insufficient'); }
    return;
  }
  SAVE.credits -= skin.price;
  SAVE.owned[skin.id]=true;
  persistSave();
  updateCurrencyBadge();
  selectShip(idx);
}

/* ---------------- Menu: track grid ---------------- */
function buildTrackGrid(){
  const grid=document.getElementById('track-grid');
  grid.innerHTML='';
  getAllTracks().forEach((t,idx)=>{
    const card=document.createElement('div');
    card.className='track-card'+(idx===selectedTrackIdx?' selected':'');
    const cv=document.createElement('canvas');
    cv.width=88; cv.height=64;
    cv.style.width='88px'; cv.style.height='64px';
    drawTrackSchematic(cv, t.def, t.theme);
    card.appendChild(cv);
    const info=document.createElement('div');
    info.style.flex='1'; info.style.minWidth='0';
    const nm=document.createElement('div'); nm.className='tname'; nm.textContent=t.name;
    const ds=document.createElement('div'); ds.className='tdesc'; ds.textContent=t.tagline;
    const meta=document.createElement('div'); meta.className='tmeta';
    meta.textContent=(t.def.reduce((a,s)=>a+s[1],0)/1000).toFixed(1)+' км · '+t.obstacles.length+' препятствий';
    info.appendChild(nm); info.appendChild(ds); info.appendChild(meta);
    if(t.custom){
      const tag=document.createElement('div'); tag.className='custom-tag'; tag.textContent='Ваша трасса';
      info.appendChild(tag);
    }
    card.appendChild(info);
    if(t.custom){
      const del=document.createElement('button'); del.className='del-btn'; del.textContent='✕';
      del.addEventListener('click', (e)=>{
        e.stopPropagation();
        playSfx('ui');
        SAVE.customTracks = SAVE.customTracks.filter(ct=>ct.id!==t.id);
        if(SAVE.selectedTrack>=getAllTracks().length) SAVE.selectedTrack=0;
        persistSave();
        loadTrackByIndex(SAVE.selectedTrack);
        buildTrackGrid();
        updateMenuSummary();
      });
      card.appendChild(del);
    }
    card.addEventListener('click', ()=>{
      playSfx('ui');
      loadTrackByIndex(idx);
      SAVE.selectedTrack = idx;
      persistSave();
      buildTrackGrid();
      updateMenuSummary();
    });
    grid.appendChild(card);
  });
}

/* ---------------- Main menu summary + navigation ---------------- */
function updateMenuSummary(){
  const skin=SKINS[selectedSkinIdx];
  document.getElementById('summary-ship-name').textContent = skin.name;
  const sc=document.getElementById('summary-ship-canvas');
  const sg=sc.getContext('2d'); sg.imageSmoothingEnabled=false;
  sg.clearRect(0,0,sc.width,sc.height);
  sg.save(); sg.translate(sc.width/2, sc.height/2);
  drawTunedShip(sg, {...skin, colors:getRenderColors(skin, skin.id)}, 3.6*skin.scale, getAppearance(skin.id));
  sg.restore();

  const t=getAllTracks()[selectedTrackIdx] || getAllTracks()[0];
  document.getElementById('summary-track-name').textContent = t.name;
  const tc=document.getElementById('summary-track-canvas');
  drawTrackSchematic(tc, t.def, t.theme);

  document.querySelectorAll('#bots-stepper button').forEach(b=>{
    b.classList.toggle('active', Number(b.dataset.n)===SAVE.bots);
  });
  const hint=document.getElementById('bots-hint');
  hint.textContent = SAVE.bots===0 ? 'Соло-заезд' : SAVE.bots+' соперник'+(SAVE.bots===1?'':'а');

  const curDiff = SAVE.pvpDifficulty || 'normal';
  document.getElementById('pvp-diff-select').value = curDiff;
  document.getElementById('pvp-size-select').value = ARENA_SIZES[SAVE.pvpArenaSize] ? SAVE.pvpArenaSize : 'medium';
}

const splashScreen=document.getElementById('splash-screen');
const modeScreen=document.getElementById('mode-screen');
const menuScreen=document.getElementById('menu-screen');
const hangarScreen=document.getElementById('hangar-screen');
const trackScreen=document.getElementById('track-screen');
const settingsScreen=document.getElementById('settings-screen');
const editorScreen=document.getElementById('editor-screen');
const currencyBadge=document.getElementById('currency-badge');

let raceMode = 'ai'; // 'solo' | 'ai' | 'pvp' — which mode-select button opened race setup

document.getElementById('play-btn').addEventListener('click', ()=>{
  playSfx('ui');
  splashScreen.classList.add('hidden');
  currencyBadge.classList.remove('hidden');
  modeScreen.classList.remove('hidden'); refreshDailyBanner();
});
function openRaceSetup(mode){
  raceMode = mode;
  const botsRow=document.getElementById('bots-row');
  const soloRow=document.getElementById('solo-row');
  const pvpRow=document.getElementById('pvp-row');
  const pvpDiffRow=document.getElementById('pvp-diff-row');
  const pvpSizeRow=document.getElementById('pvp-size-row');
  const setupTitle=document.getElementById('setup-title');
  // the arena duel has no track — its size row replaces the track picker
  document.getElementById('open-track-btn').classList.toggle('hidden', mode==='pvp');
  pvpSizeRow.classList.toggle('hidden', mode!=='pvp');
  botsRow.classList.add('hidden');
  soloRow.classList.add('hidden');
  pvpRow.classList.add('hidden');
  pvpDiffRow.classList.add('hidden');
  if(mode==='solo'){
    soloRow.classList.remove('hidden');
    setupTitle.textContent='Соло-заезд';
    SAVE.bots = 0;
    persistSave();
  } else if(mode==='pvp'){
    pvpRow.classList.remove('hidden');
    pvpDiffRow.classList.remove('hidden');
    setupTitle.textContent='ПВП-арена';
    SAVE.bots = 1;
    persistSave();
  } else {
    botsRow.classList.remove('hidden');
    setupTitle.textContent='Гонка с ботами';
    SAVE.bots = SAVE.lastAiBots>0 ? SAVE.lastAiBots : 2;
    persistSave();
  }
  updateMenuSummary();
  modeScreen.classList.add('hidden');
  menuScreen.classList.remove('hidden');
}
document.getElementById('mode-solo-btn').addEventListener('click', ()=>{ playSfx('ui'); openRaceSetup('solo'); });
document.getElementById('mode-ai-btn').addEventListener('click', ()=>{ playSfx('ui'); openRaceSetup('ai'); });
document.getElementById('mode-pvp-btn').addEventListener('click', ()=>{ playSfx('ui'); openRaceSetup('pvp'); });
document.getElementById('mode-multi-btn').addEventListener('click', ()=>{
  const btn=document.getElementById('mode-multi-btn');
  btn.classList.remove('shake'); void btn.offsetWidth; btn.classList.add('shake');
  playSfx('wallhit');
  hapticPulse(15);
});
document.getElementById('setup-back').addEventListener('click', ()=>{
  playSfx('ui');
  menuScreen.classList.add('hidden');
  modeScreen.classList.remove('hidden'); refreshDailyBanner();
});

document.getElementById('open-hangar-btn').addEventListener('click', ()=>{
  playSfx('ui');
  menuScreen.classList.add('hidden');
  currencyBadge.classList.add('hidden');
  buildShipGrid();
  hangarScreen.classList.remove('hidden');
});
document.getElementById('hangar-back').addEventListener('click', ()=>{
  playSfx('ui');
  hangarScreen.classList.add('hidden');
  updateMenuSummary();
  currencyBadge.classList.remove('hidden');
  menuScreen.classList.remove('hidden');
});
const tuningScreen=document.getElementById('tuning-screen');
let tuningReturnScreen = null;
document.getElementById('open-tuning-btn').addEventListener('click', ()=>{
  playSfx('ui');
  hangarScreen.classList.add('hidden');
  tuningReturnScreen = hangarScreen;
  buildTuningScreen();
  tuningScreen.classList.remove('hidden');
});
document.getElementById('mode-tuning-btn').addEventListener('click', ()=>{
  playSfx('ui');
  modeScreen.classList.add('hidden');
  currencyBadge.classList.remove('hidden');
  tuningReturnScreen = modeScreen;
  buildTuningScreen();
  tuningScreen.classList.remove('hidden');
});
document.getElementById('tuning-back').addEventListener('click', ()=>{
  playSfx('ui');
  tuningScreen.classList.add('hidden');
  if(tuningReturnScreen===hangarScreen){
    buildShipGrid();
    hangarScreen.classList.remove('hidden');
  } else {
    refreshDailyBanner();
    modeScreen.classList.remove('hidden');
  }
});
function buildTuningScreen(){
  const skin = SKINS[selectedSkinIdx];
  document.getElementById('tuning-ship-name').textContent = skin.name;
  const perk=PERKS[skin.perk];
  document.getElementById('tuning-ship-perk').textContent = perk.name+': '+perk.desc;
  const cv=document.getElementById('tuning-ship-canvas');
  const g=cv.getContext('2d'); g.imageSmoothingEnabled=false;
  g.clearRect(0,0,cv.width,cv.height);
  g.save(); g.translate(cv.width/2, cv.height/2);
  drawTunedShip(g, {...skin, colors:getRenderColors(skin, skin.id)}, 5.6*skin.scale, getAppearance(skin.id));
  g.restore();

  const swatchesEl=document.getElementById('paint-swatches');
  swatchesEl.innerHTML='';
  const curColor = getHullColor(skin.id);
  PAINT_COLORS.forEach(hex=>{
    const sw=document.createElement('div');
    sw.className='paint-swatch'+(curColor===hex?' selected':'');
    sw.style.background=hex;
    sw.addEventListener('click', ()=>{
      playSfx('ui');
      setHullColor(skin.id, hex);
      buildTuningScreen(); buildShipGrid(); updateMenuSummary();
    });
    swatchesEl.appendChild(sw);
  });
  const resetSw=document.createElement('div');
  resetSw.className='paint-swatch reset'+(!curColor?' selected':'');
  resetSw.textContent='✕';
  resetSw.title='Заводской цвет';
  resetSw.addEventListener('click', ()=>{
    playSfx('ui');
    resetHullColor(skin.id);
    buildTuningScreen(); buildShipGrid(); updateMenuSummary();
  });
  swatchesEl.appendChild(resetSw);

  const rowsEl=document.getElementById('tuning-rows');
  rowsEl.innerHTML='';
  const lv = getUpgradeLevels(skin.id);
  UPGRADE_STATS.forEach(stat=>{
    const row=document.createElement('div'); row.className='upgrade-row';
    const top=document.createElement('div'); top.className='upgrade-row-top';
    const name=document.createElement('div'); name.className='upgrade-name'; name.textContent=UPGRADE_LABELS[stat];
    const pips=document.createElement('div'); pips.className='upgrade-pips';
    for(let i=0;i<UPGRADE_MAX_LEVEL;i++){
      const p=document.createElement('div'); p.className='upgrade-pip'+(i<lv[stat]?' filled':'');
      pips.appendChild(p);
    }
    top.appendChild(name); top.appendChild(pips);
    row.appendChild(top);
    if(stat==='durability'){
      const dur=getEffectiveStats(skin).durability;
      const desc=document.createElement('div'); desc.className='upgrade-desc';
      desc.textContent='Выдерживает ударов: '+hullMaxHits(dur, HULL_HITS_RACE)+' в гонке, '+hullMaxHits(dur, HULL_HITS_ARENA)+' в арене';
      row.appendChild(desc);
    }
    const btn=document.createElement('button'); btn.className='upgrade-btn';
    const level=lv[stat];
    if(level>=UPGRADE_MAX_LEVEL){
      btn.textContent='МАКСИМУМ'; btn.disabled=true;
    } else {
      const cost=upgradeCost(level);
      btn.textContent='Улучшить · ₡ '+cost;
      btn.disabled = SAVE.credits<cost;
      btn.addEventListener('click', ()=>{
        if(buyUpgrade(skin.id, stat)){ playSfx('newbest'); hapticPulse(15); buildTuningScreen(); }
        else { playSfx('wallhit'); hapticPulse(20); }
      });
    }
    row.appendChild(btn);
    rowsEl.appendChild(row);
  });

  const appRowsEl=document.getElementById('tuning-appearance-rows');
  appRowsEl.innerHTML='';
  const app = getAppearance(skin.id);
  APPEARANCE_ITEMS.forEach(item=>{
    const owned = !!app[item.id];
    const row=document.createElement('div'); row.className='upgrade-row appearance-row'+(owned?' owned':'');
    const info=document.createElement('div');
    const name=document.createElement('div'); name.className='upgrade-name'; name.textContent=item.name;
    const desc=document.createElement('div'); desc.className='upgrade-desc'; desc.textContent=item.desc;
    info.appendChild(name); info.appendChild(desc);
    row.appendChild(info);
    const btn=document.createElement('button'); btn.className='appearance-btn';
    if(owned){
      btn.textContent='КУПЛЕНО'; btn.disabled=true;
    } else {
      btn.textContent='Купить · ₡ '+item.price;
      btn.disabled = SAVE.credits<item.price;
      btn.addEventListener('click', ()=>{
        if(buyAppearance(skin.id, item.id)){ playSfx('newbest'); hapticPulse(15); buildTuningScreen(); buildShipGrid(); }
        else { playSfx('wallhit'); hapticPulse(20); }
      });
    }
    row.appendChild(btn);
    appRowsEl.appendChild(row);
  });
}
document.getElementById('open-track-btn').addEventListener('click', ()=>{
  playSfx('ui');
  menuScreen.classList.add('hidden');
  currencyBadge.classList.add('hidden');
  buildTrackGrid();
  trackScreen.classList.remove('hidden');
});
document.getElementById('track-back').addEventListener('click', ()=>{
  playSfx('ui');
  trackScreen.classList.add('hidden');
  updateMenuSummary();
  currencyBadge.classList.remove('hidden');
  menuScreen.classList.remove('hidden');
});
document.getElementById('bots-stepper').addEventListener('click', (e)=>{
  const btn=e.target.closest('button');
  if(!btn) return;
  playSfx('ui');
  SAVE.bots = Number(btn.dataset.n);
  SAVE.lastAiBots = SAVE.bots;
  persistSave();
  updateMenuSummary();
});
document.getElementById('pvp-size-select').addEventListener('change', (e)=>{
  playSfx('ui');
  SAVE.pvpArenaSize = e.target.value;
  persistSave();
  updateMenuSummary();
});
document.getElementById('pvp-diff-select').addEventListener('change', (e)=>{
  playSfx('ui');
  SAVE.pvpDifficulty = e.target.value;
  persistSave();
  updateMenuSummary();
});
