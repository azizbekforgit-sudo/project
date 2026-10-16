import React from 'react';
import {interpolate} from 'remotion';
import {C, E, F, clamp} from '../../theme';
import {Icon} from '../../components/Icons';

type U = (n: number) => number;

const FACE = {
  end: {bg: '#173827', border: 'rgba(121,204,151,0.24)', chip: 'rgba(121,204,151,0.14)', icon: C.mint},
  mid: {bg: '#30241A', border: 'rgba(243,239,228,0.10)', chip: 'rgba(243,239,228,0.08)', icon: C.creamDim},
};

/** Rubber stamp «+ наценка». t = frames since impact (negative = still falling). */
export const Stamp: React.FC<{t: number; u: U; rot: number; seed: number; k?: number}> = ({t, u: u0, rot, seed, k = 1}) => {
  const u = (n: number) => u0(n) * k;
  if (t < -4) return null;
  const s = interpolate(t, [-4, 0], [1.6, 1], {...clamp, easing: E.in});
  const r = interpolate(t, [-4, 0], [rot - 10, rot], {...clamp, easing: E.in});
  const o = interpolate(t, [-4, -2], [0, 1], clamp);
  // ink pressure: a soft coral bloom right at impact
  const bloom = t >= 0 ? interpolate(t, [0, 12], [1, 0], {...clamp, easing: E.out}) : 0;
  const w = 206;
  const h = 54;
  const id = `s02ink${seed}`;
  return (
    <div
      style={{
        position: 'absolute',
        left: -u(w / 2),
        top: -u(h / 2),
        width: u(w),
        height: u(h),
        transform: `scale(${s}) rotate(${r}deg)`,
        opacity: o,
        filter: bloom > 0.01 ? `drop-shadow(0 0 ${u(16) * bloom}px rgba(240,113,103,${0.75 * bloom}))` : undefined,
      }}
    >
      <svg width={u(w)} height={u(h)} viewBox={`0 0 ${w} ${h}`} style={{display: 'block', overflow: 'visible'}}>
        <defs>
          <filter id={id} x="-5%" y="-10%" width="110%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="2" seed={seed} result="n" />
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -5 0 0 0 3.85" result="m" />
            <feComposite in="SourceGraphic" in2="m" operator="in" />
          </filter>
        </defs>
        <g filter={`url(#${id})`}>
          <rect x={2.5} y={2.5} width={w - 5} height={h - 5} rx={10} fill="rgba(240,113,103,0.10)" stroke={C.coral} strokeWidth={4} />
          <text
            x={w / 2}
            y={h / 2 + 10.5}
            textAnchor="middle"
            fontFamily={F.brand}
            fontWeight={700}
            fontSize={31}
            fill={C.coral}
            letterSpacing="0.2"
          >
            {'+ наценка'}
          </text>
        </g>
      </svg>
    </div>
  );
};

/** Face of a chain card. `stampT` = frames since this card's stamp impact (undefined = no stamp). */
export const CardFace: React.FC<{
  label: string;
  icon: string;
  mid: boolean;
  vertical: boolean;
  w: number;
  h: number;
  u: U;
  stampT?: number;
  stampRot?: number;
  index: number;
  /** 0..1 warm light from the hot price tag above/next to the card */
  warm?: number;
}> = ({label, icon, mid, vertical, w, h, u, stampT, stampRot = -7, index, warm = 0}) => {
  const t = mid ? FACE.mid : FACE.end;
  const base: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: w,
    height: h,
    boxSizing: 'border-box',
    borderRadius: u(26),
    background: t.bg,
    border: `${Math.max(1, u(1.5))}px solid ${t.border}`,
    boxShadow: `inset 0 ${u(1.5)}px 0 rgba(255,255,255,0.05)`,
    fontFamily: F.brand,
    color: C.cream,
  };
  const chip = (size: number, iconSize: number) => (
    <div style={{width: size, height: size, borderRadius: size * 0.32, background: t.chip, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto'}}>
      <Icon name={icon} size={iconSize} color={t.icon} />
    </div>
  );
  const glow =
    warm > 0.01 ? (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: u(26),
          background: vertical
            ? `radial-gradient(ellipse 60% 120% at 100% 30%, rgba(240,113,103,${0.22 * warm}) 0%, rgba(240,113,103,0) 70%)`
            : `radial-gradient(ellipse 90% 60% at 50% 0%, rgba(240,113,103,${0.22 * warm}) 0%, rgba(240,113,103,0) 70%)`,
          boxShadow: `inset 0 0 0 ${Math.max(1, u(1.5))}px rgba(240,113,103,${0.28 * warm})`,
        }}
      />
    ) : null;
  if (!vertical) {
    return (
      <div style={base}>
        {glow}
        <div style={{position: 'absolute', left: 0, right: 0, top: u(24), display: 'flex', justifyContent: 'center'}}>{chip(u(76), u(38))}</div>
        <div style={{position: 'absolute', left: 0, right: 0, top: u(112), textAlign: 'center', fontWeight: 600, fontSize: u(28), lineHeight: 1.2, whiteSpace: 'nowrap', letterSpacing: '-0.005em'}}>{label}</div>
        {stampT !== undefined ? (
          <div style={{position: 'absolute', left: w / 2, top: u(184), width: 0, height: 0}}>
            <Stamp t={stampT} u={u} rot={stampRot} seed={index * 11 + 3} />
          </div>
        ) : null}
      </div>
    );
  }
  return (
    <div style={base}>
      {glow}
      <div style={{position: 'absolute', left: u(24), top: (h - u(76)) / 2}}>{chip(u(76), u(38))}</div>
      <div style={{position: 'absolute', left: u(124), top: 0, bottom: 0, display: 'flex', alignItems: 'center', fontWeight: 600, fontSize: u(34), whiteSpace: 'nowrap', letterSpacing: '-0.005em'}}>{label}</div>
      {stampT !== undefined ? (
        <div style={{position: 'absolute', left: w - u(22) - u(89), top: h / 2, width: 0, height: 0}}>
          <Stamp t={stampT} u={u} rot={stampRot} seed={index * 11 + 3} k={0.86} />
        </div>
      ) : null}
    </div>
  );
};

/** Back of a card (deck). */
export const CardBack: React.FC<{w: number; h: number; u: U; vertical: boolean}> = ({w, h, u, vertical}) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      width: w,
      height: h,
      boxSizing: 'border-box',
      borderRadius: u(26),
      background: `repeating-linear-gradient(135deg, rgba(240,180,41,0.06) 0 ${u(2)}px, rgba(240,180,41,0) ${u(2)}px ${u(11)}px), #183526`,
      border: `${Math.max(1, u(1.5))}px solid rgba(243,239,228,0.16)`,
      boxShadow: `inset 0 ${u(1.5)}px 0 rgba(255,255,255,0.06)`,
    }}
  >
    <div
      style={{
        position: 'absolute',
        inset: u(12),
        borderRadius: u(17),
        border: `${Math.max(1, u(2))}px solid rgba(240,180,41,0.45)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name="seedling" size={u(vertical ? 46 : 60)} color="rgba(240,180,41,0.78)" />
    </div>
  </div>
);
