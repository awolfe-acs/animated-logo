// Build a lean, self-contained export of the ACS animated logo.
//
// The dev app (index.html/index.js/styles.scss) is great for tweaking: it drives
// every layer's duration/delay/easing from JS and loops via setTimeout + clone.
// This script bakes the *currently tuned* parameters into a single drop-in block:
//   - one inline-block `.acs-logo` wrapper (a normal inline logo, not viewport-centered)
//   - layered SVGs absolutely positioned inside it
//   - a scoped <style> whose keyframes express the whole sequence as ONE infinite
//     master cycle
//   - hover settle behavior that mirrors the dev interaction logic
//
// Output: export/acs-logo.html  (for hover settle behavior, include the emitted script)
//
// Regenerate with:  npm run build:logo

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'export', 'acs-logo.html');

// ── Tuned parameters (kept in sync with index.js defaults) ──────────────────────

const baseDuration      = 2400;
const globalDelay       = 0;
const fadeLead          = 2400;
// emblemLeadOffset: fine-tune the swap timing relative to fadeLead (+earlier / -later).
const emblemLeadOffset  = 140;
// reveal.leadOffset: ms relative to the emblem crossfade. Positive = fires before it, negative = after.
const reveal            = { duration: 1500, shift: -36, leadOffset: 1100 };
const EASE              = 'cubic-bezier(0.22, 1, 0.36, 1)';

const FADE_DUR_MS   = 400;
const LOOP_PAUSE_MS = 320;

// Each orb layer: its class, the multiplier/delay, and the from→to transform.
// `to` lists the same transform functions as `from` so values interpolate cleanly.
const LAYERS = [
  { cls: 'outer-circle',  mult: 1.0,  delay: 0,   from: 'rotateY(90deg)',                to: 'rotateY(0deg)' },
  { cls: 'vertical-oval', mult: 1.9,  delay: 300, from: 'rotateY(450deg)',               to: 'rotateY(0deg)' },
  { cls: 'hwrap',         mult: 1.8,  delay: 250, from: 'rotateY(90deg) rotate(-90deg)', to: 'rotateY(0deg) rotate(0deg)' },
  { cls: 'hoval',         mult: 1.9,  delay: 170, from: 'rotateX(0deg)',                 to: 'rotateX(-180deg)' },
  { cls: 'dwrap',         mult: 1.5,  delay: 180, from: 'rotateY(90deg)',                to: 'rotateY(0deg)' },
  { cls: 'diamond',       mult: 2.0,  delay: 380, from: 'rotate(0deg)',                  to: 'rotate(-90deg)' },
];

// ── Derived timeline ────────────────────────────────────────────────────────────

const layerEnd = (l) => globalDelay + l.delay + Math.round(baseDuration * l.mult);
const sequenceEnd = Math.max(...LAYERS.map(layerEnd));

const crossfadeAt = Math.max(0, Math.max(0, sequenceEnd - fadeLead) - emblemLeadOffset); // emblem starts fading in
const revealAt    = Math.max(0, crossfadeAt - reveal.leadOffset);                        // text reveal starts
const revealEnd   = revealAt + reveal.duration;
const emblemEnd   = crossfadeAt + FADE_DUR_MS;                    // emblem fully in / orb snaps off
const masterCycle = sequenceEnd + LOOP_PAUSE_MS;

// percent of the master cycle, trimmed
const pct = (t) => `${(+(t / masterCycle * 100).toFixed(3))}`;

// ── SVG geometry (copied verbatim from the source art) ──────────────────────────

const CLIP_PATH = 'M0 0H159V40H0Z M40 20A20 20 0 1 0 0 20A20 20 0 1 0 40 20Z';

const TEXT_PATHS = [
  'M141.621 39.7624C137.129 39.7624 133.597 38.929 131.124 37.2855C128.649 35.643 126.981 33.8906 126.164 32.0763C125.652 30.9413 125.282 29.9253 125.06 29.0498C125.058 29.0432 125.055 29.0282 125.05 29.0067C124.983 28.7174 125.202 28.439 125.499 28.439H129.582C129.794 28.439 129.979 28.5848 130.03 28.7907C130.044 28.8473 130.056 28.8961 130.063 28.9237C130.316 29.8559 130.731 30.7384 131.299 31.5516C132.132 32.7442 133.424 33.7347 135.138 34.4961C136.86 35.2623 139.041 35.6509 141.621 35.6509C144.589 35.6509 146.977 35.2526 148.72 34.4675C150.448 33.6891 151.637 32.7626 152.255 31.7136C152.876 30.6599 153.192 29.5538 153.192 28.4263C153.229 26.8803 152.708 25.657 151.599 24.6981C150.473 23.7255 149.059 22.9707 147.395 22.4539C145.714 21.9319 143.42 21.3909 140.578 20.8451C137.533 20.2212 135.063 19.6157 133.24 19.0471C131.399 18.4737 129.781 17.6192 128.432 16.5079C127.055 15.3751 126.276 13.8388 126.115 11.9415C125.915 9.58543 126.433 7.50771 127.655 5.76589C128.869 4.03285 130.673 2.68049 133.017 1.74701C135.346 0.820116 138.122 0.349864 141.269 0.349864C145.599 0.349864 148.94 1.04317 151.2 2.41046C153.493 3.79926 154.926 5.1683 155.579 6.59619C156.222 8.00563 156.575 9.16435 156.656 10.1391L156.661 10.1808C156.685 10.3731 156.727 10.7191 156.758 11.0897C156.781 11.3584 156.568 11.5894 156.299 11.5894H152.202C151.958 11.5894 151.758 11.3993 151.742 11.156C151.712 10.7073 151.672 10.2801 151.665 10.2405C151.517 9.23592 151.064 8.31298 150.285 7.43702C149.512 6.57028 148.368 5.85107 146.884 5.29871C145.388 4.74328 143.499 4.46183 141.269 4.46183C138.96 4.46183 136.962 4.78236 135.333 5.41507C133.72 6.04075 132.521 6.90222 131.77 7.97445C131.014 9.05019 130.739 10.2541 130.929 11.6548C131.077 12.6941 131.611 13.5244 132.564 14.1962C133.536 14.882 134.735 15.4137 136.13 15.776C137.538 16.1435 139.5 16.5672 141.958 17.0357C145.356 17.7 148.153 18.3841 150.269 19.0695C152.407 19.7624 154.265 20.8574 155.793 22.3244C157.341 23.8138 158.106 25.848 158.067 28.3709C158.067 31.999 156.631 34.8368 153.796 36.8127C150.988 38.7696 146.892 39.7624 141.621 39.7624Z',
  'M103.435 39.6696C92.5381 39.6696 83.6828 30.7585 83.7746 19.8408C83.8624 9.3925 92.2672 0.735643 102.709 0.360671C110.3 0.0884423 117.218 4.10469 120.772 10.7444C120.79 10.7787 120.82 10.8358 120.855 10.9043C121.013 11.2112 120.791 11.5778 120.445 11.5778H116.376C116.155 11.5778 115.947 11.472 115.817 11.2924C115.617 11.0171 115.319 10.6114 115.141 10.3958C112.27 6.90293 107.986 4.85332 103.435 4.85332C95.0782 4.85332 88.2791 11.652 88.2791 20.009C88.2791 28.3655 95.0782 35.1646 103.435 35.1646C108.34 35.1646 112.934 32.7844 115.785 28.7817C115.793 28.7703 115.804 28.7545 115.816 28.7365C115.946 28.5512 116.158 28.4401 116.384 28.4401H120.446C120.791 28.4401 121.014 28.8059 120.856 29.1133C120.833 29.1572 120.815 29.1927 120.802 29.216C117.371 35.677 110.761 39.6696 103.435 39.6696Z',
  'M54.6177 26.407L64.2932 6.40174C64.4719 6.03203 64.9988 6.03203 65.1775 6.40174L74.926 26.5572C75.0809 26.8781 74.7802 27.2312 74.4395 27.1262C68.1532 25.1881 61.4129 25.1368 55.0981 26.9778C54.7587 27.0766 54.464 26.7253 54.6177 26.407ZM85.1705 39.0599C85.4722 39.0599 85.6702 38.7442 85.5389 38.4724L67.3896 0.94663C67.2531 0.663864 66.9668 0.48428 66.6528 0.48428H62.8179C62.504 0.48428 62.2177 0.663864 62.0812 0.94663L43.9319 38.4724C43.8006 38.7442 43.9986 39.0599 44.3003 39.0599H47.9846C48.2985 39.0599 48.5852 38.8803 48.7218 38.5976L50.9918 33.9043C51.3729 33.1161 52.0188 32.4821 52.8223 32.1352C60.4856 28.8263 69.2443 28.9229 76.8364 32.4079C77.6074 32.7622 78.2261 33.3813 78.5953 34.1453L80.749 38.5976C80.8856 38.8803 81.1723 39.0599 81.4862 39.0599H85.1705Z',
];

const EMBLEM_PATHS = [
  'M36.4509 27.6233C34.645 31.5052 31.5047 34.645 27.6233 36.4509C27.3133 36.5954 27.0143 36.2187 27.2294 35.953C27.7357 35.3278 28.2152 34.6318 28.663 33.8683C28.9765 33.3335 29.2694 32.7737 29.5412 32.1914C30.0847 31.027 31.027 30.0843 32.1914 29.5412C32.7737 29.2694 33.3339 28.9765 33.8683 28.663C34.6318 28.2151 35.3278 27.7357 35.9526 27.2294C36.2187 27.0143 36.5954 27.3133 36.4509 27.6233ZM20 38.0114C17.0494 38.0114 14.3895 35.7761 12.5286 32.2143C12.2867 31.751 12.6946 31.2206 13.2053 31.3322C15.3546 31.8002 17.6461 32.0465 20 32.0465C22.3539 32.0465 24.6454 31.8002 26.7947 31.3322C27.3054 31.2206 27.7133 31.751 27.4714 32.2143C25.6105 35.7761 22.951 38.0114 20 38.0114ZM12.3772 36.4509C8.49528 34.6454 5.35499 31.5052 3.54907 27.6233C3.40505 27.3128 3.78134 27.0143 4.04742 27.2294C4.67267 27.7357 5.36817 28.2151 6.13216 28.663C6.66652 28.9765 7.22634 29.2694 7.80856 29.5412C8.973 30.0843 9.9157 31.027 10.4588 32.1914C10.7306 32.7737 11.0235 33.3335 11.337 33.8683C11.7853 34.6318 12.2648 35.3278 12.771 35.953C12.9862 36.2187 12.6872 36.5954 12.3772 36.4509ZM7.78573 12.5287C8.24896 12.2867 8.77936 12.6946 8.66828 13.2053C8.19978 15.3546 7.9539 17.6461 7.9539 20C7.9539 22.3539 8.19978 24.6459 8.66828 26.7947C8.77936 27.3054 8.24896 27.7133 7.78573 27.4713C4.22437 25.6105 1.98858 22.951 1.98858 20C1.98858 17.0494 4.22437 14.3895 7.78573 12.5287ZM3.54951 12.3767C5.35543 8.49528 8.49528 5.35499 12.3767 3.54951C12.6867 3.40505 12.9857 3.78178 12.7706 4.04742C12.2643 4.67267 11.7849 5.36817 11.337 6.13173C11.0235 6.66652 10.7311 7.22635 10.4593 7.80856C9.9157 8.97344 8.973 9.9157 7.80856 10.4593C7.22634 10.7311 6.66652 11.0235 6.13216 11.337C5.36817 11.7849 4.67267 12.2643 4.04742 12.7706C3.78178 12.9857 3.40505 12.6867 3.54951 12.3767ZM20 1.98858C22.951 1.98858 25.611 4.22437 27.4714 7.78573C27.7133 8.24896 27.3054 8.77936 26.7947 8.66827C24.6459 8.19978 22.3539 7.9539 20 7.9539C17.6461 7.9539 15.3546 8.19978 13.2053 8.66827C12.6946 8.7798 12.2867 8.24896 12.5286 7.78573C14.3895 4.22437 17.0494 1.98858 20 1.98858ZM30.1796 20C30.1796 22.2419 29.946 24.3881 29.5205 26.3688C29.1807 27.9504 27.9504 29.1807 26.3688 29.5205C24.3881 29.946 22.2419 30.18 20 30.18C17.7581 30.18 15.6119 29.946 13.6312 29.5205C12.0496 29.1807 10.8198 27.9504 10.4799 26.3688C10.054 24.3881 9.82042 22.2419 9.82042 20C9.82042 17.7585 10.054 15.6123 10.4799 13.6312C10.8193 12.0501 12.0496 10.8198 13.6312 10.4799C15.6119 10.054 17.7581 9.82042 20 9.82042C22.2419 9.82042 24.3881 10.054 26.3688 10.4799C27.9504 10.8198 29.1807 12.0496 29.5205 13.6312C29.946 15.6123 30.1796 17.7581 30.1796 20ZM27.6237 3.54951C31.5052 5.35543 34.645 8.49528 36.4505 12.3767C36.595 12.6867 36.2182 12.9857 35.9526 12.7706C35.3273 12.2643 34.6318 11.7849 33.8683 11.337C33.3339 11.0235 32.7737 10.7306 32.1919 10.4593C31.027 9.9157 30.0847 8.973 29.5412 7.80856C29.2694 7.22635 28.9765 6.66652 28.663 6.13173C28.2152 5.36817 27.7357 4.67267 27.2299 4.04742C27.0147 3.78178 27.3133 3.40505 27.6237 3.54951ZM31.3317 13.2053C31.2206 12.6946 31.751 12.2867 32.2143 12.5287C35.7761 14.3895 38.0114 17.0494 38.0114 20C38.0114 22.951 35.7761 25.611 32.2143 27.4713C31.751 27.7133 31.2206 27.3054 31.3317 26.7952C31.8002 24.6459 32.0461 22.3539 32.0461 20C32.0461 17.6461 31.8002 15.3546 31.3317 13.2053ZM20 0C8.97212 0 0 8.97212 0 20C0 31.0283 8.97212 40 20 40C31.0279 40 40 31.0283 40 20C40 8.97212 31.0279 0 20 0Z',
  'M21.1512 14.9723C20.5154 14.3365 19.4845 14.3365 18.8487 14.9723L14.9721 18.8489C14.3363 19.4847 14.3363 20.5156 14.9721 21.1514L18.8487 25.028C19.4845 25.6638 20.5154 25.6638 21.1512 25.028L25.0278 21.1514C25.6636 20.5156 25.6636 19.4847 25.0278 18.8489L21.1512 14.9723Z',
];

// ── Keyframe emitters ───────────────────────────────────────────────────────────

// Orb layer: hold `from` until its delay, ease to `to`, hold `to` to the end,
// then the loop boundary snaps back to `from` (invisible — the orb has faded by then).
function layerKeyframes(l) {
  const dPct = pct(globalDelay + l.delay);
  const ePct = pct(layerEnd(l));
  const head = dPct === '0'
    ? `  0% { transform: ${l.from}; animation-timing-function: ${EASE}; }`
    : `  0%, ${dPct}% { transform: ${l.from}; animation-timing-function: ${EASE}; }`;
  return `@keyframes acs-${l.cls} {
${head}
  ${ePct}% { transform: ${l.to}; }
  100% { transform: ${l.to}; }
}`;
}

const orbKeyframes = LAYERS.map(layerKeyframes).join('\n\n');

const swapKeyframes = `@keyframes acs-emblem-in {
  0%, ${pct(crossfadeAt)}% { opacity: 0; animation-timing-function: ease; }
  ${pct(emblemEnd)}% { opacity: 1; }
  100% { opacity: 1; }
}

@keyframes acs-orb-out {
  0%, ${pct(emblemEnd)}% { opacity: 1; }
  ${pct(emblemEnd + 1)}% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes acs-text-reveal {
  0%, ${pct(revealAt)}% {
    opacity: 0;
    transform: translateX(${reveal.shift}px);
    animation-timing-function: ${EASE};
  }
  ${pct(revealEnd)}% { opacity: 1; transform: translateX(0); }
  100% { opacity: 1; transform: translateX(0); }
}`;

const layerAnim = (cls) => `  .acs-logo__${cls} { animation: acs-${cls} var(--acs-cycle) linear 1 forwards; }`;

// ── Assemble the drop-in block ──────────────────────────────────────────────────

const block = `<div class="acs-logo" role="img" aria-label="ACS">
  <style>
    /* ===== ACS animated logo — self-contained, no JavaScript ===== */
    /* Resize by overriding --acs-size on .acs-logo (keeps the 159:40 ratio). */
    .acs-logo {
      /* Resize: set --acs-size on this element (default 159px, keeps 159:40 ratio).
         Color:  set --acs-color on this element (default #251f20, e.g. #412bfd for blue).
         The var() fallback is used when --acs-color is not set externally. */
      --acs-cycle: ${masterCycle}ms;
      position: relative;
      display: inline-block;
      width: var(--acs-size, 159px);
      aspect-ratio: 159 / 40;
      vertical-align: middle;
      color: var(--acs-color, #251f20);
    }
    .acs-logo__text,
    .acs-logo__orb,
    .acs-logo__emblem {
      position: absolute;
      top: 0;
      left: 0;
      overflow: visible;
    }
    .acs-logo__text { width: 100%; height: 100%; }
    /* orb + emblem occupy the left 40-of-159 square */
    .acs-logo__orb,
    .acs-logo__emblem { width: calc(100% * 40 / 159); height: 100%; }

    .acs-logo__orb {
      /* perspective scales with the logo so the 3D read is size-independent */
      perspective: calc(var(--acs-size, 159px) * 120 / 159);
      transform-style: preserve-3d;
      animation: acs-orb-out var(--acs-cycle) linear 1 forwards;
    }
    .acs-logo__emblem {
      opacity: 0;
      /* translateZ promotes it to a GPU compositor layer, matching the orb's
         rendering context and giving the same sub-pixel-smooth antialiasing. */
      transform: translateZ(0);
      will-change: opacity;
      animation: acs-emblem-in var(--acs-cycle) ease 1 forwards;
    }
    .acs-logo__textpaths {
      opacity: 0;
      transform: translateX(${reveal.shift}px);
      animation: acs-text-reveal var(--acs-cycle) linear 1 forwards;
    }

    .acs-logo__layer {
      transform-box: fill-box;
      transform-origin: center;
      transform-style: preserve-3d;
    }
    .acs-logo__hwrap { transform-box: view-box; transform-origin: center; }

${LAYERS.map((l) => layerAnim(l.cls)).join('\n')}

    @media (prefers-reduced-motion: reduce) {
      .acs-logo__orb,
      .acs-logo__layer,
      .acs-logo__emblem,
      .acs-logo__textpaths { animation: none; }
      .acs-logo__orb { opacity: 0; }
      .acs-logo__emblem { opacity: 1; }
      .acs-logo__textpaths { opacity: 1; transform: translateX(0); }
    }

${orbKeyframes.replace(/^/gm, '    ')}

${swapKeyframes.replace(/^/gm, '    ')}
  </style>

  <!-- ACS wordmark: slides out from behind the emblem's circular mask -->
  <svg class="acs-logo__text" viewBox="0 0 159 40" fill="none" shape-rendering="geometricPrecision" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <clipPath id="acs-logo-clip">
        <path clip-rule="evenodd" d="${CLIP_PATH}" />
      </clipPath>
    </defs>
    <g clip-path="url(#acs-logo-clip)">
      <g class="acs-logo__textpaths">
${TEXT_PATHS.map((d) => `        <path d="${d}" fill="currentColor" />`).join('\n')}
      </g>
    </g>
  </svg>

  <!-- Animated orb (plays, then fades under the emblem) -->
  <svg class="acs-logo__orb" viewBox="0 0 40 40" fill="none" shape-rendering="geometricPrecision" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <clipPath id="acs-orb-clip">
        <circle cx="20" cy="20" r="20"/>
      </clipPath>
    </defs>
    <circle class="acs-logo__layer acs-logo__outer-circle" cx="20" cy="20" r="19.075" transform="rotate(-90 20 20)" stroke="currentColor" stroke-width="1.85" />
    <g clip-path="url(#acs-orb-clip)">
      <path class="acs-logo__layer acs-logo__vertical-oval" d="M20 0.924805C22.8611 0.924805 25.6097 2.8629 27.6924 6.33398C29.7639 9.78664 31.0752 14.6161 31.0752 20C31.0752 25.3839 29.7639 30.2134 27.6924 33.666C25.6097 37.1371 22.8611 39.0752 20 39.0752C17.1389 39.0752 14.3903 37.1371 12.3076 33.666C10.2361 30.2134 8.9248 25.3839 8.9248 20C8.9248 14.6161 10.2361 9.78664 12.3076 6.33398C14.3903 2.8629 17.1389 0.924805 20 0.924805Z" stroke="currentColor" stroke-width="1.85" />
      <g class="acs-logo__layer acs-logo__hwrap">
        <path class="acs-logo__layer acs-logo__hoval" d="M0.924804 20C0.924804 17.1389 2.8629 14.3903 6.33398 12.3076C9.78664 10.2361 14.6161 8.9248 20 8.9248C25.3839 8.9248 30.2134 10.2361 33.666 12.3076C37.1371 14.3903 39.0752 17.1389 39.0752 20C39.0752 22.8611 37.1371 25.6097 33.666 27.6924C30.2134 29.7639 25.3839 31.0752 20 31.0752C14.6161 31.0752 9.78664 29.7639 6.33398 27.6924C2.8629 25.6097 0.924804 22.8611 0.924804 20Z" stroke="currentColor" stroke-width="1.85" />
      </g>
      <g class="acs-logo__layer acs-logo__dwrap">
        <path class="acs-logo__layer acs-logo__diamond" d="M21.1511 14.9722C20.5153 14.3364 19.4844 14.3364 18.8486 14.9722L14.972 18.8488C14.3362 19.4846 14.3362 20.5156 14.972 21.1513L18.8486 25.028C19.4844 25.6637 20.5153 25.6637 21.1511 25.028L25.0277 21.1513C25.6635 20.5156 25.6635 19.4846 25.0277 18.8488L21.1511 14.9722Z" fill="currentColor" />
      </g>
    </g>
  </svg>

  <!-- Final emblem (the perfect form, faded in on top) -->
  <svg class="acs-logo__emblem" viewBox="0 0 40 40" fill="none" shape-rendering="geometricPrecision" xmlns="http://www.w3.org/2000/svg">
${EMBLEM_PATHS.map((d) => `    <path d="${d}" fill="currentColor" />`).join('\n')}
  </svg>
</div>`;

// ── Hover variant block ──────────────────────────────────────────────────────────
// A self-contained logo that shows the static emblem + text by default and plays
// a continuous orbit loop while active. JS handles settle-to-end on pointer exit.

const HOVER_CYCLE_VERT = 2800;
const HOVER_CYCLE_WRAP = 2400;
const HOVER_CYCLE_FLIP = 2000;
const HOVER_CYCLE_DIAMOND = 2400;

const hoverBlock = `<div class="acs-logo acs-logo--hover" role="img" aria-label="ACS">
  <style>
    /* ===== ACS hover logo — static by default, animates on hover ===== */
    .acs-logo--hover {
      --acs-cycle: ${masterCycle}ms;
      position: relative;
      display: inline-block;
      width: var(--acs-size, 159px);
      aspect-ratio: 159 / 40;
      vertical-align: middle;
      color: var(--acs-color, #251f20);
      cursor: pointer;
    }
    .acs-logo--hover .acs-logo__text,
    .acs-logo--hover .acs-logo__orb,
    .acs-logo--hover .acs-logo__emblem {
      position: absolute; top: 0; left: 0; overflow: visible;
    }
    .acs-logo--hover .acs-logo__text { width: 100%; height: 100%; }
    .acs-logo--hover .acs-logo__orb,
    .acs-logo--hover .acs-logo__emblem { width: calc(100% * 40 / 159); height: 100%; }

    /* Orb: hidden by default */
    .acs-logo--hover .acs-logo__orb {
      perspective: calc(var(--acs-size, 159px) * 120 / 159);
      transform-style: preserve-3d;
      opacity: 0;
      animation: none;
      transition: opacity 35ms linear;
    }
    /* Emblem: visible by default */
    .acs-logo--hover .acs-logo__emblem {
      opacity: 1;
      animation: none;
      transform: translateZ(0);
      will-change: opacity;
      transition: opacity 55ms linear;
    }

    /* Text: always fully visible */
    .acs-logo--hover .acs-logo__textpaths {
      opacity: 1;
      transform: translateX(0);
      animation: none;
    }

    .acs-logo--hover .acs-logo__layer {
      transform-box: fill-box;
      transform-origin: center;
      transform-style: preserve-3d;
    }
    .acs-logo--hover .acs-logo__hwrap { transform-box: view-box; transform-origin: center; }
    .acs-logo--hover .acs-logo__outer-circle { animation: none; transform: none; }
    .acs-logo--hover .acs-logo__dwrap { animation: none; transform: none; }

    /* Diamond stays at its arrived position */
    .acs-logo--hover .acs-logo__diamond {
      animation: none;
      transform: rotate(-90deg);
    }

    /* Resting arrived pose — no animation until activated. */
    .acs-logo--hover:not(.hover-orb-active) .acs-logo__vertical-oval {
      animation: none;
      transform: rotateY(0deg);
    }
    .acs-logo--hover:not(.hover-orb-active) .acs-logo__hwrap {
      animation: none;
      transform: rotate(0deg);
    }
    .acs-logo--hover:not(.hover-orb-active) .acs-logo__hoval {
      animation: none;
      transform: rotateX(0deg);
    }
    .acs-logo--hover:not(.hover-orb-active) .acs-logo__diamond {
      animation: none;
      transform: rotate(-90deg);
    }

    /* Exit-only swap tuning right before removing .hover-orb-active */
    .acs-logo--hover.hover-orb-exit .acs-logo__orb { transition: opacity 95ms linear 12ms; }
    .acs-logo--hover.hover-orb-exit .acs-logo__emblem { transition: opacity 22ms linear; }

    .acs-logo--hover.hover-orb-active .acs-logo__orb { opacity: 1; }
    .acs-logo--hover.hover-orb-active .acs-logo__emblem { opacity: 0; }

    /* Orbit animations while active */
    .acs-logo--hover.hover-orb-active .acs-logo__vertical-oval {
      animation: acs-hover-vert ${HOVER_CYCLE_VERT}ms linear infinite;
    }
    .acs-logo--hover.hover-orb-active .acs-logo__hwrap {
      animation: acs-hover-hwrap ${HOVER_CYCLE_WRAP}ms linear infinite;
    }
    .acs-logo--hover.hover-orb-active .acs-logo__hoval {
      animation: acs-hover-hoval ${HOVER_CYCLE_FLIP}ms linear infinite;
    }
    .acs-logo--hover.hover-orb-active .acs-logo__diamond {
      animation: acs-hover-diamond ${HOVER_CYCLE_DIAMOND}ms linear infinite;
    }

    @keyframes acs-hover-vert {
      0%   { transform: rotateY(0deg); }
      100% { transform: rotateY(360deg); }
    }
    @keyframes acs-hover-hwrap {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    @keyframes acs-hover-hoval {
      0%   { transform: rotateX(-360deg); }
      100% { transform: rotateX(0deg); }
    }
    @keyframes acs-hover-diamond {
      from { transform: rotate(-90deg); }
      to   { transform: rotate(-270deg); }
    }

    @media (prefers-reduced-motion: reduce) {
      .acs-logo--hover .acs-logo__orb { display: none; }
      .acs-logo--hover .acs-logo__emblem { opacity: 1 !important; }
      .acs-logo--hover .acs-logo__layer,
      .acs-logo--hover .acs-logo__hwrap,
      .acs-logo--hover .acs-logo__hoval,
      .acs-logo--hover .acs-logo__diamond { animation: none !important; }
    }
  </style>

  <!-- ACS wordmark — always visible -->
  <svg class="acs-logo__text" viewBox="0 0 159 40" fill="none" shape-rendering="geometricPrecision" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <clipPath id="acs-hover-clip">
        <path clip-rule="evenodd" d="${CLIP_PATH}" />
      </clipPath>
    </defs>
    <g clip-path="url(#acs-hover-clip)">
      <g class="acs-logo__textpaths">
${TEXT_PATHS.map((d) => `        <path d="${d}" fill="currentColor" />`).join('\n')}
      </g>
    </g>
  </svg>

  <!-- Hover orb (shown while active, looping from arrived state) -->
  <svg class="acs-logo__orb" viewBox="0 0 40 40" fill="none" shape-rendering="geometricPrecision" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <clipPath id="acs-hover-orb-clip">
        <circle cx="20" cy="20" r="20"/>
      </clipPath>
    </defs>
    <circle class="acs-logo__layer acs-logo__outer-circle" cx="20" cy="20" r="19.075" transform="rotate(-90 20 20)" stroke="currentColor" stroke-width="1.85" />
    <g clip-path="url(#acs-hover-orb-clip)">
      <path class="acs-logo__layer acs-logo__vertical-oval" d="M20 0.924805C22.8611 0.924805 25.6097 2.8629 27.6924 6.33398C29.7639 9.78664 31.0752 14.6161 31.0752 20C31.0752 25.3839 29.7639 30.2134 27.6924 33.666C25.6097 37.1371 22.8611 39.0752 20 39.0752C17.1389 39.0752 14.3903 37.1371 12.3076 33.666C10.2361 30.2134 8.9248 25.3839 8.9248 20C8.9248 14.6161 10.2361 9.78664 12.3076 6.33398C14.3903 2.8629 17.1389 0.924805 20 0.924805Z" stroke="currentColor" stroke-width="1.85" />
      <g class="acs-logo__layer acs-logo__hwrap">
        <path class="acs-logo__layer acs-logo__hoval" d="M0.924804 20C0.924804 17.1389 2.8629 14.3903 6.33398 12.3076C9.78664 10.2361 14.6161 8.9248 20 8.9248C25.3839 8.9248 30.2134 10.2361 33.666 12.3076C37.1371 14.3903 39.0752 17.1389 39.0752 20C39.0752 22.8611 37.1371 25.6097 33.666 27.6924C30.2134 29.7639 25.3839 31.0752 20 31.0752C14.6161 31.0752 9.78664 29.7639 6.33398 27.6924C2.8629 25.6097 0.924804 22.8611 0.924804 20Z" stroke="currentColor" stroke-width="1.85" />
      </g>
      <g class="acs-logo__layer acs-logo__dwrap">
        <path class="acs-logo__layer acs-logo__diamond" d="M21.1511 14.9722C20.5153 14.3364 19.4844 14.3364 18.8486 14.9722L14.972 18.8488C14.3362 19.4846 14.3362 20.5156 14.972 21.1513L18.8486 25.028C19.4844 25.6637 20.5153 25.6637 21.1511 25.028L25.0277 21.1513C25.6635 20.5156 25.6635 19.4846 25.0277 18.8488L21.1511 14.9722Z" fill="currentColor" />
      </g>
    </g>
  </svg>

  <!-- Static emblem — visible by default, hidden while active -->
  <svg class="acs-logo__emblem" viewBox="0 0 40 40" fill="none" shape-rendering="geometricPrecision" xmlns="http://www.w3.org/2000/svg">
${EMBLEM_PATHS.map((d) => `    <path d="${d}" fill="currentColor" />`).join('\n')}
  </svg>
</div>`;

// ── Demo page wrapper ────────────────────────────────────────────────────────────

// Stamp a size + color class onto a block string (hover uses two classes on the root)
const stamp = (src, size, color) =>
  src.replace(/^/gm, '      ')
     .replace(/class="acs-logo acs-logo--hover"/, `class="acs-logo acs-logo--hover ${size} ${color}"`)
     .replace(/class="acs-logo"/, `class="acs-logo ${size} ${color}"`);

const page = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ACS Logo — Export</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 80px;
        background: #f8f8f8;
        font-family: system-ui, -apple-system, sans-serif;
        color: #999;
      }
      h2 {
        font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase;
        color: #bbb; margin: 0; padding-bottom: 32px; text-align: center;
      }
      .demo-section { display: flex; flex-direction: column; align-items: center; }
      .demo-note { font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; }
      .demo-row  { display: flex; align-items: center; gap: 60px; }
      .demo-label { font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; width: 40px; text-align: right; flex-shrink: 0; }
      .big   { --acs-size: 400px; }
      .small { --acs-size: 158px; }
      .acs-logo.black, .acs-logo--hover.black { --acs-color: #251f20; }
      .acs-logo.blue,  .acs-logo--hover.blue  { --acs-color: #412bfd; }
      .acs-logo.white, .acs-logo--hover.white  { --acs-color: #ffffff; }
      .demo-row--dark {
        background: #1a1a1a; border-radius: 16px; padding: 40px 60px;
        gap: 60px; display: flex; align-items: center;
      }
      .demo-row--dark .demo-label { color: rgba(255,255,255,0.25); }
    </style>
  </head>
  <body>
    <div class="demo-note">Generated by npm run build:logo &middot; hover settle JS included</div>

    <!-- ── Full Animation ──────────────────────────────────────────────────── -->
    <div class="demo-section">
      <h2>Full Animation</h2>
      <div class="demo-row" style="margin-bottom:32px">
        <span class="demo-label">Large</span>
${stamp(block, 'big', 'black')}
${stamp(block, 'big', 'blue')}
      </div>
      <div class="demo-row" style="margin-bottom:32px">
        <span class="demo-label">Small</span>
${stamp(block, 'small', 'black')}
${stamp(block, 'small', 'blue')}
      </div>
      <div class="demo-row--dark">
        <span class="demo-label">White</span>
${stamp(block, 'big', 'white')}
${stamp(block, 'small', 'white')}
      </div>
    </div>

    <!-- ── Hover Animation ─────────────────────────────────────────────────── -->
    <div class="demo-section">
      <h2>Hover to Animate</h2>
      <div class="demo-row" style="margin-bottom:32px">
        <span class="demo-label">Large</span>
${stamp(hoverBlock, 'big', 'black')}
${stamp(hoverBlock, 'big', 'blue')}
      </div>
      <div class="demo-row" style="margin-bottom:32px">
        <span class="demo-label">Small</span>
${stamp(hoverBlock, 'small', 'black')}
${stamp(hoverBlock, 'small', 'blue')}
      </div>
      <div class="demo-row--dark">
        <span class="demo-label">White</span>
${stamp(hoverBlock, 'big', 'white')}
${stamp(hoverBlock, 'small', 'white')}
      </div>
    </div>
    <script>
      (function () {
        var HOVER_LAYER_MS = {
          vertical: ${HOVER_CYCLE_VERT},
          wrap: ${HOVER_CYCLE_WRAP},
          flip: ${HOVER_CYCLE_FLIP},
          diamond: ${HOVER_CYCLE_DIAMOND}
        };
        var HOVER_SETTLE_EASE = 'cubic-bezier(0.2, 0.2, 0.8, 1)';
        var HOVER_EXIT_SWAP_MS = 140;

        function initHoverLogo(hoverLockup) {
          var finishTimer = null;
          var settleRaf = 0;
          var exitSwapTimer = null;
          var hoverPhase = 'idle'; // idle | active | settling
          var pendingRestart = false;
          var hoverStartAt = 0;

          function getOrb() {
            return hoverLockup.querySelector('.acs-logo__orb');
          }

          function clearFinishWait() {
            if (finishTimer) {
              clearTimeout(finishTimer);
              finishTimer = null;
            }
            if (settleRaf) {
              cancelAnimationFrame(settleRaf);
              settleRaf = 0;
            }
          }

          function clearExitSwap() {
            if (exitSwapTimer) {
              clearTimeout(exitSwapTimer);
              exitSwapTimer = null;
            }
            hoverLockup.classList.remove('hover-orb-exit');
          }

          function getHoverLayers() {
            var orb = getOrb();
            if (!orb) return null;
            return {
              vertical: orb.querySelector('.acs-logo__vertical-oval'),
              wrap: orb.querySelector('.acs-logo__hwrap'),
              flip: orb.querySelector('.acs-logo__hoval'),
              diamond: orb.querySelector('.acs-logo__diamond')
            };
          }

          function clearInlineMotion(layers) {
            Object.keys(layers).forEach(function (key) {
              var el = layers[key];
              if (!el) return;
              el.style.removeProperty('animation');
              el.style.removeProperty('transition');
              el.style.removeProperty('transform');
            });
          }

          function getCycleState(elapsed, duration) {
            var phase = ((elapsed % duration) + duration) % duration;
            var remaining = phase === 0 ? duration : duration - phase;
            return { progress: phase / duration, remaining: remaining };
          }

          function restartOrb() {
            var orb = getOrb();
            if (!orb) return;
            var clone = orb.cloneNode(true);
            orb.replaceWith(clone);
          }

          function startHoverCycle() {
            if (hoverPhase !== 'idle') return;
            clearFinishWait();
            clearExitSwap();
            pendingRestart = false;
            hoverPhase = 'active';
            hoverStartAt = Date.now();
            hoverLockup.classList.remove('hover-orb-active');
            restartOrb();
            void hoverLockup.getBoundingClientRect();
            hoverLockup.classList.add('hover-orb-active');
          }

          function setIdle() {
            clearFinishWait();
            var layers = getHoverLayers();
            if (layers) clearInlineMotion(layers);
            hoverPhase = 'idle';
            var shouldRestart = pendingRestart || hoverLockup.matches(':hover');
            pendingRestart = false;
            if (shouldRestart) {
              clearExitSwap();
              startHoverCycle();
              return;
            }
            hoverLockup.classList.add('hover-orb-exit');
            hoverLockup.classList.remove('hover-orb-active');
            exitSwapTimer = setTimeout(function () {
              hoverLockup.classList.remove('hover-orb-exit');
              exitSwapTimer = null;
            }, HOVER_EXIT_SWAP_MS);
          }

          hoverLockup.addEventListener('mouseenter', function () {
            if (hoverPhase === 'idle') {
              startHoverCycle();
              return;
            }
            if (hoverPhase === 'settling') {
              pendingRestart = true;
            }
          });

          hoverLockup.addEventListener('mouseleave', function () {
            if (hoverPhase === 'settling') {
              pendingRestart = false;
              return;
            }
            if (hoverPhase !== 'active' || !hoverLockup.classList.contains('hover-orb-active')) return;
            hoverPhase = 'settling';
            pendingRestart = false;

            var layers = getHoverLayers();
            if (!layers || !layers.vertical || !layers.wrap || !layers.flip || !layers.diamond) {
              setIdle();
              return;
            }

            var elapsed = Math.max(0, Date.now() - hoverStartAt);
            var v = getCycleState(elapsed, HOVER_LAYER_MS.vertical);
            var w = getCycleState(elapsed, HOVER_LAYER_MS.wrap);
            var f = getCycleState(elapsed, HOVER_LAYER_MS.flip);
            var d = getCycleState(elapsed, HOVER_LAYER_MS.diamond);

            var horizontalSettleMs = Math.max(w.remaining, f.remaining);
            function extendToFloor(remaining, period, floor) {
              if (remaining >= floor) return remaining;
              return remaining + Math.ceil((floor - remaining) / period) * period;
            }

            var vDuration = extendToFloor(v.remaining, HOVER_LAYER_MS.vertical, horizontalSettleMs);
            var wDuration = w.remaining;
            var fDuration = f.remaining;
            var dDuration = extendToFloor(d.remaining, HOVER_LAYER_MS.diamond, horizontalSettleMs);

            var vExtraTurns = Math.round((vDuration - v.remaining) / HOVER_LAYER_MS.vertical);
            var dExtraTurns = Math.round((dDuration - d.remaining) / HOVER_LAYER_MS.diamond);

            var targets = [
              {
                el: layers.vertical,
                from: 'rotateY(' + (v.progress * 360).toFixed(3) + 'deg)',
                to: 'rotateY(' + (360 + vExtraTurns * 360) + 'deg)',
                duration: vDuration
              },
              {
                el: layers.wrap,
                from: 'rotate(' + (w.progress * 360).toFixed(3) + 'deg)',
                to: 'rotate(360deg)',
                duration: wDuration
              },
              {
                el: layers.flip,
                from: 'rotateX(' + (-360 + f.progress * 360).toFixed(3) + 'deg)',
                to: 'rotateX(0deg)',
                duration: fDuration
              },
              {
                el: layers.diamond,
                from: 'rotate(' + (-90 - d.progress * 180).toFixed(3) + 'deg)',
                to: 'rotate(' + (-270 - dExtraTurns * 180) + 'deg)',
                duration: dDuration
              }
            ];

            targets.forEach(function (t) {
              t.el.style.animation = 'none';
              t.el.style.transition = 'none';
              t.el.style.transform = t.from;
            });

            void layers.vertical.getBoundingClientRect();

            settleRaf = requestAnimationFrame(function () {
              settleRaf = 0;
              targets.forEach(function (t) {
                t.el.style.transition = 'transform ' + t.duration + 'ms ' + HOVER_SETTLE_EASE;
                t.el.style.transform = t.to;
              });
              var maxRemaining = Math.max.apply(null, targets.map(function (t) { return t.duration; }));
              finishTimer = setTimeout(setIdle, maxRemaining + 40);
            });
          });
        }

        document.querySelectorAll('.acs-logo--hover').forEach(initHoverLogo);
      })();
    </script>
  </body>
</html>
`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, page, 'utf8');

console.log(`ACS logo export written to ${OUT}`);
console.log(`  master cycle: ${masterCycle}ms (sequence ${sequenceEnd}ms + pause ${LOOP_PAUSE_MS}ms)`);
console.log(`  reveal @ ${revealAt}ms · emblem crossfade @ ${crossfadeAt}ms · orb hidden @ ${emblemEnd}ms`);
