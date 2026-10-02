"use strict";

/* ---------------- Level editor ---------------- */
let editorSegments = [];
let editorThemeIdx = 0;
const OPPOSITE_DIR = { R:'L', L:'R', U:'D', D:'U' };
const EDITOR_MAX_SEGMENTS = 40;
const editorPreview = document.getElementById('editor-preview');
const editorMeta = document.getElementById('editor-meta');

function buildEditorThemeRow(){
  const row=document.getElementById('editor-theme-row');
  row.innerHTML='';
  EDITOR_THEMES.forEach((th,idx)=>{
    const sw=document.createElement('div');
    sw.className='theme-swatch'+(idx===editorThemeIdx?' selected':'');
    sw.style.background=th.swatch;
    sw.addEventListener('click', ()=>{
      playSfx('ui');
      editorThemeIdx=idx;
      buildEditorThemeRow();
    });
    row.appendChild(sw);
  });
}

function refreshEditorDirButtons(){
  const last = editorSegments[editorSegments.length-1];
  const forbidden = last ? OPPOSITE_DIR[last[0]] : null;
  document.querySelectorAll('.dir-btn').forEach(btn=>{
    const dir=btn.dataset.dir;
    btn.disabled = (dir===forbidden) || editorSegments.length>=EDITOR_MAX_SEGMENTS;
  });
}
function refreshEditorPreview(){
  const g=editorPreview.getContext('2d');
  g.imageSmoothingEnabled=false;
  g.clearRect(0,0,editorPreview.width,editorPreview.height);
  if(editorSegments.length>0){
    drawTrackSchematic(editorPreview, editorSegments, EDITOR_THEMES[editorThemeIdx]);
  }
  const total = editorSegments.reduce((a,s)=>a+s[1],0);
  editorMeta.textContent = 'Сегментов: '+editorSegments.length+' · '+(total/1000).toFixed(1)+' км';
  refreshEditorDirButtons();
  document.getElementById('editor-save').disabled = editorSegments.length<3;
}
const EDITOR_HINT_DEFAULT = 'Минимум 3 участка. Строй трассу в любую сторону — нельзя только развернуться на 180°.';
let editorHintTimer=null;
function flashEditorHint(text){
  const hint=document.getElementById('editor-hint');
  hint.textContent=text;
  hint.style.color='#ff8080';
  playSfx('wallhit');
  hapticPulse(20);
  if(editorHintTimer) clearTimeout(editorHintTimer);
  editorHintTimer=setTimeout(()=>{
    hint.textContent=EDITOR_HINT_DEFAULT;
    hint.style.color='';
  }, 1800);
}
function openEditor(){
  editorSegments = [];
  editorSelectedLen = 1200;
  document.querySelectorAll('.len-btn').forEach(b=>b.classList.toggle('active-len', Number(b.dataset.len)===editorSelectedLen));
  buildEditorThemeRow();
  refreshEditorPreview();
  modeScreen.classList.add('hidden');
  currencyBadge.classList.add('hidden');
  editorScreen.classList.remove('hidden');
}
document.getElementById('mode-editor-btn').addEventListener('click', ()=>{ playSfx('ui'); openEditor(); });
document.getElementById('editor-back').addEventListener('click', ()=>{
  playSfx('ui');
  editorScreen.classList.add('hidden');
  currencyBadge.classList.remove('hidden');
  modeScreen.classList.remove('hidden'); refreshDailyBanner();
});
let editorSelectedLen = 1200;
document.querySelectorAll('.len-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    playSfx('ui');
    editorSelectedLen = Number(btn.dataset.len);
    document.querySelectorAll('.len-btn').forEach(b=>b.classList.toggle('active-len', b===btn));
  });
});
document.querySelectorAll('.dir-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    if(btn.disabled) return;
    if(editorSegments.length>=EDITOR_MAX_SEGMENTS) return;
    const trialDef = [...editorSegments, [btn.dataset.dir, editorSelectedLen]];
    if(defHasOverlap(trialDef)){
      flashEditorHint('Трасса пересечёт саму себя — попробуй другую длину или направление');
      return;
    }
    playSfx('ui');
    editorSegments.push([btn.dataset.dir, editorSelectedLen]);
    refreshEditorPreview();
  });
});
document.getElementById('editor-undo').addEventListener('click', ()=>{
  playSfx('ui');
  editorSegments.pop();
  refreshEditorPreview();
});
document.getElementById('editor-clear').addEventListener('click', ()=>{
  playSfx('ui');
  editorSegments = [];
  refreshEditorPreview();
});
document.getElementById('editor-save').addEventListener('click', ()=>{
  if(editorSegments.length<3) return;
  playSfx('newbest');
  const theme = EDITOR_THEMES[editorThemeIdx];
  const n = (SAVE.customTracks||[]).length+1;
  const def = editorSegments.map(s=>s.slice());
  const track = {
    id:'custom_'+Date.now(),
    name:'Моя трасса '+n,
    tagline:'Своя трасса · '+def.length+' участков',
    theme:{ floor:theme.floor, wall:theme.wall, glow:theme.glow, glass:theme.glass, turb:theme.turb },
    def,
    turbulence:autoGenerateTurbulence(def),
    obstacles:autoGenerateObstacles(def),
    custom:true,
  };
  SAVE.customTracks = [...(SAVE.customTracks||[]), track];
  const newIdx = getAllTracks().length-1;
  SAVE.selectedTrack = newIdx;
  persistSave();
  loadTrackByIndex(newIdx);
  editorScreen.classList.add('hidden');
  currencyBadge.classList.remove('hidden');
  updateMenuSummary();
  modeScreen.classList.remove('hidden'); refreshDailyBanner();
});

function applyJoystickSize(){
  const size=SAVE.settings.joySize;
  joyBase.style.width=size+'px'; joyBase.style.height=size+'px';
  joyKnob.style.width=(size*0.45)+'px'; joyKnob.style.height=(size*0.45)+'px';
  joyKnob.style.margin=(-size*0.225)+'px 0 0 '+(-size*0.225)+'px';
}
setMusic.addEventListener('input', ()=>{ SAVE.settings.musicVol=Number(setMusic.value); applyAudioSettings(); persistSave(); });
setSfx.addEventListener('input', ()=>{ SAVE.settings.sfxVol=Number(setSfx.value); applyAudioSettings(); persistSave(); playSfx('ui'); });
setJoySize.addEventListener('input', ()=>{ SAVE.settings.joySize=Number(setJoySize.value); applyJoystickSize(); persistSave(); });
setSensitivity.addEventListener('input', ()=>{ SAVE.settings.sensitivity=Number(setSensitivity.value); persistSave(); });
setReduceShake.addEventListener('change', ()=>{ SAVE.settings.reduceShake=setReduceShake.checked; persistSave(); });
