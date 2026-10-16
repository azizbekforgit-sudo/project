/* S02 Chain — timeline + layout (pure). Frames are RELATIVE to the scene start (abs 180).
   Exported so a neighbouring scene (S03) can match the final pose exactly:
   at the last frame the stage is scaled by CAMERA_END about the frame centre. */

export const LAND = [30, 60, 90, 120, 150] as const; // card k lands (card_place)
export const FLIGHT = [16, 15, 14, 13, 12] as const; // deal flight length (dealer speeds up as the deck empties)
export const STAMP_AT = [-1, 75, 105, 135, -1] as const; // «+ наценка» slam per card (-1 = none)
export const TAG_SCALE = [1, 1.25, 1.5, 1.8, 2.1] as const;
export const GROW_AT = [0, 75, 105, 135, 165] as const; // tag grows to TAG_SCALE[k] (k ≥ 1)
export const HOP_DUR = 11;
export const hopStart = (k: number) => LAND[k] + 2; // tag hops from card k-1 to k
export const SEED_DROP = [26, 36] as const; // seed falls onto the price line
export const TAG_RELEASE = 38; // tag unfolds from the seed
export const HEAT = [165, 196] as const; // tag glows hot
export const RESULT_1 = 170;
export const RESULT_2 = 185;
export const HUSH = 216;
export const CAMERA_END = 1.015;
/** tag drawing scale at TAG_SCALE 1.0 (tag units → u) */
export const TAG_BASE = 1.15;
/** distance (tag units) from the tag's apex down to its punched hole */
export const TAG_APEX = 15;

export const CARDS = [
  {label: 'Фермер', icon: 'wheat-awn', mid: false},
  {label: 'Перекупщик', icon: 'user-tie', mid: true},
  {label: 'Оптовый базар', icon: 'warehouse', mid: true},
  {label: 'Магазин', icon: 'shop', mid: true},
  {label: 'Вы', icon: 'user', mid: false},
] as const;

export type Pt = {x: number; y: number};
export type Rect = {x: number; y: number; w: number; h: number};

export type ChainGeom = {
  cards: Rect[]; // final card rects (top-left), stage space (= frame space at camera 1.0)
  centers: Pt[];
  anchors: Pt[]; // seed/ring rest point for each card
  rail: [Pt, Pt];
  hopLift: Pt; // direction/size of the hop arc
  deck: Pt & {scale: number; rot: number};
  arrowAxis: 'x' | 'y';
  stringLen: number;
};

export const chainGeometry = (W: number, H: number, vertical: boolean, u: (n: number) => number): ChainGeom => {
  if (!vertical) {
    const w = u(260);
    const h = u(226);
    const gap = u(85);
    const total = 5 * w + 4 * gap;
    const x0 = (W - total) / 2;
    const top = u(598);
    const cards = [0, 1, 2, 3, 4].map((k) => ({x: x0 + k * (w + gap), y: top, w, h}));
    const centers = cards.map((c) => ({x: c.x + c.w / 2, y: c.y + c.h / 2}));
    const railY = u(348);
    const anchors = centers.map((c) => ({x: c.x, y: railY}));
    return {
      cards,
      centers,
      anchors,
      rail: [
        {x: cards[0].x, y: railY},
        {x: cards[4].x + w, y: railY},
      ],
      hopLift: {x: 0, y: -u(26)},
      deck: {x: W - u(262), y: u(938), scale: 0.74, rot: -6},
      arrowAxis: 'x',
      stringLen: u(22),
    };
  }
  const w = u(600);
  const h = u(124);
  const gap = u(58);
  const x0 = u(72);
  const top0 = u(640);
  const cards = [0, 1, 2, 3, 4].map((k) => ({x: x0, y: top0 + k * (h + gap), w, h}));
  const centers = cards.map((c) => ({x: c.x + c.w / 2, y: c.y + c.h / 2}));
  const railX = u(836);
  const anchors = cards.map((c) => ({x: railX, y: c.y + u(6)}));
  return {
    cards,
    centers,
    anchors,
    rail: [
      {x: railX, y: cards[0].y - u(40)},
      {x: railX, y: cards[4].y + h},
    ],
    hopLift: {x: u(64), y: 0},
    deck: {x: u(830), y: H - u(262), scale: 0.6, rot: -6},
    arrowAxis: 'y',
    stringLen: u(22),
  };
};
