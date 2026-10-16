import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {E, clamp} from '../../theme';

/**
 * Reel-style slot word (local replacement for the shared WordSwap, whose exit (E.in) and entrance (E.out)
 * run on different curves so the two words overlap mid-swap). Here outgoing and incoming words ride ONE
 * progress value like a physical reel, with a vertical motion blur at peak speed.
 * words[i] arrives at swaps[i]; the roll is centred on the swap frame (starts `lead` frames before it).
 */
export const Slot: React.FC<{
  words: string[];
  swaps: number[];
  dur?: number;
  lead?: number;
  align?: 'left' | 'center' | 'right';
  blur?: number; // max vertical blur in px at peak speed
  style?: React.CSSProperties;
  wordStyle?: (i: number) => React.CSSProperties | undefined;
  id: string;
}> = ({words, swaps, dur = 9, lead = 4, align = 'left', blur = 6, style, wordStyle, id}) => {
  const f = useCurrentFrame();
  const prog = (k: number, fr: number) => interpolate(fr, [swaps[k] - lead, swaps[k] - lead + dur], [0, 1], {...clamp, easing: E.smooth});
  return (
    <span
      style={{
        display: 'inline-grid',
        overflow: 'hidden',
        verticalAlign: 'bottom',
        justifyItems: align === 'left' ? 'start' : align === 'right' ? 'end' : 'center',
        // clip at the line box top (the line above must never be touched); room below for descenders.
        // Soft top/bottom edges make the reel read as a cylinder.
        padding: '0.02em 0.04em 0.14em',
        margin: '-0.02em -0.04em -0.14em',
        WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, #000 7%, #000 91%, rgba(0,0,0,0) 100%)',
        maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, #000 7%, #000 91%, rgba(0,0,0,0) 100%)',
        ...style,
      }}
    >
      <svg width={0} height={0} style={{position: 'absolute'}}>
        <defs>
          {words.map((_, i) => {
            const sp = Math.max(Math.abs(prog(i, f) - prog(i, f - 1)), i + 1 < swaps.length ? Math.abs(prog(i + 1, f) - prog(i + 1, f - 1)) : 0);
            return (
              <filter key={i} id={`${id}-b${i}`} x="-5%" y="-50%" width="110%" height="200%">
                <feGaussianBlur stdDeviation={`0 ${(sp * blur * 3.2).toFixed(2)}`} />
              </filter>
            );
          })}
        </defs>
      </svg>
      {words.map((w, i) => {
        const pin = prog(i, f);
        const pout = i + 1 < swaps.length ? prog(i + 1, f) : 0;
        if (pin <= 0 || pout >= 1) {
          return (
            <span key={i} style={{gridArea: '1 / 1', visibility: 'hidden', whiteSpace: 'nowrap'}}>
              {w}
            </span>
          );
        }
        const y = pout > 0 ? -112 * pout : 112 * (1 - pin);
        const moving = (pin > 0 && pin < 1) || (pout > 0 && pout < 1);
        return (
          <span
            key={i}
            style={{
              gridArea: '1 / 1',
              display: 'inline-block',
              whiteSpace: 'nowrap',
              transform: `translateY(${y}%)`,
              filter: moving ? `url(#${id}-b${i})` : undefined,
              ...(wordStyle?.(i) ?? {}),
            }}
          >
            {w}
          </span>
        );
      })}
    </span>
  );
};
