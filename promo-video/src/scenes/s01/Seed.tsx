import React from 'react';
import {interpolate} from 'remotion';
import {E, clamp} from '../../theme';

/**
 * The sun seed: hot core + two-stage glow. (x, y) = centre. sx/sy = squash & stretch.
 * `glow` scales the halo (beat breathing), `streak` = px of motion trail above the dot (falling).
 */
export const Seed: React.FC<{x: number; y: number; size: number; sx?: number; sy?: number; glow?: number; opacity?: number; streak?: number}> = ({
  x,
  y,
  size,
  sx = 1,
  sy = 1,
  glow = 1,
  opacity = 1,
  streak = 0,
}) => {
  const halo = size * 9 * glow;
  return (
    <div style={{position: 'absolute', left: x, top: y, width: 0, height: 0, opacity, pointerEvents: 'none'}}>
      {/* wide halo */}
      <div
        style={{
          position: 'absolute',
          width: halo,
          height: halo,
          left: -halo / 2,
          top: -halo / 2,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,205,90,0.30) 0%, rgba(240,180,41,0.12) 28%, rgba(240,180,41,0.04) 50%, rgba(240,180,41,0) 70%)',
        }}
      />
      {/* motion streak while falling */}
      {streak > 1 ? (
        <div
          style={{
            position: 'absolute',
            width: size * 0.62,
            height: streak,
            left: (-size * 0.62) / 2,
            top: -streak,
            borderRadius: size,
            background: 'linear-gradient(to bottom, rgba(240,180,41,0) 0%, rgba(240,180,41,0.18) 55%, rgba(255,214,110,0.75) 100%)',
          }}
        />
      ) : null}
      {/* core */}
      <div
        style={{
          position: 'absolute',
          width: size,
          height: size,
          left: -size / 2,
          top: -size / 2,
          borderRadius: '50%',
          transform: `scale(${sx}, ${sy})`,
          background: 'radial-gradient(circle at 42% 38%, #FFF8E1 0%, #FFE39A 28%, #F5C442 58%, #F0B429 80%, #E2A112 100%)',
          boxShadow: `0 0 ${size * 0.5 * glow}px rgba(255,220,120,0.95), 0 0 ${size * 1.5 * glow}px rgba(240,180,41,0.60), 0 0 ${size * 3.2 * glow}px rgba(240,180,41,0.25)`,
        }}
      />
    </div>
  );
};

/** One flat elliptical ripple (reads as a ground plane) that spreads from the landing point. */
export const Ripple: React.FC<{x: number; y: number; f: number; at: number; maxW: number; dur?: number; ratio?: number; stroke?: number}> = ({
  x,
  y,
  f,
  at,
  maxW,
  dur = 20,
  ratio = 0.2,
  stroke = 2,
}) => {
  if (f < at || f > at + dur) return null;
  const p = interpolate(f, [at, at + dur], [0, 1], {...clamp, easing: E.out});
  const w = 8 + (maxW - 8) * p;
  const h = w * ratio;
  const o = interpolate(f, [at, at + 2, at + dur], [0, 0.85, 0], clamp);
  return (
    <div
      style={{
        position: 'absolute',
        left: x - w / 2,
        top: y - h / 2,
        width: w,
        height: h,
        borderRadius: '50%',
        border: `${stroke}px solid rgba(240,180,41,${o})`,
        boxShadow: `0 0 ${stroke * 6}px rgba(240,180,41,${o * 0.35})`,
        pointerEvents: 'none',
      }}
    />
  );
};
