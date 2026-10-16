import type {Cue} from '../timing';
// Frames are RELATIVE to the scene start (abs 810). Content sits right of centre in 16:9 (pan ≈ +0.35).
export const cues: Cue[] = [
  // content slides in from the right, already moving (continues S04's push-out)
  {f: 0, sfx: 'whoosh', gain: -13, pan: 0.4, params: {dur: 0.45}},

  // chip «02» decodes (start 3, lock ≈14)
  {f: 3, sfx: 'scramble', gain: -17, pan: -0.6, params: {frames: 11}},
  {f: 14, sfx: 'lock', gain: -12, pan: -0.6},

  // search word swap on beats: Продукты → Овощи → Фрукты → Зелень → Мёд
  {f: 20, sfx: 'tick', gain: -14, pan: 0.3},
  {f: 35, sfx: 'tick', gain: -14, pan: 0.3},
  {f: 50, sfx: 'tick', gain: -14, pan: 0.3},
  {f: 65, sfx: 'tick', gain: -14, pan: 0.3},

  // deck drops in, six cards 2 f apart
  {f: 24, sfx: 'card_place', gain: -19, pan: 0.2},
  {f: 28, sfx: 'card_place', gain: -19, pan: 0.2},
  {f: 32, sfx: 'card_place', gain: -19, pan: 0.2},

  // riffle: split f32–44, interleave f44–76
  {f: 34, sfx: 'card_shuffle', gain: -7, pan: 0.25, params: {dur: 1.3}},
  // pile squares up
  {f: 77, sfx: 'hit_soft', gain: -9, pan: 0.25},

  // deal into the grid (k-th card lands ≈ start+10): 86 + 4k + 9
  {f: 95, sfx: 'card_place', gain: -14, pan: -0.1},
  {f: 99, sfx: 'card_place', gain: -14, pan: 0.2},
  {f: 103, sfx: 'card_place', gain: -14, pan: 0.5},
  {f: 107, sfx: 'card_place', gain: -14, pan: -0.1},
  {f: 111, sfx: 'card_place', gain: -14, pan: 0.2},
  {f: 115, sfx: 'card_place', gain: -14, pan: 0.5},

  // tomato card lifts, «В корзину» tapped, seed flies to the cart, badge pops
  {f: 138, sfx: 'swish', gain: -22, pan: 0.0},
  {f: 150, sfx: 'ui_tap', gain: -5, pan: -0.1},
  {f: 155, sfx: 'swish', gain: -20, pan: 0.5},
  {f: 160, sfx: 'pop', gain: -9, pan: 0.6},

  // exit: content whips out left (peak at the cut)
  {f: 178, sfx: 'swish', gain: -8, pan: -0.3},
];
