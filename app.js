const Lab = window.VokabelLab = window.VokabelLab || {};
Lab.config = Lab.config || {
  api: {
    summary: '/api/resumen',
    words: '/api/vocabulario'
  },
  features: {
    auth: false,
    adminPanel: false
  },
  screens: ['s-home', 's-simple', 's-advanced', 's-practice']
};
Lab.user = Lab.user || {
  status: 'guest',
  role: 'guest'
};
Lab.modules = Lab.modules || {
  practiceLoaded: false,
  practicePromise: null
};

// ── DATOS (vendrán de tu BD) ────────────────────────────
let words = [];
let isLoadingWords = false;
let loadWordsError = null;
let loadWordsPromise = null;

const themaNames = {
  1:'Zeit & Natur',
  2:'Essen & Einkaufen',
  3:'Familie & Alltag',
  4:'Hobbys & Freizeit',
  5:'Wohnen',
  6:'Kleidung & Haushalt',
  7:'Stadt & Kultur',
  8:'Im Restaurant',
  9:'Feste & Traditionen',
  10:'Wohnung & Umzug',
  11:'Studium & Alltag',
  12:'Bank & Geld',
  13:'Gesundheit',
  14:'Wetter & Mode',
  15:'Reisen & Mobilität',
  16:'Ausbildung & Beruf',
  17:'Bewerbung & Arbeit',
  18:'Urlaub',
  19:'Reise & Politik',
  20:'Unfall & Notfall',
  21:'Kunst & Aussehen',
  22:'Post & Kommunikation',
  23:'Hochschule & Kunst',
  24:'Landleben & Ehrenamt',
  25:'Umgangsformen',
  26:'Arbeitsvertrag',
  27:'Geschichte',
  28:'Migration',
  29:'Politik & Wahlen'
};

const defaultSummary = {
  totalWords: 0,
  totalThemas: Object.keys(themaNames).length,
  totalTypes: 4,
  lastUpdated: null,
  source: 'default'
};

function readStoredSummary() {
  try {
    const raw = localStorage.getItem('vokabel-summary');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed.totalWords !== 'number') return null;
    return { ...defaultSummary, ...parsed };
  } catch (error) {
    return null;
  }
}

function saveStoredSummary(summary) {
  try {
    localStorage.setItem('vokabel-summary', JSON.stringify(summary));
  } catch (error) {
    // Safari private mode puede bloquear storage; no hacemos nada.
  }
}

let summaryState = readStoredSummary() || { ...defaultSummary, source: 'default' };

function setSummaryState(partial) {
  summaryState = { ...summaryState, ...partial };
  saveStoredSummary(summaryState);
}

function hasLoadedWords() {
  return Array.isArray(words) && words.length > 0;
}

function getAllThemas() {
  return [...new Set(words.map(w => w.thema).filter(Boolean))].sort((a, b) => a - b);
}

function getAllTypes() {
  return [...new Set(words.map(w => w.type).filter(Boolean))].sort();
}

let session = [], isFlipped = false;
let selThemas = new Set(), selTypes = new Set();
let savedThemas = new Set(), savedTypes = new Set();
let activeMode = 'write';

const modeState = {
  write: { idx:0, hits:0, seen:0, racha:0 },
  cards: { idx:0, hits:0, seen:0, racha:0 },
  mc:    { idx:0, hits:0, seen:0, racha:0 },
};

function ms() { return modeState[activeMode]; }


async function goScreen(id) {
  ['s-home','s-simple','s-advanced','s-practice'].forEach(s => {
    document.getElementById(s).style.display = s === id ? 'flex' : 'none';
  });

  if (id === 's-simple') {
    if (!hasLoadedWords()) buildSimple();
    await ensureWordsLoaded();
    if (document.getElementById(id).style.display === 'flex') buildSimple();
  }

  if (id === 's-advanced') {
    if (!hasLoadedWords()) buildAdvanced();
    await ensureWordsLoaded();
    if (document.getElementById(id).style.display === 'flex') buildAdvanced();
  }
}

function goHome() {
  goScreen('s-home');
  buildHome();
}

async function loadSummary() {
  try {
    const response = await fetch(Lab.config.api.summary);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const payload = await response.json();
    setSummaryState({
      totalWords: Number(payload.totalWords) || 0,
      totalThemas: Number(payload.totalThemas) || defaultSummary.totalThemas,
      totalTypes: Number(payload.totalTypes) || defaultSummary.totalTypes,
      lastUpdated: payload.lastUpdated || new Date().toISOString(),
      source: payload.source || 'server'
    });
  } catch (error) {
    console.error('Error cargando resumen:', error);
  } finally {
    buildHome();
  }
}

async function loadWords(force = false) {
  if (!force && hasLoadedWords()) return words;
  if (!force && loadWordsPromise) return loadWordsPromise;

  isLoadingWords = true;
  loadWordsError = null;
  buildHome();

  loadWordsPromise = (async () => {
    try {
      const response = await fetch(Lab.config.api.words);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const payload = await response.json();
      words = Array.isArray(payload.palabras) ? payload.palabras : [];

      setSummaryState({
        totalWords: words.length,
        totalThemas: getAllThemas().length || summaryState.totalThemas,
        totalTypes: getAllTypes().length || summaryState.totalTypes,
        lastUpdated: payload.cachedAt || new Date().toISOString(),
        source: payload.cached ? 'cached-words' : 'words'
      });

      return words;
    } catch (error) {
      console.error('Error cargando vocabulario:', error);
      loadWordsError = 'No se pudo cargar el vocabulario desde Supabase.';
      words = [];
      throw error;
    } finally {
      isLoadingWords = false;
      loadWordsPromise = null;
      buildHome();
    }
  })();

  return loadWordsPromise;
}

async function ensureWordsLoaded() {
  if (hasLoadedWords()) return words;
  try {
    return await loadWords();
  } catch (error) {
    return [];
  }
}

function formatSummaryTimestamp(value) {
  if (!value) return 'sin medicion reciente';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'sin medicion reciente';
  return date.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function readPracticeStats() {
  try {
    return JSON.parse(
      localStorage.getItem('vokabel-practice-stats') || 'null'
    ) || {
      practiced: 0,
      correct: 0,
      wrong: 0,
      bestStreak: 0
    };
  } catch {
    return {
      practiced: 0,
      correct: 0,
      wrong: 0,
      bestStreak: 0
    };
  }
}

function buildHome() {
  const allThemas = hasLoadedWords() ? getAllThemas() : [];
  const allTypes = hasLoadedWords() ? getAllTypes() : [];
  const homeStats = document.getElementById('homeStats');
  const stats = readPracticeStats();
  const totalAnswered = stats.correct + stats.wrong;
  const pct =
    totalAnswered > 0
      ? Math.round((stats.correct / totalAnswered) * 100) + '%'
      : '—';

  const total = hasLoadedWords() ? words.length : summaryState.totalWords;
  const themes = hasLoadedWords() ? allThemas.length : summaryState.totalThemas;
  const types = hasLoadedWords() ? allTypes.length : summaryState.totalTypes;

  if (loadWordsError && !hasLoadedWords()) {
    homeStats.innerHTML = `
      <div class="stat-box"><div class="stat-n">${stats.practiced}</div><div class="stat-l">practicadas</div></div>
      <div class="stat-box"><div class="stat-n">${stats.correct}</div><div class="stat-l">acertadas</div></div>
      <div class="stat-box"><div class="stat-n">${stats.bestStreak}</div><div class="stat-l">racha récord</div></div>
      <div class="stat-box"><div class="stat-n">${pct}</div><div class="stat-l">% acierto</div></div>`;
    document.getElementById('homeBar').style.width = total ? '100%' : '0';
    document.getElementById('homeBarLabel').textContent = `${loadWordsError} Mostrando la ultima medicion guardada.`;
    document.getElementById('sidebarLevels').innerHTML = `
      <div class="sidebar-stat"><span>Ultimo recuento</span><span>${total}</span></div>
      <div class="sidebar-stat"><span>Actualizado</span><span>${formatSummaryTimestamp(summaryState.lastUpdated)}</span></div>`;
    return;
  }

  homeStats.innerHTML = `
    <div class="stat-box"><div class="stat-n">${stats.practiced}</div><div class="stat-l">practicadas</div></div>
    <div class="stat-box"><div class="stat-n">${stats.correct}</div><div class="stat-l">acertadas</div></div>
    <div class="stat-box"><div class="stat-n">${stats.bestStreak}</div><div class="stat-l">racha récord</div></div>
    <div class="stat-box"><div class="stat-n">${pct}</div><div class="stat-l">% acierto</div></div>`;
  document.getElementById('homeBar').style.width = total ? '100%' : '0';

  if (isLoadingWords && !hasLoadedWords()) {
    document.getElementById('homeBarLabel').textContent = `Catalogo visible al instante. Preparando las ${total} palabras para practicar...`;
  } else if (hasLoadedWords()) {
    document.getElementById('homeBarLabel').textContent = `${total} palabras listas para practicar`;
  } else if (summaryState.lastUpdated) {
    document.getElementById('homeBarLabel').textContent = `${total} palabras segun la ultima medicion guardada`;
  } else {
    document.getElementById('homeBarLabel').textContent = 'Cargando resumen del catalogo...';
  }

  if (hasLoadedWords()) {
    document.getElementById('sidebarLevels').innerHTML = allTypes.map(type => {
      const n = words.filter(w => w.type === type).length;
      return `<div class="sidebar-stat"><span>${type}</span><span>${n} palabras</span></div>`;
    }).join('');
  } else {
    document.getElementById('sidebarLevels').innerHTML = `
      <div class="sidebar-stat"><span>Palabras activas</span><span>${total}</span></div>
      <div class="sidebar-stat"><span>Temas disponibles</span><span>${themes}</span></div>
      <div class="sidebar-stat"><span>Tipos disponibles</span><span>${types}</span></div>
      <div class="sidebar-stat"><span>Actualizado</span><span>${formatSummaryTimestamp(summaryState.lastUpdated)}</span></div>`;
  }
}

function buildSimple() {
  const themaGrid = document.getElementById('themaGrid');

  if (!hasLoadedWords()) {
    themaGrid.innerHTML = '<div class="thema-card">Preparando temas...</div>';
    return;
  }

  const allThemas = getAllThemas();
  const TC = ['#3AA9AB','#4A90D9','#E07AB0','#F0A030','#8B5CF6'];
  themaGrid.innerHTML = allThemas.map((th, i) => {
    const cnt = words.filter(w => w.thema === th).length;
    const name = themaNames[th] || '';
    const color = TC[i % TC.length];
    const [label, bg, fg] = cnt >= 45
      ? ['completo', '#dcfce7', '#15803d']
      : cnt >= 35
        ? ['casi', '#fef9c3', '#854d0e']
        : ['corto', '#fce7f3', '#be185d'];
    return `<div class="thema-card" style="--tc:${color}" onclick="startSession(new Set([${th}]),new Set(),'Thema ${th} — ${name}','Todas las palabras del Thema ${th}')">
      <div class="t-num">Thema ${th}</div>
      <div class="t-name">${name}</div>
      <div class="t-footer">
        <span class="t-cnt">${cnt} palabras</span>
        <span class="t-pill" style="background:${bg};color:${fg}">${label}</span>
      </div>
    </div>`;
  }).join('');
}

function buildAdvanced() {
  selThemas.clear();
  selTypes.clear();

  if (!hasLoadedWords()) {
    document.getElementById('themaChips').innerHTML = '<div class="chip">Preparando temas...</div>';
    document.getElementById('typeChips').innerHTML = '';
    document.getElementById('advSummary').textContent = 'Cargando vocabulario desde Supabase...';
    document.getElementById('btnStart').disabled = true;
    return;
  }

  const allThemas = getAllThemas();
  const allTypes = getAllTypes();

  document.getElementById('themaChips').innerHTML = allThemas.map(th =>
    `<div class="chip" data-th="${th}" onclick="toggleThema(${th},this)">Thema ${th} — ${themaNames[th] || ''}</div>`
  ).join('');
  document.getElementById('typeChips').innerHTML = allTypes.map(t =>
    `<div class="chip" data-type="${t}" onclick="toggleType('${t}',this)">${t}</div>`
  ).join('');
  updateAdvSummary();
}

function toggleThema(th, el) {
  selThemas.has(th) ? selThemas.delete(th) : selThemas.add(th);
  el.classList.toggle('sel', selThemas.has(th));
  updateAdvSummary();
}

function toggleType(t, el) {
  selTypes.has(t) ? selTypes.delete(t) : selTypes.add(t);
  el.classList.toggle('sel', selTypes.has(t));
  updateAdvSummary();
}

function updateAdvSummary() {
  const btn = document.getElementById('btnStart');
  const sum = document.getElementById('advSummary');
  if (!selThemas.size) {
    sum.innerHTML = 'Selecciona al menos un tema.';
    btn.disabled = true;
    return;
  }
  const cnt = words.filter(w => selThemas.has(w.thema) && (selTypes.size === 0 || selTypes.has(w.type))).length;
  const ts = [...selThemas].map(t => `<strong>Thema ${t}</strong>`).join(', ');
  const tps = selTypes.size ? [...selTypes].map(t => `<strong>${t}</strong>`).join(', ') : '<strong>todos los tipos</strong>';
  sum.innerHTML = `${cnt} palabras seleccionadas de ${ts} · ${tps}.`;
  btn.disabled = cnt === 0;
}

function startAdvanced() {
  const lbl = [...selThemas].map(t => `Thema ${t}`).join(' + ');
  const sub = selTypes.size ? [...selTypes].join(', ') : 'Todas las palabras';
  startSession(new Set(selThemas), new Set(selTypes), lbl, sub);
}



Object.assign(window, {
  goScreen,
  goHome,
  toggleThema,
  toggleType,
  startAdvanced
});

buildHome();
loadSummary();
window.addEventListener('load', () => {
  const warmWords = () => {
    if (!hasLoadedWords() && !loadWordsPromise) {
      loadWords().catch(() => {});
    }
  };

  if ('requestIdleCallback' in window) {
    requestIdleCallback(warmWords, { timeout: 4000 });
  } else {
    setTimeout(warmWords, 2500);
  }
});
