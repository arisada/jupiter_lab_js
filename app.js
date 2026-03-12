'use strict';

/* ═══════════════ CONSTANTS ═══════════════ */
const G        = 6.674e-11;
const D_JUP_M  = 1.42984e8;
const M_REF    = 1.898e27;
const SAT_IDS  = ['io','europa','ganymede','callisto'];
const SAT_CFG  = {
  io:       {name:'Io',       color:'#ef4444', pMin:20,  pMax:100, pDef:42.5},
  europa:   {name:'Europe',   color:'#60a5fa', pMin:50,  pMax:150, pDef:85  },
  ganymede: {name:'Ganymède', color:'#34d399', pMin:100, pMax:300, pDef:172 },
  callisto: {name:'Callisto', color:'#fb923c', pMin:200, pMax:600, pDef:400 },
};
const CANVAS_RANGE = 15; // D.J. visible each side

/* ═══════════════ STATE ═══════════════ */
let obsCounter  = 0;
let state = {
  observations: [],   // [{id,timeStr,timeHours,positions:{io,eu,ga,ca}}]
  selectedId:   null,
  activeSat:    'io',
  sliders: {          // {period(h), phase(h), amplitude(Dj)}
    io:       {period: (SAT_CFG.io.pMin       + SAT_CFG.io.pMax)       / 2, phase:0, amplitude:1},
    europa:   {period: (SAT_CFG.europa.pMin   + SAT_CFG.europa.pMax)   / 2, phase:0, amplitude:1},
    ganymede: {period: (SAT_CFG.ganymede.pMin + SAT_CFG.ganymede.pMax) / 2, phase:0, amplitude:1},
    callisto: {period: (SAT_CFG.callisto.pMin + SAT_CFG.callisto.pMax) / 2, phase:0, amplitude:1},
  },
  validated: {io:false, europa:false, ganymede:false, callisto:false},
  validA:    {io:null,  europa:null,  ganymede:null,  callisto:null},
  validT:    {io:null,  europa:null,  ganymede:null,  callisto:null},
  charts:    {},
  keplerChart: null,
};

// Drag state
let dragSat   = null;
let pointerDown = false;
let movedPx   = 0;
let downX     = 0;

/* ═══════════════ TIME UTILS ═══════════════ */
function parseTimeStr(str) {
  if (!str || !str.trim()) return null;
  const n = parseFloat(str);
  if (!isNaN(n) && String(n) === str.trim()) return {type:'hours', hours:n};
  const d = new Date(str.trim());
  if (!isNaN(d.getTime())) return {type:'date', date:d};
  return null;
}

function recomputeHours() {
  const dated  = state.observations.filter(o => o._parsed && o._parsed.type === 'date');
  const houred = state.observations.filter(o => o._parsed && o._parsed.type === 'hours');
  if (dated.length > 0) {
    const t0 = Math.min(...dated.map(o => o._parsed.date.getTime()));
    dated.forEach(o => { o.timeHours = (o._parsed.date.getTime() - t0) / 3600000; });
  }
  houred.forEach(o => { o.timeHours = o._parsed.hours; });
  state.observations.filter(o => !o._parsed).forEach(o => { o.timeHours = null; });
}

/* ═══════════════ OBSERVATION MANAGEMENT ═══════════════ */
function makeObs() {
  return {id: obsCounter++, timeStr:'', timeHours:null, _parsed:null,
    positions:{io:0, europa:0, ganymede:0, callisto:0}};
}

function addObs() {
  const obs = makeObs();
  if (state.observations.length > 0) {
    const last = state.observations[state.observations.length - 1];
    if (last._parsed && last._parsed.type === 'date') {
      const newDate = new Date(last._parsed.date.getTime() + 0.5 * 3600000);
      obs._parsed = {type:'date', date: newDate};
      obs.timeStr = newDate.toISOString();
    } else if (last._parsed && last._parsed.type === 'hours') {
      const newH = (last._parsed.hours || 0) + 0.5;
      obs._parsed = {type:'hours', hours: newH};
      obs.timeStr = String(newH);
    }
  }
  state.observations.push(obs);
  recomputeHours();
  selectObs(obs.id);
  renderObsList();
  updateAllCharts();
}

function stepTime(deltah) {
  const obs = getObs();
  if (!obs) return;
  if (obs._parsed && obs._parsed.type === 'date') {
    const newDate = new Date(obs._parsed.date.getTime() + deltah * 3600000);
    obs._parsed = {type:'date', date: newDate};
    obs.timeStr = newDate.toISOString();
    const local = new Date(newDate.getTime() - newDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    document.getElementById('obsDateInput').value  = local;
    document.getElementById('obsHoursInput').value = '';
  } else {
    const current = (obs._parsed && obs._parsed.type === 'hours') ? obs._parsed.hours : 0;
    const newH = Math.max(0, Math.round((current + deltah) * 2) / 2);
    obs._parsed = {type:'hours', hours: newH};
    obs.timeStr = String(newH);
    document.getElementById('obsHoursInput').value = newH;
    document.getElementById('obsDateInput').value  = '';
  }
  recomputeHours(); updateTimeDisplay(); renderObsList(); updateAllCharts();
}

function deleteObs(id) {
  state.observations = state.observations.filter(o => o.id !== id);
  if (state.selectedId === id) {
    state.selectedId = state.observations.length ? state.observations[state.observations.length-1].id : null;
  }
  recomputeHours();
  renderObsList();
  drawCanvas();
  updateAllCharts();
}

function selectObs(id) {
  state.selectedId = id;
  renderObsList();
  const obs = getObs();
  const dateInp  = document.getElementById('obsDateInput');
  const hoursInp = document.getElementById('obsHoursInput');
  dateInp.disabled  = !obs;
  hoursInp.disabled = !obs;
  document.getElementById('stepMinusBtn').disabled = !obs;
  document.getElementById('stepPlusBtn').disabled  = !obs;
  if (obs) {
    if (obs._parsed && obs._parsed.type === 'date') {
      const d = obs._parsed.date;
      const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      dateInp.value  = local;
      hoursInp.value = '';
    } else if (obs._parsed && obs._parsed.type === 'hours') {
      dateInp.value  = '';
      hoursInp.value = obs._parsed.hours;
    } else {
      dateInp.value  = '';
      hoursInp.value = '';
    }
  } else {
    dateInp.value  = '';
    hoursInp.value = '';
  }
  updateTimeDisplay();
  updateObsCounter();
  drawCanvas();
}

function getObs(id) {
  const oid = id !== undefined ? id : state.selectedId;
  return state.observations.find(o => o.id === oid) || null;
}

function navObs(dir) {
  const idx = state.observations.findIndex(o => o.id === state.selectedId);
  if (idx < 0) return;
  const next = idx + dir;
  if (next >= 0 && next < state.observations.length) selectObs(state.observations[next].id);
}

function onDateInput(val) {
  const obs = getObs();
  if (!obs) return;
  document.getElementById('obsHoursInput').value = '';
  obs.timeStr = val;
  obs._parsed = val ? {type:'date', date: new Date(val)} : null;
  recomputeHours();
  updateTimeDisplay();
  renderObsList();
  updateAllCharts();
}

function onHoursInput(val) {
  const obs = getObs();
  if (!obs) return;
  document.getElementById('obsDateInput').value = '';
  obs.timeStr = val;
  const n = parseFloat(val);
  obs._parsed = !isNaN(n) ? {type:'hours', hours:n} : null;
  recomputeHours();
  updateTimeDisplay();
  renderObsList();
  updateAllCharts();
}

function formatDateLabel(d) {
  const yyyy = d.getFullYear();
  const mo   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  const hh   = String(d.getHours()).padStart(2, '0');
  const min  = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mo}-${dd} ${hh}:${min}`;
}


function obsTimeLabel(obs) {
  if (obs._parsed && obs._parsed.type === 'date') return formatDateLabel(obs._parsed.date);
  if (obs.timeHours !== null) return t('obs.time.fmt', {t: obs.timeHours.toFixed(1)});
  return obs.timeStr || t('obs.no.time');
}

function updateTimeDisplay() {
  const obs = getObs();
  const el  = document.getElementById('obsTimeDisplay');
  if (!obs) { el.textContent = ''; return; }
  if (obs._parsed && obs._parsed.type === 'date' && obs.timeHours !== null) {
    el.textContent = `${formatDateLabel(obs._parsed.date)}  (${t('obs.time.fmt', {t: obs.timeHours.toFixed(2)})})`;
  } else if (obs.timeHours !== null) {
    el.textContent = t('obs.time.fmt', {t: obs.timeHours.toFixed(2)});
  } else {
    el.textContent = '';
  }
}

function updateObsCounter() {
  const idx = state.observations.findIndex(o => o.id === state.selectedId);
  document.getElementById('obsCounter').textContent =
    state.observations.length ? `${idx+1} / ${state.observations.length}` : '—';
}

function clearAll() {
  state.observations = [];
  state.selectedId = null;
  document.getElementById('obsDateInput').disabled  = true;
  document.getElementById('obsDateInput').value     = '';
  document.getElementById('obsHoursInput').disabled = true;
  document.getElementById('obsHoursInput').value    = '';
  document.getElementById('stepMinusBtn').disabled  = true;
  document.getElementById('stepPlusBtn').disabled   = true;
  renderObsList();
  drawCanvas();
  updateAllCharts();
}

/* ═══════════════ IMPORT / EXPORT CSV ═══════════════ */
function exportCSV() {
  const lines = ['type,time,io,europa,ganymede,callisto'];
  state.observations.forEach(obs => {
    let type, time;
    if (obs._parsed && obs._parsed.type === 'date') {
      type = 'date';
      time = formatDateLabel(obs._parsed.date);
    } else {
      type = 'hours';
      time = (obs._parsed && obs._parsed.type === 'hours') ? obs._parsed.hours : '';
    }
    const pos = SAT_IDS.map(id => obs.positions[id] !== null ? obs.positions[id] : '').join(',');
    lines.push(`${type},${time},${pos}`);
  });
  const blob = new Blob([lines.join('\n')], {type: 'text/csv'});
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = 'jupiter_observations.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

function importCSV(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const lines = e.target.result.split(/\r?\n/).filter(l => l.trim() && !l.startsWith('type'));
    state.observations = [];
    lines.forEach(line => {
      const parts = line.split(',');
      if (parts.length < 6) return;
      const type = parts[0].trim();
      const time = parts[1].trim();
      const obs  = makeObs();
      if (type === 'date') {
        const m = time.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
        if (m) {
          obs._parsed = {type:'date', date: new Date(+m[1], +m[2]-1, +m[3], +m[4], +m[5])};
          obs.timeStr = time;
        }
      } else {
        const h = parseFloat(time);
        if (!isNaN(h)) {
          obs._parsed = {type:'hours', hours: h};
          obs.timeStr = String(h);
        }
      }
      SAT_IDS.forEach((id, i) => {
        const v = parseFloat(parts[2 + i]);
        obs.positions[id] = isNaN(v) ? null : v;
      });
      state.observations.push(obs);
    });
    recomputeHours();
    if (state.observations.length) selectObs(state.observations[0].id);
    SAT_IDS.forEach(id => setDefaultAmplitude(id));
    renderObsList();
    drawCanvas();
    updateAllCharts();
  };
  reader.readAsText(file);
}

/* ═══════════════ OBS LIST RENDERING ═══════════════ */
function renderObsList() {
  const el = document.getElementById('obsList');
  if (!state.observations.length) {
    el.innerHTML = `<div class="obs-empty">${t('obs.empty')}</div>`;
    updateObsCounter();
    return;
  }
  el.innerHTML = state.observations.map(obs => {
    const tLabel = obsTimeLabel(obs);
    const minis  = SAT_IDS.map(id => {
      const p = obs.positions[id];
      if (p === null) return '';
      const bg = SAT_CFG[id].color + '25';
      return `<span class="obs-mini-val" style="background:${bg};color:${SAT_CFG[id].color}">${p >= 0?'+':''}${p.toFixed(1)}</span>`;
    }).join('');
    const sel = obs.id === state.selectedId ? ' selected' : '';
    return `<div class="obs-item${sel}" onclick="selectObs(${obs.id})">
      <div class="obs-time">${tLabel}</div>
      <div class="obs-mini">${minis}</div>
      <div class="obs-item-actions"><button class="btn-del-obs" onclick="event.stopPropagation();deleteObs(${obs.id})" title="Supprimer">×</button></div>
    </div>`;
  }).join('');
  updateObsCounter();
}

/* ═══════════════ EXAMPLE DATA ═══════════════ */
function loadExample(key) {
  key = key || 'ideal';
  state.observations = [];
  const P = {
    io:       {T:42.5,  A:2.95,  phi:0},
    europa:   {T:85.2,  A:4.69,  phi:Math.PI/4},
    ganymede: {T:171.7, A:7.49,  phi:Math.PI/3},
    callisto: {T:400.5, A:13.17, phi:Math.PI/6},
  };

  let times, noiseFn;
  if (key === 'ideal') {
    // Dense, regular sampling — clean signal
    times   = [0,6,12,18,24,30,36,42,48,54,60,66,72,78,84,90,120,144,168,192,240,288,336,384,432];
    P.io.phi = 0;  P.europa.phi = Math.PI/4;  P.ganymede.phi = Math.PI/3;  P.callisto.phi = Math.PI/6;
    noiseFn = () => 0;
  } else if (key === 'sparse') {
    // 9 irregular observations — different phases so t₀ ≠ ideal
    times   = [0, 53, 107, 178, 240, 303, 372, 445, 510];
    P.io.phi = Math.PI*0.7;  P.europa.phi = Math.PI*1.3;  P.ganymede.phi = Math.PI*0.4;  P.callisto.phi = Math.PI*1.1;
    noiseFn = () => 0;
  } else if (key === 'noisy') {
    // 15 regular observations + ±0.6 D.J. deterministic noise (fixed seed), different phases
    times   = [0, 36, 72, 108, 144, 180, 216, 252, 288, 324, 360, 396, 432, 468, 504];
    P.io.phi = Math.PI*1.5;  P.europa.phi = Math.PI*0.2;  P.ganymede.phi = Math.PI*1.7;  P.callisto.phi = Math.PI*0.6;
    let s   = 17;
    noiseFn = () => {
      s = (Math.imul(1664525, s) + 1013904223) | 0;
      return (s / 2147483648) * 0.6;
    };
  }

  times.forEach(hr => {
    const obs = makeObs();
    obs.timeStr   = String(hr);
    obs._parsed   = {type:'hours', hours:hr};
    obs.timeHours = hr;
    SAT_IDS.forEach(id => {
      const {T,A,phi} = P[id];
      obs.positions[id] = Math.round((A * Math.sin(2*Math.PI*hr/T + phi) + noiseFn()) * 10) / 10;
    });
    state.observations.push(obs);
  });
  selectObs(state.observations[0].id);
  renderObsList();
  drawCanvas();
  SAT_IDS.forEach(id => setDefaultAmplitude(id));
  updateAllCharts();
}

/* ═══════════════ ACTIVE SATELLITE ═══════════════ */
function setActiveSat(id) {
  state.activeSat = id;
  document.querySelectorAll('.sat-btn').forEach(b => b.classList.toggle('active', b.dataset.sat === id));
}

/* ═══════════════ CANVAS HELPERS ═══════════════ */
function getDJ(canvas) {
  return canvas.clientWidth / (2 * CANVAS_RANGE);
}

function getLogicalX(e, canvas) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  return clientX - rect.left;
}

function xToDJ(lx, canvas) {
  return (lx - canvas.clientWidth / 2) / getDJ(canvas);
}

function findMoonAt(lx, canvas) {
  const obs = getObs();
  if (!obs) return null;
  const DJ  = getDJ(canvas);
  const cx  = canvas.clientWidth / 2;
  const HIT = Math.max(10, DJ * 0.45); // hit radius in px
  let best = null, bestD = HIT;
  SAT_IDS.forEach(id => {
    const p = obs.positions[id];
    if (p === null) return;
    const d = Math.abs(lx - (cx + p * DJ));
    if (d < bestD) { bestD = d; best = id; }
  });
  return best;
}

/* ═══════════════ CANVAS EVENTS ═══════════════ */
function canvasDown(e) {
  if (!getObs()) return;
  e.preventDefault();
  const canvas = document.getElementById('jupiterCanvas');
  const lx = getLogicalX(e, canvas);
  pointerDown = true;
  movedPx = 0;
  downX = lx;
  dragSat = findMoonAt(lx, canvas);
}

function canvasMove(e) {
  if (!pointerDown) return;
  e.preventDefault();
  const canvas = document.getElementById('jupiterCanvas');
  const lx = getLogicalX(e, canvas);
  movedPx = Math.abs(lx - downX);

  if (movedPx > 3 && dragSat) {
    let dj = Math.round(xToDJ(lx, canvas) * 100) / 100;
    dj = Math.max(-CANVAS_RANGE, Math.min(CANVAS_RANGE, dj));
    getObs().positions[dragSat] = dj;
    drawCanvas();
    renderObsList();
    updateAllCharts();
    // Update cursor
    canvas.style.cursor = 'grabbing';
  }
}

function canvasUp(e) {
  if (!pointerDown) return;
  const canvas = document.getElementById('jupiterCanvas');

  if (movedPx <= 3) {
    // Treat as click: place active satellite
    const obs = getObs();
    if (obs) {
      const lx = getLogicalX(e.type === 'mouseleave' ? e : e, canvas);
      let dj = Math.round(xToDJ(downX, canvas) * 100) / 100;
      dj = Math.max(-CANVAS_RANGE, Math.min(CANVAS_RANGE, dj));
      obs.positions[state.activeSat] = dj;
      drawCanvas();
      renderObsList();
      updateAllCharts();
    }
  }

  dragSat = null;
  pointerDown = false;
  canvas.style.cursor = 'crosshair';
}

/* ═══════════════ CANVAS DRAWING ═══════════════ */
function drawCanvas() {
  const canvas = document.getElementById('jupiterCanvas');
  const dpr = window.devicePixelRatio || 1;
  const W   = canvas.clientWidth;
  const H   = canvas.clientHeight;
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const cx  = W / 2;
  const cy  = H / 2;
  const DJ  = W / (2 * CANVAS_RANGE);
  const jupR = DJ / 2; // Jupiter radius = 0.5 D.J.

  // Background
  ctx.fillStyle = '#060912';
  ctx.fillRect(0, 0, W, H);

  // Stars (deterministic)
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 90; i++) {
    const sx = ((i * 7919 + 3137) % Math.floor(W));
    const sy = ((i * 4721 + 9901) % Math.floor(H));
    const sr = i % 5 === 0 ? 0.9 : 0.45;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI*2);
    ctx.fill();
  }

  // Axis line
  ctx.strokeStyle = '#1c2537';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();

  // Scale ticks & labels
  for (let d = -CANVAS_RANGE; d <= CANVAS_RANGE; d++) {
    const x = cx + d * DJ;
    const major = d % 5 === 0;
    ctx.strokeStyle = major ? '#2d3748' : '#1a2030';
    ctx.lineWidth   = major ? 1.2 : 0.6;
    const tk = major ? 7 : 4;
    ctx.beginPath(); ctx.moveTo(x, cy - tk); ctx.lineTo(x, cy + tk); ctx.stroke();
    if (major && d !== 0) {
      ctx.fillStyle = '#3d4e63';
      ctx.font = `${Math.max(9, DJ * 0.35)}px system-ui`;
      ctx.textAlign = 'center';
      ctx.fillText(d, x, cy + tk + 11);
    }
  }

  // D.J. unit & E/O labels
  ctx.fillStyle = '#374151';
  ctx.font = '9px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('D.J.', cx, cy + 20);

  ctx.fillStyle = '#374151';
  ctx.font = '10px system-ui';
  ctx.textAlign = 'right';
  ctx.fillText(t('canvas.west'), cx - jupR - 8, cy - 9);
  ctx.textAlign = 'left';
  ctx.fillText(t('canvas.east'), cx + jupR + 8, cy - 9);

  // Jupiter gradient
  const gj = ctx.createRadialGradient(cx - jupR*0.35, cy - jupR*0.35, jupR*0.1, cx, cy, jupR);
  gj.addColorStop(0,   '#f8e8b8');
  gj.addColorStop(0.3, '#e8c460');
  gj.addColorStop(0.6, '#c07830');
  gj.addColorStop(0.85,'#905018');
  gj.addColorStop(1,   '#503008');
  ctx.beginPath();
  ctx.arc(cx, cy, jupR, 0, Math.PI*2);
  ctx.fillStyle = gj;
  ctx.fill();

  // Jupiter cloud bands (clipped)
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, jupR, 0, Math.PI*2);
  ctx.clip();
  [{y:-.5,h:.14,c:'rgba(100,50,15,.45)'},{y:-.2,h:.13,c:'rgba(170,90,30,.3)'},
   {y:.12,h:.18,c:'rgba(90,45,12,.4)'}, {y:.42,h:.11,c:'rgba(150,75,25,.3)'}
  ].forEach(b=>{
    ctx.fillStyle = b.c;
    ctx.fillRect(cx - jupR, cy + b.y*jupR*2, jupR*2, b.h*jupR*2);
  });
  ctx.restore();

  // No observation selected hint
  const obs = getObs();
  if (!obs) {
    ctx.fillStyle = '#4b5563';
    ctx.font = '13px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(t('obs.canvas.hint'), cx, H - 14);
    return;
  }

  // Moons
  const moonR = Math.max(6, DJ * 0.28);
  SAT_IDS.forEach(id => {
    const pos = obs.positions[id];
    if (pos === null) return;
    const mx  = cx + pos * DJ;
    const my  = cy;
    const col = SAT_CFG[id].color;
    const isActive = id === state.activeSat;

    // Glow
    const glw = ctx.createRadialGradient(mx, my, 0, mx, my, moonR * 3);
    glw.addColorStop(0, col + '55');
    glw.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(mx, my, moonR * 3, 0, Math.PI*2);
    ctx.fillStyle = glw;
    ctx.fill();

    // Moon body
    const mg = ctx.createRadialGradient(mx - moonR*.3, my - moonR*.3, moonR*.1, mx, my, moonR);
    mg.addColorStop(0, col + 'ff');
    mg.addColorStop(1, col + '88');
    ctx.beginPath();
    ctx.arc(mx, my, moonR, 0, Math.PI*2);
    ctx.fillStyle = mg;
    ctx.fill();

    // Active ring
    if (isActive) {
      ctx.beginPath();
      ctx.arc(mx, my, moonR + 4, 0, Math.PI*2);
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3,3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Label
    const abbr = {io:'Io', europa:'Eu', ganymede:'Ga', callisto:'Ca'}[id];
    ctx.fillStyle = col;
    ctx.font = `bold ${Math.max(9, moonR * 0.95)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillText(abbr, mx, my - moonR - 4);
  });
}

/* ═══════════════ ANALYSIS ═══════════════ */
const SLIDER_STEPS = 400;
function periodToSlider(p, id) {
  const {pMin,pMax} = SAT_CFG[id];
  return Math.round(((p - pMin) / (pMax - pMin)) * SLIDER_STEPS);
}
function sliderToPeriod(v, id) {
  const {pMin,pMax} = SAT_CFG[id];
  return pMin + (parseFloat(v) / SLIDER_STEPS) * (pMax - pMin);
}

function getAnalysisData(satId) {
  return state.observations
    .filter(o => o.timeHours !== null && o.positions[satId] !== null)
    .map(o => ({t: o.timeHours, x: o.positions[satId]}))
    .sort((a,b) => a.t - b.t);
}

// Returns max |position| for this satellite across all observations (good initial A)
function getDataMaxA(satId) {
  const data = getAnalysisData(satId);
  if (!data.length) return 1;
  return Math.max(...data.map(d => Math.abs(d.x)));
}

// Sets amplitude slider to max |position| and updates state + UI
function setDefaultAmplitude(satId) {
  const A = getDataMaxA(satId);
  state.sliders[satId].amplitude = A;
  const slEl = document.getElementById(`Aslider-${satId}`);
  if (slEl) slEl.value = Math.round(A / 20 * SLIDER_STEPS);
  const valEl = document.getElementById(`Aval-${satId}`);
  if (valEl) valEl.textContent = A.toFixed(2) + ' D.J.';
}

// Fit: x(t) = A·sin(2π(t−t0)/T)  — A, T, t0 fully manual; only R² computed
function fitSat(satId) {
  const data = getAnalysisData(satId);
  if (data.length < 2) return null;
  const {period:T, phase:t0, amplitude:A} = state.sliders[satId];
  if (!A || !T) return null;
  const omega = 2 * Math.PI / T;
  const n    = data.length;
  const mean = data.reduce((s,d) => s + d.x, 0) / n;
  const ssTot = data.reduce((s,d) => s + (d.x - mean)**2, 0);
  const ssRes = data.reduce((s,d) => s + (d.x - A*Math.sin(omega*(d.t - t0)))**2, 0);
  const r2 = ssTot > 1e-12 ? Math.max(0, 1 - ssRes/ssTot) : 0;
  return {A, r2, period:T, phase:t0};
}

function updateAnalysisChart(satId) {
  const chart = state.charts[satId];
  if (!chart) return;
  const data = getAnalysisData(satId);
  const fit  = fitSat(satId);

  chart.data.datasets[0].data = data.map(d => ({x:d.t, y:d.x}));

  if (fit && data.length >= 2) {
    const tMin  = Math.min(...data.map(d=>d.t));
    const tMax  = Math.max(...data.map(d=>d.t));
    const ext   = (tMax - tMin) * 0.05;
    const omega = 2 * Math.PI / fit.period;
    const N = 300;
    const curve = [];
    for (let i = 0; i <= N; i++) {
      const t = (tMin - ext) + i/N * (tMax - tMin + 2*ext);
      curve.push({x:t, y: fit.A * Math.sin(omega * (t - fit.phase))});
    }
    chart.data.datasets[1].data = curve;
    chart.data.datasets[2].data = [{x:tMin-ext,y:fit.A},{x:tMax+ext,y:fit.A}];
    chart.data.datasets[3].data = [{x:tMin-ext,y:-fit.A},{x:tMax+ext,y:-fit.A}];
  } else {
    chart.data.datasets[1].data = [];
    chart.data.datasets[2].data = [];
    chart.data.datasets[3].data = [];
  }
  chart.update('none');
  updateStats(satId, fit);
}

function updateAllCharts() {
  SAT_IDS.forEach(updateAnalysisChart);
  updateKeplerSection();
}

function updateStats(satId, fit) {
  const s = state.sliders[satId];
  document.getElementById(`sT-${satId}`).textContent  = s.period.toFixed(1);
  document.getElementById(`sph-${satId}`).textContent = s.phase.toFixed(1);
  document.getElementById(`sA-${satId}`).textContent  = s.amplitude.toFixed(2);
  const r2El = document.getElementById(`sR2-${satId}`);
  if (fit) {
    r2El.textContent = fit.r2.toFixed(3);
    r2El.style.color = fit.r2 > 0.97 ? '#22c55e' : fit.r2 > 0.88 ? '#f59e0b' : '#ef4444';
  } else {
    r2El.textContent = '—';
    r2El.style.color = '';
  }
}

/* ═══════════════ SLIDERS ═══════════════ */
function onPeriodSlider(satId, val) {
  const T = sliderToPeriod(val, satId);
  state.sliders[satId].period = T;
  document.getElementById(`Tval-${satId}`).textContent = T.toFixed(1) + ' h';
  // Update phase slider max display
  document.getElementById(`phMax-${satId}`).textContent = T.toFixed(1) + ' h';
  updateAnalysisChart(satId);
}

function onPhaseSlider(satId, val) {
  const T = state.sliders[satId].period;
  const t0 = (parseFloat(val) / SLIDER_STEPS) * T;
  state.sliders[satId].phase = t0;
  document.getElementById(`phVal-${satId}`).textContent = t0.toFixed(1) + ' h';
  updateAnalysisChart(satId);
}

function onASlider(satId, val) {
  const A = (parseFloat(val) / SLIDER_STEPS) * 20; // 0–20 D.J.
  state.sliders[satId].amplitude = A;
  document.getElementById(`Aval-${satId}`).textContent = A.toFixed(2) + ' D.J.';
  updateAnalysisChart(satId);
}

function resetAmplitude(satId) {
  setDefaultAmplitude(satId);
  updateAnalysisChart(satId);
}

/* ═══════════════ AUTO-FIT ═══════════════ */
// Grid search on T; for each T solve 2-parameter linear LS to find optimal A and t₀.
// Model: x(t) = α·sin(ωt) + β·cos(ωt)  →  A = √(α²+β²), t₀ = T/(2π)·atan2(-β, α)
function autoFit(satId) {
  const data   = getAnalysisData(satId);
  const msgEl  = document.getElementById(`vmsg-${satId}`);
  if (data.length < 2) {
    msgEl.className  = 'warn-msg';
    msgEl.textContent = t('validate.err.nodata');
    return;
  }

  const {pMin, pMax} = SAT_CFG[satId];
  const GRID = 600;
  let bestR2 = -Infinity, bestT, bestA, bestt0;

  const n    = data.length;
  const mean = data.reduce((s, d) => s + d.x, 0) / n;
  const ssTot = data.reduce((s, d) => s + (d.x - mean) ** 2, 0);

  for (let i = 0; i <= GRID; i++) {
    const T     = pMin + (i / GRID) * (pMax - pMin);
    const omega = 2 * Math.PI / T;
    let ss = 0, sc = 0, cc = 0, sy = 0, cy = 0;
    for (const d of data) {
      const s = Math.sin(omega * d.t);
      const c = Math.cos(omega * d.t);
      ss += s * s;  sc += s * c;  cc += c * c;
      sy += s * d.x; cy += c * d.x;
    }
    const det = ss * cc - sc * sc;
    if (Math.abs(det) < 1e-12) continue;
    const alpha = (cc * sy - sc * cy) / det;
    const beta  = (ss * cy - sc * sy) / det;
    const A     = Math.sqrt(alpha * alpha + beta * beta);
    const t0raw = T / (2 * Math.PI) * Math.atan2(-beta, alpha);
    const t0    = ((t0raw % T) + T) % T;
    const ssRes = data.reduce((s, d) => s + (d.x - A * Math.sin(omega * (d.t - t0))) ** 2, 0);
    const r2    = ssTot > 1e-12 ? Math.max(0, 1 - ssRes / ssTot) : 0;
    if (r2 > bestR2) { bestR2 = r2; bestT = T; bestA = A; bestt0 = t0; }
  }

  state.sliders[satId].period    = bestT;
  state.sliders[satId].phase     = bestt0;
  state.sliders[satId].amplitude = bestA;

  document.getElementById(`Tslider-${satId}`).value     = periodToSlider(bestT, satId);
  document.getElementById(`Tval-${satId}`).textContent  = bestT.toFixed(1) + ' h';
  document.getElementById(`phMax-${satId}`).textContent = bestT.toFixed(1) + ' h';
  document.getElementById(`phSlider-${satId}`).value    = Math.round((bestt0 / bestT) * SLIDER_STEPS);
  document.getElementById(`phVal-${satId}`).textContent = bestt0.toFixed(1) + ' h';
  document.getElementById(`Aslider-${satId}`).value     = Math.round(bestA / 20 * SLIDER_STEPS);
  document.getElementById(`Aval-${satId}`).textContent  = bestA.toFixed(2) + ' D.J.';

  msgEl.className  = bestR2 >= 0.75 ? 'validate-msg' : 'warn-msg';
  msgEl.textContent = t('autofit.result', {r2: bestR2.toFixed(3)});
  updateAnalysisChart(satId);
}

/* ═══════════════ VALIDATE ═══════════════ */
function validate(satId) {
  const fit   = fitSat(satId);
  const msgEl = document.getElementById(`vmsg-${satId}`);
  if (!fit) {
    msgEl.className = 'warn-msg';
    msgEl.textContent = t('validate.err.nodata');
    return;
  }
  if (fit.r2 < 0.75) {
    msgEl.className = 'warn-msg';
    msgEl.textContent = t('validate.err.r2', {r2: fit.r2.toFixed(3)});
    return;
  }
  state.validated[satId] = true;
  state.validA[satId]    = fit.A;
  state.validT[satId]    = fit.period;
  msgEl.className = 'validate-msg';
  msgEl.textContent = t('validate.ok', {T: fit.period.toFixed(1), A: fit.A.toFixed(2), r2: fit.r2.toFixed(3)});
  document.getElementById(`prog-${satId}`).classList.add('done');
  updateKeplerSection();
}

/* ═══════════════ KEPLER ═══════════════ */
function keplerReg(points) {
  const num = points.reduce((s,p) => s + p.a3*p.T2, 0);
  const den = points.reduce((s,p) => s + p.a3**2,   0);
  if (den < 1e-30) return null;
  const slope = num / den;
  const ssTot = points.reduce((s,p) => s + p.T2**2, 0);
  const ssRes = points.reduce((s,p) => s + (p.T2 - slope*p.a3)**2, 0);
  return {slope, M: 4*Math.PI**2 / (G*slope), r2: Math.max(0, 1 - ssRes/ssTot)};
}

function updateKeplerSection() {
  const vals = SAT_IDS.filter(id => state.validated[id]);

  // Results table — with individual M_Jup per satellite
  const tbody = document.getElementById('resBody');
  if (!vals.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:var(--muted);text-align:center;padding:.5rem;font-size:.78rem">${t('kepler.table.empty')}</td></tr>`;
  } else {
    tbody.innerHTML = vals.map(id => {
      const T_s = state.validT[id] * 3600;
      const a_m = state.validA[id] * D_JUP_M;
      const Mi  = 4 * Math.PI**2 * a_m**3 / (G * T_s**2);
      const MiExp  = Math.floor(Math.log10(Mi));
      const MiMant = Mi / 10**MiExp;
      return `<tr>
        <td><span class="sat-dot" style="background:${SAT_CFG[id].color}"></span>${t('sat.'+id)}</td>
        <td>${state.validT[id].toFixed(1)}</td>
        <td>${state.validA[id].toFixed(2)}</td>
        <td>${fmtSci(T_s**2)}</td>
        <td>${fmtSci(a_m**3)}</td>
        <td style="color:${SAT_CFG[id].color};font-family:monospace;font-size:.72rem;white-space:nowrap">${MiMant.toFixed(2)}×10${sup(MiExp)}</td>
      </tr>`;
    }).join('');
  }

  updateKeplerChart(vals);

  const mc       = document.getElementById('massCard');
  const mv       = document.getElementById('massVal');
  const mcomp    = document.getElementById('massComp');
  const mr2      = document.getElementById('massR2');
  const calcDiv  = document.getElementById('calcDetail');
  const calcBody = document.getElementById('calcBody');

  if (vals.length < 2) {
    mc.className = 'mass-card empty';
    mv.textContent = vals.length < 1 ? t('kepler.mass.empty1') : t('kepler.mass.empty2');
    mcomp.style.display = 'none';
    mr2.style.display   = 'none';
    calcDiv.style.display = 'none';
    return;
  }

  const pts = vals.map(id => ({
    id,
    a3: (state.validA[id]*D_JUP_M)**3,
    T2: (state.validT[id]*3600)**2,
  }));
  const kep = keplerReg(pts);
  if (!kep) return;

  const exp  = Math.floor(Math.log10(kep.M));
  const mant = kep.M / 10**exp;
  const err  = Math.abs(kep.M - M_REF) / M_REF * 100;
  mc.className = 'mass-card';
  mv.textContent = `${mant.toFixed(2)} × 10${sup(exp)} kg`;
  mcomp.style.display = 'block';
  mcomp.textContent   = t('kepler.mass.ref', {err: err.toFixed(1)});
  mr2.style.display   = 'block';
  mr2.textContent     = t('kepler.mass.r2', {r2: kep.r2.toFixed(4)});

  // ── Detailed calculation ──
  calcDiv.style.display = 'block';
  const SX = 1e24, SY = 1e8;
  const sumNum = pts.reduce((s,p) => s + p.a3*p.T2, 0);
  const sumDen = pts.reduce((s,p) => s + p.a3**2, 0);
  const slopeVal = kep.slope;
  const num4pi2 = 4 * Math.PI**2;
  const denom   = G * slopeVal;

  const sl = t('calc.slope');
  calcBody.innerHTML = `
    <div class="calc-step">
      <div class="step-title">${t('calc.step1.title')}</div>
      <div class="calc-line sub">${t('calc.step1.formula')}</div>
      <div class="calc-line">${sl} = ${fmtSci(sumNum)} / ${fmtSci(sumDen)}</div>
      <div class="calc-line result">${sl} = ${fmtSci(slopeVal)} s²·m⁻³</div>
    </div>
    <div class="calc-step">
      <div class="step-title">${t('calc.step2.title')}</div>
      <div class="calc-line">${t('calc.step2.line1')}</div>
      <div class="calc-line">M = ${num4pi2.toFixed(4)} / (${G.toExponential(3)} × ${fmtSci(slopeVal)})</div>
      <div class="calc-line">M = ${num4pi2.toFixed(4)} / ${denom.toExponential(4)}</div>
      <div class="calc-line result">M = ${mant.toFixed(3)} × 10${sup(exp)} kg</div>
    </div>
    <div class="calc-step">
      <div class="step-title">${t('calc.step3.title')}</div>
      ${vals.map(id => {
        const T_s = state.validT[id]*3600, a_m = state.validA[id]*D_JUP_M;
        const Mi = 4*Math.PI**2*a_m**3/(G*T_s**2);
        const e = Math.floor(Math.log10(Mi));
        return `<div class="calc-line sub">${t('sat.'+id)} : 4π²·(${fmtSci(a_m)})³ / (G·(${fmtSci(T_s)})²) = <span style="color:${SAT_CFG[id].color}">${(Mi/10**e).toFixed(2)}×10${sup(e)} kg</span></div>`;
      }).join('')}
    </div>`;
}

function updateKeplerChart(vals) {
  const kc = state.keplerChart;
  if (!kc) return;
  const SX = 1e24, SY = 1e8;

  if (!vals.length) {
    kc.data.datasets[0].data = [];
    kc.data.datasets[0].backgroundColor = [];
    kc.data.datasets[1].data = [];
    kc.update('none'); return;
  }

  const pts = vals.map(id => ({
    x: (state.validA[id]*D_JUP_M)**3 / SX,
    y: (state.validT[id]*3600)**2      / SY,
    a3r: (state.validA[id]*D_JUP_M)**3,
    T2r: (state.validT[id]*3600)**2,
  }));

  kc.data.datasets[0].data = pts.map(p=>({x:p.x,y:p.y}));
  kc.data.datasets[0].backgroundColor = vals.map(id => SAT_CFG[id].color);

  if (vals.length >= 2) {
    const num = pts.reduce((s,p)=>s+p.a3r*p.T2r,0);
    const den = pts.reduce((s,p)=>s+p.a3r**2,0);
    const sl  = num/den;
    const xMax = Math.max(...pts.map(p=>p.x))*1.1;
    kc.data.datasets[1].data = [{x:0,y:0},{x:xMax,y:sl*(xMax*SX)/SY}];
  } else {
    kc.data.datasets[1].data = [];
  }
  kc.update('none');
}

/* ═══════════════ HELPERS ═══════════════ */
const SMAP = {'-':'⁻','0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹'};
function sup(n) { return String(n).split('').map(c=>SMAP[c]||c).join(''); }
function fmtSci(n) {
  if (!n) return '0';
  const e = Math.floor(Math.log10(Math.abs(n)));
  return `${(n/10**e).toFixed(2)}×10${sup(e)}`;
}

/* ═══════════════ BUILD UI ═══════════════ */
Chart.defaults.color = '#94a3b8';

function buildAnalysisGrid() {
  const grid = document.getElementById('analysisGrid');
  grid.innerHTML = SAT_IDS.map(id => {
    const cfg = SAT_CFG[id];
    const pInit = (cfg.pMin + cfg.pMax) / 2;
    return `
    <div class="sat-panel" id="panel-${id}">
      <div class="sat-header">
        <span class="sat-dot-lg" style="background:${cfg.color}"></span>
        <span data-i18n="sat.${id}" style="color:${cfg.color}">${t('sat.'+id)}</span>
      </div>
      <div class="chart-wrap-sm"><canvas id="canvas-${id}"></canvas></div>
      <div class="sliders-area">
        <div class="slider-group">
          <div class="slider-lbl">
            <span data-i18n="slider.period">Période T</span>
            <span class="slider-val" id="Tval-${id}" style="color:${cfg.color}">${pInit.toFixed(1)} h</span>
          </div>
          <input type="range" min="0" max="${SLIDER_STEPS}" value="${SLIDER_STEPS/2}"
                 id="Tslider-${id}" oninput="onPeriodSlider('${id}',this.value)">
          <div class="slider-limits"><span>${cfg.pMin} h</span><span>${cfg.pMax} h</span></div>
        </div>
        <div class="slider-group">
          <div class="slider-lbl">
            <span data-i18n="slider.phase">Décalage t₀</span>
            <span class="slider-val" id="phVal-${id}" style="color:${cfg.color}">0.0 h</span>
          </div>
          <input type="range" min="0" max="${SLIDER_STEPS}" value="0"
                 id="phSlider-${id}" oninput="onPhaseSlider('${id}',this.value)">
          <div class="slider-limits"><span>0 h</span><span id="phMax-${id}">${pInit.toFixed(1)} h</span></div>
        </div>
        <div class="slider-group">
          <div class="slider-lbl">
            <span data-i18n="slider.amplitude">Amplitude A</span>
            <span style="display:flex;gap:.4rem;align-items:center">
              <span class="slider-val" id="Aval-${id}" style="color:${cfg.color}">1.00 D.J.</span>
              <button class="btn" style="padding:.1rem .45rem;font-size:.68rem;background:#1e3a5f;color:#93c5fd;border-color:#1d4ed8" onclick="resetAmplitude('${id}')" data-i18n-title="slider.reset.title" title="Réinitialiser à max|données|">↺</button>
            </span>
          </div>
          <input type="range" min="0" max="${SLIDER_STEPS}" value="${Math.round(1/20*SLIDER_STEPS)}"
                 id="Aslider-${id}" oninput="onASlider('${id}',this.value)">
          <div class="slider-limits"><span>0 D.J.</span><span>20 D.J.</span></div>
        </div>
        <div class="fit-stats" style="grid-template-columns:1fr 1fr 1fr 1fr">
          <div class="stat-box"><div class="slbl" data-i18n="stat.T">T (h)</div>      <div class="sval" id="sT-${id}"  style="color:${cfg.color}">—</div></div>
          <div class="stat-box"><div class="slbl" data-i18n="stat.phase">t₀ (h)</div> <div class="sval" id="sph-${id}" style="color:${cfg.color}">—</div></div>
          <div class="stat-box"><div class="slbl" data-i18n="stat.A">A (D.J.)</div>  <div class="sval" id="sA-${id}"  style="color:${cfg.color}">—</div></div>
          <div class="stat-box"><div class="slbl" data-i18n="stat.r2">R²</div>        <div class="sval" id="sR2-${id}">—</div></div>
        </div>
      </div>
      <div class="validate-row">
        <button class="btn btn-autofit"  onclick="autoFit('${id}')"  data-i18n="autofit.btn">⚡ Auto-ajuster</button>
        <button class="btn btn-validate" onclick="validate('${id}')" data-i18n="validate.btn">✓ Valider</button>
        <span id="vmsg-${id}"></span>
      </div>
    </div>`;
  }).join('');
}

function initCharts() {
  SAT_IDS.forEach(id => {
    const cfg = SAT_CFG[id];
    const ctx = document.getElementById(`canvas-${id}`).getContext('2d');
    state.charts[id] = new Chart(ctx, {
      type: 'scatter',
      data: { datasets: [
        { label:t('chart.obs'), data:[], backgroundColor:cfg.color, pointRadius:5, pointHoverRadius:7, order:2 },
        { label:t('chart.fit'), data:[], type:'line', borderColor:cfg.color, borderWidth:2, pointRadius:0, fill:false, order:1, tension:0 },
        { label:'+A', data:[], type:'line', borderColor:cfg.color+'70', borderWidth:1, borderDash:[4,3], pointRadius:0, fill:false, order:3 },
        { label:'',   data:[], type:'line', borderColor:cfg.color+'70', borderWidth:1, borderDash:[4,3], pointRadius:0, fill:false, order:3 },
      ]},
      options: {
        responsive:true, maintainAspectRatio:false, animation:{duration:80},
        scales: {
          x:{ title:{display:true,text:t('chart.time'),color:'#64748b'}, grid:{color:'#1c2537'}, ticks:{color:'#64748b'} },
          y:{ title:{display:true,text:t('chart.pos'),color:'#64748b'}, grid:{color:'#1c2537'}, ticks:{color:'#64748b'} },
        },
        plugins:{
          legend:{labels:{color:'#94a3b8',usePointStyle:true,pointStyle:'circle',filter:i=>i.text!=='',boxWidth:10}},
          tooltip:{callbacks:{label:ctx=>{
            if(ctx.datasetIndex===0) return ` t=${ctx.parsed.x.toFixed(1)}h, x=${ctx.parsed.y.toFixed(2)} D.J.`;
            return null;
          }}},
        },
      },
    });
  });

  // Kepler chart
  const kctx = document.getElementById('keplerCanvas').getContext('2d');
  state.keplerChart = new Chart(kctx, {
    type:'scatter',
    data:{datasets:[
      {label:t('chart.satellites'),data:[],backgroundColor:[],pointRadius:8,pointHoverRadius:10,order:2},
      {label:t('chart.regression'),data:[],type:'line',borderColor:'#f59e0b',borderWidth:2,pointRadius:0,fill:false,order:1},
    ]},
    options:{
      responsive:true, maintainAspectRatio:false, animation:{duration:80},
      scales:{
        x:{title:{display:true,text:t('chart.kepler.x'),color:'#64748b'},grid:{color:'#1c2537'},ticks:{color:'#64748b'}},
        y:{title:{display:true,text:t('chart.kepler.y'),color:'#64748b'},grid:{color:'#1c2537'},ticks:{color:'#64748b'}},
      },
      plugins:{
        legend:{labels:{color:'#94a3b8',usePointStyle:true,pointStyle:'circle',boxWidth:10}},
        tooltip:{callbacks:{label:ctx=>{
          if(ctx.datasetIndex===0){
            const id=SAT_IDS.filter(i=>state.validated[i])[ctx.dataIndex];
            return id?` ${t('sat.'+id)}: a³=${ctx.parsed.x.toFixed(2)}×10²⁴, T²=${ctx.parsed.y.toFixed(2)}×10⁸`:null;
          }return null;
        }}},
      },
    },
  });
}

/* ═══════════════ I18N CHART UPDATE ═══════════════ */
function updateChartsI18n() {
  SAT_IDS.forEach(id => {
    const chart = state.charts[id];
    if (!chart) return;
    chart.data.datasets[0].label = t('chart.obs');
    chart.data.datasets[1].label = t('chart.fit');
    chart.options.scales.x.title.text = t('chart.time');
    chart.options.scales.y.title.text = t('chart.pos');
    chart.update('none');
  });
  const kc = state.keplerChart;
  if (kc) {
    kc.data.datasets[0].label = t('chart.satellites');
    kc.data.datasets[1].label = t('chart.regression');
    kc.options.scales.x.title.text = t('chart.kepler.x');
    kc.options.scales.y.title.text = t('chart.kepler.y');
    kc.update('none');
  }
}

/* ═══════════════ RESIZE CANVAS ON WINDOW RESIZE ═══════════════ */
window.addEventListener('resize', () => { drawCanvas(); });

/* ═══════════════ INIT ═══════════════ */
function init() {
  buildAnalysisGrid();
  initCharts();
  drawCanvas();
  updateKeplerSection();
  applyTranslations();
  // Init slider labels
  SAT_IDS.forEach(id => {
    updateStats(id, null);
    document.getElementById(`Tval-${id}`).textContent = ((SAT_CFG[id].pMin + SAT_CFG[id].pMax) / 2).toFixed(1) + ' h';
  });
}

init();
