import React from 'react';
import {interpolateColors} from 'remotion';
import {C, F} from '../../theme';

type U = (n: number) => number;

/**
 * Hanging price tag «цена». Origin (0,0) of the returned element = the punched hole.
 * Drawn in tag units (1 unit = u(1) at scale 1); scale is applied by the parent.
 */
export const PriceTag: React.FC<{u: U; heat: number}> = ({u, heat}) => {
  const top = interpolateColors(heat, [0, 1], [C.sun, '#F58C5F']);
  const bot = interpolateColors(heat, [0, 1], [C.sunLight, '#EE6E5E']);
  // viewBox: x -62..62, y -22..76 (hole at 0,0)
  const vb = {x: -62, y: -22, w: 124, h: 98};
  return (
    <svg
      width={u(vb.w)}
      height={u(vb.h)}
      viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
      style={{position: 'absolute', left: u(vb.x), top: u(vb.y), overflow: 'visible', display: 'block'}}
    >
      <defs>
        <linearGradient id="s02tagfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="1" stopColor={bot} />
        </linearGradient>
      </defs>
      {/* body: pointed top, rounded corners via a same-colour round-join stroke */}
      <path
        d="M0 -9 L48 12 L48 64 L-48 64 L-48 12 Z"
        fill="url(#s02tagfill)"
        stroke="url(#s02tagfill)"
        strokeWidth={12}
        strokeLinejoin="round"
      />
      {/* top sheen */}
      <path d="M0 -12 L50 10 L50 16 L-50 16 L-50 10 Z" fill="rgba(255,255,255,0.10)" />
      {/* printed dashed border */}
      <rect x={-45} y={19} width={90} height={42} rx={6} fill="none" stroke="rgba(28,21,3,0.28)" strokeWidth={1.6} strokeDasharray="4.5 3.5" />
      {/* eyelet + punched hole */}
      <circle cx={0} cy={0} r={9.5} fill="none" stroke="rgba(28,21,3,0.22)" strokeWidth={2.5} />
      <circle cx={0} cy={0} r={5.6} fill={C.night} />
      <text x={0} y={50} textAnchor="middle" fontFamily={F.brand} fontWeight={700} fontSize={29} fill={C.onSun} letterSpacing="-0.3">
        цена
      </text>
    </svg>
  );
};

/** The sun seed (continuity carrier): a glowing sun dot. `pulse` 0..1 brightens the glow. */
export const Seed: React.FC<{u: U; r?: number; pulse?: number; sx?: number; sy?: number}> = ({u, r = 9, pulse = 0, sx = 1, sy = 1}) => {
  const R = u(r);
  return (
    <div
      style={{
        position: 'absolute',
        left: -R,
        top: -R,
        width: R * 2,
        height: R * 2,
        borderRadius: '50%',
        background: `radial-gradient(circle at 38% 34%, #FFE8A3 0%, ${C.sun} 55%, ${C.sunLight} 100%)`,
        boxShadow: `0 0 ${u(14 + 10 * pulse)}px rgba(240,180,41,${0.75 + 0.2 * pulse}), 0 0 ${u(40 + 24 * pulse)}px rgba(240,180,41,${0.32 + 0.2 * pulse})`,
        transform: `scale(${sx}, ${sy})`,
      }}
    />
  );
};
