import type {Cue} from '../timing';
// Frames are RELATIVE to the scene start (abs 420). The drop is f60 (abs 480, music accent).
// Pan follows the 16:9 layout (Фермер left, Вы right, logo centre, final mark top-left).
export const cues: Cue[] = [
  // the three middlemen lift off in a riffle (f3/6/9) and fly out of frame (gone f17–23)
  {f: 2, sfx: 'card_shuffle', gain: -6, pan: 0, params: {dur: 0.5}},
  {f: 17, sfx: 'whoosh', gain: -8, pan: 0.1, params: {dur: 0.6}},
  // price tag zips back to the farmer, shrinking 2.1 → 1.0 and cooling coral → sun (peak speed f6)
  {f: 6, sfx: 'swish', gain: -12, pan: 0.2},
  // «Сейчас» pill flips into the sun pill «С AgroVerse» (beat)
  {f: 15, sfx: 'switch', gain: -8, pan: -0.6},
  // seed leaves the farmer (card lights up) and runs the bright line to «Вы»
  {f: 20, sfx: 'shimmer', gain: -13, pan: -0.4},
  {f: 23, sfx: 'swish', gain: -15, pan: -0.1},
  // «Напрямую.» masks up (beat)
  {f: 30, sfx: 'impact', gain: -5, pan: -0.3},
  // seed lands on «Вы» (beat), then lifts off and swells into the drop
  {f: 45, sfx: 'hit_soft', gain: -7, pan: 0.4},
  {f: 60, sfx: 'reverse_cymbal', gain: -6, params: {dur: 1.0}},
  // DROP: sun flood + logo sting (boom = biggest hit of the film so far)
  {f: 60, sfx: 'boom', gain: 0},
  {f: 60, sfx: 'logo_sting', gain: -3},
  // cream circle sweeps in behind the sun ring (DAY)
  {f: 66, sfx: 'whoosh', gain: -12, params: {dur: 0.5}},
  // logo tile pops, stem grows to the seed, the seed becomes the yellow leaf
  {f: 68, sfx: 'pop', gain: -6},
  {f: 83, sfx: 'shimmer', gain: -8},
  // «AgroVerse» decodes 80 → locks 106
  {f: 80, sfx: 'scramble', gain: -11, params: {frames: 26}},
  {f: 106, sfx: 'lock', gain: -5},
  // lockup lifts, eyebrow + hero line rise in
  {f: 99, sfx: 'hit_soft', gain: -10},
  // text leaves, lockup shrinks and drifts to the top-left (peak speed f157)
  {f: 157, sfx: 'swish', gain: -8, pan: -0.5},
];
