/* S01 Hook — all key frames (RELATIVE to scene start). Pure: imported by the scene and by s01.cues.ts. */
import {scrambleEnd} from '../../timing';

export const T = {
  bgIn: 8, // black → night
  dropFrom: 4, // seed enters from above
  land: 16, // seed lands (squash, ripple)
  l1Start: 18, // «Фермер вырастил» decode starts at the seed
  l1Stagger: 2.2, // 16:9 one line, 15 chars, centre-out
  l1StaggerV: 16 / 3.5, // 9:16 two lines («вырастил» = 8 chars) — same lock frame
  l1Scramble: 14,
  seedGo: 22, // seed lifts off the line …
  seedArrive: 42, // … and hangs over the deck
  deckIn: 25, // face-down deck slides in (bottom card first)
  swaps: [45, 60, 75, 90, 105], // slot words + card landings (on beats)
  flight: 7, // frames a card is in the air (lands on the swap frame)
  slotDur: 9, // slot reel roll length …
  slotLead: 4, // … starting this many frames before the swap (fastest on the beat)
  square: 108, // pile squares up after «урожай.»
  groupUp: [119, 129] as const, // line 1 + slot + pile slide up, dim, defocus
  l2Start: 123,
  l2Stagger: 0.65,
  l2Scramble: 9,
  underline: [150, 160] as const, // coral marker under «не он.»
  exit: [171, 181] as const, // whip up with vertical blur (still mid-whip on the last frame, 179)
};

export const L1_TEXT = 'Фермер вырастил';
export const L1_LOCK = scrambleEnd(L1_TEXT, T.l1Start, T.l1Stagger, T.l1Scramble, 'center'); // 48
export const L2_TEXT = 'Но цену назначает не он.';
export const L2_LOCK = scrambleEnd(L2_TEXT, T.l2Start, T.l2Stagger, T.l2Scramble, 'ltr'); // 147

export const SLOT_WORDS = ['помидоры', 'яблоки', 'пшеницу', 'дыни', 'урожай.'];
export const CARD_EMOJI = ['tomato', 'red-apple', 'sheaf-of-rice', 'melon', 'seedling'];
