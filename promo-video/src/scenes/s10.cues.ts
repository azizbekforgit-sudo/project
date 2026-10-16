import type {Cue} from '../timing';
// Frames are RELATIVE to the scene start (s10 = absolute 1620).
export const cues: Cue[] = [
  {f: 2, sfx: 'boom', gain: -4}, // seed floods into the dusk field
  {f: 12, sfx: 'logo_sting', gain: -7},
  {f: 22, sfx: 'swish', gain: -12},
  {f: 32, sfx: 'swish', gain: -13},
  {f: 52, sfx: 'swish', gain: -13},
  {f: 78, sfx: 'pop', gain: -9},
  {f: 86, sfx: 'pop', gain: -10},
  {f: 94, sfx: 'pop', gain: -10},
  {f: 120, sfx: 'shimmer', gain: -3},
  {f: 120, sfx: 'hit_soft', gain: -6},
];
