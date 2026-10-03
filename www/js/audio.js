"use strict";

/* ---------------- Audio engine (synthesised, except the looped in-race music track) ---------------- */
let audioCtx=null, masterGain, musicGain, sfxGain;
let engineOsc=null, engineFilter=null, engineGain=null;
function ensureAudio(){
  if(audioCtx) return true;
  try{
    audioCtx = new (window.AudioContext||window.webkitAudioContext)();
    masterGain = audioCtx.createGain(); masterGain.gain.value=1; masterGain.connect(audioCtx.destination);
    musicGain = audioCtx.createGain(); musicGain.gain.value=SAVE.settings.musicVol; musicGain.connect(masterGain);
    sfxGain = audioCtx.createGain(); sfxGain.gain.value=SAVE.settings.sfxVol; sfxGain.connect(masterGain);
    return true;
  }catch(e){ return false; }
}
function resumeAudio(){ if(ensureAudio() && audioCtx.state==='suspended'){ audioCtx.resume().catch(()=>{}); } }
['pointerdown','touchstart','keydown'].forEach(evt=>window.addEventListener(evt, resumeAudio, {passive:true}));

function noiseBuffer(duration){
  const rate=audioCtx.sampleRate;
  const buf=audioCtx.createBuffer(1, Math.max(1,Math.floor(rate*duration)), rate);
  const data=buf.getChannelData(0);
  for(let i=0;i<data.length;i++) data[i]=Math.random()*2-1;
  return buf;
}
function playTone(freq, duration, type, gainVal, glideTo){
  if(!ensureAudio()) return;
  const t0=audioCtx.currentTime;
  const osc=audioCtx.createOscillator();
  osc.type=type||'sine';
  osc.frequency.setValueAtTime(freq, t0);
  if(glideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20,glideTo), t0+duration);
  const g=audioCtx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.001,gainVal), t0+0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0+duration);
  osc.connect(g); g.connect(sfxGain);
  osc.start(t0); osc.stop(t0+duration+0.02);
}
function playNoiseBurst(duration, filterFreq, gainVal){
  if(!ensureAudio()) return;
  const t0=audioCtx.currentTime;
  const src=audioCtx.createBufferSource();
  src.buffer=noiseBuffer(duration);
  const filt=audioCtx.createBiquadFilter();
  filt.type='bandpass'; filt.frequency.value=filterFreq; filt.Q.value=0.9;
  const g=audioCtx.createGain();
  g.gain.setValueAtTime(gainVal, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0+duration);
  src.connect(filt); filt.connect(g); g.connect(sfxGain);
  src.start(t0); src.stop(t0+duration+0.02);
}
function playSfx(type){
  if(!ensureAudio()) return;
  if(audioCtx.state==='suspended'){ audioCtx.resume().catch(()=>{}); }
  switch(type){
    case 'ui': playTone(740,0.05,'square',0.05); break;
    case 'boost': playTone(300,0.35,'sawtooth',0.09,900); break;
    case 'wallhit': playNoiseBurst(0.12, 900, 0.16); break;
    case 'crash': playNoiseBurst(0.22, 260, 0.24); playTone(90,0.22,'triangle',0.14,50); break;
    case 'explode': playNoiseBurst(0.7, 180, 0.32); playTone(120,0.6,'sawtooth',0.12,30); setTimeout(()=>playNoiseBurst(0.4, 600, 0.14),90); break;
    case 'crateBreak': playNoiseBurst(0.16, 2200, 0.14); playTone(1200,0.1,'square',0.05,1800); break;
    case 'trick': playTone(880,0.09,'square',0.06,1320); setTimeout(()=>playTone(1320,0.12,'square',0.045),70); break;
    case 'countdown': playTone(520,0.12,'square',0.07); break;
    case 'go': playTone(880,0.28,'square',0.09,1400); break;
    case 'finish': playTone(660,0.15,'square',0.07,990); setTimeout(()=>playTone(990,0.25,'square',0.07,1320),120); break;
    case 'newbest': playTone(660,0.1,'square',0.07,1320); setTimeout(()=>playTone(990,0.1,'square',0.07,1760),90); setTimeout(()=>playTone(1320,0.2,'square',0.07,2200),180); break;
    case 'laser': playTone(1100,0.07,'sawtooth',0.06,1900); break;
    case 'hit': playNoiseBurst(0.14, 1400, 0.18); playTone(220,0.12,'triangle',0.1,120); break;
    case 'shieldBlock': playTone(500,0.08,'square',0.08,900); break;
    case 'shieldUp': playTone(700,0.1,'triangle',0.08,1400); setTimeout(()=>playTone(1050,0.12,'triangle',0.07,1600),80); break;
  }
}
function startEngineSound(){
  if(!ensureAudio() || engineOsc) return;
  engineOsc = audioCtx.createOscillator();
  engineOsc.type='sawtooth'; engineOsc.frequency.value=60;
  engineFilter = audioCtx.createBiquadFilter();
  engineFilter.type='lowpass'; engineFilter.frequency.value=400;
  engineGain = audioCtx.createGain(); engineGain.gain.value=0;
  engineOsc.connect(engineFilter); engineFilter.connect(engineGain); engineGain.connect(sfxGain);
  engineOsc.start();
}
function stopEngineSound(){
  if(!engineOsc) return;
  try{
    engineGain.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 0.04);
    engineOsc.stop(audioCtx.currentTime+0.25);
  }catch(e){}
  engineOsc=null; engineFilter=null; engineGain=null;
}
function updateEngineSound(speed, maxSpeed){
  if(!engineOsc) return;
  const t=clamp(speed/Math.max(1,maxSpeed),0,1.3);
  engineOsc.frequency.setTargetAtTime(50+t*140, audioCtx.currentTime, 0.06);
  engineFilter.frequency.setTargetAtTime(300+t*1500, audioCtx.currentTime, 0.06);
  engineGain.gain.setTargetAtTime(0.05+t*0.10, audioCtx.currentTime, 0.1);
}

const MUSIC_SCALES = {
  menu:  {notes:[261.63,329.63,392.00,440,523.25], tempo:0.5, wave:'triangle'},
};
/* In-race music is a looped mp3 played through a plain <audio> element (not routed into
   the WebAudio graph: createMediaElementSource outputs silence for file:// pages), so its
   volume is set directly from the music slider, scaled down to sit under the SFX. */
const RACE_MUSIC_SRC = 'audio/race.mp3';
const RACE_MUSIC_LEVEL = 0.25;
let raceMusic=null;
function raceMusicVolume(){ return Math.min(1, SAVE.settings.musicVol*RACE_MUSIC_LEVEL); }
function startRaceMusic(){
  if(!raceMusic){ raceMusic = new Audio(RACE_MUSIC_SRC); raceMusic.loop = true; raceMusic.preload = 'auto'; }
  raceMusic.volume = raceMusicVolume();
  raceMusic.currentTime = 0;
  raceMusic.play().catch(()=>{});
}
function stopRaceMusic(){ if(raceMusic) raceMusic.pause(); }
document.addEventListener('visibilitychange', ()=>{
  if(!raceMusic || currentMusicKey!=='race') return;
  if(document.hidden) raceMusic.pause(); else raceMusic.play().catch(()=>{});
});
let musicScheduler=null, musicNoteIdx=0, currentMusicKey=null;
function playMusicNote(freq, duration, wave){
  if(!audioCtx) return;
  const t0=audioCtx.currentTime;
  const osc=audioCtx.createOscillator();
  osc.type=wave; osc.frequency.value=freq;
  const g=audioCtx.createGain();
  g.gain.setValueAtTime(0.0001,t0);
  g.gain.exponentialRampToValueAtTime(0.05, t0+0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0+duration);
  osc.connect(g); g.connect(musicGain);
  osc.start(t0); osc.stop(t0+duration+0.05);
}
function startMusic(key){
  if(!ensureAudio()) return;
  if(currentMusicKey===key && (musicScheduler || key==='race')) return;
  stopMusic();
  currentMusicKey=key;
  if(key==='race'){ startRaceMusic(); return; }
  const scale = MUSIC_SCALES[key]||MUSIC_SCALES.menu;
  musicNoteIdx=0;
  const step=()=>{
    const octave = Math.floor(musicNoteIdx/scale.notes.length)%2===0?1:0.5;
    const freq = scale.notes[musicNoteIdx % scale.notes.length]*octave;
    playMusicNote(freq, scale.tempo*0.9, scale.wave);
    musicNoteIdx++;
  };
  step();
  musicScheduler = setInterval(step, scale.tempo*1000);
}
function stopMusic(){
  if(musicScheduler){ clearInterval(musicScheduler); musicScheduler=null; }
  stopRaceMusic();
  currentMusicKey=null;
}
function applyAudioSettings(){
  if(raceMusic) raceMusic.volume = raceMusicVolume();
  if(!audioCtx) return;
  musicGain.gain.value = SAVE.settings.musicVol;
  sfxGain.gain.value = SAVE.settings.sfxVol;
}
/* Inside the Android app navigator.vibrate does nothing in the WebView, so go through the
   native @capacitor/haptics plugin there. It only takes a single duration, so patterns
   ([on, off, on, ...]) are played as a chain of timed pulses. */
let hapticTimers = [];
function nativeHapticsAvailable(){
  return !!(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform()
    && Capacitor.nativePromise);
}
function nativeVibrate(ms){
  try{ Capacitor.nativePromise('Haptics', 'vibrate', {duration: Math.max(1, Math.round(ms))}).catch(()=>{}); }catch(e){}
}
function hapticPulse(ms){
  if(nativeHapticsAvailable()){
    for(const t of hapticTimers) clearTimeout(t);
    hapticTimers = [];
    if(!Array.isArray(ms)){ nativeVibrate(ms); return; }
    let at = 0;
    ms.forEach((d, i)=>{
      if(i%2===0 && d>0) hapticTimers.push(setTimeout(()=>nativeVibrate(d), at));
      at += d;
    });
    return;
  }
  try{ if(navigator.vibrate) navigator.vibrate(ms); }catch(e){}
}
