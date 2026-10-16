import React from 'react';
import {AbsoluteFill, Img, random, staticFile, useCurrentFrame} from 'remotion';
import {C} from '../theme';

/** Film grain: cycles pre-rendered noise tiles (public/grain/g0..g7.png) with a per-frame offset. Put it LAST (on top). */
export const Grain: React.FC<{opacity?: number}> = ({opacity = 0.07}) => {
  const f = useCurrentFrame();
  const tile = Math.floor(f / 2) % 8;
  const ox = Math.floor(random(`gx-${f}`) * 256);
  const oy = Math.floor(random(`gy-${f}`) * 256);
  return (
    <AbsoluteFill style={{pointerEvents: 'none', mixBlendMode: 'overlay', opacity, overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: -ox, top: -oy, right: -256, bottom: -256, display: 'flex', flexWrap: 'wrap'}}>
        {Array.from({length: 40}).map((_, i) => (
          <Img key={i} src={staticFile(`grain/g${tile}.png`)} style={{width: 512, height: 512, display: 'block'}} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

/** Vignette, applied last-but-grain. */
export const Vignette: React.FC<{strength?: number; color?: string}> = ({strength = 0.45, color = '0,0,0'}) => (
  <AbsoluteFill style={{pointerEvents: 'none', background: `radial-gradient(ellipse at 50% 45%, rgba(${color},0) 55%, rgba(${color},${strength}) 100%)`}} />
);

/** Dark night background with soft radial glows (no full-screen linear gradients: they band). */
export const NightBg: React.FC<{glowX?: number; glowY?: number; glow?: string; intensity?: number}> = ({
  glowX = 50,
  glowY = 55,
  glow = 'rgba(240,180,41,0.16)',
  intensity = 1,
}) => (
  <AbsoluteFill style={{background: C.night}}>
    <AbsoluteFill style={{background: `radial-gradient(circle at ${glowX}% ${glowY}%, ${glow} 0%, rgba(240,180,41,0) ${42 * intensity}%)`}} />
    <AbsoluteFill style={{background: 'radial-gradient(circle at 15% 110%, rgba(121,204,151,0.10) 0%, rgba(121,204,151,0) 45%)'}} />
  </AbsoluteFill>
);

/** Light cream background with a warm sun glow and a pale green glow. */
export const LightBg: React.FC<{glowX?: number; glowY?: number}> = ({glowX = 78, glowY = 30}) => (
  <AbsoluteFill style={{background: C.ground}}>
    <AbsoluteFill style={{background: `radial-gradient(circle at ${glowX}% ${glowY}%, rgba(240,180,41,0.20) 0%, rgba(240,180,41,0) 40%)`}} />
    <AbsoluteFill style={{background: 'radial-gradient(circle at 10% 95%, rgba(31,92,53,0.10) 0%, rgba(31,92,53,0) 45%)'}} />
  </AbsoluteFill>
);

/** Huge ghost type in the background (decorative, 4–8% opacity). */
export const GhostType: React.FC<{text: string; color?: string; opacity?: number; size?: number; x?: number; y?: number; font?: string}> = ({
  text,
  color = C.field,
  opacity = 0.06,
  size = 420,
  x = 0,
  y = 0,
  font,
}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      fontSize: size,
      lineHeight: 0.9,
      fontWeight: 800,
      letterSpacing: '-0.04em',
      color,
      opacity,
      whiteSpace: 'nowrap',
      fontFamily: font,
      pointerEvents: 'none',
    }}
  >
    {text}
  </div>
);
