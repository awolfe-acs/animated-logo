/**
 * ACS Animated Logo — logo.js
 *
 * Handles hover-settle and orbit-mode activation for .acs-logo elements.
 *
 * Usage (ES module import):
 *   import { initLogos } from './logo.js';
 *   initLogos();              // scan document
 *   initLogos(myContainer);   // scan a specific element
 *
 * Usage (standalone <script type="module" src="logo.js">):
 *   Auto-initialises on DOMContentLoaded.
 *
 * Timing constants mirror _logo.scss:
 *   ORBIT_START_MS   = $acs-orbit-start   (3040ms)
 *   HOVER_VERT_MS    = $acs-hover-vert    (2800ms)
 *   HOVER_HWRAP_MS   = $acs-hover-hwrap   (2400ms)
 *   HOVER_HOVAL_MS   = $acs-hover-hoval   (2000ms)
 *   HOVER_DIAMOND_MS = $acs-hover-diamond (2400ms)
 */

// ── Constants ──────────────────────────────────────────────────────────────────

/** ms after page load when the full-animation logo enters orbit mode. */
const ORBIT_START_MS = 3040;

const HOVER_LAYER_MS = {
  vertical: 2800,
  wrap:     2400,
  flip:     2000,
  diamond:  2400,
};

const HOVER_SETTLE_EASE  = 'cubic-bezier(0.2, 0.2, 0.8, 1)';
const HOVER_EXIT_SWAP_MS = 140;

// ── Core logic (shared by both variants) ──────────────────────────────────────

function initOrbitHover(logo) {
  let finishTimer    = null;
  let settleRaf      = 0;
  let exitSwapTimer  = null;
  let hoverPhase     = 'idle'; // 'idle' | 'active' | 'settling'
  let pendingRestart = false;
  let hoverStartAt   = 0;

  const getOrb = () => logo.querySelector('.acs-logo__orb');

  const getLayers = () => {
    const orb = getOrb();
    if (!orb) return null;
    return {
      vertical: orb.querySelector('.acs-logo__vertical-oval'),
      wrap:     orb.querySelector('.acs-logo__hwrap'),
      flip:     orb.querySelector('.acs-logo__hoval'),
      diamond:  orb.querySelector('.acs-logo__diamond'),
    };
  };

  const clearFinishWait = () => {
    if (finishTimer) { clearTimeout(finishTimer); finishTimer = null; }
    if (settleRaf)   { cancelAnimationFrame(settleRaf); settleRaf = 0; }
  };

  const clearExitSwap = () => {
    if (exitSwapTimer) { clearTimeout(exitSwapTimer); exitSwapTimer = null; }
    logo.classList.remove('hover-orb-exit');
  };

  const clearInlineMotion = (layers) => {
    Object.values(layers).forEach((el) => {
      if (!el) return;
      el.style.removeProperty('animation');
      el.style.removeProperty('transition');
      el.style.removeProperty('transform');
    });
  };

  const cycleState = (elapsed, duration) => {
    const phase     = ((elapsed % duration) + duration) % duration;
    const remaining = phase === 0 ? duration : duration - phase;
    return { progress: phase / duration, remaining };
  };

  const restartOrb = () => {
    const orb = getOrb();
    if (orb) orb.replaceWith(orb.cloneNode(true));
  };

  const setIdle = () => {
    clearFinishWait();
    const layers = getLayers();
    if (layers) clearInlineMotion(layers);
    hoverPhase = 'idle';
    const restart = pendingRestart || logo.matches(':hover');
    pendingRestart = false;
    if (restart) { clearExitSwap(); startCycle(); return; }
    logo.classList.add('hover-orb-exit');
    logo.classList.remove('hover-orb-active');
    exitSwapTimer = setTimeout(() => {
      logo.classList.remove('hover-orb-exit');
      exitSwapTimer = null;
    }, HOVER_EXIT_SWAP_MS);
  };

  const startCycle = () => {
    if (hoverPhase !== 'idle') return;
    clearFinishWait();
    clearExitSwap();
    pendingRestart = false;
    hoverPhase     = 'active';
    hoverStartAt   = Date.now();
    logo.classList.remove('hover-orb-active');
    restartOrb();
    void logo.getBoundingClientRect();
    logo.classList.add('hover-orb-active');
  };

  logo.addEventListener('mouseenter', () => {
    if (hoverPhase === 'idle')     { startCycle(); return; }
    if (hoverPhase === 'settling') { pendingRestart = true; }
  });

  logo.addEventListener('mouseleave', () => {
    if (hoverPhase === 'settling') { pendingRestart = false; return; }
    if (hoverPhase !== 'active' || !logo.classList.contains('hover-orb-active')) return;

    hoverPhase     = 'settling';
    pendingRestart = false;

    const layers = getLayers();
    if (!layers || !layers.vertical || !layers.wrap || !layers.flip || !layers.diamond) {
      setIdle();
      return;
    }

    const elapsed = Math.max(0, Date.now() - hoverStartAt);
    const v = cycleState(elapsed, HOVER_LAYER_MS.vertical);
    const w = cycleState(elapsed, HOVER_LAYER_MS.wrap);
    const f = cycleState(elapsed, HOVER_LAYER_MS.flip);
    const d = cycleState(elapsed, HOVER_LAYER_MS.diamond);

    const hFloor = Math.max(w.remaining, f.remaining);
    const extendToFloor = (rem, period, floor) =>
      rem >= floor ? rem : rem + Math.ceil((floor - rem) / period) * period;

    const vDur   = extendToFloor(v.remaining, HOVER_LAYER_MS.vertical, hFloor);
    const wDur   = w.remaining;
    const fDur   = f.remaining;
    const dDur   = extendToFloor(d.remaining, HOVER_LAYER_MS.diamond, hFloor);
    const vExtra = Math.round((vDur - v.remaining) / HOVER_LAYER_MS.vertical);
    const dExtra = Math.round((dDur - d.remaining) / HOVER_LAYER_MS.diamond);

    const targets = [
      {
        el:   layers.vertical,
        from: 'rotateY(' + (v.progress * 360).toFixed(3) + 'deg)',
        to:   'rotateY(' + (360 + vExtra * 360) + 'deg)',
        dur:  vDur,
      },
      {
        el:   layers.wrap,
        from: 'rotate(' + (w.progress * 360).toFixed(3) + 'deg)',
        to:   'rotate(360deg)',
        dur:  wDur,
      },
      {
        el:   layers.flip,
        from: 'rotateX(' + (-360 + f.progress * 360).toFixed(3) + 'deg)',
        to:   'rotateX(0deg)',
        dur:  fDur,
      },
      {
        el:   layers.diamond,
        from: 'rotate(' + (-90 - d.progress * 180).toFixed(3) + 'deg)',
        to:   'rotate(' + (-270 - dExtra * 180) + 'deg)',
        dur:  dDur,
      },
    ];

    targets.forEach(({ el, from }) => {
      el.style.animation  = 'none';
      el.style.transition = 'none';
      el.style.transform  = from;
    });
    void layers.vertical.getBoundingClientRect();

    settleRaf = requestAnimationFrame(() => {
      settleRaf = 0;
      targets.forEach(({ el, to, dur }) => {
        el.style.transition = 'transform ' + dur + 'ms ' + HOVER_SETTLE_EASE;
        el.style.transform  = to;
      });
      finishTimer = setTimeout(setIdle, Math.max(...targets.map((t) => t.dur)) + 40);
    });
  });
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Initialise all ACS logo variants within `root`.
 *
 * @param {Document | Element} root  Defaults to `document`.
 */
export function initLogos(root = document) {
  // Hover variant — wire up immediately.
  root.querySelectorAll('.acs-logo--hover').forEach(initOrbitHover);

  // Full-animation variant — add orbit class once the reveal completes, then wire up.
  root.querySelectorAll('.acs-logo:not(.acs-logo--hover)').forEach((logo) => {
    setTimeout(() => {
      logo.classList.add('acs-logo--orbit-active');
      initOrbitHover(logo);
      // If the pointer was already over the logo during the reveal, start immediately.
      if (logo.matches(':hover')) {
        logo.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
      }
    }, ORBIT_START_MS);
  });
}

// Auto-init when included as a standalone <script type="module">.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initLogos());
} else {
  initLogos();
}
