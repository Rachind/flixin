"use strict";

/* ---------------- Logo (pixel monogram) ---------------- */
const LOGO_GRID = [
".DDMMMP......",
".DMDDDD......",
".MDD.....PPU.",
".DMD......PU.",
".DDMMMMC.....",
".DMDDDDC.U...",
".MDD..PC.U...",
".DMD..PC.U...",
".DDM..PCUU...",
".DMD..PCUU...",
".PDD..PCUU...",
];
const LOGO_COLORS = { D:'#0d9488', M:'#4de8c0', P:'#d8fbff', C:'#00e5ff', U:'#4da6ff' };
function renderLogo(){
  ['logo-canvas','logo-canvas-splash'].forEach(id=>{
    const cv=document.getElementById(id);
    if(!cv) return;
    const g=cv.getContext('2d');
    g.imageSmoothingEnabled=false;
    g.clearRect(0,0,cv.width,cv.height);
    const cell=cv.width/13;
    const gw=13*cell, gh=11*cell;
    drawPixelGrid(g, LOGO_GRID, LOGO_COLORS, cell, (cv.width-gw)/2, (cv.height-gh)/2);
  });
}

/* ---------------- Joystick pixel sprites ---------------- */
const JOY_BASE_GRID = [
"......................",
"........RRRRRR........",
"......RRRRRRRRRR......",
".....RRRRRRRRRRRR.....",
"....RRRR......RRRR....",
"...RRR..........RRR...",
"..RRR............RRR..",
"..RRR............RRR..",
".RRR..............RRR.",
".RRR..............RRR.",
".RRR..............RRR.",
".RRR..............RRR.",
".RRR..............RRR.",
".RRR..............RRR.",
"..RRR............RRR..",
"..RRR............RRR..",
"...RRR..........RRR...",
"....RRRR......RRRR....",
".....RRRRRRRRRRRR.....",
"......RRRRRRRRRR......",
"........RRRRRR........",
"......................",
];
const JOY_KNOB_GRID = [
".............",
"....KKKKK....",
"..KKKHHHKKK..",
"..KKHHHHHKK..",
".KKHHHHHHHKK.",
".KHHHHHHHHHK.",
".KHHHHHHHHHK.",
".KHHHHHHHHHK.",
".KKHHHHHHHKK.",
"..KKHHHHHKK..",
"..KKKHHHKKK..",
"....KKKKK....",
".............",
];
function renderJoystickSprites(){
  const bc=document.getElementById('joy-base-canvas');
  const bg=bc.getContext('2d'); bg.imageSmoothingEnabled=false;
  drawPixelGrid(bg, JOY_BASE_GRID, {R:'#3ddbd0'}, 1, 0, 0);
  const kc=document.getElementById('joy-knob-canvas');
  const kg=kc.getContext('2d'); kg.imageSmoothingEnabled=false;
  drawPixelGrid(kg, JOY_KNOB_GRID, {K:'#1c9e94', H:'#bdf6f0'}, 1, 0, 0);
}
renderJoystickSprites();
