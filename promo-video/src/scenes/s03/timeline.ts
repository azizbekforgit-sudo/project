/* S03 Turn + brand reveal — timeline (frames RELATIVE to the scene start, abs 420).
   Beats fall on 0, 15, 30, 45, 60 (= the drop, abs 480), 75, 90 … */

export const T = {
  /** middleman cards 1..3 lift off (riffle, 3 f stagger) */
  exit: [3, 6, 9] as const,
  exitDur: 15,
  /** arrows between the cards fade with them */
  arrowsOut: [1, 7] as const,
  /** old headline / verdict leave through their masks */
  headOut: 2,
  verdictOut: 3,
  /** price tag springs back to 1.0 and cools from coral to sun */
  shrink: 4,
  cool: [4, 20] as const,
  /** the tag zips back along the rail to the farmer (markups undone) */
  rewind: [4, 18] as const,
  /** Фермер and Вы slide toward each other */
  slide: [10, 34] as const,
  /** «Сейчас» pill turns into the sun pill «С AgroVerse» (beat) */
  pill: 15,
  pillDur: 10,
  /** seed (with the tag at 1.0) travels Фермер → Вы leaving a bright line */
  travel: [20, 45] as const,
  /** «Напрямую.» masks up (beat) */
  word: 30,
  /** seed lands on Вы (beat) */
  arrive: 45,
  /** seed lifts off the line and glides to the logo centre while swelling (riser peak) */
  rise: [46, 58] as const,
  /** DROP — boom + logo sting (abs 480) */
  drop: 60,
  /** sun circle, then cream circle (DAY) — both pass every corner over several frames */
  sunFlood: [59, 73] as const, // starts a frame early so the burst is already visible on the boom frame
  creamFlood: [64, 80] as const,
  /** LogoMark build (≈34 f); its yellow leaf unfolds at logo + 17 */
  logo: 66,
  /** «AgroVerse» decode: 80 + 8·2 + 10 = lock at 106 */
  wordmark: 80,
  wmStagger: 2,
  wmScramble: 10,
  /** 16:9: the lockup is built dead centre, then lifts to make room for the line under it */
  lift: [92, 110] as const,
  /** eyebrow + hero line */
  eyebrow: 96,
  hero: [98, 103, 107] as const,
  /** text leaves, lockup scales down and drifts to the top-left (still drifting at the cut) */
  textOut: 151,
  /** the lockup moves as ONE unit (scale + translate to the top-left)… */
  drift: [154, 182] as const,
  /** …while inside it the wordmark swings from under the icon to its right: x first, then y (never crosses the icon) */
  relayX: [157, 171] as const,
  relayY: [169, 185] as const,
} as const;

export const LEAF_AT = T.logo + 17;
export const WM_LOCK = T.wordmark + 8 * T.wmStagger + T.wmScramble; // 106

/** Lockup geometry (stacked: icon above the wordmark) for the reveal, and the small top-left mark at the end. */
export const lockupGeom = (W: number, H: number, vertical: boolean, u: (n: number) => number) => {
  if (!vertical) {
    const S = u(210);
    const logoTop = u(226);
    const logoTopA = u(335); // logo + wordmark centred in frame during the reveal
    const wmSize = u(128);
    const wmTop = logoTop + S + u(28);
    const eyebrowTop = wmTop + wmSize + u(40);
    const heroTop = eyebrowTop + u(26) + u(34);
    return {
      S,
      logoCx: W / 2,
      logoTop,
      logoTopA,
      wmSize,
      wmTop,
      eyebrowSize: u(26),
      eyebrowTop,
      heroSize: u(62),
      heroTop,
      heroLines: [['Продайте урожай.', 0], ['Найдите нужный продукт.', 1]] as [string, number][],
      small: {x: u(140), y: u(80), S: u(64), wm: u(46), gap: u(18)},
    };
  }
  const S = u(240);
  const logoTop = u(548);
  const wmSize = u(150);
  const wmTop = logoTop + S + u(30);
  const eyebrowTop = wmTop + wmSize + u(44);
  const heroTop = eyebrowTop + u(28) + u(36);
  return {
    S,
    logoCx: W / 2,
    logoTop,
    logoTopA: logoTop, // 9:16 has room: no lift
    wmSize,
    wmTop,
    eyebrowSize: u(28),
    eyebrowTop,
    heroSize: u(68),
    heroTop,
    heroLines: [['Продайте урожай.', 0], ['Найдите нужный', 1], ['продукт.', 1]] as [string, number][],
    small: {x: u(72), y: u(160), S: u(72), wm: u(52), gap: u(20)},
  };
};

/** where the seed sits on the logo: top of the stem, the base of the yellow leaf (icon units 256,240 of 512) */
export const seedOnLogo = (g: ReturnType<typeof lockupGeom>) => ({x: g.logoCx, y: g.logoTopA + (g.S * 240) / 512});
