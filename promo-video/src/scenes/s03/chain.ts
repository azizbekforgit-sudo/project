/* S03 chain motion (pure, stage space = S02's stage space). Continues S02's final pose exactly. */
import {interpolate, spring} from 'remotion';
import {E, clamp} from '../../theme';
import {ChainGeom, Pt, Rect, TAG_APEX, TAG_BASE, chainGeometry} from '../s02/geometry';
import {SWING, swing, tagScale} from '../s02/motion';
import {T} from './timeline';

type U = (n: number) => number;
const FPS = 30;
/** S02's last frame is 239; S03 frame 0 is the frame after it */
export const S02_END = 240;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpPt = (a: Pt, b: Pt, t: number): Pt => ({x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t)});

/** final positions of Фермер / Вы after they slide toward each other */
const slideTargets = (g: ChainGeom, vertical: boolean, W: number, u: U) => {
  const c = g.cards[0];
  if (!vertical) {
    const half = u(360);
    return {c0: {...c, x: W / 2 - half - c.w / 2}, c4: {...g.cards[4], x: W / 2 + half - c.w / 2}};
  }
  // centre the two-card chain in the space left under the headline
  return {c0: {...c, y: u(760)}, c4: {...g.cards[4], y: u(1300)}};
};

export type ChainState = {
  c0: Rect;
  c4: Rect;
  a0: Pt;
  a4: Pt;
  rail: [Pt, Pt];
};

export const chainAt = (s: number, g: ChainGeom, vertical: boolean, W: number, u: U): ChainState => {
  const p = interpolate(s, T.slide as unknown as number[], [0, 1], {...clamp, easing: E.inOut});
  const tg = slideTargets(g, vertical, W, u);
  const c0 = {...g.cards[0], x: lerp(g.cards[0].x, tg.c0.x, p), y: lerp(g.cards[0].y, tg.c0.y, p)};
  const c4 = {...g.cards[4], x: lerp(g.cards[4].x, tg.c4.x, p), y: lerp(g.cards[4].y, tg.c4.y, p)};
  if (!vertical) {
    const railY = g.anchors[0].y;
    return {
      c0,
      c4,
      a0: {x: c0.x + c0.w / 2, y: railY},
      a4: {x: c4.x + c4.w / 2, y: railY},
      rail: [
        {x: c0.x, y: railY},
        {x: c4.x + c4.w, y: railY},
      ],
    };
  }
  const railX = g.anchors[0].x;
  return {
    c0,
    c4,
    a0: {x: railX, y: c0.y + u(6)},
    a4: {x: railX, y: c4.y + u(6)},
    rail: [
      {x: railX, y: c0.y - u(40)},
      {x: railX, y: c4.y + c4.h},
    ],
  };
};

/** ring (= seed on the line) position in stage space */
export const ringAt = (s: number, g: ChainGeom, vertical: boolean, W: number, u: U): Pt => {
  const st = chainAt(s, g, vertical, W, u);
  if (s < T.rewind[0]) return st.a4;
  if (s < T.rewind[1]) return lerpPt(st.a4, st.a0, interpolate(s, T.rewind as unknown as number[], [0, 1], {...clamp, easing: E.inOut}));
  if (s < T.travel[0]) return st.a0;
  if (s < T.travel[1]) return lerpPt(st.a0, st.a4, interpolate(s, T.travel as unknown as number[], [0, 1], {...clamp, easing: E.inOut}));
  return st.a4;
};

/* ── S02 hand-off state (cached per layout) ── */
const HANDOFF = new Map<string, {th: number; w: number; sc: number}>();
export const handoff = (W: number, H: number, vertical: boolean, u: U) => {
  const key = `${W}x${H}`;
  let v = HANDOFF.get(key);
  if (!v) {
    const g = chainGeometry(W, H, vertical, u);
    const th1 = swing(S02_END - 1, g, u);
    const th2 = swing(S02_END, g, u);
    v = {th: th2, w: th2 - th1, sc: tagScale(S02_END)};
    HANDOFF.set(key, v);
  }
  return v;
};

/** tag scale: springs from S02's 2.1 back to 1.0 */
export const tagScaleAt = (s: number, sc0: number) =>
  sc0 + (1 - sc0) * spring({frame: s - T.shrink, fps: FPS, config: {damping: 13, stiffness: 150, mass: 0.8}});

/** heat 1 → 0 (coral → sun) */
export const heatAt = (s: number) => 1 - interpolate(s, T.cool as unknown as number[], [0, 1], {...clamp, easing: E.inOut});

/**
 * Pendulum swing of the hanging tag (radians), integrated from S02's hand-off angle/velocity,
 * driven by the ring's acceleration (same model + constants as S02). Valid up to the detach frame.
 */
export const tagSwing = (t: number, g: ChainGeom, vertical: boolean, W: number, H: number, u: U) => {
  const h0 = handoff(W, H, vertical, u);
  const dt = 0.25;
  const h = 0.25;
  const grav = u(SWING.grav);
  let th = h0.th;
  let w = h0.w;
  const end = Math.min(t, T.rise[0]);
  for (let s = 0; s < end - 1e-6; s += dt) {
    const pa = ringAt(s - h, g, vertical, W, u);
    const pb = ringAt(s, g, vertical, W, u);
    const pc = ringAt(s + h, g, vertical, W, u);
    let ax = (pa.x - 2 * pb.x + pc.x) / (h * h);
    let ay = (pa.y - 2 * pb.y + pc.y) / (h * h);
    ax = Math.max(-u(30), Math.min(u(30), ax));
    ay = Math.max(-u(30), Math.min(u(30), ay));
    const sc = Math.max(0.6, tagScaleAt(s, h0.sc));
    const L = g.stringLen + sc * TAG_BASE * u(TAG_APEX + 26);
    const alpha = (-SWING.K * ax * Math.cos(th) - (grav - SWING.K * ay) * Math.sin(th)) / L - 0.24 * w;
    w += alpha * dt;
    th += w * dt;
  }
  return {th, w};
};
