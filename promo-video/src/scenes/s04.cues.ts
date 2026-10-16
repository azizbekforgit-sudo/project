import type {Cue} from '../timing';
// Frames are RELATIVE to the scene start (abs 600). Phone sits right of centre in 16:9 (x≈1390 → pan ≈ +0.45).
export const cues: Cue[] = [
  // phone sweeps in from the right, already moving (spring peak speed ≈ f-1)
  {f: 0, sfx: 'whoosh', gain: -12, pan: 0.5, params: {dur: 0.45}},

  // chip «01» decodes (ScrambleText: start 4, lock 15)
  {f: 4, sfx: 'scramble', gain: -17, pan: -0.6, params: {frames: 11}},
  {f: 15, sfx: 'lock', gain: -12, pan: -0.6},

  // three emoji float out of the phone (tomato left of it, carrot + apple right)
  {f: 15, sfx: 'pop', gain: -16, pan: 0.2},
  {f: 21, sfx: 'pop', gain: -17, pan: 0.85},
  {f: 27, sfx: 'pop', gain: -18, pan: 0.8},

  // step 1 → tap «Дальше», screen pushes to step 2 (slide peak f77)
  {f: 72, sfx: 'ui_tap', gain: -5, pan: 0.45},
  {f: 77, sfx: 'swish', gain: -15, pan: 0.4},

  // step 2 → tap «Дальше», push to step 3 (slide peak f132)
  {f: 127, sfx: 'ui_tap', gain: -5, pan: 0.45},
  {f: 132, sfx: 'swish', gain: -15, pan: 0.4},

  // step 3 → tap «Опубликовать товар»; the seed flies up; toast lands on the beat (abs 780)
  {f: 175, sfx: 'ui_tap', gain: -4, pan: 0.5},
  {f: 180, sfx: 'success', gain: -3, pan: 0.35},

  // exit: phone pushes out left (peak at the cut)
  {f: 208, sfx: 'swish', gain: -7, pan: -0.3},
];
