/* Pure timing data (no React / no fonts) — imported by scenes AND by tools/export-cues.ts → audio/cues.json.
   120 BPM @ 30 fps: beat = 15 f, bar = 60 f = 2 s. Film = 1800 f = 60 s = 30 bars. */

export const FPS = 30;
export const BEAT = 15;
export const BAR = 60;
export const TOTAL = 1800;
export const sec = (s: number) => Math.round(s * FPS);

/** Scene table — absolute frames [from, to). Scenes may draw a few frames past `to` only via `tail`. */
export const SCENES = [
  {id: 's01', name: 'Hook', from: 0, to: 180},
  {id: 's02', name: 'Chain', from: 180, to: 420},
  {id: 's03', name: 'Reveal', from: 420, to: 600},
  {id: 's04', name: 'Sell', from: 600, to: 810},
  {id: 's05', name: 'Buy', from: 810, to: 990},
  {id: 's06', name: 'Order', from: 990, to: 1230},
  {id: 's07', name: 'Talk', from: 1230, to: 1380},
  {id: 's08', name: 'Comfort', from: 1380, to: 1560},
  {id: 's09', name: 'Values', from: 1560, to: 1620},
  {id: 's10', name: 'End', from: 1620, to: 1800},
] as const;

export type SceneId = (typeof SCENES)[number]['id'];
export const scene = (id: SceneId) => SCENES.find((s) => s.id === id)!;

/**
 * Music plan (A minor, Hijaz colour in the tension parts, VI–III–VII–i after the drop, A major at the end).
 * Frames are absolute. The audio builder follows this exactly.
 */
export const MUSIC = {
  bpm: 120,
  key: 'A minor',
  sections: [
    {from: 0, to: 180, name: 'intro-tension', energy: 0.25, note: 'dark dutar drone + sparse doira taps, Hijaz motif (E–F–G#–A), no kick'},
    {from: 180, to: 405, name: 'problem-build', energy: 0.5, note: 'half-time kick enters at 180, bass pulse, tension rises each bar; doira roll riser 345→405'},
    {from: 405, to: 420, name: 'hush', energy: 0.0, note: 'near-silence (only room tail) — pre-reveal hush'},
    {from: 420, to: 480, name: 'collapse', energy: 0.35, note: 'filtered groove + riser that peaks exactly at 480'},
    {from: 480, to: 1560, name: 'main-groove', energy: 0.85, note: 'DROP at 480: full groove, doira + kick + clap, rubab lead, F–C–G–Am, bright and hopeful'},
    {from: 1560, to: 1620, name: 'values-stops', energy: 0.7, note: 'stop-time hits on 1560, 1575, 1590 (one per word), groove drops out between'},
    {from: 1620, to: 1740, name: 'finale', energy: 0.8, note: 'warm lift, A major colour, pads wide, lead plays the hook motif resolved'},
    {from: 1740, to: 1800, name: 'tail', energy: 0.2, note: 'final hit at 1740, ring-out, ends clean at 1800'},
  ],
  /** frames that must carry a strong musical accent */
  accents: [480, 600, 810, 990, 1230, 1380, 1560, 1575, 1590, 1620, 1740],
} as const;

/* ── SFX cue vocabulary — every scene declares its sounds with these names ── */
export type Sfx =
  | 'whoosh' // air pass; PEAK lands on `f`. params.dur (s, default 0.6)
  | 'swish' // short fast whoosh (UI slide); peak on f
  | 'riser' // builds and ENDS on f. params.dur (s)
  | 'reverse_cymbal' // swells and ENDS on f. params.dur (s)
  | 'boom' // sub drop + impact on f (biggest hit: brand reveal, final)
  | 'impact' // mid impact on f
  | 'hit_soft' // soft thump (seed lands, card settles)
  | 'tick' // single scramble tick
  | 'scramble' // run of ticks from f for params.frames (default 12)
  | 'lock' // crisp click when a text finishes decoding
  | 'pop' // UI element pops in
  | 'ui_tap' // finger tap on a button
  | 'notification' // push notification chime
  | 'vibrate' // phone buzz pattern 120-60-120 ms
  | 'success' // positive sting («Продано», published)
  | 'card_shuffle' // riffle shuffle, params.dur (s)
  | 'card_place' // a card dealt onto the table
  | 'stamp' // rubber stamp thud («+ наценка»)
  | 'bubble' // chat message bubble
  | 'typing' // soft keyboard / typing dots run, params.frames
  | 'switch' // toggle click (theme / language)
  | 'shimmer' // sparkle / glint
  | 'logo_sting' // short tonal sting for the logo
  | 'glitch'; // digital glitch (use at most once)

export type Cue = {f: number; sfx: Sfx; gain?: number /* dB, default 0 */; pan?: number /* -1..1 */; params?: Record<string, number>};

/* ── Scramble helpers (pure) ── */
export type ScrambleOrder = 'ltr' | 'center' | 'random';
export const scrambleEnd = (text: string, start = 0, stagger = 1.5, scramble = 10, order: ScrambleOrder = 'ltr') => {
  const n = Array.from(text).length;
  const maxRank = order === 'center' ? (n - 1) / 2 : n - 1;
  return Math.ceil(start + maxRank * stagger + scramble);
};
