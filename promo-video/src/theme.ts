import {Easing} from 'remotion';
import {fontFamily as UNBOUNDED} from './gf-Unbounded';
import {fontFamily as RUBIK} from './gf-Rubik';
import {fontFamily as GOLOS} from './gf-GolosText';
import {fontFamily as MONO} from './gf-JetBrainsMono';

/* ── Timing lives in timing.ts (pure, shared with the audio builder) ── */
export {FPS, BEAT, BAR, TOTAL, sec} from './timing';
import {BEAT, BAR} from './timing';
/** frame of beat n (0-based) counted from the start of the film */
export const beat = (n: number) => n * BEAT;
export const bar = (n: number) => n * BAR;

/* ── Brand colours (from agroverse front/css/theme.css) ── */
export const C = {
  // light theme
  field: '#1F5C35',
  fieldDeep: '#143D24',
  sprout: '#EAF2E6',
  sun: '#F0B429',
  sunLight: '#E9A916',
  sunPale: '#FDF3D8',
  ground: '#F6F6F1',
  card: '#FFFFFF',
  ink: '#1A201C',
  ink2: '#434B45',
  ink3: '#5F6761',
  rule: '#E2E5DC',
  danger: '#B42318',
  dangerBg: '#FDECEA',
  onSun: '#1C1503',
  // dark / night
  night: '#0B140F',
  night2: '#0E1712',
  nightCard: '#15211A',
  nightCard2: '#1A2920',
  mint: '#79CC97',
  mintPale: '#A6E0BA',
  cream: '#F3EFE4',
  creamDim: '#C9C3B3',
  coral: '#F07167',
  nightRule: '#2A3B30',
  // earth accents (design board)
  beige: '#EDDFCA',
  soil: '#6B4F38',
} as const;

/* ── Type ── */
export const F = {
  display: `${UNBOUNDED}, ${GOLOS}, sans-serif`, // big Russian headlines
  brand: `${RUBIK}, ${GOLOS}, sans-serif`, // wordmark, prices, UI titles (the app's display face)
  body: `${GOLOS}, sans-serif`, // UI text, captions
  mono: `${MONO}, monospace`, // scramble glyphs, labels
} as const;

/* ── Easing vocabulary (only these) ── */
export const E = {
  /** entrances: expo-out-like */
  out: Easing.bezier(0.16, 1, 0.3, 1),
  /** entrances, emphasized decelerate (M3) */
  outStrong: Easing.bezier(0.05, 0.7, 0.1, 1),
  /** exits: emphasized accelerate (M3) */
  in: Easing.bezier(0.3, 0, 0.8, 0.15),
  /** moves between positions */
  inOut: Easing.bezier(0.2, 0, 0, 1),
  /** symmetric smooth move */
  smooth: Easing.bezier(0.65, 0, 0.35, 1),
} as const;

/* ── Spring presets (pass as `config`) ── */
export const SPR = {
  /** UI settle, no bounce */
  settle: {damping: 200, stiffness: 120, mass: 1},
  /** soft pop with a hint of overshoot (damping ratio ~0.7) */
  pop: {damping: 14, stiffness: 180, mass: 0.8},
  /** heavier, slower */
  heavy: {damping: 22, stiffness: 90, mass: 1.4},
  /** snappy button press */
  snap: {damping: 18, stiffness: 320, mass: 0.6},
} as const;

export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/* Russian typography: non-breaking space after short words so lines never end on a preposition */
export const nbsp = (s: string) =>
  s.replace(/(^|[\s(«])(в|во|с|со|к|ко|у|о|об|и|а|но|на|по|за|не|ни|от|до|из|без|для|при|что|как|это|вы|мы|он|она|все|всё|уже|ещё)\s/gi, (_m, p, w) => `${p}${w} `)
       .replace(/\s—/g, ' —');
