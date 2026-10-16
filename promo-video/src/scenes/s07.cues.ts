import type {Cue} from '../timing';
// Frames are RELATIVE to the scene start (abs 1230 = 0).
export const cues: Cue[] = [
  {f: 12, sfx: 'bubble', gain: -8, pan: 0.25},
  {f: 20, sfx: 'typing', gain: -16, pan: -0.2, params: {frames: 12}},
  {f: 32, sfx: 'bubble', gain: -8, pan: -0.25},
  {f: 52, sfx: 'bubble', gain: -8, pan: 0.25},
  {f: 57, sfx: 'pop', gain: -10, pan: 0.3}, // call button ring
  {f: 69, sfx: 'swish', gain: -9}, // chat -> assistant push
  {f: 74, sfx: 'shimmer', gain: -12}, // orb flare
  {f: 82, sfx: 'typing', gain: -12, params: {frames: 19}}, // question typed
  {f: 104, sfx: 'ui_tap', gain: -6, pan: 0.2},
  {f: 106, sfx: 'bubble', gain: -8, pan: 0.25},
  {f: 112, sfx: 'typing', gain: -16, pan: -0.2, params: {frames: 10}}, // ai typing dots
  {f: 122, sfx: 'tick', gain: -14},
  {f: 127, sfx: 'tick', gain: -14},
  {f: 132, sfx: 'tick', gain: -14},
  {f: 137, sfx: 'tick', gain: -14},
  {f: 146, sfx: 'lock', gain: -12}, // answer complete
];
