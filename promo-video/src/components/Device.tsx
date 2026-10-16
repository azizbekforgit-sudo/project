import React from 'react';
import {Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, E, clamp} from '../theme';

/** Real app screenshots are 1170×2532 (390×844 CSS px @3x). */
export const SHOT_W = 1170;
export const SHOT_H = 2532;
export const SHOT_CSS_W = 390;
export const SHOT_CSS_H = 844;

/**
 * Phone mockup. `width` is the outer width in px. Children render inside the screen
 * (screen coordinates: CSS px of the 390-wide app, scaled to fit — use <Screen/> or absolutely
 * positioned overlays in 390×844 space via the `ui` prop).
 *
 * 3D: rotateY/rotateX in degrees; the phone sits in its own perspective container.
 */
export const Phone: React.FC<{
  width: number;
  rotateY?: number;
  rotateX?: number;
  rotateZ?: number;
  dark?: boolean;
  shadow?: boolean;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({width, rotateY = 0, rotateX = 0, rotateZ = 0, dark = false, shadow = true, style, children}) => {
  const bezel = width * 0.035;
  const screenW = width - bezel * 2;
  const screenH = (screenW * SHOT_CSS_H) / SHOT_CSS_W;
  const height = screenH + bezel * 2;
  const radius = width * 0.15;
  const scale = screenW / SHOT_CSS_W; // 390-css-px app space → screen px
  return (
    <div style={{perspective: width * 4, ...style}}>
      <div
        style={{
          width,
          height,
          borderRadius: radius,
          background: 'linear-gradient(145deg, #2A2F2C 0%, #0C0E0D 45%, #1D211F 100%)',
          padding: bezel,
          boxSizing: 'border-box',
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`,
          transformStyle: 'preserve-3d',
          boxShadow: shadow
            ? `0 ${width * 0.06}px ${width * 0.16}px rgba(8, 20, 12, ${dark ? 0.55 : 0.28}), 0 ${width * 0.01}px ${width * 0.03}px rgba(8, 20, 12, 0.25), inset 0 0 0 ${Math.max(1.5, width * 0.004)}px rgba(255,255,255,0.10)`
            : undefined,
          position: 'relative',
        }}
      >
        <div
          style={{
            width: screenW,
            height: screenH,
            borderRadius: radius - bezel,
            overflow: 'hidden',
            position: 'relative',
            background: dark ? C.night2 : C.ground,
          }}
        >
          <div style={{position: 'absolute', left: 0, top: 0, width: SHOT_CSS_W, height: SHOT_CSS_H, transform: `scale(${scale})`, transformOrigin: '0 0'}}>
            {children}
          </div>
          {/* dynamic island */}
          <div
            style={{
              position: 'absolute',
              top: screenW * 0.025,
              left: '50%',
              width: screenW * 0.3,
              height: screenW * 0.085,
              transform: 'translateX(-50%)',
              borderRadius: 999,
              background: '#050605',
            }}
          />
          {/* glass sheen */}
          <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(115deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 35%)', pointerEvents: 'none'}} />
        </div>
      </div>
    </div>
  );
};

/**
 * A screenshot inside the phone, in 390×844 app space. `scrollY` in CSS px scrolls tall (full-page)
 * shots. `src` relative to public/, e.g. "screens/m-light-market.png".
 */
export const Screen: React.FC<{src: string; scrollY?: number; style?: React.CSSProperties}> = ({src, scrollY = 0, style}) => (
  <Img
    src={staticFile(src)}
    style={{position: 'absolute', left: 0, top: -scrollY, width: SHOT_CSS_W, height: 'auto', display: 'block', ...style}}
  />
);

/**
 * Cross-dissolve/slide between screenshots inside the phone. `items` = [{src, at}] where `at` is the
 * relative frame the screen becomes active. mode 'slide' pushes left like app navigation.
 */
export const ScreenSequence: React.FC<{items: {src: string; at: number; scrollY?: number}[]; mode?: 'slide' | 'fade'; dur?: number}> = ({
  items,
  mode = 'slide',
  dur = 12,
}) => {
  const f = useCurrentFrame();
  return (
    <>
      {items.map((it, i) => {
        const next = items[i + 1];
        const pin = i === 0 ? 1 : interpolate(f, [it.at, it.at + dur], [0, 1], {...clamp, easing: E.inOut});
        const pout = next ? interpolate(f, [next.at, next.at + dur], [0, 1], {...clamp, easing: E.inOut}) : 0;
        if (pin <= 0 || pout >= 1) return null;
        const x = mode === 'slide' ? (1 - pin) * SHOT_CSS_W - pout * SHOT_CSS_W * 0.3 : 0;
        const o = mode === 'fade' ? pin * (1 - pout) : 1;
        return (
          <div key={i} style={{position: 'absolute', inset: 0, transform: `translateX(${x}px)`, opacity: o, boxShadow: mode === 'slide' && pin < 1 ? '-20px 0 40px rgba(0,0,0,0.15)' : undefined}}>
            <Screen src={it.src} scrollY={it.scrollY} />
          </div>
        );
      })}
    </>
  );
};

/**
 * Finger tap: a soft dot that presses in and a ring that expands. x/y in the parent's coordinates.
 * at = relative frame of the press (put the click SFX on this frame).
 */
export const Tap: React.FC<{x: number; y: number; at: number; size?: number; color?: string}> = ({x, y, at, size = 44, color = 'rgba(20,61,36,0.35)'}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (f < at - 10 || f > at + 24) return null;
  const approach = interpolate(f, [at - 10, at], [0, 1], {...clamp, easing: E.out});
  const release = spring({frame: f - at, fps, config: {damping: 12, stiffness: 300, mass: 0.5}});
  const press = f < at ? interpolate(f, [at - 3, at], [0, 1], clamp) : 1 - release;
  const ring = interpolate(f, [at, at + 18], [0, 1], {...clamp, easing: E.out});
  const fade = interpolate(f, [at + 8, at + 24], [1, 0], clamp);
  const dot = size * (1 - 0.22 * press);
  return (
    <div style={{position: 'absolute', left: x, top: y, width: 0, height: 0, pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          width: size * (1 + ring * 1.6),
          height: size * (1 + ring * 1.6),
          left: -(size * (1 + ring * 1.6)) / 2,
          top: -(size * (1 + ring * 1.6)) / 2,
          borderRadius: '50%',
          border: `${Math.max(2, size * 0.06)}px solid ${color}`,
          opacity: f >= at ? (1 - ring) * fade : 0,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: dot,
          height: dot,
          left: -dot / 2,
          top: -dot / 2,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.55)',
          border: `${Math.max(2, size * 0.05)}px solid rgba(20,61,36,0.45)`,
          boxShadow: '0 6px 18px rgba(0,0,0,0.18)',
          opacity: approach * fade,
          transform: `scale(${0.6 + 0.4 * approach})`,
        }}
      />
    </div>
  );
};
