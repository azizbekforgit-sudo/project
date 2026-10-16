import type {Cue} from '../timing';
// Frames are RELATIVE to the scene start.
export const cues: Cue[] = [
  // entrance rise
  {f: 6, sfx: 'swish', gain: -12},
  // beat 1 — three languages (tap on RU, then screens shuffle like cards)
  {f: 11, sfx: 'ui_tap', gain: -8},
  {f: 15, sfx: 'switch', gain: -6},
  {f: 15, sfx: 'card_shuffle', gain: -10, params: {dur: 0.25}},
  {f: 15, sfx: 'scramble', gain: -12, params: {frames: 13}},
  {f: 28, sfx: 'lock', gain: -8},
  {f: 30, sfx: 'switch', gain: -6},
  {f: 30, sfx: 'card_shuffle', gain: -10, params: {dur: 0.25}},
  {f: 30, sfx: 'scramble', gain: -12, params: {frames: 12}},
  {f: 42, sfx: 'lock', gain: -8},
  {f: 45, sfx: 'switch', gain: -6},
  {f: 45, sfx: 'card_shuffle', gain: -10, params: {dur: 0.25}},
  {f: 45, sfx: 'scramble', gain: -12, params: {frames: 13}},
  {f: 58, sfx: 'lock', gain: -6},
  // welcome → market card flick
  {f: 60, sfx: 'card_shuffle', gain: -9, params: {dur: 0.3}},
  // beat 2 — theme: tap the moon, circular reveal
  {f: 70, sfx: 'ui_tap', gain: -8},
  {f: 75, sfx: 'switch', gain: -4},
  {f: 85, sfx: 'whoosh', gain: -10, params: {dur: 0.5}},
  // beat 3 — large text
  {f: 129, sfx: 'ui_tap', gain: -8},
  {f: 135, sfx: 'switch', gain: -6},
  {f: 137, sfx: 'swish', gain: -10},
  // exit whip into S09
  {f: 178, sfx: 'whoosh', gain: -8, params: {dur: 0.4}},
];
