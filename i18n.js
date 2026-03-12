'use strict';

const LOCALES = {
  fr: {
    'page.title':           'Masse de Jupiter — 3ème loi de Kepler',
    'header.title':         '♃ Masse de Jupiter',
    'header.subtitle':      'Détermination par observation des satellites galiléens et la 3<sup>e</sup> loi de Kepler',
    'theory.summary':       'Principe physique',
    'theory.p1':            'Les satellites galiléens orbitent selon des cercles. Vus de la Terre, leurs positions projetées sont sinusoïdales :',
    'theory.params':        '<strong>A</strong> : demi-grand axe (D.J.) &nbsp;|&nbsp; <strong>T</strong> : période (h) &nbsp;|&nbsp; <strong>t₀</strong> : décalage de phase (h)',
    'theory.p2':            'Après ajustement des sliders T et t₀ pour maximiser R², on applique :',
    'theory.note':          'Position positive = Est (E), négative = Ouest (O). 1 D.J. = 142 984 km.',
    'progress.label':       'Satellites validés :',
    'section.obs':          '📷 Saisie des observations',
    'section.analysis':     '📈 Analyse des orbites — ajustez T et t₀ pour maximiser R²',
    'section.kepler':       '🔭 3ème Loi de Kepler — Masse de Jupiter',
    'obs.empty':            'Aucune observation — cliquez « + Ajouter »',
    'obs.add':              '+ Ajouter',
    'obs.example':          'Charger exemple',
    'obs.clear':            'Tout effacer',
    'obs.label.datetime':   'Date/heure :',
    'obs.or':               'ou',
    'obs.hours.placeholder':'heures',
    'obs.drag.hint':        "Glissez les lunes pour les repositionner — un clic sur le canvas place la prochaine lune dans l'ordre (Io → Europe → Ganymède → Callisto)",
    'obs.canvas.hint':      'Ajoutez une observation pour placer les lunes',
    'obs.no.time':          '(sans heure)',
    'obs.time.fmt':         't = {t} h',
    'sat.io':               'Io',
    'sat.europa':           'Europe',
    'sat.ganymede':         'Ganymède',
    'sat.callisto':         'Callisto',
    'slider.period':        'Période T',
    'slider.phase':         'Décalage t₀',
    'slider.amplitude':     'Amplitude A',
    'slider.reset.title':   'Réinitialiser à max|données|',
    'stat.T':               'T (h)',
    'stat.phase':           't₀ (h)',
    'stat.A':               'A (D.J.)',
    'stat.r2':              'R²',
    'validate.btn':         '✓ Valider',
    'validate.err.nodata':  '⚠ Entrez au moins 2 observations.',
    'validate.err.r2':      '⚠ R² = {r2} — ajustez T, t₀ et A.',
    'validate.ok':          '✓ T={T}h, A={A} D.J. (R²={r2})',
    'kepler.intro':         'Après validation des 4 satellites, la régression T² = f(a³) donne la pente 4π²/(GM).',
    'kepler.params.title':  'Paramètres validés',
    'kepler.table.sat':     'Satellite',
    'kepler.table.T':       'T (h)',
    'kepler.table.A':       'A (D.J.)',
    'kepler.table.T2':      'T² (s²)',
    'kepler.table.a3':      'a³ (m³)',
    'kepler.table.M':       'M<sub>Jup</sub> (kg)',
    'kepler.table.empty':   'Aucun satellite validé',
    'kepler.mass.label':    'Masse de Jupiter',
    'kepler.mass.empty1':   '— validez ≥ 2 satellites —',
    'kepler.mass.empty2':   '— validez 1 satellite de plus —',
    'kepler.mass.ref':      'Réf. : 1,898 × 10²⁷ kg  |  Écart : {err} %',
    'kepler.mass.r2':       'R² Kepler = {r2}',
    'calc.title':           'Détail du calcul',
    'calc.slope':           'pente',
    'calc.step1.title':     "1 — Régression T² = pente × a³  (passant par l'origine)",
    'calc.step1.formula':   'pente = Σ(aᵢ³ · Tᵢ²) / Σ(aᵢ⁶)',
    'calc.step2.title':     "2 — Inversion de la 3ème loi de Kepler : T² = (4π²/GM) · a³",
    'calc.step2.line1':     'M = 4π² / (G × pente)',
    'calc.step3.title':     '3 — Valeurs par satellite (calcul individuel)',
    'chart.obs':            'Observations',
    'chart.fit':            'Courbe ajustée',
    'chart.time':           'Temps (h)',
    'chart.pos':            'Position (D.J.)',
    'chart.kepler.x':       'a³ (×10²⁴ m³)',
    'chart.kepler.y':       'T² (×10⁸ s²)',
    'chart.satellites':     'Satellites',
    'chart.regression':     'Régression (origine)',
  },
  en: {
    'page.title':           "Mass of Jupiter — Kepler's 3rd Law",
    'header.title':         '♃ Mass of Jupiter',
    'header.subtitle':      "Determination by observation of Galilean moons using Kepler's 3<sup>rd</sup> law",
    'theory.summary':       'Physical principle',
    'theory.p1':            'The Galilean moons orbit in circles. Seen from Earth, their projected positions are sinusoidal:',
    'theory.params':        '<strong>A</strong>: semi-major axis (D.J.) &nbsp;|&nbsp; <strong>T</strong>: period (h) &nbsp;|&nbsp; <strong>t₀</strong>: phase offset (h)',
    'theory.p2':            'After adjusting sliders T and t₀ to maximize R², apply:',
    'theory.note':          'Positive position = East (E), negative = West (W). 1 D.J. = 142,984 km.',
    'progress.label':       'Validated moons:',
    'section.obs':          '📷 Enter observations',
    'section.analysis':     '📈 Orbit fitting — adjust T and t₀ to maximize R²',
    'section.kepler':       "🔭 Kepler's 3rd Law — Mass of Jupiter",
    'obs.empty':            'No observations — click "+ Add"',
    'obs.add':              '+ Add',
    'obs.example':          'Load example',
    'obs.clear':            'Clear all',
    'obs.label.datetime':   'Date/time:',
    'obs.or':               'or',
    'obs.hours.placeholder':'hours',
    'obs.drag.hint':        'Drag moons to reposition them — clicking the canvas places the next moon in order (Io → Europa → Ganymede → Callisto)',
    'obs.canvas.hint':      'Add an observation to place moons',
    'obs.no.time':          '(no time)',
    'obs.time.fmt':         't = {t} h',
    'sat.io':               'Io',
    'sat.europa':           'Europa',
    'sat.ganymede':         'Ganymede',
    'sat.callisto':         'Callisto',
    'slider.period':        'Period T',
    'slider.phase':         'Phase offset t₀',
    'slider.amplitude':     'Amplitude A',
    'slider.reset.title':   'Reset to max|data|',
    'stat.T':               'T (h)',
    'stat.phase':           't₀ (h)',
    'stat.A':               'A (D.J.)',
    'stat.r2':              'R²',
    'validate.btn':         '✓ Validate',
    'validate.err.nodata':  '⚠ Enter at least 2 observations.',
    'validate.err.r2':      '⚠ R² = {r2} — adjust T, t₀ and A.',
    'validate.ok':          '✓ T={T}h, A={A} D.J. (R²={r2})',
    'kepler.intro':         'After validating all 4 moons, the regression T² = f(a³) gives slope 4π²/(GM).',
    'kepler.params.title':  'Validated parameters',
    'kepler.table.sat':     'Moon',
    'kepler.table.T':       'T (h)',
    'kepler.table.A':       'A (D.J.)',
    'kepler.table.T2':      'T² (s²)',
    'kepler.table.a3':      'a³ (m³)',
    'kepler.table.M':       'M<sub>Jup</sub> (kg)',
    'kepler.table.empty':   'No validated moon',
    'kepler.mass.label':    'Mass of Jupiter',
    'kepler.mass.empty1':   '— validate ≥ 2 moons —',
    'kepler.mass.empty2':   '— validate 1 more moon —',
    'kepler.mass.ref':      'Ref.: 1.898 × 10²⁷ kg  |  Error: {err}%',
    'kepler.mass.r2':       'Kepler R² = {r2}',
    'calc.title':           'Calculation detail',
    'calc.slope':           'slope',
    'calc.step1.title':     '1 — Regression T² = slope × a³  (through origin)',
    'calc.step1.formula':   'slope = Σ(aᵢ³ · Tᵢ²) / Σ(aᵢ⁶)',
    'calc.step2.title':     "2 — Inversion of Kepler's 3rd law: T² = (4π²/GM) · a³",
    'calc.step2.line1':     'M = 4π² / (G × slope)',
    'calc.step3.title':     '3 — Individual values per moon',
    'chart.obs':            'Observations',
    'chart.fit':            'Fitted curve',
    'chart.time':           'Time (h)',
    'chart.pos':            'Position (D.J.)',
    'chart.kepler.x':       'a³ (×10²⁴ m³)',
    'chart.kepler.y':       'T² (×10⁸ s²)',
    'chart.satellites':     'Moons',
    'chart.regression':     'Regression (origin)',
  },
};

let currentLang = localStorage.getItem('lang') || 'fr';

function t(key, vars) {
  const str = (LOCALES[currentLang]?.[key]) ?? (LOCALES['fr'][key]) ?? key;
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : ''));
}

function applyTranslations() {
  document.title = t('page.title');
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    el.innerHTML = t(el.dataset.i18nHtml);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.dataset.i18nTitle);
  });
}

function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('lang', lang);
  document.documentElement.lang = lang;
  document.querySelectorAll('.lang-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.lang === lang));
  applyTranslations();
  if (typeof renderObsList       === 'function') renderObsList();
  if (typeof updateKeplerSection === 'function') updateKeplerSection();
  if (typeof updateChartsI18n    === 'function') updateChartsI18n();
  if (typeof drawCanvas          === 'function') drawCanvas();
}

// Initialize switcher state on load
document.querySelectorAll('.lang-btn').forEach(b =>
  b.classList.toggle('active', b.dataset.lang === currentLang));
document.documentElement.lang = currentLang;
