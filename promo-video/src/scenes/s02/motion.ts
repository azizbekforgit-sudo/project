/* S02 motion maths — pure functions of the (fractional) frame. */
import {interpolate, spring} from 'remotion';
import {E, clamp} from '../../theme';
import {ChainGeom, TAG_APEX, TAG_BASE, GROW_AT, HOP_DUR, HUSH, LAND, Pt, SEED_DROP, STAMP_AT, TAG_RELEASE, TAG_SCALE, hopStart} from './geometry';

const FPS = 30;

/** small damped bounce after a landing (t = frames since landing) */
export const bounce = (t: number, amp: number, period = 6, decay = 3.2) =>
  t <= 0 || t > 24 ? 0 : amp * Math.exp(-t / decay) * Math.sin((Math.PI * t) / period);

/** Seed / ring position on the price line. */
export const ringPos = (t: number, g: ChainGeom, u: (n: number) => number): Pt => {
  const a = g.anchors;
  // seed drop onto the line
  if (t < SEED_DROP[1]) {
    const p = interpolate(t, [SEED_DROP[0], SEED_DROP[1]], [0, 1], {...clamp, easing: E.in});
    return {x: a[0].x, y: a[0].y - (1 - p) * (a[0].y + u(60))};
  }
  let p: Pt = a[0];
  let landedAt: number = SEED_DROP[1];
  let amp = u(9);
  for (let k = 1; k < 5; k++) {
    const hs = hopStart(k);
    const he = hs + HOP_DUR;
    if (t >= he) {
      p = a[k];
      landedAt = he;
      amp = u(6);
      continue;
    }
    if (t > hs) {
      const e = interpolate(t, [hs, he], [0, 1], {...clamp, easing: E.inOut});
      const arc = Math.sin(Math.PI * interpolate(t, [hs, he], [0, 1], {...clamp, easing: E.smooth}));
      return {
        x: a[k - 1].x + (a[k].x - a[k - 1].x) * e + g.hopLift.x * arc,
        y: a[k - 1].y + (a[k].y - a[k - 1].y) * e + g.hopLift.y * arc,
      };
    }
    break;
  }
  const b = bounce(t - landedAt, amp);
  return {x: p.x, y: p.y + b};
};

const GROW_CFG = {damping: 12, stiffness: 190, mass: 0.75};
/** Tag scale (0 before it unfolds). */
export const tagScale = (t: number) => {
  let s = spring({frame: t - TAG_RELEASE, fps: FPS, config: {damping: 14, stiffness: 170, mass: 0.7}});
  for (let k = 1; k < 5; k++) s += (TAG_SCALE[k] - TAG_SCALE[k - 1]) * spring({frame: t - GROW_AT[k], fps: FPS, config: GROW_CFG});
  return s;
};

const SCALE_CACHE = new Map<number, number>();
const scaleAt = (fr: number) => {
  let v = SCALE_CACHE.get(fr);
  if (v === undefined) {
    v = tagScale(fr);
    SCALE_CACHE.set(fr, v);
  }
  return v;
};

/** Which card the tag currently belongs to (for the trail). */
export const tagIndex = (t: number) => {
  let k = 0;
  for (let j = 1; j < 5; j++) if (t >= hopStart(j) + HOP_DUR * 0.5) k = j;
  return k;
};

/**
 * Pendulum swing of the tag hanging from the ring (radians, + = bob to the right).
 * Deterministic integration from the release frame to t, driven by the ring's acceleration.
 */
export const SWING = {th0: -0.55, grav: 2.9, K: 0.08, damp: 0.2, jolt: 0.012};
export const swing = (t: number, g: ChainGeom, u: (n: number) => number) => {
  if (t <= TAG_RELEASE) return SWING.th0;
  const dt = 0.25;
  const h = 0.25;
  const grav = u(SWING.grav);
  const K = SWING.K; // how strongly the ring's acceleration drives the tag
  let th = SWING.th0;
  let w = 0;
  const stamps = STAMP_AT.filter((s) => s > 0);
  for (let s = TAG_RELEASE; s < t - 1e-6; s += dt) {
    const pa = ringPos(s - h, g, u);
    const pb = ringPos(s, g, u);
    const pc = ringPos(s + h, g, u);
    let ax = (pa.x - 2 * pb.x + pc.x) / (h * h);
    let ay = (pa.y - 2 * pb.y + pc.y) / (h * h);
    // clip finite-difference spikes at bounce onsets
    ax = Math.max(-u(30), Math.min(u(30), ax));
    ay = Math.max(-u(30), Math.min(u(30), ay));
    const sc = Math.max(0.6, scaleAt(Math.floor(s)));
    const L = g.stringLen + sc * TAG_BASE * u(TAG_APEX + 26);
    const damp = s < 190 ? SWING.damp : interpolate(s, [190, HUSH - 4], [SWING.damp, 0.6], clamp);
    const alpha = (-K * ax * Math.cos(th) - (grav - K * ay) * Math.sin(th)) / L - damp * w;
    w += alpha * dt;
    th += w * dt;
    // stamp jolts: the slam shakes the line, the tag twitches
    for (const st of stamps) if (s < st && s + dt >= st) w += SWING.jolt;
  }
  return th;
};

export {LAND};
