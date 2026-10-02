"use strict";

/* ---------------- Track system (generic math) ---------------- */
const TRACK_HALF_WIDTH = 130;
const DIRS = { R:{x:1,y:0}, L:{x:-1,y:0}, D:{x:0,y:1}, U:{x:0,y:-1} };

function buildTrack(def){
  const waypoints=[{x:0,y:0}];
  const dirs=[], normals=[], lengths=[], cum=[0];
  let cur={x:0,y:0};
  for(const seg of def){
    const d=DIRS[seg[0]];
    const length=seg[1];
    const next={x:cur.x+d.x*length, y:cur.y+d.y*length};
    dirs.push(d);
    normals.push({x:-d.y, y:d.x});
    lengths.push(length);
    waypoints.push(next);
    cum.push(cum[cum.length-1]+length);
    cur=next;
  }
  return {waypoints, dirs, normals, lengths, cum, totalLength: cum[cum.length-1]};
}

function trackPointAt(s){
  s = clamp(s, 0, TOTAL_LENGTH);
  let i = TRACK.lengths.length-1;
  for(let k=0;k<TRACK.lengths.length;k++){
    if(s <= TRACK.cum[k+1] + 0.001){ i=k; break; }
  }
  const t = s - TRACK.cum[i];
  const wp = TRACK.waypoints[i];
  const d = TRACK.dirs[i];
  return { pos:{x:wp.x+d.x*t, y:wp.y+d.y*t}, dir:d, normal:TRACK.normals[i], segIndex:i, t };
}

function projectToTrack(px,py){
  let best=null;
  for(let i=0;i<TRACK.lengths.length;i++){
    const wp=TRACK.waypoints[i], d=TRACK.dirs[i], len=TRACK.lengths[i];
    const lx=px-wp.x, ly=py-wp.y;
    const tproj = lx*d.x + ly*d.y;
    const tclamped = clamp(tproj,0,len);
    const cxp = wp.x+d.x*tclamped, cyp = wp.y+d.y*tclamped;
    const dist = Math.hypot(px-cxp, py-cyp);
    if(!best || dist<best.dist){
      const n = TRACK.normals[i];
      const lateral = lx*n.x + ly*n.y;
      best = {dist, segIndex:i, progress: TRACK.cum[i]+tclamped, lateral, tproj};
    }
  }
  return best;
}

/* ---------------- Track catalogue ---------------- */
/* Obstacles are placed deliberately: wall-hugging "pylons" (indestructible)
   and "crates" (destructible) that read as structural parts of the tunnel,
   arranged as slaloms (alternating sides) and gates (paired, same s,
   opposite sides leaving a safe central lane) instead of scattered randomly. */
const TRACKS = [
  {
    id:'nebula', name:'Туманность', tagline:'Лёгкая · знакомая трасса',
    theme:{ floor:'#121a28', wall:'#2a3a44', glow:'rgba(79,216,208,0.35)', glass:'rgba(120,210,230,0.22)', turb:'255,90,60' },
    def:[['R',1800],['D',1200],['R',1500],['U',1400],['R',2000]],
    turbulence:[{start:2000,end:2700},{start:5000,end:5600}],
    obstacles:[
      {s:400,  offset:-96, r:26, destructible:true},
      {s:650,  offset: 96, r:28, destructible:false},
      {s:950,  offset:-96, r:26, destructible:true},
      {s:1300, offset: 96, r:30, destructible:false},
      {s:1650, offset:-92, r:26, destructible:true},
      {s:1650, offset: 92, r:28, destructible:false},
      {s:2150, offset:-96, r:26, destructible:false},
      {s:2450, offset: 96, r:26, destructible:true},
      {s:3400, offset:-96, r:28, destructible:false},
      {s:3750, offset: 96, r:26, destructible:true},
      {s:5150, offset:-96, r:26, destructible:true},
      {s:5450, offset: 96, r:28, destructible:false},
      {s:6400, offset:-92, r:26, destructible:true},
      {s:6750, offset: 92, r:28, destructible:false},
      {s:7150, offset:-90, r:26, destructible:true},
      {s:7150, offset: 90, r:26, destructible:false},
    ],
  },
  {
    id:'canyon', name:'Каньон', tagline:'Сложная · длинная трасса с изломом',
    theme:{ floor:'#1c1712', wall:'#4a382a', glow:'rgba(255,159,67,0.4)', glass:'rgba(255,190,120,0.2)', turb:'255,60,40' },
    def:[['R',1500],['D',1000],['L',1200],['D',1000],['R',2200],['U',1800],['R',1600]],
    turbulence:[{start:1700,end:2300},{start:2800,end:3400},{start:7200,end:8000}],
    obstacles:[
      {s:350,  offset:-96, r:26, destructible:true},
      {s:700,  offset: 96, r:28, destructible:false},
      {s:1100, offset:-96, r:26, destructible:true},
      {s:1900, offset: 96, r:26, destructible:false},
      {s:2200, offset:-96, r:26, destructible:true},
      {s:3000, offset:-92, r:28, destructible:false},
      {s:3300, offset: 92, r:26, destructible:true},
      {s:3550, offset:-90, r:26, destructible:true},
      {s:3550, offset: 90, r:26, destructible:false},
      {s:4100, offset: 96, r:26, destructible:true},
      {s:4450, offset:-96, r:28, destructible:false},
      {s:5100, offset:-96, r:26, destructible:true},
      {s:5500, offset: 96, r:28, destructible:false},
      {s:5900, offset:-96, r:26, destructible:true},
      {s:6300, offset: 96, r:26, destructible:false},
      {s:6650, offset:-90, r:26, destructible:true},
      {s:6650, offset: 90, r:26, destructible:false},
      {s:7400, offset: 96, r:26, destructible:false},
      {s:7800, offset:-96, r:26, destructible:true},
      {s:8300, offset: 96, r:28, destructible:false},
      {s:8900, offset:-96, r:26, destructible:true},
      {s:9300, offset: 96, r:28, destructible:false},
      {s:9700, offset:-90, r:26, destructible:true},
      {s:9700, offset: 90, r:26, destructible:false},
    ],
  },
  {
    id:'core', name:'Ядро', tagline:'Средняя · компактный спринт',
    theme:{ floor:'#181026', wall:'#3a2a4a', glow:'rgba(255,93,162,0.4)', glass:'rgba(220,150,255,0.2)', turb:'220,60,255' },
    def:[['R',1200],['D',800],['R',1000],['D',800],['L',900],['U',1600],['R',1400]],
    turbulence:[{start:1350,end:1850},{start:3900,end:4500},{start:5000,end:5800}],
    obstacles:[
      {s:300,  offset:-92, r:24, destructible:true},
      {s:650,  offset: 92, r:26, destructible:false},
      {s:1000, offset:-92, r:24, destructible:true},
      {s:1550, offset: 92, r:24, destructible:false},
      {s:2300, offset:-92, r:26, destructible:true},
      {s:2700, offset: 92, r:24, destructible:false},
      {s:2950, offset:-88, r:24, destructible:true},
      {s:2950, offset: 88, r:24, destructible:false},
      {s:3400, offset:-92, r:26, destructible:false},
      {s:4100, offset: 92, r:24, destructible:true},
      {s:4450, offset:-92, r:26, destructible:false},
      {s:5100, offset: 92, r:24, destructible:true},
      {s:5500, offset:-92, r:26, destructible:false},
      {s:6000, offset: 92, r:24, destructible:true},
      {s:6600, offset:-92, r:26, destructible:false},
      {s:6950, offset: 92, r:24, destructible:true},
      {s:7350, offset:-88, r:24, destructible:true},
      {s:7350, offset: 88, r:24, destructible:false},
    ],
  },
  {
    id:'void', name:'Пустота', tagline:'Сложная · семь поворотов в темноте',
    theme:{ floor:'#0a0d18', wall:'#1a3a6e', glow:'rgba(90,150,255,0.45)', glass:'rgba(140,180,255,0.22)', turb:'80,140,255' },
    def:[['R',1000],['U',900],['R',1400],['D',1600],['R',1200],['U',1000],['R',1800]],
    turbulence:[{start:1150,end:1650},{start:3500,end:4300},{start:6250,end:6850}],
    obstacles:[
      {s:250,  offset:-92, r:24, destructible:true},
      {s:600,  offset: 92, r:26, destructible:false},
      {s:1300, offset:-92, r:24, destructible:false},
      {s:1600, offset: 92, r:24, destructible:true},
      {s:2100, offset:-96, r:26, destructible:true},
      {s:2500, offset: 96, r:28, destructible:false},
      {s:2900, offset:-90, r:26, destructible:true},
      {s:2900, offset: 90, r:26, destructible:false},
      {s:3700, offset:-96, r:26, destructible:false},
      {s:4100, offset: 96, r:26, destructible:true},
      {s:4600, offset:-92, r:26, destructible:false},
      {s:5200, offset: 92, r:24, destructible:true},
      {s:5600, offset:-92, r:26, destructible:false},
      {s:6400, offset: 92, r:24, destructible:true},
      {s:6800, offset:-92, r:26, destructible:false},
      {s:7400, offset: 92, r:24, destructible:true},
      {s:7800, offset:-92, r:26, destructible:false},
      {s:8200, offset:-88, r:24, destructible:true},
      {s:8200, offset: 88, r:24, destructible:false},
    ],
  },
  {
    id:'storm', name:'Шторм', tagline:'Сложная · извилистый грозовой каньон',
    theme:{ floor:'#151d10', wall:'#4a5a1a', glow:'rgba(180,230,60,0.4)', glass:'rgba(220,240,140,0.2)', turb:'220,220,40' },
    def:[['R',1300],['D',700],['R',900],['U',1300],['L',1100],['D',900],['R',2400]],
    turbulence:[{start:1400,end:1900},{start:3100,end:3700},{start:5450,end:6000}],
    obstacles:[
      {s:300,  offset:-92, r:24, destructible:true},
      {s:650,  offset: 92, r:26, destructible:false},
      {s:1000, offset:-92, r:24, destructible:true},
      {s:1650, offset: 92, r:24, destructible:false},
      {s:2250, offset:-92, r:26, destructible:true},
      {s:2600, offset: 92, r:24, destructible:false},
      {s:3300, offset:-96, r:26, destructible:true},
      {s:3650, offset: 96, r:26, destructible:false},
      {s:4000, offset:-90, r:24, destructible:true},
      {s:4000, offset: 90, r:24, destructible:false},
      {s:4500, offset:-92, r:26, destructible:false},
      {s:4900, offset: 92, r:24, destructible:true},
      {s:5600, offset:-92, r:24, destructible:true},
      {s:5950, offset: 92, r:26, destructible:false},
      {s:6600, offset:-92, r:24, destructible:true},
      {s:7000, offset: 92, r:26, destructible:false},
      {s:7400, offset:-92, r:24, destructible:true},
      {s:7800, offset: 92, r:26, destructible:false},
      {s:8200, offset:-88, r:24, destructible:true},
      {s:8200, offset: 88, r:24, destructible:false},
    ],
  },
];

/* ---------------- Custom (player-made) tracks ----------------
   Auto-generates the same kind of "logical" obstacle placement used for the
   built-in tracks (wall-hugging slalom + paired gates) for any segment list
   the level editor produces, plus a couple of turbulence zones. */
function segPointDist(px,py, ax,ay,bx,by){
  const dx=bx-ax, dy=by-ay;
  const len2=dx*dx+dy*dy;
  let t = len2>0 ? ((px-ax)*dx+(py-ay)*dy)/len2 : 0;
  t = clamp(t,0,1);
  const cx=ax+dx*t, cy=ay+dy*t;
  return Math.hypot(px-cx,py-cy);
}
function segSegDist(a1,a2,b1,b2){
  return Math.min(
    segPointDist(a1.x,a1.y, b1.x,b1.y,b2.x,b2.y),
    segPointDist(a2.x,a2.y, b1.x,b1.y,b2.x,b2.y),
    segPointDist(b1.x,b1.y, a1.x,a1.y,a2.x,a2.y),
    segPointDist(b2.x,b2.y, a1.x,a1.y,a2.x,a2.y)
  );
}
/* Rejects tracks whose tunnel would cross or run alongside itself: since a
   ship's position is resolved by "closest point on the whole track", any two
   non-adjacent segments that pass within a tunnel-width of each other make
   that resolution ambiguous and the race can get stuck. */
function defHasOverlap(def){
  if(def.length<2) return false;
  const built = buildTrack(def);
  const wp = built.waypoints;
  const n = wp.length-1;
  for(let i=0;i<n;i++){
    for(let j=i+2;j<n;j++){
      const d = segSegDist(wp[i],wp[i+1], wp[j],wp[j+1]);
      if(d < TRACK_HALF_WIDTH*2.15) return true;
    }
  }
  return false;
}
function autoGenerateObstacles(def){
  const built = buildTrack(def);
  const total = built.totalLength;
  const obstacles=[];
  let side=-1, s=320, idx=0;
  while(s < total-320){
    if(idx%4===3){
      obstacles.push({s, offset:-90, r:26, destructible:true});
      obstacles.push({s, offset:90, r:26, destructible:false});
    } else {
      const destructible = idx%2===0;
      obstacles.push({s, offset:side*92, r:destructible?26:28, destructible});
      side*=-1;
    }
    idx++;
    s += 380 + (idx%3===0?100:0);
  }
  return obstacles;
}
function autoGenerateTurbulence(def){
  const built = buildTrack(def);
  const zones=[];
  for(let i=1;i<built.lengths.length-1;i+=2){
    const segStart=built.cum[i], segLen=built.lengths[i];
    if(segLen<500) continue;
    zones.push({start:Math.round(segStart+segLen*0.28), end:Math.round(segStart+segLen*0.72)});
  }
  return zones;
}
const EDITOR_THEMES = [
  { key:'teal',   floor:'#121a28', wall:'#2a3a44', glow:'rgba(79,216,208,0.35)',  glass:'rgba(120,210,230,0.22)', turb:'255,90,60',  swatch:'#3ddbd0' },
  { key:'orange', floor:'#1c1712', wall:'#4a382a', glow:'rgba(255,159,67,0.4)',   glass:'rgba(255,190,120,0.2)',  turb:'255,60,40',  swatch:'#ff8c42' },
  { key:'purple', floor:'#181026', wall:'#3a2a4a', glow:'rgba(255,93,162,0.4)',   glass:'rgba(220,150,255,0.2)',  turb:'220,60,255', swatch:'#c77dff' },
  { key:'blue',   floor:'#0a0d18', wall:'#1a3a6e', glow:'rgba(90,150,255,0.45)',  glass:'rgba(140,180,255,0.22)', turb:'80,140,255', swatch:'#5aa8ff' },
  { key:'green',  floor:'#151d10', wall:'#4a5a1a', glow:'rgba(180,230,60,0.4)',   glass:'rgba(220,240,140,0.2)',  turb:'220,220,40', swatch:'#b4e63c' },
];
function getAllTracks(){ return [...TRACKS, ...(SAVE.customTracks||[])]; }

let selectedTrackIdx = 0;
let TRACK, TOTAL_LENGTH, TURBULENCE_ZONES, OBSTACLE_DEFS, TRACK_THEME;

function loadTrackByIndex(idx){
  const all = getAllTracks();
  idx = clamp(idx, 0, all.length-1);
  selectedTrackIdx = idx;
  const t = all[idx];
  TRACK = buildTrack(t.def);
  TOTAL_LENGTH = TRACK.totalLength;
  TURBULENCE_ZONES = t.turbulence;
  OBSTACLE_DEFS = t.obstacles;
  TRACK_THEME = t.theme;
  resetObstacles();
  rebuildBoundaries();
}

function turbulenceAt(s){
  for(const z of TURBULENCE_ZONES) if(s>=z.start && s<=z.end) return z;
  return null;
}

/* ---------------- Track boundary geometry (continuous, rounded corners) ----------------
   Each segment's wall used to be drawn as an independent rectangle, so at every turn two
   rectangles simply overlapped ("two pipes glued together"). Instead we now trace the
   left/right tunnel walls as ONE continuous path across the whole track: at every turn we
   compute the exact corner where the two straight offset-lines would meet, then round that
   vertex off with arcTo so the bend reads as a real curved elbow. */
const CORNER_RADIUS = Math.min(TRACK_HALF_WIDTH*0.6, 78);

function offsetLineConst(segIdx, hwSigned){
  const wp=TRACK.waypoints[segIdx], n=TRACK.normals[segIdx], d=TRACK.dirs[segIdx];
  if(d.y===0) return {axis:'y', value: wp.y + n.y*hwSigned};
  return {axis:'x', value: wp.x + n.x*hwSigned};
}
function cornerPoint(segA, segB, hwSigned){
  const dA=TRACK.dirs[segA], dB=TRACK.dirs[segB];
  const a=offsetLineConst(segA,hwSigned), b=offsetLineConst(segB,hwSigned);
  if(a.axis==='y' && b.axis==='x') return {x:b.value, y:a.value};
  if(a.axis==='x' && b.axis==='y') return {x:a.value, y:b.value};
  // same axis: a straight continuation (R->R, U->U, ...) just carries the
  // shared offset forward with no bend needed.
  if(dA.x===dB.x && dA.y===dB.y){
    const wp=TRACK.waypoints[segA+1];
    const n=TRACK.normals[segA];
    return {x:wp.x+n.x*hwSigned, y:wp.y+n.y*hwSigned};
  }
  // exact reversal - the editor blocks this, but fall back to the raw waypoint
  const wp=TRACK.waypoints[segA+1];
  return {x:wp.x, y:wp.y};
}
function buildBoundaryPts(hwSigned){
  const N=TRACK.waypoints.length;
  const pts=[];
  pts.push({x:TRACK.waypoints[0].x+TRACK.normals[0].x*hwSigned, y:TRACK.waypoints[0].y+TRACK.normals[0].y*hwSigned});
  for(let i=1;i<N-1;i++) pts.push(cornerPoint(i-1,i,hwSigned));
  const lastSeg=TRACK.dirs.length-1;
  pts.push({x:TRACK.waypoints[N-1].x+TRACK.normals[lastSeg].x*hwSigned, y:TRACK.waypoints[N-1].y+TRACK.normals[lastSeg].y*hwSigned});
  return pts;
}
function traceRoundedPath(g, pts, radius){
  g.moveTo(pts[0].x, pts[0].y);
  for(let i=1;i<pts.length-1;i++) g.arcTo(pts[i].x, pts[i].y, pts[i+1].x, pts[i+1].y, radius);
  g.lineTo(pts[pts.length-1].x, pts[pts.length-1].y);
}
let leftBoundary=[], rightBoundary=[];
function rebuildBoundaries(){
  leftBoundary = buildBoundaryPts(TRACK_HALF_WIDTH);
  rightBoundary = buildBoundaryPts(-TRACK_HALF_WIDTH);
}

function drawTrackShell(g){
  const theme=TRACK_THEME;
  g.beginPath();
  traceRoundedPath(g, leftBoundary, CORNER_RADIUS);
  g.lineTo(rightBoundary[rightBoundary.length-1].x, rightBoundary[rightBoundary.length-1].y);
  const rev=rightBoundary.slice().reverse();
  for(let i=1;i<rev.length-1;i++) g.arcTo(rev[i].x, rev[i].y, rev[i+1].x, rev[i+1].y, CORNER_RADIUS);
  g.lineTo(rev[rev.length-1].x, rev[rev.length-1].y);
  g.closePath();
  g.fillStyle=theme.floor;
  g.fill();

  g.lineJoin='round';
  g.beginPath(); traceRoundedPath(g, leftBoundary, CORNER_RADIUS);
  g.strokeStyle=theme.wall; g.lineWidth=12; g.stroke();
  g.strokeStyle=theme.glow; g.lineWidth=3; g.stroke();

  g.beginPath(); traceRoundedPath(g, rightBoundary, CORNER_RADIUS);
  g.strokeStyle=theme.wall; g.lineWidth=12; g.stroke();
  g.strokeStyle=theme.glow; g.lineWidth=3; g.stroke();
}

let obstacles = [];
function resetObstacles(){
  obstacles = OBSTACLE_DEFS.map(o=>{
    const tp = trackPointAt(o.s);
    return {
      ...o, alive:true, lastNearMiss:-99,
      x: tp.pos.x + tp.normal.x*o.offset,
      y: tp.pos.y + tp.normal.y*o.offset,
    };
  });
}

/* ---------------- Obstacle sprites (pixel-art, not plain squares) ---------------- */
const CRATE_GRID = [
"KKKKKKKKK",
"KTTTTTTTK",
"KTTWTWTTK",
"KTTTWTTTK",
"KTWTTTWTK",
"KTTTWTTTK",
"KTTWTWTTK",
"KTTTTTTTK",
"KKKKKKKKK",
];
const CRATE_COLORS = { K:'#06231f', T:'#1a5c56', W:'#bdf5ef' };
const PYLON_GRID = [
"KKKKKKKKK",
"KDDYYDDYK",
"KDYYDDYYK",
"KYYDDYYDK",
"KYDDYYDDK",
"KDDYYDDYK",
"KDYYDDYYK",
"KYYDDYYDK",
"KKKKKKKKK",
];
const PYLON_COLORS = { K:'#1a1512', D:'#3a3230', Y:'#ffcc33' };

function drawObstacle(g, o){
  g.save();
  g.translate(o.x, o.y);
  const grid = o.destructible ? CRATE_GRID : PYLON_GRID;
  const colors = o.destructible ? CRATE_COLORS : PYLON_COLORS;
  const cell = (o.r*2)/grid.length;
  drawPixelGridCentered(g, grid, colors, cell);
  if(o.destructible){
    const pulse=0.35+0.3*Math.sin(raceTime*4+o.s);
    g.globalAlpha=pulse;
    g.strokeStyle='#bdf5ef'; g.lineWidth=1.4;
    const half=(grid.length*cell)/2;
    g.strokeRect(-half,-half,half*2,half*2);
    g.globalAlpha=1;
  }
  g.restore();
}
