/* ============================================================================
   theme.js — port of rider-app/src/theme/{color,schoolPalettes,index}.ts
   ----------------------------------------------------------------------------
   Kept as a literal port rather than a re-implementation. If the app's palette
   maths changes, this file changes the same way, and the demo keeps matching
   the product instead of slowly becoming a different-looking thing that shares
   a logo. The MD3 neutral tokens below are react-native-paper's own
   MD3LightTheme / MD3DarkTheme values, since that is what the app renders on.
   ========================================================================== */
(function (global) {
  'use strict';

  /* ---- colour utilities (theme/color.ts) --------------------------- */

  function hexToRgb(color) {
    var m = color.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
    if (m) return { r: +m[1], g: +m[2], b: +m[3] };
    var c = color.replace('#', '');
    var full = c.length === 3 ? c.split('').map(function (x) { return x + x; }).join('') : c;
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16),
    };
  }

  function rgbToHex(r, g, b) {
    function h(v) { return Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0'); }
    return ('#' + h(r) + h(g) + h(b)).toUpperCase();
  }

  function rgbToHsl(r, g, b) {
    var rn = r / 255, gn = g / 255, bn = b / 255;
    var max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
    var l = (max + min) / 2;
    if (max === min) return { h: 0, s: 0, l: l * 100 };
    var d = max - min;
    var s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    var h;
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
    else if (max === gn) h = ((bn - rn) / d + 2) / 6;
    else h = ((rn - gn) / d + 4) / 6;
    return { h: h * 360, s: s * 100, l: l * 100 };
  }

  function hslToRgb(hsl) {
    var sn = hsl.s / 100, ln = hsl.l / 100;
    if (sn === 0) { var v = ln * 255; return { r: v, g: v, b: v }; }
    var q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
    var p = 2 * ln - q;
    function hue(t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    }
    var hn = hsl.h / 360;
    return { r: hue(hn + 1 / 3) * 255, g: hue(hn) * 255, b: hue(hn - 1 / 3) * 255 };
  }

  function hexToHsl(hex) { var c = hexToRgb(hex); return rgbToHsl(c.r, c.g, c.b); }
  function hslToHex(hsl) { var c = hslToRgb(hsl); return rgbToHex(c.r, c.g, c.b); }

  /** Absolute lightness — M3 tonal-role style, not a relative lighten. */
  function withLightness(hex, l) { var h = hexToHsl(hex); h.l = l; return hslToHex(h); }
  /** Relative luminance reduction, for dark-mode container tokens. */
  function reduceLightness(hex, frac) { var h = hexToHsl(hex); h.l = h.l * (1 - frac); return hslToHex(h); }
  /** Alpha-blend `tint` over `base` — the real mechanism behind M3 tonal elevation. */
  function mix(base, tint, opacity) {
    var a = hexToRgb(base), b = hexToRgb(tint);
    return rgbToHex(
      a.r + (b.r - a.r) * opacity,
      a.g + (b.g - a.g) * opacity,
      a.b + (b.b - a.b) * opacity
    );
  }

  /* ---- school palettes (theme/schoolPalettes.ts) ------------------- */

  var SCHOOL_PALETTES = {
    'UG-LEGON': {
      primary: '#191970', onPrimary: '#FFFFFF',
      primaryContainer: '#2E2E9E', onPrimaryContainer: '#FFFFFF',
      secondary: '#FFF700', onSecondary: '#2A2900',
      secondaryContainer: '#FFF9B0', onSecondaryContainer: '#3A3900',
      tertiary: '#C5B358', onTertiary: '#2A2400',
    },
    UPSA: {
      primary: '#0E1F3D', onPrimary: '#FFFFFF',
      primaryContainer: '#1C3259', onPrimaryContainer: '#FFFFFF',
      secondary: '#C9962C', onSecondary: '#2A1F00',
      secondaryContainer: '#F3E2C0', onSecondaryContainer: '#3A2C00',
      tertiary: '#C9962C', onTertiary: '#2A1F00',
    },
    GIMPA: {
      primary: '#002F6C', onPrimary: '#FFFFFF',
      primaryContainer: '#1E4E8C', onPrimaryContainer: '#FFFFFF',
      secondary: '#D4A017', onSecondary: '#2A1F00',
      secondaryContainer: '#F5E1AE', onSecondaryContainer: '#3A2C00',
      tertiary: '#D4A017', onTertiary: '#2A1F00',
    },
    'CENTRAL-UNI': {
      primary: '#7A1F2B', onPrimary: '#FFFFFF',
      primaryContainer: '#9C3341', onPrimaryContainer: '#FFFFFF',
      secondary: '#C9A227', onSecondary: '#2A1F00',
      secondaryContainer: '#F0DDA0', onSecondaryContainer: '#3A2C00',
      tertiary: '#C9A227', onTertiary: '#2A1F00',
    },
    ASHESI: {
      primary: '#0B4F4A', onPrimary: '#FFFFFF',
      primaryContainer: '#146C64', onPrimaryContainer: '#FFFFFF',
      secondary: '#E0722C', onSecondary: '#FFFFFF',
      secondaryContainer: '#F7C9A6', onSecondaryContainer: '#3A1D00',
      tertiary: '#E0722C', onTertiary: '#FFFFFF',
    },
  };

  // Legon is the campus that is actually open. The others are previews, so
  // the default has to be the live one - a first-time visitor must not land
  // on a school they cannot ride on yet.
  var DEFAULT_SCHOOL_CODE = 'UG-LEGON';

  function getSchoolPalette(code) {
    return SCHOOL_PALETTES[code] || SCHOOL_PALETTES[DEFAULT_SCHOOL_CODE];
  }

  /**
   * Two different adjustments, per the app's own comment:
   *   action colours lighten toward M3 tone-80 so they stay legible on dark;
   *   container colours (large surface areas) lose ~20% luminance so big
   *   colour fields stay muted instead of glowing.
   */
  function deriveDarkPalette(light) {
    return {
      primary: withLightness(light.primary, 78),
      onPrimary: withLightness(light.primary, 18),
      primaryContainer: reduceLightness(light.primaryContainer, 0.2),
      onPrimaryContainer: withLightness(light.primary, 90),
      secondary: withLightness(light.secondary, 78),
      onSecondary: withLightness(light.secondary, 18),
      secondaryContainer: reduceLightness(light.secondaryContainer, 0.2),
      onSecondaryContainer: withLightness(light.secondary, 90),
      tertiary: withLightness(light.tertiary, 78),
      onTertiary: withLightness(light.tertiary, 18),
    };
  }

  /* ---- MD3 neutrals, as react-native-paper ships them -------------- */

  var MD3 = {
    light: {
      onSurface: '#1C1B1F', onSurfaceVariant: '#49454F',
      surfaceVariant: '#E7E0EC', outline: '#79747E', outlineVariant: '#CAC4D0',
    },
    dark: {
      onSurface: '#E6E1E5', onSurfaceVariant: '#CAC4D0',
      surfaceVariant: '#49454F', outline: '#938F99', outlineVariant: '#49454F',
    },
  };

  var SUCCESS = '#059669';
  var DANGER = '#DC2626';
  var ELEVATION_TINT_OPACITY = [0, 0.05, 0.08, 0.11, 0.12, 0.14];

  /* ---- buildTheme (theme/index.ts) --------------------------------- */

  function buildTheme(schoolCode, mode) {
    var light = getSchoolPalette(schoolCode);
    var p = mode === 'dark' ? deriveDarkPalette(light) : light;
    var neutrals = mode === 'dark' ? MD3.dark : MD3.light;
    var background = mode === 'dark' ? '#1C1B1F' : '#F8FAFC';
    var surface = mode === 'dark' ? '#1C1B1F' : '#FFFFFF';

    var elevation = ELEVATION_TINT_OPACITY.map(function (op) {
      return mix(surface, p.primary, op);
    });

    return {
      mode: mode,
      schoolCode: schoolCode || DEFAULT_SCHOOL_CODE,
      colors: {
        primary: p.primary, onPrimary: p.onPrimary,
        primaryContainer: p.primaryContainer, onPrimaryContainer: p.onPrimaryContainer,
        secondary: p.secondary, onSecondary: p.onSecondary,
        secondaryContainer: p.secondaryContainer, onSecondaryContainer: p.onSecondaryContainer,
        tertiary: p.tertiary, onTertiary: p.onTertiary,
        background: background, surface: surface,
        onSurface: neutrals.onSurface, onSurfaceVariant: neutrals.onSurfaceVariant,
        surfaceVariant: neutrals.surfaceVariant,
        outline: neutrals.outline, outlineVariant: neutrals.outlineVariant,
        success: SUCCESS, danger: DANGER,
        elevation: elevation,
      },
    };
  }

  /* ---- readable accent ---------------------------------------------
     M3 never intends `secondary` to be painted as text straight onto
     `background` — it is meant to be paired with its own container, or used
     for small filled shapes. The landing page wants a brand accent for one
     word of the headline, and taking `secondary` literally breaks badly on at
     least one real campus: UG-Legon's secondary is #FFF700, and a pure yellow
     headline on a #F8FAFC page measures about 1.1:1. Legible to nobody.

     So the accent keeps the campus hue and gives up whatever lightness it must
     to clear 4.5:1 against the page. Legon still reads as Legon — the word is
     gold rather than lemon — and it is readable, which the brand colour on its
     own was not. */

  function relativeLuminance(hex) {
    var c = hexToRgb(hex);
    var chan = [c.r, c.g, c.b].map(function (v) {
      var x = v / 255;
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * chan[0] + 0.7152 * chan[1] + 0.0722 * chan[2];
  }

  function contrastRatio(a, b) {
    var la = relativeLuminance(a), lb = relativeLuminance(b);
    var hi = Math.max(la, lb), lo = Math.min(la, lb);
    return (hi + 0.05) / (lo + 0.05);
  }

  /**
   * Walks the colour's lightness toward the far side of the background until it
   * clears `target`. Steps of 2% rather than a binary search because the goal
   * is the *least* adjusted colour that passes, not the fastest arrival.
   */
  function readableOn(color, background, target) {
    target = target || 4.5;
    if (contrastRatio(color, background) >= target) return color;
    var hsl = hexToHsl(color);
    var goDarker = relativeLuminance(background) > 0.4;
    for (var step = 1; step <= 50; step++) {
      var l = goDarker ? hsl.l - step * 2 : hsl.l + step * 2;
      if (l < 0 || l > 100) break;
      var candidate = hslToHex({ h: hsl.h, s: hsl.s, l: l });
      if (contrastRatio(candidate, background) >= target) return candidate;
    }
    return goDarker ? '#000000' : '#FFFFFF';
  }

  /* ---- map ink -----------------------------------------------------
     The campus map is drawn in SVG rather than served from a tile provider,
     so it has to be coloured from the palette like everything else. Tinting
     the neutrals toward the campus primary is what stops the map reading as a
     grey rectangle bolted onto a navy app. */
  function mapInk(theme) {
    var c = theme.colors;
    if (theme.mode === 'dark') {
      return {
        land: mix('#1F2126', c.primary, 0.06),
        road: mix('#2C2F36', c.primary, 0.05),
        roadLine: mix('#383C45', c.primary, 0.08),
        green: mix('#22301F', c.primary, 0.05),
        water: mix('#1B2836', c.primary, 0.10),
      };
    }
    return {
      land: mix('#F1F4F8', c.primary, 0.035),
      road: '#FFFFFF',
      roadLine: mix('#DEE5EE', c.primary, 0.05),
      green: mix('#DFEDE1', c.primary, 0.03),
      water: mix('#CFE0F0', c.primary, 0.05),
    };
  }

  /* ---- applying to the document ------------------------------------ */

  var STORAGE_MODE = 'traverse_demo_mode';
  // Bumped when Legon became the live campus. Anyone who visited before
  // then has 'UPSA' persisted, and reading the old key would pin them to a
  // coming-soon school on a site that now says Legon is the one that works.
  var STORAGE_SCHOOL = 'traverse_demo_school_v2';

  function safeGet(key) {
    try { return global.localStorage.getItem(key); } catch (e) { return null; }
  }
  function safeSet(key, value) {
    try { global.localStorage.setItem(key, value); } catch (e) { /* private mode */ }
  }

  var state = {
    school: safeGet(STORAGE_SCHOOL) || DEFAULT_SCHOOL_CODE,
    // 'system' is a real third state, not a synonym for light.
    preference: safeGet(STORAGE_MODE) || 'system',
  };

  function resolvedMode() {
    if (state.preference === 'light' || state.preference === 'dark') return state.preference;
    return global.matchMedia && global.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark' : 'light';
  }

  var listeners = [];
  function onChange(fn) { listeners.push(fn); }

  function apply() {
    var mode = resolvedMode();
    var theme = buildTheme(state.school, mode);
    var c = theme.colors;
    var root = document.documentElement;

    function set(name, value) { root.style.setProperty(name, value); }

    set('--primary', c.primary);
    set('--on-primary', c.onPrimary);
    set('--primary-container', c.primaryContainer);
    set('--on-primary-container', c.onPrimaryContainer);
    set('--secondary', c.secondary);
    set('--on-secondary', c.onSecondary);
    set('--secondary-container', c.secondaryContainer);
    set('--on-secondary-container', c.onSecondaryContainer);
    set('--tertiary', c.tertiary);
    set('--on-tertiary', c.onTertiary);
    set('--background', c.background);
    set('--surface', c.surface);
    set('--on-surface', c.onSurface);
    set('--on-surface-variant', c.onSurfaceVariant);
    set('--surface-variant', c.surfaceVariant);
    set('--outline', c.outline);
    set('--outline-variant', c.outlineVariant);
    set('--success', c.success);
    set('--danger', c.danger);
    set('--elev-1', c.elevation[1]);
    set('--elev-2', c.elevation[2]);
    set('--elev-3', c.elevation[3]);
    set('--shadow-hue', mode === 'dark' ? '0 0 0' : '15 23 42');

    set('--accent-text', readableOn(c.secondary, c.background, 4.5));
    set('--accent-on-surface', readableOn(c.secondary, c.surface, 4.5));

    var ink = mapInk(theme);
    set('--map-land', ink.land);
    set('--map-road', ink.road);
    set('--map-road-line', ink.roadLine);
    set('--map-green', ink.green);
    set('--map-water', ink.water);

    root.setAttribute('data-mode', mode);
    root.setAttribute('data-school', state.school);

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', c.primary);

    listeners.forEach(function (fn) { fn(theme); });
    return theme;
  }

  function setSchool(code) {
    state.school = SCHOOL_PALETTES[code] ? code : DEFAULT_SCHOOL_CODE;
    safeSet(STORAGE_SCHOOL, state.school);
    return apply();
  }

  function setPreference(pref) {
    state.preference = pref;
    safeSet(STORAGE_MODE, pref);
    return apply();
  }

  function toggleMode() {
    return setPreference(resolvedMode() === 'dark' ? 'light' : 'dark');
  }

  if (global.matchMedia) {
    var mq = global.matchMedia('(prefers-color-scheme: dark)');
    var onSystemChange = function () { if (state.preference === 'system') apply(); };
    if (mq.addEventListener) mq.addEventListener('change', onSystemChange);
    else if (mq.addListener) mq.addListener(onSystemChange);
  }

  global.TraverseTheme = {
    SCHOOL_PALETTES: SCHOOL_PALETTES,
    DEFAULT_SCHOOL_CODE: DEFAULT_SCHOOL_CODE,
    buildTheme: buildTheme,
    getSchoolPalette: getSchoolPalette,
    deriveDarkPalette: deriveDarkPalette,
    mix: mix,
    withLightness: withLightness,
    readableOn: readableOn,
    contrastRatio: contrastRatio,
    apply: apply,
    setSchool: setSchool,
    setPreference: setPreference,
    toggleMode: toggleMode,
    onChange: onChange,
    get school() { return state.school; },
    get preference() { return state.preference; },
    get mode() { return resolvedMode(); },
  };
})(window);
