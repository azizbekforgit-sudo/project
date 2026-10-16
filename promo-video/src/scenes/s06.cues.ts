import type {Cue} from '../timing';
// Frames are RELATIVE to the scene start (abs 990–1230).
export const cues: Cue[] = [
  {f: 4, sfx: 'swish', gain: -12}, // phone settles in
  {f: 1, sfx: 'scramble', gain: -14, params: {frames: 8}}, // «03» chip
  {f: 9, sfx: 'lock', gain: -12},
  {f: 15, sfx: 'notification', gain: -6}, // banner drops
  {f: 15, sfx: 'vibrate', gain: -6}, // phone wiggle 15–24
  {f: 60, sfx: 'ui_tap', gain: -6}, // tap the banner
  {f: 66, sfx: 'swish', gain: -12}, // orders screen slides in
  {f: 88, sfx: 'pop', gain: -10}, // card pops off the screen
  {f: 104, sfx: 'swish', gain: -9}, // card flies to its place
  {f: 120, sfx: 'hit_soft', gain: -8}, // «Созвонились.» + Позвонить ring
  {f: 150, sfx: 'hit_soft', gain: -8}, // «Договорились.» + Написать ring
  {f: 180, sfx: 'ui_tap', gain: -4}, // tap «Продано»
  {f: 182, sfx: 'success', gain: -4}, // pill morph
  {f: 184, sfx: 'shimmer', gain: -16}, // sun dots
  {f: 237, sfx: 'whoosh', gain: -8, params: {dur: 0.5}}, // exit whip → S07
];
