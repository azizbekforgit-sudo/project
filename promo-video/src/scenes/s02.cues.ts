import type {Cue} from '../timing';
// Frames are RELATIVE to the scene start (abs 180). Pan follows the 16:9 layout (card x: 270 → 1650 px).
// Card k lands at 30·(k+1); its flight peaks mid-way (flight lengths 16/15/14/13/12 f).
export const cues: Cue[] = [
  // deck rides in with the whip from S01 and squares up
  {f: 1, sfx: 'card_shuffle', gain: -9, pan: 0.5, params: {dur: 0.45}},

  // deal 1 — Фермер
  {f: 22, sfx: 'swish', gain: -15, pan: 0.15},
  {f: 30, sfx: 'card_place', gain: -5, pan: -0.36},
  // the sun seed drops onto the price line, the tag unfolds from it
  {f: 36, sfx: 'hit_soft', gain: -7, pan: -0.36},
  {f: 39, sfx: 'pop', gain: -10, pan: -0.36},

  // deal 2 — Перекупщик; tag hops; stamp slams, tag grows
  {f: 52, sfx: 'swish', gain: -15, pan: 0.25},
  {f: 60, sfx: 'card_place', gain: -5, pan: -0.18},
  {f: 73, sfx: 'tick', gain: -13, pan: -0.18},
  {f: 75, sfx: 'stamp', gain: -1, pan: -0.18},

  // deal 3 — Оптовый базар
  {f: 83, sfx: 'swish', gain: -15, pan: 0.32},
  {f: 90, sfx: 'card_place', gain: -5, pan: 0},
  {f: 103, sfx: 'tick', gain: -13, pan: 0},
  {f: 105, sfx: 'stamp', gain: -1, pan: 0},

  // deal 4 — Магазин
  {f: 113, sfx: 'swish', gain: -15, pan: 0.38},
  {f: 120, sfx: 'card_place', gain: -5, pan: 0.18},
  {f: 133, sfx: 'tick', gain: -13, pan: 0.18},
  {f: 135, sfx: 'stamp', gain: -1, pan: 0.18},

  // deal 5 — Вы; tag hops over and pops to its biggest, then heats up
  {f: 144, sfx: 'swish', gain: -16, pan: 0.42},
  {f: 150, sfx: 'card_place', gain: -5, pan: 0.36},
  {f: 163, sfx: 'tick', gain: -13, pan: 0.36},
  {f: 165, sfx: 'pop', gain: -5, pan: 0.36},

  // verdict: «Фермеру — мало.» (small), «Вам — дорого.» (big, coral)
  {f: 171, sfx: 'hit_soft', gain: -8, pan: -0.2},
  {f: 186, sfx: 'impact', gain: -4, pan: 0.1},
  // 216–240: hush — no sounds
];
