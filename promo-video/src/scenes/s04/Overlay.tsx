import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, E, F, SPR, clamp} from '../../theme';
import {T, TAPS, TOAST} from './plan';

/* The sun seed as a finger/tap dot, in app space (390×844). */
const SeedDot: React.FC<{x: number; y: number; r?: number; o?: number; halo?: number}> = ({x, y, r = 7, o = 1, halo = 1}) => (
  <div style={{position: 'absolute', left: x, top: y, width: 0, height: 0, opacity: o, pointerEvents: 'none'}}>
    <div
      style={{
        position: 'absolute',
        width: r * 6 * halo,
        height: r * 6 * halo,
        left: (-r * 6 * halo) / 2,
        top: (-r * 6 * halo) / 2,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(240,180,41,0.34) 0%, rgba(240,180,41,0.12) 38%, rgba(240,180,41,0) 70%)',
      }}
    />
    <div
      style={{
        position: 'absolute',
        width: r * 2,
        height: r * 2,
        left: -r,
        top: -r,
        borderRadius: '50%',
        background: `radial-gradient(circle at 38% 34%, #FFE08A 0%, ${C.sun} 55%, ${C.sunLight} 100%)`,
        boxShadow: `0 0 ${r * 1.4}px ${r * 0.5}px rgba(240,180,41,0.55), 0 ${r * 0.3}px ${r * 0.8}px rgba(120,80,0,0.25)`,
      }}
    />
  </div>
);

/** One tap: the seed glides in from the thumb side, presses, rings, lifts away. */
const useTap = (at: number, x: number, y: number, leave = true) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (f < at - 12 || (leave && f > at + 16)) return null;
  const a = interpolate(f, [at - 12, at - 1], [0, 1], {...clamp, easing: E.out});
  const press = f < at ? interpolate(f, [at - 2, at], [0, 1], clamp) : 1 - spring({frame: f - at, fps, config: SPR.snap});
  const lift = leave ? interpolate(f, [at + 5, at + 14], [0, 1], {...clamp, easing: E.in}) : 0;
  const ring = interpolate(f, [at, at + 16], [0, 1], {...clamp, easing: E.out});
  return {
    x: x + (1 - a) * 30 + lift * 10,
    y: y + (1 - a) * 46 + lift * 16,
    o: Math.min(1, a * 1.6) * (1 - lift),
    r: 7 * (1 - 0.2 * press) * (0.75 + 0.25 * a),
    ring,
    ringOn: f >= at,
  };
};

const Ring: React.FC<{x: number; y: number; p: number}> = ({x, y, p}) => {
  const d = 22 + p * 46;
  return (
    <div
      style={{
        position: 'absolute',
        left: x - d / 2,
        top: y - d / 2,
        width: d,
        height: d,
        borderRadius: '50%',
        border: `${2.4 * (1 - 0.4 * p)}px solid rgba(240,180,41,${0.85 * (1 - p)})`,
      }}
    />
  );
};

/** where the publish-tap seed is while it flies up into the toast (before it lands) */
export const seedFlight = (f: number) => {
  const p = interpolate(f, [...T.seedFly], [0, 1], {...clamp, easing: E.inOut});
  const x0 = TAPS.publish.x;
  const y0 = TAPS.publish.y;
  const x1 = TOAST.checkX;
  const y1 = TOAST.checkY + toastDrop(f).dy;
  // gentle arc (bulges right, like a thrown paper plane)
  const cx = (x0 + x1) / 2 + 70;
  const cy = (y0 + y1) / 2;
  const q = 1 - p;
  return {x: q * q * x0 + 2 * q * p * cx + p * p * x1, y: q * q * y0 + 2 * q * p * cy + p * p * y1, p};
};

export const SeedLayer: React.FC = () => {
  const f = useCurrentFrame();
  const t1 = useTap(T.tap1, TAPS.next.x, TAPS.next.y);
  const t2 = useTap(T.tap2, TAPS.next.x, TAPS.next.y);
  const t3 = useTap(T.tap3, TAPS.publish.x, TAPS.publish.y, false);
  const ring3 = interpolate(f, [T.tap3, T.tap3 + 16], [0, 1], {...clamp, easing: E.out});
  const flying = f >= T.seedFly[0] && f < T.seedFly[1];
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: 390, height: 844, pointerEvents: 'none'}}>
      {[t1, t2].map((t, i) =>
        t ? (
          <React.Fragment key={i}>
            {t.ringOn ? <Ring x={TAPS.next.x} y={TAPS.next.y} p={t.ring} /> : null}
            <SeedDot x={t.x} y={t.y} r={t.r} o={t.o} />
          </React.Fragment>
        ) : null,
      )}
      {f >= T.tap3 && f < T.tap3 + 17 ? <Ring x={TAPS.publish.x} y={TAPS.publish.y} p={ring3} /> : null}
      {t3 && f < T.seedFly[0] ? <SeedDot x={t3.x} y={t3.y} r={t3.r} o={t3.o} /> : null}
      {flying
        ? [0.9, 0.6, 0.3, 0].map((lag, k) => {
            const s = seedFlight(f - lag * 1.6);
            return <SeedDot key={k} x={s.x} y={s.y} r={k === 3 ? 9 : 4.5 + 1.2 * k} o={k === 3 ? 1 : 0.28 + 0.16 * k} halo={k === 3 ? 1.35 : 0.7} />;
          })
        : null}
    </div>
  );
};

/* ── Toast (rebuilt from the app: white 96 %, 1 px green border, r14, Golos 600 17 px, «✓») ── */
export const toastDrop = (f: number) => {
  const p = interpolate(f, [T.toast - 1, T.toast + 8], [0, 1], {...clamp, easing: E.out});
  return {p, dy: (1 - p) * -30, o: interpolate(f, [T.toast - 1, T.toast + 1], [0, 1], clamp)};
};

export const Toast: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (f < T.toast - 1) return null;
  const drop = toastDrop(f);
  const lift = interpolate(f, [...T.lift], [0, 1], {...clamp, easing: E.out});
  const scale = 1 + 0.5 * lift;
  const circle = spring({frame: f - T.check, fps, config: SPR.pop});
  const tick = interpolate(f, [T.check + 2, T.check + 9], [0, 1], {...clamp, easing: E.out});
  // the seed: lands in the circle's centre at seedFly end, then settles as a small badge on its shoulder
  const landed = f >= T.seedFly[1];
  const badge = interpolate(f, [T.check, T.check + 8], [0, 1], {...clamp, easing: E.out});
  const pulse = f >= 195 ? Math.exp(-(f - 195) / 5) : 0;
  const cx = TOAST.checkX - TOAST.x;
  const cy = TOAST.h / 2;
  return (
    <div
      style={{
        position: 'absolute',
        left: TOAST.x,
        top: TOAST.y + drop.dy,
        width: TOAST.w,
        height: TOAST.h,
        transform: `scale(${scale})`,
        transformOrigin: '50% 50%',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: drop.o,
          boxSizing: 'border-box',
          borderRadius: 14,
          background: 'rgba(255,255,255,0.97)',
          border: `1px solid ${C.field}`,
          boxShadow: `0 ${8 + 18 * lift}px ${22 + 34 * lift}px -${6 + 4 * lift}px rgba(20,40,25,${0.16 + 0.14 * lift}), 0 1px 2px rgba(20,40,25,0.06)`,
          display: 'flex',
          alignItems: 'center',
          padding: '0 18px 0 20px',
          gap: 12,
        }}
      >
        <div style={{width: 26, height: 26, flex: '0 0 26px', position: 'relative'}}>
          <div style={{position: 'absolute', inset: 0, borderRadius: 13, background: C.field, transform: `scale(${circle})`}} />
          <svg width={26} height={26} viewBox="0 0 26 26" style={{position: 'absolute', inset: 0}}>
            <path d="M7.4 13.6 L11.3 17.3 L18.8 9.4" fill="none" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={18} strokeDashoffset={18 * (1 - tick)} />
          </svg>
        </div>
        <span style={{fontFamily: F.body, fontWeight: 600, fontSize: 17, color: '#1A201C', whiteSpace: 'nowrap', letterSpacing: '-0.005em'}}>Товар успешно опубликован!</span>
      </div>
      {landed ? (
        <SeedDot
          x={cx + badge * 11}
          y={cy - badge * 11}
          r={8 - 3.6 * badge + 1.2 * pulse}
          halo={1 + 0.5 * pulse}
        />
      ) : null}
    </div>
  );
};

export {SeedDot};
