import type {Cue} from '../timing';
// Frames are RELATIVE to the scene start (s09 = absolute 1560).
export const cues: Cue[] = [
  {f: 0, sfx: 'impact', gain: -1},
  {f: 15, sfx: 'impact', gain: -1},
  {f: 30, sfx: 'impact', gain: 0},
  {f: 31, sfx: 'hit_soft', gain: -8}, // the sun seed lands as the full stop
  {f: 53, sfx: 'whoosh', gain: -9, params: {dur: 0.5}}, // seed rises
  {f: 60, sfx: 'reverse_cymbal', gain: -8, params: {dur: 0.5}}, // ends on the s10 flood
];
