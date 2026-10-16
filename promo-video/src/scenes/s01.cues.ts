import type {Cue} from '../timing';
import {L1_LOCK, L2_LOCK, T} from './s01/timing';
// Frames are RELATIVE to the scene start.

const [s1, s2, s3, s4, s5] = T.swaps;

export const cues: Cue[] = [
  // the sun seed: short air pass peaking just before it lands, then a soft thump on the squash (f16)
  {f: T.land - 2, sfx: 'swish', gain: -17, params: {dur: 0.3}},
  {f: T.land, sfx: 'hit_soft', gain: -2},
  // «Фермер вырастил» decodes out of the seed (f18 → f48)
  {f: T.l1Start, sfx: 'scramble', gain: -16, params: {frames: L1_LOCK - T.l1Start}},
  {f: L1_LOCK, sfx: 'lock', gain: -7},
  // face-down deck slides in under the seed (f25 → ~f38)
  {f: T.deckIn + 3, sfx: 'card_shuffle', gain: -13, pan: 0.3, params: {dur: 0.45}},
  // each card flips over and slaps onto the pile ON the beat; the slot word rolls on the same frame
  ...[s1, s2, s3, s4].flatMap((s): Cue[] => [
    {f: s, sfx: 'card_place', gain: -7, pan: 0.3},
    {f: s, sfx: 'tick', gain: -13},
  ]),
  // «урожай.» + seedling card: the decisive lock (pile squares up, rim glow)
  {f: s5, sfx: 'card_place', gain: -5, pan: 0.3},
  {f: s5, sfx: 'lock', gain: -4},
  // the sentence steps back (peak speed of the slide-up)
  {f: T.groupUp[0] + 2, sfx: 'swish', gain: -14, params: {dur: 0.35}},
  // «Но цену назначает не он.» decodes ltr (f123 → f147)
  {f: T.l2Start, sfx: 'scramble', gain: -16, params: {frames: L2_LOCK - T.l2Start}},
  {f: L2_LOCK, sfx: 'lock', gain: -7},
  // coral marker swipes under «не он.» with a soft stamp thump
  {f: T.underline[0], sfx: 'stamp', gain: -9},
  // whip up into S02 — peak speed at the cut
  {f: 180, sfx: 'whoosh', gain: -7, params: {dur: 0.5}},
];
