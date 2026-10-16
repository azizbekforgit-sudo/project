import React from 'react';
import {interpolate, interpolateColors, useCurrentFrame} from 'remotion';
import {C, E, F, clamp} from '../../theme';

/** The sun seed in screen px (same look as S02's Seed). `heat` 0..1 whitens the core before the flood. */
export const SeedDot: React.FC<{x: number; y: number; r: number; glow?: number; core?: number; opacity?: number}> = ({x, y, r, glow = 0, core = 0, opacity = 1}) => {
  if (r <= 0.2 || opacity <= 0) return null;
  const k = r / 9; // S02 seed radius ≈ u(9)
  const hot = interpolateColors(core, [0, 1], ['#FFE8A3', '#FFFBEA']);
  return (
    <div
      style={{
        position: 'absolute',
        left: x - r,
        top: y - r,
        width: r * 2,
        height: r * 2,
        borderRadius: '50%',
        opacity,
        background: `radial-gradient(circle at ${38 + 12 * core}% ${34 + 16 * core}%, ${hot} 0%, ${C.sun} ${55 + 10 * core}%, ${C.sunLight} 100%)`,
        boxShadow: `0 0 ${(14 + 10 * glow) * k}px rgba(240,180,41,${0.75 + 0.2 * glow}), 0 0 ${(40 + 30 * glow) * k}px rgba(240,180,41,${0.32 + 0.25 * glow})`,
      }}
    />
  );
};

/**
 * The S02 «Сейчас» outline pill turning into the sun pill «С AgroVerse».
 * Mono advance = 0.6em (+0.02em tracking) so the width can animate exactly.
 */
export const MorphPill: React.FC<{at: number; dur: number; u: (n: number) => number; dimFrom: number}> = ({at, dur, u, dimFrom}) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [at, at + dur], [0, 1], {...clamp, easing: E.inOut});
  const pOld = interpolate(f, [at, at + dur * 0.6], [0, 1], {...clamp, easing: E.in});
  const pNew = interpolate(f, [at + dur * 0.3, at + dur], [0, 1], {...clamp, easing: E.out});
  // the pill grows a little as it becomes the brand pill
  const fs = u(23) + u(4) * p;
  const k = fs / u(23);
  const adv = fs * 0.62;
  const wOld = 6 * adv;
  const wNew = 11 * adv;
  const fill = interpolate(f, [at, at + dur * 0.7], [0, 1], {...clamp, easing: E.out});
  const opacity = interpolate(f, [at - 6, at + 2], [dimFrom, 1], {...clamp, easing: E.inOut});
  // a soft sun glow blooms once when the fill lands
  const bloom = interpolate(f, [at + dur * 0.5, at + dur * 0.8, at + dur + 18], [0, 1, 0.35], clamp);
  return (
    <div
      style={{
        display: 'inline-block',
        fontFamily: F.mono,
        fontSize: fs,
        fontWeight: 500,
        padding: `${u(7) * k}px ${u(18) * k}px`,
        borderRadius: 999,
        border: `${Math.max(1, u(1.5))}px solid ${interpolateColors(fill, [0, 1], ['rgba(243,239,228,0.34)', 'rgba(240,180,41,1)'])}`,
        background: `rgba(240,180,41,${fill})`,
        letterSpacing: '0.02em',
        opacity,
        boxShadow: bloom > 0.01 ? `0 0 ${u(30) * bloom}px rgba(240,180,41,${0.45 * bloom})` : undefined,
      }}
    >
      <span style={{position: 'relative', display: 'inline-block', width: wOld + (wNew - wOld) * p, overflow: 'hidden', verticalAlign: 'top'}}>
        <span style={{visibility: 'hidden'}}>С</span>
        <span
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            whiteSpace: 'nowrap',
            color: 'rgba(243,239,228,0.82)',
            transform: `translateY(${-115 * pOld}%)`,
            opacity: 1 - pOld,
          }}
        >
          Сейчас
        </span>
        <span
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            whiteSpace: 'nowrap',
            color: C.onSun,
            fontWeight: 600,
            transform: `translateY(${115 * (1 - pNew)}%)`,
          }}
        >
          {'С AgroVerse'}
        </span>
      </span>
    </div>
  );
};

/** S02's baseline-aligned mixed-size words, fully in, leaving upward through their masks from `out`. */
export const WordsOut: React.FC<{words: {t: string; style?: React.CSSProperties}[]; out: number; stagger?: number; dur?: number}> = ({words, out, stagger = 2, dur = 9}) => {
  const f = useCurrentFrame();
  return (
    <>
      {words.map((w, i) => {
        const s = out + i * stagger;
        const y = interpolate(f, [s, s + dur], [0, -170], {...clamp, easing: E.in});
        return (
          <React.Fragment key={i}>
            {i > 0 ? ' ' : null}
            <span style={{display: 'inline-block', clipPath: 'inset(0)', padding: '0.14em 0.06em 0.16em', margin: '-0.14em -0.06em -0.16em', ...w.style}}>
              <span style={{display: 'inline-block', transform: `translateY(${y}%)`, whiteSpace: 'nowrap'}}>{w.t}</span>
            </span>
          </React.Fragment>
        );
      })}
    </>
  );
};

/** RiseText exits leave descender slivers inside their mask (shared component moves words only −110%);
    fade the line out over the last frames of its exit. */
export const exitFade = (f: number, out: number, words: number, outDur: number, stagger = 1.5) => {
  const end = out + (words - 1) * stagger + outDur;
  return 1 - interpolate(f, [end - 5, end - 1], [0, 1], clamp);
};
