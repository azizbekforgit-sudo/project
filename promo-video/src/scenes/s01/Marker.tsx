import React from 'react';
import {interpolate} from 'remotion';
import {E, clamp} from '../../theme';

/** A tapered, slightly arched brush stroke (hand-drawn marker), built once as a filled outline. */
const VB_W = 400;
const VB_H = 44;
const strokePath = (() => {
  const N = 48;
  const top: string[] = [];
  const bot: string[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const x = 4 + t * (VB_W - 8);
    // centreline: gentle rise to the right, a little belly, a hand wobble
    const cy = 28 - 9 * t + 5 * Math.sin(Math.PI * t) * -0.6 + 1.2 * Math.sin(t * 9.5 + 0.8);
    // thickness: quick attack, long body, flicked-off tail
    const th = 4 + 16 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.08)), 0.45) * (1 - 0.35 * t);
    top.push(`${x.toFixed(1)},${(cy - th / 2).toFixed(1)}`);
    bot.unshift(`${x.toFixed(1)},${(cy + th / 2).toFixed(1)}`);
  }
  return `M${top.join(' L')} L${bot.join(' L')} Z`;
})();

/**
 * Marker underline that swipes in left→right between `from` and `to` (relative frames).
 * Fills its positioned parent's width; place it with `style` (absolute).
 */
export const Marker: React.FC<{f: number; from: number; to: number; color: string; style?: React.CSSProperties; id: string}> = ({f, from, to, color, style, id}) => {
  const p = interpolate(f, [from, to], [0, 1], {...clamp, easing: E.out});
  if (p <= 0) return null;
  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="none" style={{position: 'absolute', overflow: 'visible', ...style}}>
      <defs>
        <clipPath id={id}>
          <rect x={0} y={-10} width={VB_W * p + 2} height={VB_H + 20} />
        </clipPath>
      </defs>
      <path d={strokePath} fill={color} clipPath={`url(#${id})`} />
    </svg>
  );
};
