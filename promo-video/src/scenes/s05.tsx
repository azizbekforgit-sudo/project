import React from 'react';
import {AbsoluteFill, interpolate, random, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, E, F, SPR, clamp} from '../theme';
import {useLayout} from '../layout';
import {LightBg} from '../components/Atmos';
import {Icon} from '../components/Icons';
import {RiseText, WordSwap} from '../components/Text';
import {ScrambleText} from '../components/ScrambleText';
import {PRODUCTS, ProductCard} from '../components/ProductCard';
import {Tap} from '../components/Device';
import {T, DROP, DEAL_ORDER, PI} from './s05/plan';

/* S05 · Buyer finds · abs 810–990 (rel 0–180). All frames below are relative. */

const CARD_H = 1.373; // ProductCard height / width (measured)
const BTN_Y = 1.247; // «В корзину» button centre y / width (measured)

const Scene: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {W, H, vertical, u} = useLayout();

  /* ── layout ── */
  const cw = vertical ? u(296) : u(250);
  const gap = vertical ? u(20) : u(24);
  const ch = cw * CARD_H;
  const gridW = 3 * cw + 2 * gap;
  const gridH = 2 * ch + gap;
  const rowH = vertical ? u(88) : u(80);
  const rowGap = vertical ? u(34) : u(32);
  const blockH = rowH + rowGap + gridH;
  const gx = vertical ? (W - gridW) / 2 : W - u(96) - gridW;
  const top = vertical ? u(600) : (H - blockH) / 2;
  const gy = top + rowH + rowGap;
  const centre = {x: gx + gridW / 2, y: gy + ch + gap / 2 - ch / 2 + ch / 2 - gap / 2 + 0}; // grid centre
  const slotC = (k: number) => ({x: gx + (k % 3) * (cw + gap) + cw / 2, y: gy + Math.floor(k / 3) * (ch + gap) + ch / 2});
  const textLeft = vertical ? u(72) : u(140);
  const textTop = vertical ? u(176) : u(300);

  /* ── entrance / exit (leftward flow, continues S04's push-out) ── */
  const enter = interpolate(f, [-6, 22], [1, 0], {...clamp, easing: E.out});
  const exitG = interpolate(f, [...T.exit], [0, 1], {...clamp, easing: E.in});
  const exitT = interpolate(f, [T.exit[0] - 2, T.exit[1] - 2], [0, 1], {...clamp, easing: E.in});
  const gridX = enter * u(vertical ? 560 : 640) - exitG * (gx + gridW + u(120));
  const textX = -exitT * (textLeft + u(900));
  const speed = Math.abs(interpolate(f + 0.5, [...T.exit], [0, 1], {...clamp, easing: E.in}) - interpolate(f - 0.5, [...T.exit], [0, 1], {...clamp, easing: E.in})) * (gx + gridW + u(120));
  const hBlur = Math.min(u(34), Math.max(0, speed - u(26)) * 0.14);
  const push = interpolate(f, [0, T.exit[0]], [1, 1.02], {...clamp, easing: E.inOut});

  /* ── beat pulse for the seed caret ── */
  const beatPulse = 0.5 + 0.5 * Math.cos((2 * Math.PI * (f % 15)) / 15);

  /* ── the deck ── */
  const split = interpolate(f, [...T.split], [0, 1], {...clamp, easing: E.inOut});
  const sq = spring({frame: f - T.square, fps, config: {damping: 11, stiffness: 220, mass: 0.7}});
  const sqE = f < T.square ? 0 : sq; // 0 → 1 (slight overshoot)
  const sx = cw * 0.64;
  const ly = u(36);

  type Pose = {x: number; y: number; r: number; rx: number; s: number; z: number; o: number};
  const cardPose = (i: number): Pose => {
    const half = i < 3 ? -1 : 1;
    const pos = i < 3 ? i : i - 3; // 0 = top of its half
    const d = DROP[i];
    const k = DEAL_ORDER.indexOf(i);
    const j0 = {x: (random(`a${i}`) - 0.5) * u(9), y: (random(`b${i}`) - 0.5) * u(5), r: (random(`c${i}`) - 0.5) * 2.4};
    const j1 = {x: (random(`d${i}`) - 0.5) * u(26), y: (random(`e${i}`) - 0.5) * u(10), r: (random(`f${i}`) - 0.5) * 5};
    // 1. stacked (pre-riffle)
    const stackY = i * u(2.6);
    const base: Pose = {x: j0.x, y: j0.y + stackY, r: j0.r, rx: 0, s: 1, z: 10 - i, o: 1};
    // deck enters
    const inP = interpolate(f, [T.deckIn + 2 * i, T.deckIn + 2 * i + 12], [0, 1], {...clamp, easing: E.out});
    base.o = Math.min(1, inP * 3);
    base.y += (1 - inP) * u(60);
    base.s = 0.94 + 0.06 * inP;
    base.r += (1 - inP) * (i % 2 ? 5 : -5);
    // 2. held in two hands
    const held: Pose = {
      x: base.x + (half * sx - base.x) * split,
      y: base.y + (-ly - pos * u(1) - base.y) * split + (-ly * 0 + u(2) * Math.sin(f / 5 + i)) * split * (f < T.drop0 ? 1 : 0),
      r: base.r + (half * 5.5 - base.r) * split,
      rx: 0,
      s: 1 + 0.015 * split,
      z: 100 + (3 - pos),
      o: base.o,
    };
    if (f < T.drop0 + 0) {
      if (f < T.split[0]) return base;
      return held;
    }
    // 3. drop on an arc
    const t0 = T.drop0 + T.dropStep * d;
    const t = interpolate(f, [t0, t0 + T.dropDur], [0, 1], clamp);
    const L = {x: j1.x, y: j1.y + d * u(-1.8) + i * 0, r: j1.r};
    if (t < 1) {
      const xe = E.out(t);
      const ye = E.smooth(t);
      const arc = Math.sin(Math.PI * t);
      return {
        x: held.x + (L.x - held.x) * xe + half * -u(12) * arc,
        y: held.y + (L.y - held.y) * ye - u(34) * arc * (1 - t),
        r: held.r + (L.r - held.r) * xe + half * -3 * arc,
        rx: -26 * arc,
        s: held.s + (1 - held.s) * ye + 0.05 * arc,
        z: t > 0 ? 50 + d : held.z,
        o: 1,
      };
    }
    // landed on the pile: square it up
    const settle = 1 - sqE;
    const pile: Pose = {
      x: L.x * settle,
      y: L.y * settle - u(7) * Math.sin(Math.PI * Math.min(1, Math.max(0, (f - T.square) / 14))) * 1,
      r: L.r * settle,
      rx: 0,
      s: 1 + 0.012 * Math.sin(Math.PI * Math.min(1, Math.max(0, (f - T.square) / 12))),
      z: d,
      o: 1,
    };
    // 4. deal into the grid
    const ds = T.dealStart + T.dealStep * k;
    const p = interpolate(f, [ds, ds + T.dealDur], [0, 1], {...clamp, easing: E.out});
    if (f < ds) return pile;
    const sl = slotC(k);
    const arc = Math.sin(Math.PI * Math.min(1, p));
    const swing = (k % 2 ? 1 : -1) * 4;
    return {
      x: pile.x + (sl.x - centre.x) * p,
      y: pile.y + (sl.y - centre.y) * p - u(18) * arc,
      r: pile.r * (1 - p) + swing * arc,
      rx: 0,
      s: 1 + 0.045 * arc,
      z: p < 1 ? 60 : 20 + k,
      o: 1,
    };
  };

  /* ── highlight + add to cart ── */
  const liftP = interpolate(f, [...T.lift], [0, 1], {...clamp, easing: E.out});
  const added = f >= T.tap ? 1 : 0;
  const press = f >= T.tap ? interpolate(f, [T.tap, T.tap + 3, T.tap + 12], [0, 1, 0], {...clamp, easing: E.out}) : 0;
  const badge = f >= T.badge ? spring({frame: f - T.badge, fps, config: SPR.pop}) : 0;
  const cartBounce = f >= T.badge ? Math.sin(Math.PI * Math.min(1, (f - T.badge) / 12)) : 0;

  /* geometry of the search row */
  const cartW = rowH;
  const searchW = gridW - cartW - u(16);
  const cartCx = gx + gridW - cartW / 2;
  const cartCy = top + rowH / 2;
  const badgeC = {x: cartCx + cartW * 0.34, y: cartCy - cartW * 0.34};
  const slot0 = slotC(0);
  const liftScale = 1 + 0.06 * liftP;
  const btnPt = {x: slot0.x + gridX * 0, y: slot0.y + (BTN_Y * cw - ch / 2) * liftScale - u(10) * liftP};

  /* seed flight: button → cart badge (quadratic arc) */
  const fp = interpolate(f, [T.tap, T.badge], [0, 1], {...clamp, easing: E.smooth});
  const sc = {x: (btnPt.x + badgeC.x) / 2 + u(70), y: Math.min(btnPt.y, badgeC.y) - u(60)};
  const seed = {
    x: (1 - fp) * (1 - fp) * btnPt.x + 2 * (1 - fp) * fp * sc.x + fp * fp * badgeC.x,
    y: (1 - fp) * (1 - fp) * btnPt.y + 2 * (1 - fp) * fp * sc.y + fp * fp * badgeC.y,
  };
  const seedO = f >= T.tap && f < T.badge ? 1 : 0;

  const headSize = vertical ? u(82) : u(92);
  const lines = vertical ? ['Покупатель', 'находит свежее'] : ['Покупатель', 'находит', 'свежее'];
  const subSize = vertical ? u(40) : u(38);

  const chipIn = interpolate(f, [T.chip, T.chip + 12], [0, 1], {...clamp, easing: E.out});
  const chipOut = interpolate(f, [T.textOut, T.textOut + 7], [0, 1], {...clamp, easing: E.in});

  return (
    <AbsoluteFill style={{background: C.ground, overflow: 'hidden'}}>
      <LightBg glowX={vertical ? 60 : 72} glowY={vertical ? 62 : 36} />
      <svg width={0} height={0} style={{position: 'absolute'}}>
        <defs>
          <filter id={`s05-hb-${vertical ? 'v' : 'h'}`} x="-20%" y="0" width="140%" height="100%">
            <feGaussianBlur stdDeviation={`${hBlur.toFixed(2)} 0`} />
          </filter>
        </defs>
      </svg>
      <AbsoluteFill style={{transform: `scale(${push})`, transformOrigin: '60% 50%'}}>
        <AbsoluteFill style={{filter: hBlur > 0.5 ? `url(#s05-hb-${vertical ? 'v' : 'h'})` : undefined}}>
          {/* ghost numeral */}
          <div
            style={{
              position: 'absolute',
              left: vertical ? u(430) + gridX * 0.5 : gx - u(150) + gridX * 0.5 - u(26) * (f / 180),
              top: vertical ? u(60) : gy - u(30),
              fontFamily: F.display,
              fontWeight: 800,
              fontSize: vertical ? u(560) : u(640),
              lineHeight: 0.9,
              letterSpacing: '-0.06em',
              color: C.field,
              opacity: 0.045,
              whiteSpace: 'nowrap',
            }}
          >
            02
          </div>

          {/* text column */}
          <div style={{position: 'absolute', left: textLeft, top: textTop, transform: `translateX(${textX}px)`}}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                fontFamily: F.mono,
                fontSize: u(26),
                fontWeight: 500,
                color: C.field,
                padding: `${u(7)}px ${u(18)}px`,
                borderRadius: 999,
                border: `${Math.max(1, u(1.5))}px solid rgba(31,92,53,0.32)`,
                letterSpacing: '0.04em',
                opacity: chipIn * (1 - chipOut),
                transform: `translateY(${(1 - chipIn) * u(14) - chipOut * u(18)}px)`,
              }}
            >
              <ScrambleText text="02" start={T.chip} stagger={3} scramble={8} tick={2} seed="s05chip" glyphColor={C.sunLight} />
            </div>
            <div style={{marginTop: vertical ? u(30) : u(26), fontFamily: F.display, fontWeight: 800, fontSize: headSize, lineHeight: 1.05, letterSpacing: '-0.03em', color: C.ink}}>
              {lines.map((line, li) => (
                <div key={li}>
                  <RiseText
                    text={line}
                    start={T.head + li * 3}
                    dur={18}
                    out={T.textOut + li * 1.5}
                    outDur={8}
                    wordStyle={(w) => (w === 'свежее' ? {color: C.field} : undefined)}
                  />
                </div>
              ))}
            </div>
            <div style={{marginTop: vertical ? u(34) : u(30), fontFamily: F.body, fontWeight: 500, fontSize: subSize, lineHeight: 1.32, color: C.ink2}}>
              <RiseText text={'Прямо у того, кто вырастил.'} start={T.sub} stagger={2.5} dur={16} out={T.textOut + 4} outDur={8} />
            </div>
          </div>

          {/* right block: search row + deck */}
          <AbsoluteFill style={{transform: `translateX(${gridX}px)`}}>
            {/* search row */}
            <div style={{position: 'absolute', left: gx, top, width: searchW, height: rowH, display: 'flex', alignItems: 'center', gap: u(18), padding: `0 ${u(14)}px 0 ${u(28)}px`, boxSizing: 'border-box', background: C.card, borderRadius: u(22), border: `${Math.max(1.5, u(2))}px solid ${C.rule}`, boxShadow: '0 2px 4px rgba(20,40,25,0.05), 0 14px 36px rgba(20,40,25,0.10)', fontFamily: F.body}}>
              <Icon name="magnifying-glass" size={u(30)} color={C.ink3} />
              <div style={{flex: 1, display: 'flex', alignItems: 'center', gap: u(4), fontSize: u(vertical ? 34 : 34), fontWeight: 500, color: C.ink, letterSpacing: '-0.005em'}}>
                <WordSwap words={['Продукты', 'Овощи', 'Фрукты', 'Зелень', 'Мёд']} swaps={[...T.swaps]} dur={9} />
                <span style={{width: u(3), height: u(36), borderRadius: 2, background: C.sun, opacity: 0.35 + 0.65 * beatPulse, marginLeft: u(6)}} />
              </div>
              <div style={{width: rowH - u(26), height: rowH - u(26), borderRadius: '50%', background: C.sprout, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <Icon name="microphone" size={u(28)} color={C.field} />
              </div>
            </div>
            {/* cart */}
            <div
              style={{
                position: 'absolute',
                left: gx + gridW - cartW,
                top,
                width: cartW,
                height: rowH,
                background: C.card,
                borderRadius: u(22),
                border: `${Math.max(1.5, u(2))}px solid ${C.rule}`,
                boxShadow: '0 2px 4px rgba(20,40,25,0.05), 0 14px 36px rgba(20,40,25,0.10)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box',
                transform: `scale(${1 + 0.07 * cartBounce})`,
              }}
            >
              <Icon name="cart-shopping" size={u(34)} color={C.field} />
            </div>
            <div
              style={{
                position: 'absolute',
                left: badgeC.x - u(19),
                top: badgeC.y - u(19),
                width: u(38),
                height: u(38),
                borderRadius: '50%',
                background: C.sun,
                color: C.onSun,
                fontFamily: F.brand,
                fontWeight: 700,
                fontSize: u(23),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(240,180,41,0.5)',
                transform: `scale(${Math.max(0, badge)})`,
              }}
            >
              1
            </div>

            {/* deck / grid */}
            <div style={{position: 'absolute', inset: 0, perspective: u(1700), perspectiveOrigin: `${centre.x}px ${centre.y}px`}}>
              {PRODUCTS.slice(0, 6).map((p, i) => {
                const ps = cardPose(i);
                if (ps.o <= 0) return null;
                const k = DEAL_ORDER.indexOf(i);
                const isTomato = i === 0;
                const dealt = f >= T.dealStart + T.dealStep * k + T.dealDur;
                const dim = !isTomato && dealt ? 1 - 0.1 * liftP : 1;
                const sNow = ps.s * (isTomato && dealt ? liftScale * (1 - 0.02 * press) : 1);
                const yNow = ps.y - (isTomato && dealt ? u(10) * liftP : 0);
                return (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      left: centre.x - cw / 2,
                      top: centre.y - ch / 2,
                      width: cw,
                      zIndex: isTomato && dealt && liftP > 0 ? 80 : ps.z,
                      opacity: ps.o * dim,
                      transform: `translate3d(${ps.x}px, ${yNow}px, 0) rotate(${ps.r}deg) rotateX(${ps.rx}deg) scale(${sNow})`,
                    }}
                  >
                    <ProductCard
                      p={p}
                      w={cw}
                      added={isTomato ? added : 0}
                      style={isTomato && liftP > 0 ? {boxShadow: `0 ${u(8 + 26 * liftP)}px ${u(20 + 50 * liftP)}px rgba(20,40,25,${0.1 + 0.16 * liftP}), 0 2px 6px rgba(20,40,25,0.08)`} : undefined}
                    />
                  </div>
                );
              })}
            </div>

            {/* tap + seed */}
            <div style={{position: 'absolute', inset: 0, zIndex: 200}}>
              <Tap x={btnPt.x} y={btnPt.y + u(6)} at={T.tap} size={u(58)} />
              <div
                style={{
                  position: 'absolute',
                  left: seed.x - u(11),
                  top: seed.y - u(11),
                  width: u(22),
                  height: u(22),
                  borderRadius: '50%',
                  background: C.sun,
                  boxShadow: `0 0 ${u(24)}px ${u(6)}px rgba(240,180,41,0.55)`,
                  opacity: seedO,
                }}
              />
            </div>
          </AbsoluteFill>
        </AbsoluteFill>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

void PI;
export default Scene;
