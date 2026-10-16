import React from 'react';
import {interpolate} from 'remotion';
import {C, E, F, clamp} from '../../theme';
import {useLayout} from '../../layout';

/**
 * Shared by s09 (Values) and s10 (End card, opening frames).
 * `t` = frames since the start of s09 (s10 passes 60 + its own frame) so the words and the
 * rising sun seed are one continuous animation across the hard cut.
 */
export const WORDS = ['Честно', 'Просто', 'Рядом'] as const;
export const HITS: number[] = [0, 15, 30];
export const RISE_START = 46;
export const RISE_END = 70;
export const SCENE9_LEN = 60;

const measure = (text: string, px: number) => {
  try {
    if (typeof document === 'undefined') throw new Error('no dom');
    const ctx = document.createElement('canvas').getContext('2d')!;
    ctx.font = `800 ${px}px Unbounded`;
    (ctx as unknown as {letterSpacing: string}).letterSpacing = `${-0.03 * px}px`;
    return ctx.measureText(text).width;
  } catch {
    return text.length * px * 0.8;
  }
};

/** Geometry of the stack, the dusk image and the sun for the current aspect ratio. */
export const useGeo = () => {
  const {W, H, vertical, u} = useLayout();
  const fs = vertical ? u(156) : u(224);
  const lineH = fs * 0.98;
  const x = vertical ? u(72) : u(150);
  const top = vertical ? 1110 : (H - 3 * lineH) / 2 + u(6);
  const dotR = fs * 0.1;
  const gap = fs * 0.05;
  // baseline inside a line box (tuned on renders)
  const baseOff = lineH * 0.5 + fs * 0.355;
  const lines = WORDS.map((w, i) => {
    const wpx = measure(w, fs);
    const lineTop = top + i * lineH;
    return {w, wpx, lineTop, dotX: x + wpx + gap + dotR, dotY: lineTop + baseOff - dotR};
  });
  const sun = vertical ? {x: 540, y: 971, r: 62 * 2.4444} : {x: 1200, y: 614.4, r: 62 * 1.2};
  const img = vertical ? {left: -1904, top: -280, w: 3911, h: 2200} : {left: 0, top: 0, w: 1920, h: 1080};
  return {W, H, vertical, u, fs, lineH, x, top, dotR, gap, baseOff, lines, sun, img};
};

export const beatPulse = (f: number, k = 4) => Math.exp(-(((f % 15) + 15) % 15) / k);

/** The three words (without full stops; the dots are drawn separately so the 3rd one can be the sun seed). */
export const ValuesStack: React.FC<{t: number}> = ({t}) => {
  const g = useGeo();
  const kick = HITS.reduce((a, h) => a + (t >= h ? interpolate(t - h, [0, 8], [g.u(12), 0], {...clamp, easing: E.out}) : 0), 0);
  return (
    <div style={{position: 'absolute', inset: 0, transform: `translateY(${kick}px)`}}>
      {g.lines.map((ln, i) => {
        const h = HITS[i];
        const s = interpolate(t, [h, h + 6], [1.15, 1], {...clamp, easing: E.out});
        const blur = interpolate(t, [h, h + 6], [g.u(16), 0], {...clamp, easing: E.out});
        const next = HITS[i + 1];
        const dim = next === undefined ? 1 : interpolate(t, [next, next + 5], [1, 0.5], {...clamp, easing: E.out});
        const show = t >= h;
        const dotHidden = i === 2 && t >= RISE_START; // handed over to the free-flying seed
        const dotPop = i === 2 ? interpolate(t, [h, h + 6], [1, 1], clamp) : 1;
        const dotColor = i === 2 ? C.sun : C.cream;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: g.x,
              top: ln.lineTop,
              height: g.lineH,
              fontFamily: F.display,
              fontWeight: 800,
              fontSize: g.fs,
              lineHeight: `${g.lineH}px`,
              letterSpacing: '-0.03em',
              color: C.cream,
              whiteSpace: 'nowrap',
              opacity: show ? dim : 0,
              transformOrigin: `0px ${g.baseOff}px`,
              transform: `scale(${s})`,
              filter: blur > 0.2 ? `blur(${blur}px)` : undefined,
            }}
          >
            {ln.w}
            {!dotHidden ? (
              <span
                style={{
                  position: 'absolute',
                  left: ln.dotX - g.x - g.dotR * dotPop,
                  top: ln.dotY - ln.lineTop - g.dotR * dotPop,
                  width: g.dotR * 2 * dotPop,
                  height: g.dotR * 2 * dotPop,
                  borderRadius: '50%',
                  background: dotColor,
                  boxShadow: i === 2 ? `0 0 ${g.dotR * 2.2}px ${g.dotR * 0.5}px rgba(240,180,41,${0.35 + 0.25 * beatPulse(t)})` : undefined,
                }}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

/** Position / radius of the sun seed once it has left the full stop (p = 0 at rest, 1 = the sun of the dusk field). */
export const seedState = (g: ReturnType<typeof useGeo>, t: number) => {
  const rest = g.lines[2];
  const p = interpolate(t, [RISE_START, RISE_END], [0, 1], {...clamp, easing: E.smooth});
  const lift = Math.sin(p * Math.PI) * g.u(g.vertical ? 170 : 60); // arc
  return {
    p,
    x: rest.dotX + (g.sun.x - rest.dotX) * p + lift,
    y: rest.dotY + (g.sun.y - rest.dotY) * p,
    r: g.dotR + (g.sun.r - g.dotR) * p,
  };
};

export const SunSeed: React.FC<{t: number; fade?: number}> = ({t, fade = 1}) => {
  const g = useGeo();
  if (t < RISE_START) return null;
  const s = seedState(g, t);
  const breathe = 1 + 0.05 * beatPulse(t);
  const r = s.r * breathe;
  return (
    <div
      style={{
        position: 'absolute',
        left: s.x - r,
        top: s.y - r,
        width: r * 2,
        height: r * 2,
        borderRadius: '50%',
        background: C.sun,
        opacity: fade,
        boxShadow: `0 0 ${r * 1.6}px ${r * 0.45}px rgba(240,180,41,${0.35 + 0.3 * s.p})`,
      }}
    />
  );
};
