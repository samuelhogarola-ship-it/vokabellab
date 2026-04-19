const API_BASE_URL = 'https://aleman-backend.onrender.com';
const API_URL = `${API_BASE_URL}/api/vocabulario`;
const CURRENT_TEXT_URL = 'https://samuelcoachdealeman.com/blog/f/leseverstehen-b1-elektrische-busse-werden-eingef%C3%BChrt';
const STORAGE_KEY = 'samuel_aleman_progreso';
const PRACTICADAS_KEY = 'samuel_aleman_practicadas';
const COOLDOWN_MINUTES = 60;
const NIVELES_CONFIG = {
  a2: 'A2',
  b1: 'B1',
  b2: 'B2',
  c1: 'C1'
};
const TIPOS_CONFIG = {
  flashcards: 'Flashcards',
  test: 'Test',
  lueckentext: 'Lückentext',
  articulo: 'Artículo',
  ordenar: 'Ordenar frases'
};

let ejercicios = [];
let indice = 0;
let respuestas = [];
let seleccionActual = null;
let totalPalabras = 10;
let vocabularioCacheado = null;
let nivelSeleccionado = 'b1';
let actividadesSeleccionadas = [];
let palabrasDisponiblesNivel = [];
let rachaActual = 0;
let erroresUltimoResultado = [];
let countdownInterval = null;
let autoAdvanceTimeout = null;
let respuestaBloqueada = false;

const $ = id => document.getElementById(id);
const setDisplay = (id, value) => { $(id).style.display = value; };
const show = (id, value = 'block') => setDisplay(id, value);
const hide = id => setDisplay(id, 'none');

function irAPantalla(screenId) {
  ['screen-content', 'screen-activity', 'screen-ejercicio', 'screen-resultado'].forEach(hide);
  show(screenId);
}

function snapshotRespuesta(ej, raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  if (Array.isArray(raw) && raw.length === 0) return null;
  return {
    pregunta: ej.pregunta,
    tuya: textoUsuario(ej, raw),
    correcta: textoCorrecta(ej),
    correcto: evaluar(ej, raw),
    _raw: Array.isArray(raw) ? [...raw] : raw,
    palabraBase: ej.palabraBase || ej.pregunta,
    ejercicioIndex: indice,
    ejercicioOriginal: { ...ej }
  };
}

function guardarProgreso() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ejercicios,
      indice,
      respuestas,
      totalPalabras,
      nivelSeleccionado,
      actividadesSeleccionadas,
      ts: Date.now()
    }));
  } catch (e) {}
}

function cargarProgresoGuardado() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (Date.now() - data.ts > 86400000) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return data;
  } catch (e) {
    return null;
  }
}

function limpiarProgreso() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
}

function getPalabrasStats() {
  try {
    const raw = localStorage.getItem(PRACTICADAS_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw);
    if (Date.now() - data.ts > 7 * 86400000) {
      localStorage.removeItem(PRACTICADAS_KEY);
      return {};
    }
    if (data.stats && typeof data.stats === 'object') return data.stats;
    if (Array.isArray(data.palabras)) {
      return Object.fromEntries(
        data.palabras.map(palabra => [
          palabra,
          { aciertos: 1, fallos: 0, completada: true, ultimaVezPorNivel: {} }
        ])
      );
    }
    return {};
  } catch (e) {
    return {};
  }
}

function getNivelProgressKey(nivel = nivelSeleccionado) {
  return normalizarNivelValor(mapNivelSeleccionado(nivel));
}

function getPalabrasUsadas() {
  const stats = getPalabrasStats();
  return Object.entries(stats)
    .filter(([, stat]) => stat && stat.completada)
    .map(([palabra]) => palabra);
}

function guardarPalabrasUsadas(nuevas) {
  try {
    const actuales = getPalabrasStats();
    const stats = { ...actuales };
    nuevas.filter(Boolean).forEach(palabra => {
      const previo = stats[palabra] || { aciertos: 0, fallos: 0, completada: false, ultimaVezPorNivel: {} };
      stats[palabra] = {
        aciertos: Math.max(previo.aciertos, 1),
        fallos: previo.fallos,
        completada: true,
        ultimaVezPorNivel: previo.ultimaVezPorNivel || {}
      };
    });
    localStorage.setItem(PRACTICADAS_KEY, JSON.stringify({
      stats,
      ts: Date.now()
    }));
  } catch (e) {}
}

function actualizarStatsPalabras(respuestasSesion) {
  try {
    const statsActuales = getPalabrasStats();
    const stats = { ...statsActuales };

    respuestasSesion.filter(Boolean).forEach(r => {
      const palabra = r.palabraBase;
      if (!palabra) return;
      const previo = stats[palabra] || { aciertos: 0, fallos: 0, completada: false, ultimaVezPorNivel: {} };
      const aciertos = previo.aciertos + (r.correcto ? 1 : 0);
      const fallos = previo.fallos + (r.correcto ? 0 : 1);
      stats[palabra] = {
        aciertos,
        fallos,
        completada: previo.completada || r.correcto,
        ultimaVezPorNivel: previo.ultimaVezPorNivel || {}
      };
    });

    localStorage.setItem(PRACTICADAS_KEY, JSON.stringify({
      stats,
      ts: Date.now()
    }));
  } catch (e) {}
}

function resetPalabrasUsadas() {
  try { localStorage.removeItem(PRACTICADAS_KEY); } catch (e) {}
}

function registrarAparicion(palabra, nivel = nivelSeleccionado) {
  try {
    if (!palabra) return;
    const statsActuales = getPalabrasStats();
    const previo = statsActuales[palabra] || { aciertos: 0, fallos: 0, completada: false, ultimaVezPorNivel: {} };
    const claveNivel = getNivelProgressKey(nivel);
    statsActuales[palabra] = {
      ...previo,
      ultimaVezPorNivel: {
        ...(previo.ultimaVezPorNivel || {}),
        [claveNivel]: Date.now()
      }
    };
    localStorage.setItem(PRACTICADAS_KEY, JSON.stringify({
      stats: statsActuales,
      ts: Date.now()
    }));
  } catch (e) {}
}

function registrarAparicionesSesion(palabras, nivel = nivelSeleccionado) {
  [...new Set((palabras || []).filter(Boolean))].forEach(palabra => registrarAparicion(palabra, nivel));
}

function cooldownSuperado(palabra, stats = getPalabrasStats(), nivel = nivelSeleccionado, minutosCooldown = COOLDOWN_MINUTES) {
  const claveNivel = getNivelProgressKey(nivel);
  const ultima = stats[palabra]?.ultimaVezPorNivel?.[claveNivel];
  if (!ultima) return true;
  return (Date.now() - ultima) > minutosCooldown * 60 * 1000;
}

function getUltimaVezPalabraNivel(palabra, stats = getPalabrasStats(), nivel = nivelSeleccionado) {
  const claveNivel = getNivelProgressKey(nivel);
  return stats[palabra]?.ultimaVezPorNivel?.[claveNivel] || 0;
}

function showError(msg) {
  const el = $('error-msg');
  el.textContent = msg;
  show('error-msg');
}

function crearTonoDataUri(frecuencia, duracion = 0.12) {
  const sampleRate = 8000;
  const samples = Math.floor(sampleRate * duracion);
  const buffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(buffer);
  const writeString = (offset, text) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples * 2, true);

  for (let i = 0; i < samples; i += 1) {
    const fade = 1 - (i / samples);
    const sampleValue = Math.sin((2 * Math.PI * frecuencia * i) / sampleRate) * 0.28 * fade;
    view.setInt16(44 + i * 2, sampleValue * 32767, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return `data:audio/wav;base64,${btoa(binary)}`;
}

const audioCorrecto = new Audio(crearTonoDataUri(760, 0.16));
const audioIncorrecto = new Audio(crearTonoDataUri(180, 0.12));
audioCorrecto.preload = 'auto';
audioIncorrecto.preload = 'auto';

function reproducirSonido(correcto) {
  try {
    const audio = correcto ? audioCorrecto : audioIncorrecto;
    audio.pause();
    audio.currentTime = 0;
    audio.volume = 0.28;
    audio.play().catch(() => {});
  } catch (e) {}
}

function limpiarTemporizadores() {
  if (countdownInterval) window.clearInterval(countdownInterval);
  if (autoAdvanceTimeout) window.clearTimeout(autoAdvanceTimeout);
  countdownInterval = null;
  autoAdvanceTimeout = null;
  const countdown = $('next-countdown');
  if (countdown) {
    countdown.textContent = '';
    countdown.classList.remove('visible');
  }
}

function guardarRespuestaActual() {
  respuestas[indice] = snapshotRespuesta(ejercicios[indice], seleccionActual);
  guardarProgreso();
}

function avanzarTrasRespuesta() {
  guardarRespuestaActual();
  const esUltimo = indice === ejercicios.length - 1;

  if (esUltimo) {
    mostrarResultado();
    return;
  }

  indice += 1;
  renderEjercicio(ejercicios[indice], indice + 1, ejercicios.length, respuestas[indice]?._raw ?? null);
  guardarProgreso();
}

function iniciarCuentaAtrasAutoavance() {
  limpiarTemporizadores();
  const countdown = $('next-countdown');
  let segundos = 4;

  if (countdown) {
    countdown.textContent = `Siguiente en ${segundos}...`;
    countdown.classList.add('visible');
  }

  countdownInterval = window.setInterval(() => {
    segundos -= 1;
    if (countdown && segundos > 0) countdown.textContent = `Siguiente en ${segundos}...`;
    if (segundos <= 0 && countdownInterval) {
      window.clearInterval(countdownInterval);
      countdownInterval = null;
    }
  }, 1000);

  autoAdvanceTimeout = window.setTimeout(() => {
    limpiarTemporizadores();
    avanzarTrasRespuesta();
  }, 4000);
}

function actualizarRacha(correcto) {
  rachaActual = correcto ? rachaActual + 1 : 0;
  const pill = $('streak-pill');
  const count = $('streak-count');
  if (!pill || !count) return;
  count.textContent = rachaActual;
  pill.classList.toggle('visible', rachaActual >= 1);
}

function renderProgresoDots(actual, total) {
  const wrap = $('progreso-dots');
  if (!wrap) return;
  wrap.innerHTML = '';
  for (let i = 1; i <= total; i += 1) {
    const dot = document.createElement('span');
    dot.className = 'progreso-dot';
    if (i < actual) dot.classList.add('done');
    if (i === actual) dot.classList.add('active');
    wrap.appendChild(dot);
  }
}

function animarCambioPregunta() {
  const card = $('screen-ejercicio');
  if (!card) return;
  card.classList.remove('question-enter');
  void card.offsetWidth;
  card.classList.add('question-enter');
}

function getTraduccionEjercicio(ej) {
  if (ej.tipo === 'ordenar') return '';
  if (ej.traduccionBase) return ej.traduccionBase;
  if (ej.tipo === 'flashcards') return ej.respuestaCorrecta;
  if (ej.traducciones) return ej.traducciones[textoCorrecta(ej)] || '';
  return '';
}

function configurarTraduccion(ej) {
  const btn = $('btn-toggle-traduccion');
  const panel = $('translation-panel');
  if (!btn || !panel) return;

  const traduccion = getTraduccionEjercicio(ej);
  panel.textContent = traduccion;
  panel.classList.remove('visible');
  btn.textContent = 'Ver traducción';
  btn.style.display = traduccion ? 'inline-flex' : 'none';

  btn.onclick = () => {
    const visible = panel.classList.toggle('visible');
    btn.textContent = visible ? 'Ocultar traducción' : 'Ver traducción';
  };
}

function limpiarFeedbackRespuesta() {
  const el = $('respuesta-feedback');
  if (!el) return;
  el.textContent = '';
  el.className = 'respuesta-feedback';
  hide('respuesta-feedback');
}

function mostrarFeedbackRespuesta(correcto, registrar = true) {
  const el = $('respuesta-feedback');
  if (!el) return;
  el.textContent = correcto ? 'Gut!' : ':(';
  el.className = `respuesta-feedback feedback-popup ${correcto ? 'correcta' : 'incorrecta'}`;
  show('respuesta-feedback');
  if (registrar) {
    reproducirSonido(correcto);
    actualizarRacha(correcto);
  }
  window.setTimeout(() => {
    if (el.classList.contains('feedback-popup')) hide('respuesta-feedback');
  }, 3000);
}

function aplicarFeedbackOpciones(ej, respuestaElegida, registrar = true) {
  const botones = [...document.querySelectorAll('#opciones-wrap .opcion-btn')];
  const correcta = String(ej.respuestaCorrecta || '').toUpperCase();
  const elegida = String(respuestaElegida || '').toUpperCase();
  const acierto = elegida === correcta;

  botones.forEach(btn => {
    const opcion = btn.dataset.opcion;
    btn.disabled = true;
    btn.classList.remove('seleccionada');

    if (opcion === correcta) {
      btn.classList.add('resultado-correcta');
      if (ej.tipo === 'articulo') btn.classList.add('articulo-correcta-destacada');
    } else {
      btn.classList.add('resultado-incorrecta-suave');
    }

    if (opcion === elegida && opcion !== correcta) {
      btn.classList.add('resultado-incorrecta');
    }
  });

  mostrarFeedbackRespuesta(acierto, registrar);
}

function getActividadesActivas() {
  return [...document.querySelectorAll('#practice-selector .config-chip.active')]
    .map(btn => btn.dataset.modo)
    .filter(Boolean);
}

function getNivelActivo() {
  return document.querySelector('#level-selector .config-chip.active')?.dataset.level || 'b1';
}

function getTiposEfectivos(actividades = actividadesSeleccionadas) {
  return Array.isArray(actividades) && actividades.length > 0 ? actividades : Object.keys(TIPOS_CONFIG);
}

function normalizarActividadGuardada(valor) {
  if (valor === 'traduccion') return 'flashcards';
  if (valor === 'completar') return 'lueckentext';
  return valor;
}

function normalizarActividadesGuardadas(valor) {
  if (Array.isArray(valor)) return valor.map(normalizarActividadGuardada);
  if (typeof valor === 'string') return [normalizarActividadGuardada(valor)];
  return [];
}

function actualizarNivelSeleccionado() {
  nivelSeleccionado = getNivelActivo();
}

function mapNivelSeleccionado(nivel = nivelSeleccionado) {
  return {
    a2: 'A2',
    b1: 'B1',
    b2: 'B2',
    c1: 'C1'
  }[nivel] || 'B1';
}

function normalizarNivelGuardado(valor) {
  if (valor === 'a2b1') return 'b1';
  return valor;
}

function normalizarNivelValor(valor) {
  return String(valor || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
    .replace(/[-–—]/g, '')
    .trim();
}

function getClaveNivelDato(valor) {
  const normalizado = normalizarNivelValor(valor);

  if (normalizado === 'a2') return 'a2';
  if (normalizado === 'b1') return 'b1';
  if (normalizado === 'b2') return 'b2';
  if (normalizado === 'c1') return 'c1';

  // Ignoramos niveles compuestos legacy como A2-B1 para no mezclar pools.
  return '';
}

function actualizarHintActividad() {
  actividadesSeleccionadas = getActividadesActivas();
  const hint = $('practice-hint');

  if (actividadesSeleccionadas.length === 0) {
    hint.textContent = 'Si no eliges ninguna actividad, practicarás con todos los formatos.';
    return;
  }
  hint.textContent = `Practicarás con: ${actividadesSeleccionadas.map(tipo => TIPOS_CONFIG[tipo]).join(', ')}.`;
}

function activarActividadesEnPantalla(actividades) {
  const activas = Array.isArray(actividades) ? actividades : [];
  document.querySelectorAll('#practice-selector .config-chip').forEach(btn => {
    btn.classList.toggle('active', activas.includes(btn.dataset.modo));
  });
  actividadesSeleccionadas = activas;
  actualizarHintActividad();
}

function activarNivelEnPantalla(nivel) {
  document.querySelectorAll('#level-selector .config-chip').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.level === nivel);
  });
  nivelSeleccionado = nivel || 'b1';
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sample(arr, n) {
  return shuffle(arr).slice(0, Math.min(n, arr.length));
}

function normalizar(txt) {
  return String(txt || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,!?;:¡¿]/g, '')
    .trim();
}

function extraerArticulo(aleman) {
  const m = String(aleman || '').match(/^(der|die|das)\s+/i);
  return m ? m[1].toLowerCase() : null;
}

function quitarArticulo(aleman) {
  return String(aleman || '').replace(/^(der|die|das)\s+/i, '').trim();
}

function escaparRegex(texto) {
  return String(texto || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getStatsPalabra(palabraBase) {
  return getPalabrasStats()[palabraBase] || { aciertos: 0, fallos: 0, completada: false };
}

function getCategoriaBase(item) {
  return normalizar(item?.categoria || '');
}

function getCategoriaGramatical(item) {
  const categoria = getCategoriaBase(item);
  if (/(adjet|adjektiv)/.test(categoria)) return 'adjetivo';
  if (/(verb)/.test(categoria)) return 'verbo';
  if (/(sustant|substantiv|noun|nombre)/.test(categoria) || extraerArticulo(item?.aleman)) return 'sustantivo';
  if (/(adverb)/.test(categoria)) return 'adverbio';
  if (/(pron)/.test(categoria)) return 'pronombre';
  if (/(prep)/.test(categoria)) return 'preposicion';
  if (/(expres|locuc|frase|idiom)/.test(categoria) || esMultiPalabra(item?.aleman)) return 'expresion';
  return categoria || 'otro';
}

function esMultiPalabra(texto) {
  return String(texto || '').trim().includes(' ');
}

function puntuarDistractor(candidata, correcta, campo) {
  let score = 0;
  if (getCategoriaGramatical(candidata) === getCategoriaGramatical(correcta)) score += 8;
  if (getCategoriaBase(candidata) && getCategoriaBase(candidata) === getCategoriaBase(correcta)) score += 4;
  if (Boolean(extraerArticulo(candidata.aleman)) === Boolean(extraerArticulo(correcta.aleman))) score += 3;
  if (esMultiPalabra(candidata[campo]) === esMultiPalabra(correcta[campo])) score += 2;

  const diffCampo = Math.abs(String(candidata[campo] || '').length - String(correcta[campo] || '').length);
  const diffAleman = Math.abs(String(candidata.aleman || '').length - String(correcta.aleman || '').length);
  score += Math.max(0, 4 - Math.min(diffCampo, 4));
  score += Math.max(0, 3 - Math.min(diffAleman, 3));

  const candStats = getStatsPalabra(candidata.aleman);
  score += Math.min(candStats.fallos, 3);
  return score;
}

function filtrarPorNivel(lista, nivel = nivelSeleccionado) {
  const objetivo = getClaveNivelDato(mapNivelSeleccionado(nivel));
  if (!objetivo) return [];
  return lista.filter(item => getClaveNivelDato(item.nivel || '') === objetivo);
}

function actualizarDisponibilidadNivel() {
  if (!vocabularioCacheado) return;

  palabrasDisponiblesNivel = filtrarPorNivel(vocabularioCacheado, nivelSeleccionado);
  const disponibles = palabrasDisponiblesNivel.length;
  const slider = $('slider-palabras');
  const status = $('level-status');
  const btn = $('btn-empezar');

  $('slider-max-label').textContent = disponibles;

  if (disponibles === 0) {
    slider.min = 0;
    slider.max = 0;
    slider.value = 0;
    slider.disabled = true;
    $('num-palabras-display').textContent = '0';
    status.textContent = 'Todavía no hay vocabulario disponible para este nivel.';
    status.className = 'level-status empty';
    btn.disabled = true;
    actualizarPanelProgresoSemanal();
    return;
  }

  slider.disabled = false;
  slider.min = Math.min(5, disponibles);
  slider.max = disponibles;
  slider.value = String(Math.min(Number(slider.value) || slider.min, disponibles));
  $('num-palabras-display').textContent = slider.value;
  status.textContent = `${disponibles} palabras disponibles para este nivel.`;
  status.className = 'level-status ready';
  btn.disabled = false;
  actualizarPanelProgresoSemanal();
}

async function cargarVocabulario() {
  const res = await fetch(API_URL);
  if (!res.ok) {
    let detalle = `HTTP ${res.status}`;
    try {
      const errorData = await res.json();
      if (errorData?.details) {
        detalle = `${errorData.error || "Error"}: ${errorData.details}`;
      } else if (errorData?.error) {
        detalle = errorData.error;
      }
    } catch (e) {}
    throw new Error(detalle);
  }
  const data = await res.json();
  if (!Array.isArray(data.palabras)) throw new Error('Formato incorrecto');
  const lista = data.palabras
    .filter(p => p.aleman && p.espanol)
    .map(p => ({ ...p, frase: p.frase || '', nivel: p.nivel || '' }));

  return lista;
}

function getPoolDistractoresNivel() {
  return Array.isArray(palabrasDisponiblesNivel) && palabrasDisponiblesNivel.length > 0
    ? palabrasDisponiblesNivel
    : filtrarPorNivel(vocabularioCacheado || [], nivelSeleccionado);
}

function seleccionarDistractoresCompatibles(pool, correcta, campo, minimo = 2, ideal = 3) {
  const categoriaObjetivo = getCategoriaGramatical(correcta);
  const base = pool.filter(p =>
    normalizar(p[campo]) !== normalizar(correcta[campo]) &&
    normalizar(p.aleman) !== normalizar(correcta.aleman)
  );

  const mismaCategoriaNivel = base
    .filter(p => getCategoriaGramatical(p) === categoriaObjetivo)
    .map(p => ({ item: p, score: puntuarDistractor(p, correcta, campo) }))
    .sort((a, b) => b.score - a.score)
    .map(entry => entry.item);

  if (mismaCategoriaNivel.length >= minimo) {
    return mismaCategoriaNivel.slice(0, Math.min(ideal, mismaCategoriaNivel.length));
  }

  const fallbackGlobal = (vocabularioCacheado || [])
    .filter(p =>
      normalizar(p[campo]) !== normalizar(correcta[campo]) &&
      normalizar(p.aleman) !== normalizar(correcta.aleman) &&
      getCategoriaGramatical(p) === categoriaObjetivo
    )
    .map(p => ({ item: p, score: puntuarDistractor(p, correcta, campo) }))
    .sort((a, b) => b.score - a.score)
    .map(entry => entry.item);

  const combinados = [...new Map([...mismaCategoriaNivel, ...fallbackGlobal].map(item => [item.aleman, item])).values()];
  return combinados.slice(0, Math.min(ideal, combinados.length));
}

function crearTestOpciones(lista, correcta, campo) {
  const distractores = seleccionarDistractoresCompatibles(lista, correcta, campo, 2, 3).map(p => p[campo]);

  if (distractores.length < 2) return null;

  const opciones = shuffle([correcta[campo], ...distractores]);
  const letras = ['A', 'B', 'C', 'D'];
  const mapa = {};
  opciones.forEach((texto, i) => { mapa[letras[i]] = texto; });
  return { mapa, correcta: letras.find(l => mapa[l] === correcta[campo]) };
}

function generarEjercicios(lista, numPalabras, actividadesActivas = actividadesSeleccionadas) {
  const activos = getTiposEfectivos(actividadesActivas);
  const porTipo = Math.max(1, Math.ceil(numPalabras / activos.length));
  const baseLista = [...lista];
  const poolNivel = getPoolDistractoresNivel();
  const baseArticulos = activos.length === 1 && activos[0] === 'articulo'
    ? seleccionarPalabrasPriorizadas(poolNivel.filter(p => extraerArticulo(p.aleman)), numPalabras)
    : baseLista.filter(p => extraerArticulo(p.aleman));

  const candidatosPorTipo = {
    flashcards: baseLista.map(item => ({
      tipo: 'flashcards',
      pregunta: item.aleman,
      preguntaSub: 'Piensa la traducción y marca si la sabías antes de verla',
      respuestaCorrecta: item.espanol,
      palabraBase: item.aleman,
      traduccionBase: item.espanol
    })),
    test: baseLista.map(item => {
      const pack = crearTestOpciones(poolNivel, item, 'espanol');
      if (!pack) return null;
      return {
        tipo: 'test',
        pregunta: item.aleman,
        preguntaSub: 'Selecciona la traducción correcta',
        opcionA: pack.mapa.A,
        opcionB: pack.mapa.B,
        opcionC: pack.mapa.C,
        opcionD: pack.mapa.D,
        respuestaCorrecta: pack.correcta,
        palabraBase: item.aleman,
        traduccionBase: item.espanol
      };
    }).filter(Boolean),
    lueckentext: baseLista.filter(p => p.frase).map(item => {
      const formasCandidatas = [item.aleman, quitarArticulo(item.aleman)]
        .map(txt => String(txt || '').trim())
        .filter(Boolean)
        .filter((txt, idx, arr) => arr.indexOf(txt) === idx)
        .sort((a, b) => b.length - a.length);

      let frase = item.frase;
      let encontrada = false;
      formasCandidatas.forEach(forma => {
        if (encontrada) return;
        const regex = new RegExp(`(^|\\b)${escaparRegex(forma)}(?=\\b)`, 'i');
        const reemplazada = frase.replace(regex, '$1___');
        if (reemplazada !== frase) {
          frase = reemplazada;
          encontrada = true;
        }
      });
      if (!encontrada) return null;

      const pack = crearTestOpciones(poolNivel, item, 'aleman');
      if (!pack) return null;

      return {
        tipo: 'lueckentext',
        pregunta: frase,
        preguntaSub: 'Elige la palabra que falta',
        opcionA: pack.mapa.A,
        opcionB: pack.mapa.B,
        opcionC: pack.mapa.C,
        opcionD: pack.mapa.D,
        respuestaCorrecta: pack.correcta,
        traducciones: Object.fromEntries(
          Object.values(pack.mapa).map(aleman => [
            aleman,
            lista.find(p => p.aleman === aleman)?.espanol || ''
          ])
        ),
        palabraBase: item.aleman,
        traduccionBase: item.espanol
      };
    }).filter(Boolean),
    articulo: baseArticulos.map(item => {
      const art = extraerArticulo(item.aleman);
      const mapa = { A: 'der', B: 'die', C: 'das' };
      return {
        tipo: 'articulo',
        pregunta: quitarArticulo(item.aleman),
        preguntaSub: '¿Qué artículo lleva este sustantivo?',
        opcionA: 'der',
        opcionB: 'die',
        opcionC: 'das',
        respuestaCorrecta: Object.keys(mapa).find(k => mapa[k] === art),
        palabraBase: item.aleman,
        traduccionBase: item.espanol
      };
    }),
    ordenar: baseLista
      .filter(item => String(item.frase || '').trim())
      .map(item => {
        const frase = String(item.frase || '').trim();
        return {
          tipo: 'ordenar',
          pregunta: 'Ordena la oración correctamente',
          preguntaSub: 'Clica las palabras en el orden correcto',
          palabras: shuffle(frase.split(' ')),
          respuestaCorrecta: frase,
          palabraBase: item.aleman,
          traduccionBase: item.espanol
        };
      })
  };

  const ejs = [];
  activos.forEach(tipo => {
    ejs.push(...sample(candidatosPorTipo[tipo] || [], porTipo));
  });

  if (ejs.length < numPalabras) {
    const existentes = new Set(ejs.map(ej => `${ej.tipo}::${ej.palabraBase}`));
    const sobrantes = shuffle(
      activos.flatMap(tipo => (candidatosPorTipo[tipo] || []).filter(ej => !existentes.has(`${ej.tipo}::${ej.palabraBase}`)))
    );
    ejs.push(...sobrantes.slice(0, numPalabras - ejs.length));
  }

  return shuffle(ejs).slice(0, Math.min(numPalabras, ejs.length));
}

function renderEjercicio(ej, num, total, respuestaAnterior) {
  limpiarTemporizadores();
  animarCambioPregunta();
  respuestaBloqueada = Boolean(respuestaAnterior);
  seleccionActual = Array.isArray(respuestaAnterior) ? [...respuestaAnterior] : respuestaAnterior ?? null;
  $('btn-siguiente').disabled = false;
  $('btn-siguiente').textContent = num === total ? 'Ver resultado →' : 'Siguiente →';
  $('btn-atras').disabled = num <= 1;
  $('prog-actual').textContent = num;
  $('prog-total').textContent = total;
  $('prog-fill').style.width = `${((num - 1) / total) * 100}%`;
  renderProgresoDots(num, total);

  const labels = {
    flashcards: 'Flashcards',
    test: 'Test',
    lueckentext: 'Lückentext',
    articulo: 'Artículo',
    ordenar: 'Ordenar frases'
  };

  $('tipo-badge').textContent = labels[ej.tipo];
  $('pregunta-texto').textContent = ej.pregunta;
  $('pregunta-sub').textContent = ej.preguntaSub || '';
  configurarTraduccion(ej);
  limpiarFeedbackRespuesta();
  $('opciones-wrap').innerHTML = '';
  hide('opciones-wrap');
  hide('flashcard-wrap');
  hide('input-wrap');
  hide('ordenar-wrap');

  if (ej.tipo === 'flashcards') {
    show('flashcard-wrap');
    const card = $('flashcard-card');
    $('flashcard-front').textContent = ej.pregunta;
    $('flashcard-back').textContent = ej.respuestaCorrecta;
    card.classList.toggle('revealed', Boolean(respuestaAnterior));
    seleccionActual = respuestaAnterior ?? null;
    $('btn-siguiente').disabled = false;
    $('btn-flashcard-si').disabled = Boolean(respuestaAnterior);
    $('btn-flashcard-no').disabled = Boolean(respuestaAnterior);
    $('btn-flashcard-si').onclick = () => {
      if (respuestaBloqueada) return;
      respuestaBloqueada = true;
      seleccionActual = 'si';
      card.classList.add('revealed');
      mostrarFeedbackRespuesta(true);
      $('btn-flashcard-si').disabled = true;
      $('btn-flashcard-no').disabled = true;
      $('btn-siguiente').disabled = false;
      iniciarCuentaAtrasAutoavance();
    };
    $('btn-flashcard-no').onclick = () => {
      if (respuestaBloqueada) return;
      respuestaBloqueada = true;
      seleccionActual = 'no';
      card.classList.add('revealed');
      mostrarFeedbackRespuesta(false);
      $('btn-flashcard-si').disabled = true;
      $('btn-flashcard-no').disabled = true;
      $('btn-siguiente').disabled = false;
      iniciarCuentaAtrasAutoavance();
    };
    if (respuestaAnterior) {
      mostrarFeedbackRespuesta(String(respuestaAnterior).toLowerCase() === 'si', false);
    }
    return;
  }

  if (ej.tipo === 'ordenar') {
    show('ordenar-wrap');
    const banco = $('banco-palabras');
    const construccion = $('orden-construccion');
    banco.innerHTML = '';
    construccion.innerHTML = '';
    construccion.classList.remove('orden-correcta', 'orden-incorrecta');
    seleccionActual = [];

    const addWord = (word, sourceChip) => {
      if (respuestaBloqueada) return;
      sourceChip.classList.add('usada');
      seleccionActual.push(word);
      const c2 = document.createElement('span');
      c2.className = 'palabra-chip';
      c2.textContent = word;
      c2.onclick = () => {
        if (respuestaBloqueada) return;
        const idx = seleccionActual.findIndex((w, i) => w === word && i === [...construccion.children].indexOf(c2));
        if (idx > -1) {
          seleccionActual.splice(idx, 1);
        } else {
          const fallback = seleccionActual.lastIndexOf(word);
          if (fallback > -1) seleccionActual.splice(fallback, 1);
        }
        sourceChip.classList.remove('usada');
        c2.remove();
        $('btn-siguiente').disabled = false;
      };
      construccion.appendChild(c2);
      $('btn-siguiente').disabled = false;

      if (seleccionActual.length === ej.respuestaCorrecta.split(' ').length) {
        respuestaBloqueada = true;
        [...banco.children].forEach(chip => {
          chip.classList.add('bloqueada');
          chip.style.pointerEvents = 'none';
        });
        const correcto = evaluar(ej, seleccionActual);
        construccion.classList.add(correcto ? 'orden-correcta' : 'orden-incorrecta');
        mostrarFeedbackRespuesta(correcto);
        iniciarCuentaAtrasAutoavance();
      }
    };

    ej.palabras.forEach(p => {
      const chip = document.createElement('span');
      chip.className = 'palabra-chip';
      chip.textContent = p;
      chip.onclick = () => {
        if (chip.classList.contains('usada')) return;
        addWord(p, chip);
      };
      banco.appendChild(chip);
    });

    if (Array.isArray(respuestaAnterior) && respuestaAnterior.length > 0) {
      respuestaAnterior.forEach(p => {
        const chip = [...banco.children].find(c => c.textContent === p && !c.classList.contains('usada'));
        if (chip) chip.click();
      });
    }

    return;
  }

  const opciones = [
    { l: 'A', t: ej.opcionA },
    { l: 'B', t: ej.opcionB },
    { l: 'C', t: ej.opcionC }
  ];
  if (ej.opcionD) opciones.push({ l: 'D', t: ej.opcionD });

  show('opciones-wrap', 'grid');
  $('opciones-wrap').className = ej.tipo === 'articulo' ? 'opciones tres' : 'opciones';

  opciones.forEach(op => {
    const btn = document.createElement('button');
    btn.className = 'opcion-btn';
    btn.dataset.opcion = op.l;
    const contenido = document.createElement('div');
    contenido.className = 'opcion-contenido';
    const texto = document.createElement('span');
    texto.textContent = op.t;
    contenido.appendChild(texto);

    if (ej.tipo === 'articulo') {
      btn.classList.add(`articulo-${op.t.toLowerCase()}`);
    }

    if (ej.tipo === 'lueckentext' && ej.traducciones) {
      const ayuda = document.createElement('span');
      ayuda.textContent = '💬';
      ayuda.className = 'ayuda-icono';
      const tooltip = document.createElement('span');
      tooltip.className = 'tooltip-traduccion';
      tooltip.textContent = ej.traducciones[op.t] || '';
      ayuda.onclick = e => {
        e.stopPropagation();
        tooltip.style.display = tooltip.style.display === 'none' ? 'inline' : 'none';
      };
      contenido.appendChild(ayuda);
      contenido.appendChild(tooltip);
    }

    btn.appendChild(contenido);
    if (respuestaAnterior === op.l) btn.classList.add('seleccionada');

    btn.onclick = e => {
      if (e.target.classList.contains('ayuda-icono')) return;
      if (respuestaBloqueada) return;
      respuestaBloqueada = true;
      seleccionActual = op.l;
      aplicarFeedbackOpciones(ej, op.l);
      $('btn-siguiente').disabled = false;
      iniciarCuentaAtrasAutoavance();
    };

    $('opciones-wrap').appendChild(btn);
  });

  if (respuestaAnterior) {
    aplicarFeedbackOpciones(ej, respuestaAnterior, false);
    $('btn-siguiente').disabled = false;
  }
}

function evaluar(ej, respuesta) {
  if (ej.tipo === 'flashcards') return String(respuesta || '').toLowerCase() === 'si';
  if (ej.tipo === 'ordenar') return normalizar((respuesta || []).join(' ')) === normalizar(ej.respuestaCorrecta);
  return String(respuesta || '').toUpperCase() === String(ej.respuestaCorrecta || '').toUpperCase();
}

function textoUsuario(ej, respuesta) {
  if (ej.tipo === 'flashcards') return String(respuesta || '').toLowerCase() === 'si' ? 'Sí' : 'No la sé';
  if (ej.tipo === 'ordenar') return (respuesta || []).join(' ') || '—';
  return { A: ej.opcionA, B: ej.opcionB, C: ej.opcionC, D: ej.opcionD }[respuesta] || '—';
}

function textoCorrecta(ej) {
  if (ej.tipo === 'flashcards') return ej.respuestaCorrecta;
  if (ej.tipo === 'ordenar') return ej.respuestaCorrecta;
  return { A: ej.opcionA, B: ej.opcionB, C: ej.opcionC, D: ej.opcionD }[ej.respuestaCorrecta] || ej.respuestaCorrecta;
}

function actualizarBloqueContinuar() {
  const btn = $('btn-continuar');
  if (btn) hide('btn-continuar');
  $('btn-reiniciar').textContent = 'Repetir';
}

function mostrarResultado() {
  limpiarTemporizadores();
  limpiarProgreso();
  hide('screen-ejercicio');
  show('screen-resultado');

  const contestadas = respuestas.filter(Boolean);
  const noRespondidas = Math.max(ejercicios.length - contestadas.length, 0);
  actualizarStatsPalabras(contestadas);

  const correctas = contestadas.filter(r => r.correcto).length;
  const total = ejercicios.length;
  const errores = contestadas.filter(r => !r.correcto);
  erroresUltimoResultado = errores;
  const pct = total > 0 ? Math.round((correctas / total) * 100) : 0;

  $('punt-grande').textContent = `${correctas}/${total}`;
  $('result-stats').innerHTML = `
    <span>${correctas} aciertos</span>
    <span>${errores.length} errores</span>
    <span>${noRespondidas} no respondidas</span>
  `;
  $('punt-label').textContent =
    pct >= 80
      ? '¡Sehr gut! Sigue así 🎉'
      : pct >= 50
        ? 'Gut gemacht, sigue practicando 💪'
        : 'Übung macht den Meister — ¡inténtalo de nuevo!';

  const lista = $('resumen-lista');
  lista.innerHTML = '';
  const resumen = errores.length > 0 ? errores : [];
  if (resumen.length === 0) {
    const div = document.createElement('div');
    div.className = 'resumen-item';
    div.innerHTML = '<span class="resumen-icon">✓</span><div><div class="resumen-correcta">No hay fallos para repasar.</div></div>';
    lista.appendChild(div);
  }
  resumen.forEach(r => {
    const div = document.createElement('div');
    div.className = 'resumen-item';
    div.innerHTML = `
      <span class="resumen-icon">${r.correcto ? '✓' : '✗'}</span>
      <div>
        <div class="resumen-pregunta">${r.pregunta}</div>
        ${r.correcto
          ? `<div class="resumen-correcta">${r.tuya}</div>`
          : `<div class="resumen-tuya">Tu respuesta: ${r.tuya}</div><div class="resumen-correcta">Correcta: ${r.correcta}</div>`
        }
      </div>`;
    lista.appendChild(div);
  });

  actualizarPanelProgresoSemanal();
  actualizarBloqueContinuar();
  const btnErrores = $('btn-repasar-errores');
  if (errores.length > 0) {
    btnErrores.onclick = () => {
      const ejerciciosOriginales = [...ejercicios];
      const ejerciciosRepaso = errores
        .map(error =>
          error.ejercicioOriginal ||
          ejerciciosOriginales[error.ejercicioIndex] ||
          ejerciciosOriginales.find(ej => ej.palabraBase === error.palabraBase && ej.pregunta === error.pregunta)
        )
        .filter(Boolean);
      ejercicios = ejerciciosRepaso;
      indice = 0;
      respuestas = Array(ejercicios.length).fill(null);
      rachaActual = 0;
      actualizarRacha(false);
      hide('screen-resultado');
      irAPantalla('screen-ejercicio');
      renderEjercicio(ejercicios[0], 1, ejercicios.length, null);
      guardarProgreso();
    };
    show('btn-repasar-errores');
  } else {
    hide('btn-repasar-errores');
  }
}

function mostrarModalTerminar() {
  const hechos = respuestas.filter(Boolean).length;
  const quedan = ejercicios.length - hechos;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'modal-terminar';
  overlay.innerHTML = `
    <div class="modal-box">
      <span class="modal-emoji">🏳️</span>
      <h3>¿Terminar el test?</h3>
      <p>Llevas <strong>${hechos} ejercicio${hechos !== 1 ? 's' : ''}</strong> completado${hechos !== 1 ? 's' : ''}. Aún te quedan <strong>${quedan}</strong> por hacer.</p>
      <div class="modal-btns">
        <button class="btn-main-solo" id="modal-btn-terminar">Sí, terminar y ver resultados</button>
        <button class="btn-modal-secondary" id="modal-btn-continuar">Seguir el test</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  $('modal-btn-terminar').onclick = () => {
    overlay.remove();
    mostrarResultado();
  };
  $('modal-btn-continuar').onclick = () => overlay.remove();
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
}

function actualizarStatsInicio() {
  actualizarPanelProgresoSemanal();
}

function getResumenProgresoNivel() {
  const disponibles = vocabularioCacheado ? filtrarPorNivel(vocabularioCacheado, nivelSeleccionado) : [];
  const usadasSet = new Set(getPalabrasUsadas());
  const practicadas = disponibles.filter(p => usadasSet.has(p.aleman)).length;
  const pendientes = Math.max(disponibles.length - practicadas, 0);
  const porcentaje = disponibles.length > 0 ? Math.round((practicadas / disponibles.length) * 100) : 0;
  return { disponibles: disponibles.length, practicadas, pendientes, porcentaje };
}

function actualizarPanelProgresoSemanal() {
  const resumen = getResumenProgresoNivel();
  const nivelTexto = mapNivelSeleccionado(nivelSeleccionado);
  $('weekly-progress-title').textContent = `Progreso ${nivelTexto}`;
  $('weekly-progress-pct').textContent = `${resumen.porcentaje}% completado`;
  $('weekly-progress-fill').style.width = `${resumen.porcentaje}%`;
  $('weekly-progress-main').textContent = `${resumen.practicadas} / ${resumen.disponibles} palabras practicadas`;
  $('weekly-progress-sub').textContent = `${resumen.disponibles} palabras en este nivel`;
  $('btn-reset-progress').disabled = resumen.practicadas === 0;
}

function seleccionarSinRepetir(todasLasPalabras, nivel, n) {
  const stats = getPalabrasStats();
  const unseen = shuffle(
    todasLasPalabras.filter(p => !stats[p.aleman] || (stats[p.aleman].aciertos + stats[p.aleman].fallos) === 0)
  );

  const vistasFueraCooldown = [...todasLasPalabras]
    .filter(p => {
      const stat = stats[p.aleman];
      return stat && !unseen.find(x => x.aleman === p.aleman) && cooldownSuperado(p.aleman, stats, nivel);
    })
    .sort((a, b) => {
      const sa = stats[a.aleman] || { fallos: 0, aciertos: 0 };
      const sb = stats[b.aleman] || { fallos: 0, aciertos: 0 };
      const diffFallos = (sb.fallos || 0) - (sa.fallos || 0);
      if (diffFallos !== 0) return diffFallos;

      const diffUltimaVez = getUltimaVezPalabraNivel(a.aleman, stats, nivel) - getUltimaVezPalabraNivel(b.aleman, stats, nivel);
      if (diffUltimaVez !== 0) return diffUltimaVez;

      return Math.random() - 0.5;
    });

  const resto = shuffle(
    todasLasPalabras.filter(p =>
      !unseen.find(x => x.aleman === p.aleman) &&
      !vistasFueraCooldown.find(x => x.aleman === p.aleman)
    )
  );

  return [...unseen, ...vistasFueraCooldown, ...resto].slice(0, Math.min(n, todasLasPalabras.length));
}

function seleccionarPalabrasPriorizadas(lista, cantidad) {
  return seleccionarSinRepetir(lista, nivelSeleccionado, cantidad);
}

async function iniciar(continuar = false) {
  hide('screen-activity');
  hide('error-msg');
  show('loading');

  if (!continuar) {
    try {
      const palabras = vocabularioCacheado || await cargarVocabulario();
      vocabularioCacheado = palabras;
      actualizarNivelSeleccionado();
      actualizarDisponibilidadNivel();
      totalPalabras = Number($('slider-palabras').value);

      const filtradasPorNivel = palabrasDisponiblesNivel;
      if (filtradasPorNivel.length === 0) {
        throw new Error('No hay palabras disponibles para este nivel.');
      }
      const pool = seleccionarPalabrasPriorizadas(filtradasPorNivel, totalPalabras);

      ejercicios = generarEjercicios(pool, totalPalabras, actividadesSeleccionadas);
      if (ejercicios.length === 0) throw new Error('No hay ejercicios disponibles para esta configuración.');
      registrarAparicionesSesion(ejercicios.map(ej => ej.palabraBase), nivelSeleccionado);
      indice = 0;
      respuestas = Array(ejercicios.length).fill(null);
    } catch (e) {
      hide('loading');
      show('screen-activity');
      showError(`Error al cargar el vocabulario. ${e.message}`);
      return;
    }
  }

  hide('loading');
  irAPantalla('screen-ejercicio');
  renderEjercicio(ejercicios[indice], indice + 1, ejercicios.length, respuestas[indice]?._raw ?? null);
  guardarProgreso();
}

async function precargar() {
  try {
    vocabularioCacheado = await cargarVocabulario();
    actualizarDisponibilidadNivel();
    actualizarStatsInicio();
  } catch (e) {}
}

$('slider-palabras').oninput = e => {
  $('num-palabras-display').textContent = e.target.value;
};

$('btn-empezar').onclick = () => iniciar(false);

$('btn-siguiente').onclick = () => {
  limpiarTemporizadores();
  respuestas[indice] = snapshotRespuesta(ejercicios[indice], seleccionActual);
  const esUltimo = indice === ejercicios.length - 1;

  if (esUltimo) {
    mostrarResultado();
    return;
  }

  indice += 1;
  renderEjercicio(ejercicios[indice], indice + 1, ejercicios.length, respuestas[indice]?._raw ?? null);
  guardarProgreso();
};

$('btn-atras').onclick = () => {
  if (indice <= 0) return;
  limpiarTemporizadores();

  const actual = snapshotRespuesta(ejercicios[indice], seleccionActual);
  respuestas[indice] = actual;
  indice -= 1;
  renderEjercicio(ejercicios[indice], indice + 1, ejercicios.length, respuestas[indice]?._raw ?? null);
  guardarProgreso();
};

$('btn-terminar').onclick = () => {
  limpiarTemporizadores();
  respuestas[indice] = snapshotRespuesta(ejercicios[indice], seleccionActual);
  guardarProgreso();
  mostrarModalTerminar();
};

$('btn-reiniciar').onclick = () => {
  limpiarProgreso();
  limpiarTemporizadores();
  indice = 0;
  respuestas = Array(ejercicios.length).fill(null);
  rachaActual = 0;
  actualizarRacha(false);
  hide('screen-resultado');
  irAPantalla('screen-ejercicio');
  renderEjercicio(ejercicios[0], 1, ejercicios.length, null);
  guardarProgreso();
};

$('btn-volver-menu').onclick = () => {
  limpiarProgreso();
  limpiarTemporizadores();
  rachaActual = 0;
  actualizarRacha(false);
  hide('screen-resultado');
  irAPantalla('screen-activity');
  actualizarStatsInicio();
};

$('btn-salir-test').onclick = () => {
  limpiarProgreso();
  limpiarTemporizadores();
  rachaActual = 0;
  actualizarRacha(false);
  hide('main-app');
  hide('app-header');
  show('screen-landing', 'flex');
};

$('btn-reset-progress').onclick = () => {
  resetPalabrasUsadas();
  limpiarProgreso();
  actualizarStatsInicio();
  actualizarDisponibilidadNivel();
};

document.querySelectorAll('#practice-selector .config-chip').forEach(btn => {
  btn.onclick = () => {
    btn.classList.toggle('active');
    actualizarHintActividad();
  };
});

document.querySelectorAll('#level-selector .config-chip').forEach(btn => {
  btn.onclick = () => {
    activarNivelEnPantalla(btn.dataset.level);
    actualizarDisponibilidadNivel();
  };
});

$('btn-volver-landing').onclick = () => {
  hide('main-app');
  hide('app-header');
  show('screen-landing', 'flex');
};

$('btn-ir-actividad').onclick = () => {
  irAPantalla('screen-activity');
};

$('btn-volver-contenido').onclick = () => {
  irAPantalla('screen-content');
};

$('btn-open-text').href = CURRENT_TEXT_URL;

$('btn-entrar').onclick = () => {
  hide('screen-landing');
  show('main-app', 'flex');
  show('app-header');
  irAPantalla('screen-content');
  precargar();
  hide('progreso-guardado-banner');

  const guardado = cargarProgresoGuardado();
  if (guardado && guardado.ejercicios && guardado.indice < guardado.ejercicios.length) {
    const banner = $('progreso-guardado-banner');
    $('prog-guardado-txt').textContent = `Ejercicio ${guardado.indice + 1} de ${guardado.ejercicios.length}`;
    show('progreso-guardado-banner');
    banner.onclick = () => {
      ejercicios = guardado.ejercicios;
      indice = guardado.indice;
      respuestas = guardado.respuestas;
      totalPalabras = guardado.totalPalabras;
      nivelSeleccionado = typeof guardado.nivelSeleccionado === 'string'
        ? normalizarNivelGuardado(guardado.nivelSeleccionado)
        : 'b1';
      actividadesSeleccionadas = normalizarActividadesGuardadas(
        guardado.actividadesSeleccionadas ?? guardado.actividadSeleccionada
      );
      activarNivelEnPantalla(nivelSeleccionado);
      actualizarDisponibilidadNivel();
      activarActividadesEnPantalla(actividadesSeleccionadas);
      hide('progreso-guardado-banner');
      irAPantalla('screen-ejercicio');
      renderEjercicio(ejercicios[indice], indice + 1, ejercicios.length, respuestas[indice]?._raw ?? null);
    };
  }
};

activarNivelEnPantalla('b1');
activarActividadesEnPantalla([]);
