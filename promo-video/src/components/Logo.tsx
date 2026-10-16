import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, E, F, clamp} from '../theme';

/**
 * The AgroVerse app icon (assets/icons/icon.svg) built from its own paths so it can grow:
 * tile pops in → stem draws up → white leaf unfolds → yellow leaf unfolds → ground line draws.
 * `start` = relative frame the build begins. Total build ≈ 34 frames. `static` skips the build.
 */
export const LogoMark: React.FC<{size: number; start?: number; isStatic?: boolean; tile?: boolean; style?: React.CSSProperties}> = ({
  size,
  start = 0,
  isStatic = false,
  tile = true,
  style,
}) => {
  const f = useCurrentFrame() - start;
  const {fps} = useVideoConfig();
  const p = (a: number, b: number) => (isStatic ? 1 : interpolate(f, [a, b], [0, 1], {...clamp, easing: E.out}));
  const tileS = isStatic ? 1 : spring({frame: f, fps, config: {damping: 13, stiffness: 160, mass: 0.9}});
  const stem = p(6, 18);
  const leafL = isStatic ? 1 : spring({frame: f - 12, fps, config: {damping: 12, stiffness: 170, mass: 0.7}});
  const leafR = isStatic ? 1 : spring({frame: f - 17, fps, config: {damping: 11, stiffness: 170, mass: 0.7}});
  const ground = p(14, 30);
  return (
    <svg viewBox="0 0 512 512" width={size} height={size} style={{display: 'block', overflow: 'visible', ...style}}>
      {tile ? (
        <g transform={`translate(256 256) scale(${tileS}) translate(-256 -256)`}>
          <rect width="512" height="512" rx="112" fill={C.field} />
          <circle cx="256" cy="256" r="196" fill="#2A7346" opacity=".55" />
        </g>
      ) : null}
      <path d="M256 404 V262" stroke="#FFFFFF" strokeWidth="30" strokeLinecap="round" fill="none" strokeDasharray="142" strokeDashoffset={142 * (1 - stem)} opacity={stem > 0 ? 1 : 0} />
      <g transform={`translate(256 270) scale(${leafL}) rotate(${(1 - leafL) * -25}) translate(-256 -270)`}>
        <path d="M256 270 C 252 196 200 150 120 146 C 118 222 166 270 256 270 Z" fill="#FFFFFF" />
      </g>
      <g transform={`translate(256 236) scale(${leafR}) rotate(${(1 - leafR) * 25}) translate(-256 -236)`}>
        <path d="M256 236 C 262 160 316 112 398 110 C 400 190 350 236 256 236 Z" fill={C.sun} />
      </g>
      <path d="M176 404 H336" stroke="#FFFFFF" strokeWidth="30" strokeLinecap="round" opacity={0.9 * (ground > 0 ? 1 : 0)} strokeDasharray="160" strokeDashoffset={160 * (1 - ground)} />
    </svg>
  );
};

/** Wordmark "AgroVerse" in the app's display face (Rubik 700). */
export const Wordmark: React.FC<{size: number; color?: string; style?: React.CSSProperties; children?: React.ReactNode}> = ({size, color = C.fieldDeep, style, children}) => (
  <span style={{fontFamily: F.brand, fontWeight: 700, fontSize: size, letterSpacing: '-0.02em', color, lineHeight: 1, ...style}}>{children ?? 'AgroVerse'}</span>
);
