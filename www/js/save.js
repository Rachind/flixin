"use strict";

/* ---------------- Persistence (localStorage, with graceful fallback) ---------------- */
const STORAGE_KEY = 'flixin_save_v2';
function defaultSave(){
  const owned={};
  SKINS.forEach(s=>{ owned[s.id] = (s.price===0); });
  return {
    credits:180, owned, selectedSkin:'arrow', selectedTrack:0, bots:2, lastAiBots:2,
    bestTimes:{}, bestGhosts:{}, seenTutorial:false, customTracks:[],
    settings:{ musicVol:0.6, sfxVol:0.8, joySize:130, sensitivity:1.0, reduceShake:false },
    stats:{ totalRaces:0, totalDistance:0, totalCreditsEarned:0, totalObstaclesDestroyed:0,
            totalOvertakes:0, totalNearMisses:0, wins:0, raceCountByShip:{}, arenaWins:0, arenaWinStreak:0 },
    achievements:[], dailyChallenge:null, upgrades:{}, appearance:{}, hullColor:{}, claimedGifts:[],
    pvpDifficulty:'normal',
  };
}
let SAVE = defaultSave();

async function loadSave(){
  let raw = null;
  try{ raw = window.localStorage ? localStorage.getItem(STORAGE_KEY) : null; }catch(e){ raw = null; }
  if(!raw){ SAVE = defaultSave(); return; }
  try{
    {
      const parsed = JSON.parse(raw);
      const base = defaultSave();
      SAVE = Object.assign(base, parsed);
      SAVE.owned = Object.assign(base.owned, parsed.owned||{});
      SAVE.bestTimes = Object.assign({}, parsed.bestTimes||{});
      SAVE.bestGhosts = Object.assign({}, parsed.bestGhosts||{});
      SAVE.settings = Object.assign(base.settings, parsed.settings||{});
      SAVE.customTracks = Array.isArray(parsed.customTracks) ? parsed.customTracks : [];
      SAVE.stats = Object.assign(base.stats, parsed.stats||{});
      SAVE.stats.raceCountByShip = Object.assign({}, (parsed.stats||{}).raceCountByShip||{});
      SAVE.achievements = Array.isArray(parsed.achievements) ? parsed.achievements : [];
      SAVE.dailyChallenge = parsed.dailyChallenge || null;
      SAVE.upgrades = parsed.upgrades || {};
      SAVE.appearance = parsed.appearance || {};
      SAVE.hullColor = parsed.hullColor || {};
      SAVE.claimedGifts = Array.isArray(parsed.claimedGifts) ? parsed.claimedGifts : [];
    }
  }catch(e){ /* corrupt save -> keep defaults */ }
}
async function persistSave(){
  try{ if(window.localStorage) localStorage.setItem(STORAGE_KEY, JSON.stringify(SAVE)); }catch(e){ /* ignore (private mode / quota) */ }
}

/* ---------------- One-time gifts (dev bonuses that grant credits exactly once) ---------------- */
const ONE_TIME_GIFTS = [
  { id:'tima_bonus_2026_09_19', amount:600, label:'Бонус: +600 ₡' },
];
function grantPendingGifts(){
  if(!Array.isArray(SAVE.claimedGifts)) SAVE.claimedGifts=[];
  let total=0, lastLabel='';
  ONE_TIME_GIFTS.forEach(gift=>{
    if(!SAVE.claimedGifts.includes(gift.id)){
      SAVE.claimedGifts.push(gift.id);
      SAVE.credits += gift.amount;
      total += gift.amount;
      lastLabel = gift.label;
    }
  });
  if(total>0){ persistSave(); showToast(ONE_TIME_GIFTS.length===1?lastLabel:('Бонус: +'+total+' ₡')); }
}
function showToast(text){
  const t=document.createElement('div');
  t.className='gift-toast';
  t.textContent=text;
  document.body.appendChild(t);
  requestAnimationFrame(()=>t.classList.add('show'));
  setTimeout(()=>{ t.classList.remove('show'); setTimeout(()=>t.remove(), 400); }, 2600);
}
function updateCurrencyBadge(){
  document.getElementById('currency-value').textContent = SAVE.credits;
  document.querySelectorAll('.cur-val').forEach(el=>{ el.textContent = SAVE.credits; });
}
