"use strict";

/* =========================================================================
   FLIXIN — пиксельная 2D космо-гонка
   ========================================================================= */

/* ---------------- Canvas setup ---------------- */
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let DPR = Math.min(window.devicePixelRatio || 1, 2);

const PIXEL_K = 3; // internal-buffer downscale factor -> chunky pixel look
const pixelCanvas = document.createElement('canvas');
const pctx = pixelCanvas.getContext('2d');

function resize(){
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * DPR);
  canvas.height = Math.floor(window.innerHeight * DPR);
  canvas.style.width = window.innerWidth+'px';
  canvas.style.height = window.innerHeight+'px';
  ctx.setTransform(DPR,0,0,DPR,0,0);
  ctx.imageSmoothingEnabled = false;

  pixelCanvas.width = Math.max(1, Math.round(window.innerWidth / PIXEL_K));
  pixelCanvas.height = Math.max(1, Math.round(window.innerHeight / PIXEL_K));
  pctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resize);
resize();

/* ---------------- Utils ---------------- */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
function angleLerp(a,b,t){
  let d=((b-a+Math.PI*3)%(Math.PI*2))-Math.PI;
  return a+d*t;
}
function fmtTime(sec){
  const m=Math.floor(sec/60);
  const s=sec-m*60;
  return String(m).padStart(2,'0')+':'+s.toFixed(1).padStart(4,'0');
}

/* ---------------- Generic pixel-grid drawing ---------------- */
function drawPixelGrid(g, rows, colors, cell, ox, oy){
  for(let r=0;r<rows.length;r++){
    const row=rows[r];
    for(let c=0;c<row.length;c++){
      const ch=row[c];
      if(ch==='.') continue;
      const color=colors[ch];
      if(!color) continue;
      g.fillStyle=color;
      g.fillRect(ox+c*cell-0.4, oy+r*cell-0.4, cell+0.8, cell+0.8);
    }
  }
}
function drawPixelGridCentered(g, rows, colors, cell){
  const H=rows.length, W=rows[0].length;
  drawPixelGrid(g, rows, colors, cell, -(W*cell)/2, -(H*cell)/2);
}
