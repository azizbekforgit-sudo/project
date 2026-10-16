import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, E, F, SPR, clamp} from '../theme';
import {useLayout} from '../layout';
import {LightBg} from '../components/Atmos';
import {Phone, SHOT_CSS_H, SHOT_CSS_W} from '../components/Device';
import {Emoji} from '../components/Icons';
import {LogoMark, Wordmark} from '../components/Logo';
import {AppScreen} from './s04/AppScreen';
import {SeedLayer, Toast} from './s04/Overlay';
import {Copy} from './s04/Copy';
import {T} from './s04/plan';

/* S04 · Farmer sells · abs 600–810 (rel 0–210). Frames below are relative. */

const phoneBox = (pw: number) => {
  const bezel = pw * 0.035;
  const screenW = pw - bezel * 2;
  const screenH = (screenW * SHOT_CSS_H) / SHOT_CSS_W;
  return {bezel, screenW, screenH, ph: screenH + bezel * 2, k: screenW / SHOT_CSS_W};
};

type Floater = {name: string; size: number; rx: number; ry: number; rot: number; front: boolean; at: number; phase: number};

const Scene: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {W, H, vertical, u} = useLayout();

  /* ── layout ── */
  const PW = vertical ? u(540) : u(460);
  const box = phoneBox(PW);
  const PH = box.ph;
  const pcx = vertical ? W / 2 + u(14) : u(1388);
  const PX = pcx - PW / 2;
  const PY = vertical ? u(770) : (H - PH) / 2;
  const textLeft = vertical ? u(72) : u(140);
  const textTop = vertical ? u(196) : u(292);

  /* ── camera / phone motion ── */
  const pin = spring({frame: f + 5, fps, config: SPR.heavy}); // already moving at f0 (continues S03's leftward drift)
  const rotIn = spring({frame: f, fps, config: SPR.heavy});
  const exitP = interpolate(f, [...T.exit], [0, 1], {...clamp, easing: E.in});
  const exitAt = (fr: number) => interpolate(fr, [...T.exit], [0, 1], {...clamp, easing: E.in});
  const exitDist = PX + PW + u(160);
  const enterDist = vertical ? u(820) : u(980);
  const phoneX = (fr: number) => (1 - spring({frame: fr + 5, fps, config: SPR.heavy})) * enterDist - exitAt(fr) * exitDist;
  const px = phoneX(f);
  const speed = Math.abs(phoneX(f + 0.5) - phoneX(f - 0.5));
  const hBlur = Math.min(u(40), Math.max(0, speed - u(28)) * 0.16); // blur only when it really travels
  const breathe = Math.sin((2 * Math.PI * f) / 210);
  const rotY = (vertical ? -17 + 12 * rotIn : -22 + 14 * rotIn) + 1.1 * breathe + 16 * exitP;
  const rotX = (vertical ? 5 : 3) * (1 - rotIn) + (vertical ? 2.5 : 1.5) + 0.6 * Math.sin((2 * Math.PI * f) / 260 + 1);
  const floatY = u(6) * Math.sin((2 * Math.PI * f) / 150 + 0.6) + (1 - pin) * u(40);
  const push = interpolate(f, [0, T.exit[0]], [1, 1.03], {...clamp, easing: E.inOut});

  /* ── brand lockup handed over from S03 (top-left), fades as the copy arrives ── */
  const lockO = interpolate(f, [4, 20], [1, 0], {...clamp, easing: E.out});

  /* ── emoji parallax (category tiles idea): float out of the phone during step 1 ── */
  const floaters: Floater[] = vertical
    ? [
        {name: 'red-apple', size: u(104), rx: 1.08, ry: 0.6, rot: -8, front: false, at: T.emoji[2], phase: 2.1},
        {name: 'tomato', size: u(150), rx: -0.12, ry: 0.4, rot: -10, front: true, at: T.emoji[0], phase: 0},
        {name: 'carrot', size: u(124), rx: 1.02, ry: 0.16, rot: 22, front: true, at: T.emoji[1], phase: 1.2},
      ]
    : [
        {name: 'red-apple', size: u(112), rx: 1.04, ry: 0.74, rot: -8, front: false, at: T.emoji[2], phase: 2.1},
        {name: 'tomato', size: u(164), rx: -0.17, ry: 0.68, rot: -10, front: true, at: T.emoji[0], phase: 0},
        {name: 'carrot', size: u(128), rx: 1.13, ry: 0.24, rot: 22, front: true, at: T.emoji[1], phase: 1.2},
      ];
  const floaterEl = (fl: Floater, i: number) => {
    const p = spring({frame: f - fl.at, fps, config: {damping: 18, stiffness: 90, mass: 1}});
    if (f < fl.at) return null;
    const out = interpolate(f, [T.emojiOut + i * 2, T.emojiOut + i * 2 + 11], [0, 1], {...clamp, easing: E.in});
    const sx = PX + PW / 2; // emerge from the screen centre
    const sy = PY + PH * 0.5;
    const rx = PX + PW * (0.5 + (fl.rx - 0.5)) ;
    const ry = PY + PH * fl.ry;
    const dx = rx - sx;
    const dy = ry - sy;
    const len = Math.hypot(dx, dy) || 1;
    const x = sx + dx * p + (dx / len) * u(150) * out;
    const y = sy + dy * p + u(9) * Math.sin((2 * Math.PI * (f - fl.at)) / 96 + fl.phase) - u(60) * out;
    const rot = fl.rot * p + 4 * Math.sin((2 * Math.PI * (f - fl.at)) / 120 + fl.phase);
    const s = (0.3 + 0.7 * p) * (1 - 0.15 * out);
    const o = Math.min(1, p * 2.5) * (1 - out);
    return (
      <div
        key={fl.name}
        style={{
          position: 'absolute',
          left: x - fl.size / 2,
          top: y - fl.size / 2,
          width: fl.size,
          height: fl.size,
          opacity: o,
          transform: `rotate(${rot}deg) scale(${s})`,
          filter: fl.front ? `drop-shadow(0 ${u(18)}px ${u(20)}px rgba(20,40,25,0.22))` : `drop-shadow(0 ${u(10)}px ${u(14)}px rgba(20,40,25,0.16)) blur(${u(1.4)}px)`,
        }}
      >
        <Emoji name={fl.name} size={fl.size} />
      </div>
    );
  };

  return (
    <AbsoluteFill style={{background: C.ground, overflow: 'hidden'}}>
      <LightBg glowX={vertical ? 58 : 72} glowY={vertical ? 58 : 34} />
      <svg width={0} height={0} style={{position: 'absolute'}}>
        <defs>
          <filter id={`s04-hb-${vertical ? 'v' : 'h'}`} x="-20%" y="0" width="140%" height="100%">
            <feGaussianBlur stdDeviation={`${hBlur.toFixed(2)} 0`} />
          </filter>
        </defs>
      </svg>

      {/* lockup from S03 */}
      <div style={{position: 'absolute', left: vertical ? u(72) : u(96), top: vertical ? u(160) : u(80), display: 'flex', alignItems: 'center', gap: u(14), opacity: lockO}}>
        <LogoMark size={u(46)} isStatic />
        <Wordmark size={u(32)} />
      </div>

      <AbsoluteFill style={{transform: `scale(${push})`, transformOrigin: vertical ? '50% 60%' : '62% 50%'}}>
        {/* ghost numeral behind the phone (rhymes with the «01» chip), moves at half the phone's parallax */}
        <div
          style={{
            position: 'absolute',
            left: pcx - (vertical ? u(330) : u(470)) + px * 0.45 - u(24) * (f / 210),
            top: vertical ? PY + PH * 0.12 : PY + PH * 0.08,
            fontFamily: F.display,
            fontWeight: 800,
            fontSize: vertical ? u(520) : u(640),
            lineHeight: 0.9,
            letterSpacing: '-0.06em',
            color: C.field,
            opacity: 0.045 * interpolate(f, [0, 16], [0, 1], {...clamp, easing: E.out}) * interpolate(f, [T.exit[0] - 2, T.exit[0] + 4], [1, 0], clamp),
            whiteSpace: 'nowrap',
          }}
        >
          01
        </div>
        <Copy vertical={vertical} u={u} left={textLeft} top={textTop} />

        <AbsoluteFill style={{filter: hBlur > 0.5 ? `url(#s04-hb-${vertical ? 'v' : 'h'})` : undefined}}>
          <AbsoluteFill style={{transform: `translateX(${px}px)`}}>
            {floaters.filter((fl) => !fl.front).map((fl) => floaterEl(fl, floaters.indexOf(fl)))}
            {/* phone + its overlay share one rotated plane */}
            <div style={{position: 'absolute', left: PX, top: PY + floatY, width: PW, height: PH, perspective: PW * 4}}>
              <div style={{position: 'absolute', inset: 0, transformStyle: 'preserve-3d', transform: `rotateX(${rotX}deg) rotateY(${rotY}deg)`}}>
                <Phone width={PW}>
                  <AppScreen idPrefix={`s04${vertical ? 'v' : 'h'}`} />
                </Phone>
                <div style={{position: 'absolute', left: box.bezel, top: box.bezel, width: box.screenW, height: box.screenH, transform: 'translateZ(1px)'}}>
                  <div style={{position: 'absolute', left: 0, top: 0, width: SHOT_CSS_W, height: SHOT_CSS_H, transform: `scale(${box.k})`, transformOrigin: '0 0'}}>
                    <SeedLayer />
                    <Toast />
                  </div>
                </div>
              </div>
            </div>
            {floaters.filter((fl) => fl.front).map((fl) => floaterEl(fl, floaters.indexOf(fl)))}
          </AbsoluteFill>
        </AbsoluteFill>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default Scene;
