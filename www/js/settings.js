"use strict";

/* ---------------- Settings screen ---------------- */
const setMusic=document.getElementById('set-music');
const setSfx=document.getElementById('set-sfx');
const setJoySize=document.getElementById('set-joysize');
const setSensitivity=document.getElementById('set-sensitivity');
const setReduceShake=document.getElementById('set-reduceshake');

function openSettings(){
  setMusic.value = SAVE.settings.musicVol;
  setSfx.value = SAVE.settings.sfxVol;
  setJoySize.value = SAVE.settings.joySize;
  setSensitivity.value = SAVE.settings.sensitivity;
  setReduceShake.checked = SAVE.settings.reduceShake;
  applyJoystickSize();
  modeScreen.classList.add('hidden');
  currencyBadge.classList.add('hidden');
  settingsScreen.classList.remove('hidden');
}
document.getElementById('mode-settings-btn').addEventListener('click', ()=>{ playSfx('ui'); openSettings(); });
const profileScreen=document.getElementById('profile-screen');
document.getElementById('mode-profile-btn').addEventListener('click', ()=>{
  playSfx('ui');
  modeScreen.classList.add('hidden');
  currencyBadge.classList.add('hidden');
  buildProfileScreen();
  profileScreen.classList.remove('hidden');
});
document.getElementById('profile-back').addEventListener('click', ()=>{
  playSfx('ui');
  profileScreen.classList.add('hidden');
  currencyBadge.classList.remove('hidden');
  modeScreen.classList.remove('hidden'); refreshDailyBanner();
});
function refreshDailyBanner(){
  const def = ensureDailyChallenge();
  const banner = document.getElementById('daily-banner');
  const done = SAVE.dailyChallenge.completed;
  document.getElementById('daily-reward').textContent = '(+'+def.reward+' ₡)';
  document.getElementById('daily-desc').textContent = def.desc;
  banner.classList.toggle('done', done);
}
function buildProfileScreen(){
  const st = SAVE.stats;
  let favId=null, favCount=-1;
  Object.entries(st.raceCountByShip||{}).forEach(([id,count])=>{
    if(count>favCount){ favCount=count; favId=id; }
  });
  const favSkin = SKINS.find(s=>s.id===favId) || SKINS[0];
  const cv=document.getElementById('profile-fav-canvas');
  const g=cv.getContext('2d'); g.imageSmoothingEnabled=false;
  g.clearRect(0,0,cv.width,cv.height);
  g.save(); g.translate(cv.width/2, cv.height/2);
  drawShipMatrix(g, favSkin.shape, favSkin.colors, 4.6*favSkin.scale);
  g.restore();
  document.getElementById('profile-fav-name').textContent = favId ? favSkin.name+' ('+favCount+' гонок)' : 'Ещё не выбран';

  const statsEl=document.getElementById('profile-stats');
  const rows=[
    ['Гонок сыграно', st.totalRaces],
    ['Побед', st.wins],
    ['Пройдено', (st.totalDistance/1000).toFixed(1)+' км'],
    ['Заработано всего', '₡ '+st.totalCreditsEarned],
    ['Ящиков разбито', st.totalObstaclesDestroyed],
    ['Обгонов', st.totalOvertakes],
    ['Опасных пролётов', st.totalNearMisses],
  ];
  statsEl.innerHTML='';
  rows.forEach(([label,val])=>{
    const row=document.createElement('div'); row.className='profile-stat-row';
    row.innerHTML = '<span>'+label+'</span><b>'+val+'</b>';
    statsEl.appendChild(row);
  });

  document.getElementById('achievements-title').textContent = 'Ачивки '+SAVE.achievements.length+'/'+ACHIEVEMENTS.length;
  const listEl=document.getElementById('achievements-list');
  listEl.innerHTML='';
  ACHIEVEMENTS.forEach(a=>{
    const unlocked = SAVE.achievements.includes(a.id);
    const item=document.createElement('div'); item.className='achievement-item '+(unlocked?'unlocked':'locked');
    const icon=document.createElement('div'); icon.className='achievement-icon';
    const text=document.createElement('div'); text.className='achievement-text';
    text.innerHTML = '<div class="achievement-name">'+a.name+'</div><div class="achievement-desc">'+a.desc+'</div>';
    const reward=document.createElement('div'); reward.className='achievement-reward'; reward.textContent='+'+a.reward+'₡';
    item.appendChild(icon); item.appendChild(text); item.appendChild(reward);
    listEl.appendChild(item);
  });
}
document.getElementById('settings-back').addEventListener('click', ()=>{
  playSfx('ui');
  settingsScreen.classList.add('hidden');
  currencyBadge.classList.remove('hidden');
  modeScreen.classList.remove('hidden'); refreshDailyBanner();
});

/* ---------------- App update (Android build only) ---------------- */
const UPDATE_REPO='Rachind/flixin';
const updateRow=document.getElementById('update-row');
const updateBtn=document.getElementById('update-btn');
const updateStatus=document.getElementById('update-status');
let updateApkUrl=null;

function isNativeApp(){
  return !!(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform());
}
document.getElementById('app-version').textContent = APP_BUILD ? '#'+APP_BUILD : 'dev';
updateRow.classList.toggle('hidden', !isNativeApp());

async function checkForUpdate(){
  updateBtn.disabled=true;
  updateStatus.textContent='Проверяю…';
  try{
    const res=await fetch('https://api.github.com/repos/'+UPDATE_REPO+'/releases/latest', {cache:'no-store'});
    if(!res.ok) throw new Error('HTTP '+res.status);
    const rel=await res.json();
    const m=/^build-(\d+)$/.exec(rel.tag_name||'');
    const apk=(rel.assets||[]).find(a=>/\.apk$/i.test(a.name));
    const latest=m ? parseInt(m[1],10) : 0;
    if(apk && latest>APP_BUILD){
      updateApkUrl=apk.browser_download_url;
      updateStatus.textContent='Доступна версия #'+latest+'. После скачивания откройте файл и нажмите «Обновить» — прогресс сохранится.';
      updateBtn.textContent='Скачать';
    }else{
      updateStatus.textContent='У вас последняя версия';
    }
  }catch(e){
    updateStatus.textContent='Не удалось проверить. Есть интернет?';
  }
  updateBtn.disabled=false;
}
updateBtn.addEventListener('click', ()=>{
  playSfx('ui');
  if(updateApkUrl){
    persistSave();
    // Capacitor hands navigation to external hosts over to the system browser, which downloads the APK.
    window.location.href=updateApkUrl;
  }else{
    checkForUpdate();
  }
});
