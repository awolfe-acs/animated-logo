import './styles.scss';
import emblemUrl from './ACS-Emblem.svg';

// ── Layer config ──────────────────────────────────────────────────────────────
// horizontal-oval-wrap  = horizontal-orbit-2d = rotateY spin (the wrapper <g>)
// horizontal-oval       = horizontal-orbit-3d = rotateX backflip (the inner <path>)

const LAYERS = {
  'outer-circle': {
    label: 'Outer Circle',
    defaultMult:  1.0,
    defaultDelay: 0,
  },
  'vertical-oval': {
    label: 'Vertical Oval',
    defaultMult:  2.6,
    defaultDelay: 300,
  },
  'horizontal-oval-wrap': {
    label: 'H. Oval — Spin',   // rotateY, horizontal-orbit-2d
    defaultMult:  2.0,
    defaultDelay: 180,
  },
  'horizontal-oval': {
    label: 'H. Oval — Backflip', // rotateX, horizontal-orbit-3d
    defaultMult:  1.85,
    defaultDelay: 560,
  },
  'diamond-wrap': {
    label: 'Diamond — 3D Flip',  // rotateY, diamond-3d
    defaultMult:  1.5,
    defaultDelay: 180,
  },
  'diamond': {
    label: 'Diamond — Spin',     // rotate Z CCW, diamond-2d
    defaultMult:  2.0,
    defaultDelay: 380,
  },
};

// ── State ─────────────────────────────────────────────────────────────────────

const state = {
  baseDuration: 2400,
  globalDelay: 0,
  fadeLead: 3000,
  layers: Object.fromEntries(
    Object.entries(LAYERS).map(([k, v]) => [k, { mult: v.defaultMult, delay: v.defaultDelay }])
  ),
  ease: { x1: 0.22, y1: 1.0, x2: 0.36, y2: 1.0 },
  reveal: { duration: 600, shift: -28 },
};

// ── Animation helpers ─────────────────────────────────────────────────────────

function easeString() {
  const { x1, y1, x2, y2 } = state.ease;
  return `cubic-bezier(${x1.toFixed(2)}, ${y1.toFixed(2)}, ${x2.toFixed(2)}, ${y2.toFixed(2)})`;
}

function applyStyles() {
  const logo = document.querySelector('.orb-logo');
  if (!logo) return;
  const easing = easeString();
  Object.keys(LAYERS).forEach((cls) => {
    const el = logo.querySelector(`.${cls}`);
    if (!el) return;
    const { mult, delay } = state.layers[cls];
    el.style.animationDuration       = `${Math.round(state.baseDuration * mult)}ms`;
    el.style.animationTimingFunction = easing;
    el.style.animationDelay          = `${state.globalDelay + delay}ms`;
  });
}

function applyRevealStyles() {
  const paths = document.querySelector('.acs-text-paths');
  if (!paths) return;
  paths.style.setProperty('--reveal-shift', `${state.reveal.shift}px`);
  paths.style.setProperty('--reveal-dur', `${state.reveal.duration}ms`);
}

const LOOP_PAUSE_MS = 320;
const FADE_DUR_MS   = 400; // must match CSS transition duration

function getSequenceDuration() {
  let maxEnd = state.globalDelay;
  Object.values(state.layers).forEach(({ mult, delay }) => {
    const end = state.globalDelay + delay + Math.round(state.baseDuration * mult);
    if (end > maxEnd) maxEnd = end;
  });
  return maxEnd;
}

const REVEAL_LEAD_OFFSET_MS = 300; // text reveal fires this many ms before the emblem crossfade

let loopTimer;
let fadeTimer;
let revealTimer;
let fadeSnapTimer;
let debounceTimer;

function clearLoopTimer()    { clearTimeout(loopTimer);    loopTimer    = null; }
function clearFadeTimer()    { clearTimeout(fadeTimer);    fadeTimer    = null; }
function clearRevealTimer()  { clearTimeout(revealTimer);  revealTimer  = null; }
function clearFadeSnapTimer(){ clearTimeout(fadeSnapTimer); fadeSnapTimer = null; }

function crossfade() {
  const emblem = document.querySelector('.logo-emblem');
  const logo   = document.querySelector('.orb-logo');

  // Step 1: fade the emblem IN on top — logo stays fully visible underneath (no partial overlap)
  if (emblem) emblem.classList.add('visible');

  // Step 2: once emblem is fully opaque, snap logo to invisible with no transition
  // (emblem is covering it completely so the snap is invisible)
  clearFadeSnapTimer();
  fadeSnapTimer = setTimeout(() => {
    if (logo) {
      logo.style.transition = 'none';
      logo.classList.add('faded');
      requestAnimationFrame(() => logo.style.removeProperty('transition'));
    }
  }, FADE_DUR_MS);
}

function snapReset() {
  const emblem = document.querySelector('.logo-emblem');
  const logo   = document.querySelector('.orb-logo');
  const paths  = document.querySelector('.acs-text-paths');
  clearFadeSnapTimer();
  clearRevealTimer();
  // instantly reset all three — no transitions during reset
  if (emblem) { emblem.style.transition = 'none'; emblem.classList.remove('visible'); }
  if (logo)   { logo.style.transition   = 'none'; logo.classList.remove('faded'); }
  if (paths)  { paths.style.transition  = 'none'; paths.classList.remove('revealed'); }
  requestAnimationFrame(() => requestAnimationFrame(() => {
    emblem?.style.removeProperty('transition');
    logo?.style.removeProperty('transition');
    paths?.style.removeProperty('transition');
  }));
}

function scheduleFade() {
  clearFadeTimer();
  clearRevealTimer();
  const crossfadeDelay = Math.max(0, getSequenceDuration() - state.fadeLead);
  const revealDelay    = Math.max(0, crossfadeDelay - REVEAL_LEAD_OFFSET_MS);
  revealTimer = setTimeout(() => document.querySelector('.acs-text-paths')?.classList.add('revealed'), revealDelay);
  fadeTimer   = setTimeout(crossfade, crossfadeDelay);
}

function scheduleLoop() {
  clearLoopTimer();
  loopTimer = setTimeout(restartAnimation, getSequenceDuration() + LOOP_PAUSE_MS);
}

function restartAnimation() {
  clearLoopTimer();
  clearFadeTimer();
  clearRevealTimer();
  clearFadeSnapTimer();
  snapReset();
  applyStyles();
  applyRevealStyles();
  const logo = document.querySelector('.orb-logo');
  if (!logo) return;
  const clone = logo.cloneNode(true);
  clone.classList.remove('faded');
  clone.style.removeProperty('transition');
  logo.replaceWith(clone);
  scheduleLoop();
  scheduleFade();
}

function scheduleRestart() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(restartAnimation, 350);
}

// ── Control builders ──────────────────────────────────────────────────────────

function makeSection(text) {
  const el = document.createElement('h3');
  el.textContent = text;
  return el;
}

function makeSlider({ id, label, min, max, step, value, format, onChange }) {
  const group = document.createElement('div');
  group.className = 'control-group';

  const header = document.createElement('div');
  header.className = 'control-header';

  const lbl = document.createElement('label');
  lbl.setAttribute('for', id);
  lbl.textContent = label;

  const valEl = document.createElement('span');
  valEl.className = 'control-val';
  valEl.textContent = format(value);

  header.append(lbl, valEl);

  const input = document.createElement('input');
  input.type  = 'range';
  input.id    = id;
  input.min   = min;
  input.max   = max;
  input.step  = step;
  input.value = value;

  input.addEventListener('input', () => {
    const v = parseFloat(input.value);
    valEl.textContent = format(v);
    onChange(v);
  });

  group.append(header, input);
  return group;
}

function makeLayerControls(cls, { label }) {
  const card = document.createElement('div');
  card.className = 'layer-card';

  const title = document.createElement('div');
  title.className = 'layer-card-title';
  title.textContent = label;
  card.appendChild(title);

  card.appendChild(makeSlider({
    id: `layer-mult-${cls}`,
    label: 'Duration',
    min: 0.1, max: 10, step: 0.05,
    value: state.layers[cls].mult,
    format: (v) => `${v.toFixed(2)}×`,
    onChange: (v) => { state.layers[cls].mult = v; scheduleRestart(); },
  }));

  card.appendChild(makeSlider({
    id: `layer-delay-${cls}`,
    label: 'Delay',
    min: 0, max: 2000, step: 10,
    value: state.layers[cls].delay,
    format: (v) => `${v}ms`,
    onChange: (v) => { state.layers[cls].delay = v; scheduleRestart(); },
  }));

  return card;
}

// ── Build panel ───────────────────────────────────────────────────────────────

function buildControls() {
  const panel = document.getElementById('controls');

  const heading = document.createElement('h2');
  heading.textContent = 'Animation Controls';
  panel.appendChild(heading);

  // Global
  panel.appendChild(makeSection('Global'));
  panel.appendChild(makeSlider({
    id: 'base-duration',
    label: 'Base Duration',
    min: 100, max: 8000, step: 50,
    value: state.baseDuration,
    format: (v) => `${v}ms`,
    onChange: (v) => { state.baseDuration = v; scheduleRestart(); },
  }));
  panel.appendChild(makeSlider({
    id: 'global-delay',
    label: 'Animation Delay',
    min: 0, max: 5000, step: 50,
    value: state.globalDelay,
    format: (v) => `${v}ms`,
    onChange: (v) => { state.globalDelay = v; scheduleRestart(); },
  }));
  panel.appendChild(makeSlider({
    id: 'fade-lead',
    label: 'Emblem Fade-in Lead',
    min: 0, max: 8000, step: 50,
    value: state.fadeLead,
    format: (v) => `${v}ms`,
    onChange: (v) => { state.fadeLead = v; scheduleRestart(); },
  }));

  // Layers
  panel.appendChild(makeSection('Layers'));
  Object.entries(LAYERS).forEach(([cls, config]) => {
    panel.appendChild(makeLayerControls(cls, config));
  });

  // Text Reveal (ACS wordmark)
  panel.appendChild(makeSection('Text Reveal'));
  panel.appendChild(makeSlider({
    id: 'reveal-duration',
    label: 'Reveal Duration',
    min: 100, max: 3000, step: 50,
    value: state.reveal.duration,
    format: (v) => `${v}ms`,
    onChange: (v) => { state.reveal.duration = v; scheduleRestart(); },
  }));
  panel.appendChild(makeSlider({
    id: 'reveal-shift',
    label: 'Reveal Shift',
    min: -200, max: 0, step: 1,
    value: state.reveal.shift,
    format: (v) => `${v}u`,
    onChange: (v) => { state.reveal.shift = v; scheduleRestart(); },
  }));

  // Easing
  panel.appendChild(makeSection('Easing'));

  const easePreview = document.createElement('code');
  easePreview.className = 'ease-preview';
  easePreview.textContent = easeString();
  panel.appendChild(easePreview);

  const easeParams = [
    { key: 'x1', label: 'x₁  ease-in timing',   min: 0,  max: 1, step: 0.01 },
    { key: 'y1', label: 'y₁  ease-in strength',  min: -2, max: 2, step: 0.01 },
    { key: 'x2', label: 'x₂  ease-out timing',   min: 0,  max: 1, step: 0.01 },
    { key: 'y2', label: 'y₂  ease-out strength', min: -2, max: 2, step: 0.01 },
  ];

  easeParams.forEach(({ key, label, min, max, step }) => {
    panel.appendChild(makeSlider({
      id: `ease-${key}`,
      label,
      min, max, step,
      value: state.ease[key],
      format: (v) => v.toFixed(2),
      onChange: (v) => {
        state.ease[key] = v;
        easePreview.textContent = easeString();
        scheduleRestart();
      },
    }));
  });

  const btn = document.createElement('button');
  btn.className = 'btn-restart';
  btn.textContent = 'Restart Animation';
  btn.addEventListener('click', () => {
    clearTimeout(debounceTimer);
    clearLoopTimer();
    restartAnimation();
  });
  panel.appendChild(btn);
}

// Inject the static emblem overlay into the stage
const emblemImg = document.createElement('img');
emblemImg.src       = emblemUrl;
emblemImg.className = 'logo-emblem';
emblemImg.width     = 40;
emblemImg.height    = 40;
emblemImg.alt       = '';
emblemImg.setAttribute('aria-hidden', 'true');
document.querySelector('.lockup').appendChild(emblemImg);

buildControls();
restartAnimation();
