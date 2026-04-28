// window.VokabelLab is initialised by app.js — do not redeclare

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function startSession(themas, types, title, sub) {
  session = shuffle(words.filter(w => themas.has(w.thema) && (types.size === 0 || types.has(w.type))));
  savedThemas = themas;
  savedTypes = types;
  ['write', 'cards', 'mc'].forEach(m => { modeState[m] = { idx:0, hits:0, seen:0, racha:0 }; });
  isFlipped = false;
  document.getElementById('practiceTitle').textContent = title;
  document.getElementById('practiceSub').textContent = sub;
  goScreen('s-practice');
  activeMode = 'write';
  switchTab('write');
  updateStats();
}

function resetScore() {
  ['write', 'cards', 'mc'].forEach(m => { modeState[m] = { idx:0, hits:0, seen:0, racha:0 }; });
  isFlipped = false;
  updateStats();
  switchTab(activeMode);
}

function restartSession(mode) {
  const m = mode || 'write';
  session = shuffle([...session]);
  modeState[m] = { idx:0, hits:0, seen:0, racha:0 };
  isFlipped = false;
  updateStats();
  switchTab(m);
}

function updateStats() {
  const s = ms();
  const t = session.length;
  document.getElementById('pTotal').textContent = t;
  document.getElementById('pDom').textContent = s.hits;
  document.getElementById('pRacha').textContent = s.racha;
  document.getElementById('pPct').textContent = s.seen > 0 ? Math.round(s.hits / s.seen * 100) + '%' : '—';
  const p = t > 0 ? Math.round(s.idx / t * 100) : 0;
  document.getElementById('pBar').style.width = p + '%';
  document.getElementById('pBarLabel').textContent = `${s.idx} de ${t} palabras`;

  const modeInfo = [
    {key:'write', icon:'✏️', name:'Escribir'},
    {key:'cards', icon:'🃏', name:'Tarjetas'},
    {key:'mc', icon:'🎯', name:'Test'},
  ];
  const anyActivity = modeInfo.some(m => modeState[m.key].seen > 0);
  document.getElementById('sessionSidebar').innerHTML = `
    <div class="sidebar-stat"><span>Palabras totales</span><span>${t}</span></div>
    <hr style="margin:10px 0;border-color:#f0f0f0">
    ${modeInfo.map(m => {
      const state = modeState[m.key];
      const pct = state.seen > 0 ? Math.round(state.hits / state.seen * 100) + '%' : '—';
      const activeStyle = activeMode === m.key ? 'background:#f0fafa;' : '';
      return `<div style="padding:8px 0 8px;border-bottom:1px solid #f0f0f0;${activeStyle}">
        <div style="font-size:12px;font-weight:700;color:#1b1b1b;margin-bottom:4px">${m.icon} ${m.name}</div>
        <div style="display:flex;justify-content:space-between;font-size:13px;color:#5e5e5e">
          <span>Acertadas</span><span style="color:#3AA9AB;font-weight:700">${state.hits}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:13px;color:#5e5e5e">
          <span>Falladas</span><span style="color:${state.seen - state.hits > 0 ? '#e76f51' : '#a4a4a4'};font-weight:700">${state.seen - state.hits}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:13px;color:#5e5e5e">
          <span>% Acierto</span><span style="font-weight:700">${pct}</span>
        </div>
      </div>`;
    }).join('')}
    ${!anyActivity ? '<div style="font-size:13px;color:#a4a4a4;margin-top:8px">Sin actividad todavia.</div>' : ''}
  `;
}

function renderWrite() {
  const s = modeState.write;
  const empty = document.getElementById('writeEmpty');
  if (s.idx >= session.length) {
    ['w-de','w-input','w-feedback','w-check','w-next','w-counter']
      .forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
    document.getElementById('w-badges').style.display = 'none';
    empty.style.display = '';
    return;
  }
  empty.style.display = 'none';
  ['w-de','w-input','w-check'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = ''; });
  document.getElementById('w-badges').style.display = 'flex';
  const w = session[s.idx];
  document.getElementById('w-de').textContent = w.de;
  document.getElementById('w-type').textContent = w.type;
  document.getElementById('w-thema').textContent = `Thema ${w.thema}`;
  document.getElementById('w-counter').textContent = `${s.idx + 1} / ${session.length}`;
  const inp = document.getElementById('w-input');
  inp.value = '';
  inp.className = 'write-input';
  inp.disabled = false;
  inp.style.display = '';
  const fb = document.getElementById('w-feedback');
  fb.style.display = 'none';
  fb.className = 'write-feedback';
  document.getElementById('w-check').style.display = '';
  document.getElementById('w-next').style.display = 'none';
  setTimeout(() => inp.focus(), 50);
}

function normalize(s) {
  return s.toLowerCase()
    .replace(/[áàä]/g,'a').replace(/[éèë]/g,'e')
    .replace(/[íìï]/g,'i').replace(/[óòö]/g,'o')
    .replace(/[úùü]/g,'u').replace(/ñ/g,'n')
    .replace(/[^a-z0-9\s/]/g,'').trim();
}

function checkWrite() {
  const s = modeState.write;
  if (s.idx >= session.length) return;
  const w = session[s.idx];
  const inp = document.getElementById('w-input');
  const fb = document.getElementById('w-feedback');
  const userVal = inp.value.trim();
  if (!userVal) {
    inp.focus();
    return;
  }

  const correct = w.es.split('/').map(c => c.trim());
  const isOk = correct.some(c => normalize(userVal) === normalize(c));

  s.seen++;
  if (isOk) {
    s.hits++;
    s.racha++;
    inp.className = 'write-input correct';
    fb.className = 'write-feedback correct';
    fb.textContent = `✓ Correcto — ${w.es}`;
  } else {
    s.racha = 0;
    inp.className = 'write-input wrong';
    fb.className = 'write-feedback wrong';
    fb.textContent = `✗ La respuesta correcta es: ${w.es}`;
  }
  fb.style.display = '';
  inp.disabled = true;
  document.getElementById('w-check').style.display = 'none';
  document.getElementById('w-next').style.display = '';
  updateStats();
}

function nextWrite() {
  modeState.write.idx++;
  renderWrite();
}

function renderCard() {
  const s = modeState.cards;
  const empty = document.getElementById('cardEmpty');
  const cardArea = document.getElementById('cardArea');
  if (s.idx >= session.length) {
    cardArea.style.display = 'none';
    empty.style.display = '';
    return;
  }
  cardArea.style.display = '';
  empty.style.display = 'none';
  const w = session[s.idx];
  document.getElementById('c-de').textContent = w.de;
  document.getElementById('c-es').textContent = w.es;
  document.getElementById('c-cat').textContent = `${w.type} · Thema ${w.thema}`;
  document.getElementById('c-thema').textContent = `Thema ${w.thema}`;
  document.getElementById('c-type').textContent = w.type;
  document.getElementById('c-counter').textContent = `${s.idx + 1} / ${session.length}`;
  document.getElementById('flashcard').classList.remove('flipped');
  isFlipped = false;
}

function flipCard() {
  isFlipped = !isFlipped;
  document.getElementById('flashcard').classList.toggle('flipped', isFlipped);
}

function markCard(ok) {
  const s = modeState.cards;
  if (s.idx >= session.length) return;
  s.seen++;
  if (ok === true) {
    s.hits++;
    s.racha++;
  } else if (ok === false) {
    s.racha = 0;
  }
  // ok === null → unsure: seen++ but no hit, racha unchanged
  s.idx++;
  renderCard();
  updateStats();
}

function renderMC() {
  const s = modeState.mc;
  const empty = document.getElementById('mcEmpty');
  const opts = document.getElementById('mc-options');
  if (s.idx >= session.length) {
    opts.innerHTML = '';
    empty.style.display = '';
    document.getElementById('mc-de').textContent = '';
    document.getElementById('mc-badges').style.display = 'none';
    return;
  }
  empty.style.display = 'none';
  document.getElementById('mc-badges').style.display = 'flex';
  document.getElementById('mc-next').style.display = 'none';

  const w = session[s.idx];
  document.getElementById('mc-de').textContent = w.de;
  document.getElementById('mc-type').textContent = w.type;
  document.getElementById('mc-thema').textContent = `Thema ${w.thema}`;
  document.getElementById('mc-counter').textContent = `${s.idx + 1} / ${session.length}`;

  const otherEs = words.filter(x => x.es !== w.es).map(x => x.es);
  shuffle(otherEs);
  const distractors = [...new Set(otherEs)].slice(0, 3);
  const options = shuffle([w.es, ...distractors]);

  opts.innerHTML = options.map(opt => `
    <button class="mc-opt" onclick="selectMC(this,'${opt.replace(/'/g, "\\'")}','${w.es.replace(/'/g, "\\'")}')">
      ${opt}
    </button>`).join('');
}

function selectMC(btn, chosen, correct) {
  const s = modeState.mc;
  const opts = document.querySelectorAll('.mc-opt');
  opts.forEach(b => b.disabled = true);
  const isOk = normalize(chosen) === normalize(correct);
  s.seen++;
  if (isOk) {
    s.hits++;
    s.racha++;
    btn.classList.add('correct');
  } else {
    s.racha = 0;
    btn.classList.add('wrong');
    opts.forEach(b => {
      if (normalize(b.textContent.trim()) === normalize(correct)) b.classList.add('reveal');
    });
  }
  document.getElementById('mc-next').style.display = '';
  updateStats();
}

function nextMC() {
  modeState.mc.idx++;
  renderMC();
}

function buildWordTable() {
  document.getElementById('wordTableBody').innerHTML = session.map(w => `
    <tr>
      <td class="td-de">${w.de}</td>
      <td>${w.es}</td>
      <td>${w.type}</td>
      <td>Thema ${w.thema}</td>
    </tr>`).join('');
}

function switchTab(tab) {
  const tabs = ['write','cards','mc','list'];
  tabs.forEach(t => {
    document.getElementById('view-' + t).style.display = t === tab ? '' : 'none';
    document.getElementById('tab-' + t).className = 'tab-btn' + (t === tab ? ' active' : '');
  });
  if (tab !== 'list') activeMode = tab;
  updateStats();
  if (tab === 'write') renderWrite();
  if (tab === 'cards') renderCard();
  if (tab === 'mc') renderMC();
  if (tab === 'list') buildWordTable();
}


Object.assign(window, {
  startSession,
  restartSession,
  resetScore,
  checkWrite,
  nextWrite,
  flipCard,
  markCard,
  selectMC,
  nextMC,
  switchTab
});

window.VokabelLab.modules = window.VokabelLab.modules || {};
window.VokabelLab.modules.practiceLoaded = true;
