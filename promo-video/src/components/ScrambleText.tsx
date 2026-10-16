import React from 'react';
import {interpolate, random, useCurrentFrame} from 'remotion';
import {C, E, F, clamp} from '../theme';

const POOL_RU = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЭЮЯ';
const POOL_LAT = 'ABCDEFGHJKLMNOPQRSTUVWXYZ';
const POOL_DIG = '0123456789';
const POOL_SYM = '#%&*+=/<>?@';

import type {ScrambleOrder} from '../timing';
export {scrambleEnd} from '../timing';
export type {ScrambleOrder};

export const ScrambleText: React.FC<{
  text: string;
  start?: number;
  stagger?: number;
  scramble?: number;
  tick?: number;
  seed?: string;
  order?: ScrambleOrder;
  style?: React.CSSProperties;
  /** colour of unresolved glyphs */
  glyphColor?: string;
  /** font of unresolved glyphs */
  glyphFont?: string;
  /** brief colour flash on the freshly locked glyph */
  flashColor?: string;
}> = ({
  text,
  start = 0,
  stagger = 1.5,
  scramble = 10,
  tick = 2,
  seed = 's',
  order = 'ltr',
  style,
  glyphColor = C.sun,
  glyphFont = F.mono,
  flashColor,
}) => {
  const f = useCurrentFrame() - start;
  const chars = Array.from(text);
  const n = chars.length;
  const rank = (i: number) =>
    order === 'ltr' ? i : order === 'center' ? Math.abs(i - (n - 1) / 2) : random(`${seed}-o-${i}`) * (n - 1);
  const lastLock = Math.max(...chars.map((_, i) => rank(i) * stagger + scramble));
  if (f < 0) {
    return <span style={{whiteSpace: 'pre-wrap', opacity: 0, ...style}}>{text}</span>;
  }
  if (f >= lastLock + 4) return <span style={{whiteSpace: 'pre-wrap', ...style}}>{text}</span>;

  // group into words so animated lines never break mid-word
  const words: {ch: string; i: number}[][] = [[]];
  chars.forEach((ch, i) => {
    if (ch === ' ') words.push([]);
    else words[words.length - 1].push({ch, i});
  });

  return (
    <span style={{whiteSpace: 'pre-wrap', ...style}}>
      {words.map((w, wi) => (
        <React.Fragment key={wi}>
          {wi > 0 ? ' ' : null}
          <span style={{whiteSpace: 'nowrap'}}>
            {w.map(({ch, i}) => {
              if (ch === ' ') return <span key={i}>{ch}</span>;
              const appear = rank(i) * stagger * 0.45;
              const lock = rank(i) * stagger + scramble;
              const isLetter = /[A-Za-zА-Яа-яЁё]/.test(ch);
              const isLat = /[A-Za-z]/.test(ch);
              const pool = /\d/.test(ch) ? POOL_DIG : isLetter ? (isLat ? POOL_LAT : POOL_RU) : POOL_SYM;
              let g = pool[Math.floor(random(`${seed}-${i}-${Math.floor(f / tick)}`) * pool.length)];
              if (isLetter && ch !== ch.toUpperCase()) g = g.toLowerCase();
              const locked = f >= lock;
              const sinceLock = f - lock;
              const settle = interpolate(sinceLock, [0, 5], [1, 0], {...clamp, easing: E.out});
              return (
                <span key={i} style={{position: 'relative', display: 'inline-block'}}>
                  <span
                    style={{
                      visibility: locked ? 'visible' : 'hidden',
                      display: 'inline-block',
                      transform: `translateY(${settle * 0.12}em)`,
                      color: flashColor && sinceLock >= 0 && sinceLock < 3 ? flashColor : undefined,
                    }}
                  >
                    {ch}
                  </span>
                  {f >= appear && !locked && /\S/.test(ch) ? (
                    <span
                      style={{
                        position: 'absolute',
                        left: '50%',
                        top: 0,
                        transform: 'translateX(-50%)',
                        color: glyphColor,
                        fontFamily: glyphFont,
                        fontWeight: 500,
                        opacity: 0.85,
                      }}
                    >
                      {g}
                    </span>
                  ) : null}
                </span>
              );
            })}
          </span>
        </React.Fragment>
      ))}
    </span>
  );
};
