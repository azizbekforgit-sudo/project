import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, E, F, SPR, clamp} from '../theme';
import {useLayout} from '../layout';
import {LightBg} from '../components/Atmos';
import {Phone, ScreenSequence, SHOT_CSS_H, SHOT_CSS_W, Tap} from '../components/Device';
import {RiseText} from '../components/Text';
import {ScrambleText} from '../components/ScrambleText';
import {Banner} from './s06/Banner';
import {OrderCard, CARD_H, CARD_W} from './s06/Card';
import {CARD_AT, SCREEN_HOME, SCREEN_ORDERS, T} from './s06/plan';

/* S06 · Order → farmer · abs 990–1230 (rel 0–240). Frames below are relative. */

const phoneBox = (pw: number) => {
  const bezel = pw * 0.035;
  const screenW = pw - bezel * 2;
  const screenH = (screenW * SHOT_CSS_H) / SHOT_CSS_W;
  return {bezel, screenW, screenH, ph: screenH + bezel * 2, k: screenW / SHOT_CSS_W};
};

/** one kinetic line: mask-rise on its beat, dims when the next one lands. The full stop is the sun seed. */
const Line: React.FC<{word: string; start: number; next?: number; size: number; color: string; lh: number}> = ({word, start, next, size, color, lh}) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [start, start + 16], [1, 0], {...clamp, easing: E.out});
  const dim = next === undefined ? 1 : 1 - 0.72 * interpolate(f, [next, next + 10], [0, 1], {...clamp, easing: E.out});
  if (f < start - 1) return <div style={{height: lh}} />;
  return (
    <div style={{height: lh, overflow: 'hidden', paddingBottom: size * 0.12}}>
      <div style={{transform: `translateY(${p * 112}%)`, opacity: dim, whiteSpace: 'nowrap', color}}>
        {word}
        <span style={{color: C.sun}}>.</span>
      </div>
    </div>
  );
};

const Scene: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {W, H, vertical, u} = useLayout();

  /* ── layout ── */
  const PW = vertical ? u(540) : u(458);
  const box = phoneBox(PW);
  const PH = box.ph;
  const pcx = vertical ? W / 2 : u(1396);
  const PX = pcx - PW / 2;
  const PY = vertical ? u(650) : (H - PH) / 2;
  const textLeft = vertical ? u(72) : u(140);
  const textTop = vertical ? u(190) : u(286);

  /* final card rect */
  const cardW = vertical ? u(858) : u(600);
  const cs = cardW / CARD_W;
  const cardH = CARD_H * cs;
  const cardX = pcx - cardW / 2;
  const cardY = vertical ? u(650) : (H - cardH) / 2;

  /* ── phone entrance (already moving at f0), breathing, vibration ── */
  const phoneIn = (fr: number) => 1 - spring({frame: fr + 7, fps, config: SPR.heavy});
  const enterDist = vertical ? u(760) : u(640);
  const px = phoneIn(f) * enterDist;
  const speed = Math.abs((phoneIn(f + 0.5) - phoneIn(f - 0.5)) * enterDist);
  const hBlur = Math.min(u(30), Math.max(0, speed - u(26)) * 0.14);
  const vibOn = (f >= 15 && f <= 18) || (f >= 21 && f <= 23);
  const vibS = f % 2 === 0 ? 1 : -1;
  const vx = vibOn ? vibS * u(7) : 0;
  const vr = vibOn ? vibS * 0.8 : 0;
  const rotY = (vertical ? -6 : -8) + 1.0 * Math.sin((2 * Math.PI * f) / 210);
  const rotX = vertical ? 3 : 1.6;
  const floatY = u(5) * Math.sin((2 * Math.PI * f) / 150 + 0.6);

  /* ── lift: shared element ── */
  const lp = interpolate(f, [T.lift + 2, T.land], [0, 1], {...clamp, easing: E.inOut});
  const cardVis = interpolate(f, [T.liftPre, T.liftPre + 2], [0, 1], clamp);
  const k0 = box.k;
  const sx0 = PX + box.bezel + CARD_AT.x * k0;
  const sy0 = PY + box.bezel + CARD_AT.y * k0 + floatY;
  const cX = sx0 + (cardX - sx0) * lp;
  const cY = sy0 + (cardY - sy0) * lp - u(26) * Math.sin(lp * Math.PI);
  const cScale = k0 + (cs - k0) * lp + 0.03 * Math.sin(Math.min(1, Math.max(0, (f - T.liftPre) / 12)) * Math.PI) * (1 - lp);
  const liftShadow = Math.max(lp, interpolate(f, [T.liftPre, T.lift + 2], [0, 0.6], clamp));
  const phoneFade = interpolate(f, [T.lift + 4, T.lift + 24], [1, 0], {...clamp, easing: E.in});
  const phoneScale = 1 - 0.06 * (1 - phoneFade);
  const rotYNow = rotY * phoneFade;
  const glow = interpolate(f, [T.lift, T.land + 10], [0, 1], {...clamp, easing: E.out});
  const beatPulse = 0.5 + 0.5 * Math.cos((2 * Math.PI * ((f - T.land) % 30)) / 30);

  /* ── camera + exit ── */
  const push = interpolate(f, [0, T.exit[0]], [1, 1.03], {...clamp, easing: E.inOut});
  const ex = interpolate(f, [...T.exit], [0, 1], {...clamp, easing: E.in});
  const exitY = -ex * H * 0.9;
  const vBlur = u(34) * ex;
  const panelTop = H - interpolate(f, [T.exit[0] + 2, T.exit[1] - 2], [0, H + 4], {...clamp, easing: E.in});

  /* ── copy ── */
  const chipIn = interpolate(f, [T.chip, T.chip + 12], [0, 1], {...clamp, easing: E.out});
  const head = vertical ? u(100) : u(108);
  const tri = vertical ? u(80) : u(80);
  const lh = tri * 1.2;
  const lines = ['Заказ —', 'сразу', 'фермеру'];
  const ghostO = 0.05 * interpolate(f, [0, 14], [0, 1], {...clamp, easing: E.out});

  const phoneInner = (
    <>
      <ScreenSequence items={[{src: SCREEN_HOME, at: 0}, {src: SCREEN_ORDERS, at: T.screen}]} mode="slide" dur={14} />
      <Banner />
      <Tap x={195} y={96} at={T.tapNotif} size={46} />
    </>
  );

  return (
    <AbsoluteFill style={{background: C.ground, overflow: 'hidden'}}>
      <LightBg glowX={vertical ? 60 : 74} glowY={vertical ? 62 : 40} />
      <svg width={0} height={0} style={{position: 'absolute'}}>
        <defs>
          <filter id={`s06-hb-${vertical ? 'v' : 'h'}`} x="-20%" y="0" width="140%" height="100%">
            <feGaussianBlur stdDeviation={`${hBlur.toFixed(2)} 0`} />
          </filter>
          <filter id={`s06-vb-${vertical ? 'v' : 'h'}`} x="0" y="-20%" width="100%" height="140%">
            <feGaussianBlur stdDeviation={`0 ${vBlur.toFixed(2)}`} />
          </filter>
        </defs>
      </svg>

      <AbsoluteFill style={{filter: vBlur > 0.5 ? `url(#s06-vb-${vertical ? 'v' : 'h'})` : undefined}}>
        <AbsoluteFill style={{transform: `translateY(${exitY}px) scale(${push})`, transformOrigin: '60% 55%'}}>
          {/* sun glow behind the card (appears with the lift) */}
          <div
            style={{
              position: 'absolute',
              left: pcx - u(560),
              top: (vertical ? cardY + cardH / 2 : H / 2) - u(560),
              width: u(1120),
              height: u(1120),
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(240,180,41,0.30) 0%, rgba(240,180,41,0) 62%)',
              opacity: glow * (0.8 + 0.2 * beatPulse),
              transform: `scale(${0.7 + 0.3 * glow})`,
            }}
          />
          {/* ghost numeral */}
          <div
            style={{
              position: 'absolute',
              left: vertical ? u(420) : u(840),
              top: vertical ? u(1250) : u(250),
              fontFamily: F.display,
              fontWeight: 800,
              fontSize: vertical ? u(480) : u(600),
              lineHeight: 0.9,
              letterSpacing: '-0.06em',
              color: C.field,
              opacity: vertical ? 0 : ghostO * 0.8,
              whiteSpace: 'nowrap',
            }}
          >
            03
          </div>

          {/* copy column */}
          <div style={{position: 'absolute', left: textLeft, top: textTop}}>
            <div
              style={{
                display: 'inline-flex',
                fontFamily: F.mono,
                fontSize: u(26),
                fontWeight: 500,
                color: C.field,
                padding: `${u(7)}px ${u(18)}px`,
                borderRadius: 999,
                border: `${Math.max(1, u(1.5))}px solid rgba(31,92,53,0.32)`,
                letterSpacing: '0.04em',
                opacity: chipIn,
                transform: `translateY(${(1 - chipIn) * u(14)}px)`,
              }}
            >
              <ScrambleText text="03" start={T.chip} stagger={3} scramble={8} tick={2} seed="s06chip" glyphColor={C.sunLight} />
            </div>
            <div style={{position: 'relative', marginTop: vertical ? u(30) : u(26)}}>
              <div style={{fontFamily: F.display, fontWeight: 800, fontSize: head, lineHeight: 1.05, letterSpacing: '-0.03em', color: C.ink}}>
                {lines.map((line, li) => (
                  <div key={li}>
                    <RiseText text={line} start={T.head + li * 3} dur={18} out={T.headOut + li * 1.5} outDur={8} wordStyle={() => (li === 2 ? {color: C.field} : undefined)} />
                  </div>
                ))}
              </div>
              <div style={{position: 'absolute', left: 0, top: 0, fontFamily: F.display, fontWeight: 800, fontSize: tri, lineHeight: 1.2, letterSpacing: '-0.03em'}}>
                <Line word="Созвонились" start={T.words[0]} next={T.words[1]} size={tri} color={C.ink} lh={lh} />
                <Line word="Договорились" start={T.words[1]} next={T.words[2]} size={tri} color={C.ink} lh={lh} />
                <Line word="Продано" start={T.words[2]} size={tri} color={C.field} lh={lh} />
              </div>
            </div>
          </div>

          {/* phone */}
          <AbsoluteFill style={{filter: hBlur > 0.5 ? `url(#s06-hb-${vertical ? 'v' : 'h'})` : undefined}}>
            {phoneFade > 0 ? (
              <div style={{position: 'absolute', left: PX + px + vx, top: PY + floatY, width: PW, height: PH, opacity: phoneFade, transform: `scale(${phoneScale}) rotateZ(${vr}deg)`}}>
                <Phone width={PW} rotateY={rotYNow} rotateX={rotX * phoneFade}>
                  {phoneInner}
                </Phone>
              </div>
            ) : null}
            {/* the lifted card */}
            {cardVis > 0 ? (
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: CARD_W,
                  height: CARD_H,
                  transformOrigin: '0 0',
                  transform: `translate(${cX}px, ${cY}px) scale(${cScale})`,
                  opacity: cardVis,
                  borderRadius: 24,
                  boxShadow: `0 ${24 * liftShadow}px ${60 * liftShadow}px rgba(20,50,30,${0.10 + 0.18 * liftShadow}), 0 ${2 + 4 * liftShadow}px ${6 * liftShadow}px rgba(20,50,30,0.08)`,
                }}
              >
                <OrderCard />
              </div>
            ) : null}
          </AbsoluteFill>
        </AbsoluteFill>
      </AbsoluteFill>

      {/* exit wipe → night-green (S07 backdrop) */}
      <div style={{position: 'absolute', left: 0, right: 0, top: panelTop, height: H + 8, background: C.night2, overflow: 'hidden'}}>
        <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 60%, rgba(121,204,151,0.14) 0%, rgba(121,204,151,0) 55%)'}} />
      </div>
    </AbsoluteFill>
  );
};

export default Scene;
