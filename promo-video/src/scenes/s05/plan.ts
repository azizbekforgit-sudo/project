/* S05 timing — all frames RELATIVE to the scene start (abs 810). */
export const PI = Math.PI;

export const T = {
  chip: 3,
  head: 6,
  sub: 20,
  swaps: [20, 35, 50, 65] as const, // Овощи → Фрукты → Зелень → Мёд (abs 830/845/860/875)
  deckIn: 22, // deck appears (abs 832)
  split: [32, 44] as const, // halves part
  drop0: 44, // first card leaves its half
  dropStep: 4,
  dropDur: 13,
  square: 76, // deck squares up (spring)
  dealStart: 86,
  dealStep: 4,
  dealDur: 16,
  lift: [136, 148] as const, // tomato card lifts (abs 946–958)
  tap: 150, // «В корзину» tapped (abs 960)
  badge: 160, // cart badge pops
  textOut: 160,
  exit: [165, 180] as const,
} as const;

/** card index → drop order (0 = first to fall, bottom of the new pile). Halves: L = 0,1,2 (top half), R = 3,4,5 */
export const DROP: Record<number, number> = {5: 0, 2: 1, 4: 2, 1: 3, 3: 4, 0: 5};
/** deal order: top of the pile first → slot k */
export const DEAL_ORDER = [0, 3, 1, 4, 2, 5];
