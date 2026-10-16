import React from 'react';
import {AbsoluteFill, interpolate, random, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, E, F, SPR, clamp} from '../theme';
import {useLayout} from '../layout';
import {NightBg, Vignette} from '../components/Atmos';
import {RiseText} from '../components/Text';
import {CardBack, CardFace} from './s02/Cards';
import {PriceTag, Seed} from './s02/PriceTag';
import {
  CAMERA_END,
  TAG_APEX,
  TAG_BASE,
  CARDS,
  FLIGHT,
  HEAT,
  LAND,
  RESULT_1,
  RESULT_2,
  SEED_DROP,
  STAMP_AT,
  TAG_RELEASE,
  chainGeometry,
  hopStart,
} from './s02/geometry';
import {ringPos, swing, tagScale} from './s02/motion';

type U = (n: number) => number;

/* ── word rise with baseline alignment (mixed sizes in one line) ── */
const RiseWords: React.FC<{words: {t: string; style?: React.CSSProperties}[]; start: number; stagger?: number; dur?: number}> = ({words, start, stagger = 4, dur = 16}) => {
  const f = useCurrentFrame();
  return (
    <>
      {words.map((w, i) => {
        const s = start + i * stagger;
        const y = interpolate(f, [s, s + dur], [112, 0], {...clamp, easing: E.out});
        return (
          <React.Fragment key={i}>
            {i > 0 ? ' ' : null}
            <span style={{display: 'inline-block', clipPath: 'inset(0)', padding: '0.14em 0.06em 0.16em', margin: '-0.14em -0.06em -0.16em', ...w.style}}>
              <span style={{display: 'inline-block', transform: `translateY(${y}%)`, whiteSpace: 'nowrap'}}>{w.t}</span>
            </span>
          </React.Fragment>
        );
      })}
    </>
  );
};

/* ── card pose: deck → flight (arc, flip, lift) → landed (rotation settle, squash, stamp shake) ── */
type Pose = {x: number; y: number; rot: number; scale: number; flipY: number; z: number; sx: number; sy: number; contact: number; state: 'deck' | 'flight' | 'landed'; depth: number};

const RESID = [6.5, -5.5, 5, -6, 4.5];

const computePoses = (f: number, fps: number, u: U, g: ReturnType<typeof chainGeometry>) => {
  const reg = (fr: number) => spring({frame: fr, fps, config: {damping: 15, stiffness: 140, mass: 0.8}});
  const deckPose = (i: number, fr: number) => {
    const layer = 4 - i;
    const r = reg(fr);
    return {
      x: g.deck.x + layer * u(2.6) + (random(`s02-fx-${i}`) - 0.5) * u(110) * (1 - r),
      y: g.deck.y - layer * u(5) + (random(`s02-fy-${i}`) - 0.5) * u(40) * (1 - r),
      rot: g.deck.rot + (random(`s02-dr-${i}`) - 0.5) * 3.5 + (random(`s02-fr-${i}`) - 0.5) * 26 * (1 - r),
    };
  };
  // a stamp slam jolts the table: resting cards (and the deck) hop a hair
  let jolt = 0;
  for (const st of STAMP_AT) if (st > 0 && f >= st && f < st + 8) jolt += -u(2.6) * Math.exp(-(f - st) / 1.8) * Math.cos(((f - st) * Math.PI) / 4);
  return CARDS.map((_, i): Pose => {
    const c = g.centers[i];
    const dur = FLIGHT[i];
    const land = LAND[i];
    const t0 = land - dur;
    if (f < t0) {
      const d = deckPose(i, f);
      return {...d, y: d.y + jolt, scale: g.deck.scale, flipY: 180, z: 0, sx: 1, sy: 1, contact: 0, state: 'deck', depth: 4 - i};
    }
    if (f < land) {
      const d = deckPose(i, t0);
      const tau = (f - t0) / dur;
      const e = interpolate(f, [t0, land], [0, 1], {...clamp, easing: E.smooth});
      const p1 = {x: (d.x + c.x) / 2, y: Math.min(d.y, c.y) - u(g.arrowAxis === 'x' ? 170 : 120)};
      const x = (1 - e) * (1 - e) * d.x + 2 * (1 - e) * e * p1.x + e * e * c.x;
      const y = (1 - e) * (1 - e) * d.y + 2 * (1 - e) * e * p1.y + e * e * c.y;
      const z = 4 * tau * (1 - tau); // gravity parabola in raw time → lands with speed
      const flip = interpolate(tau, [0.06, 0.62], [180, 0], {...clamp, easing: E.inOut});
      const rot = d.rot + (RESID[i] - d.rot) * e - 9 * Math.sin(Math.PI * tau);
      return {x, y, rot, scale: (g.deck.scale + (1 - g.deck.scale) * e) * (1 + 0.15 * z), flipY: flip, z, sx: 1, sy: 1, contact: 0, state: 'flight', depth: 100};
    }
    const t = f - land;
    const settle = spring({frame: t, fps, config: {damping: 11, stiffness: 190, mass: 0.75}});
    const sq = 1 - spring({frame: t, fps, config: SPR.snap});
    let rot = RESID[i] * (1 - settle);
    let x = c.x;
    let scale = 1;
    const st = STAMP_AT[i];
    if (st > 0 && f >= st && f < st + 9) {
      const ts = f - st;
      x += u(6) * Math.pow(0.55, ts) * (ts % 2 === 0 ? 1 : -1);
      rot += 0.7 * Math.pow(0.5, ts) * (ts % 2 === 0 ? -1 : 1);
    }
    if (st > 0 && f >= st) scale = 1 - 0.035 * (1 - spring({frame: f - st, fps, config: SPR.snap}));
    const own = st > 0 && f >= st && f < st + 8;
    return {x, y: c.y + (own ? 0 : jolt), rot, scale, flipY: 0, z: 0, sx: 1 + 0.025 * sq, sy: 1 - 0.045 * sq, contact: Math.exp(-t / 3), state: 'landed', depth: 10 + i};
  });
};

const Scene: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {W, H, vertical, u} = useLayout();
  const g = chainGeometry(W, H, vertical, u);
  const card = g.cards[0];

  /* camera: enters from below already moving (continues S01's whip up), hush push at the end */
  // velocity-matched with S01's whip (S01 exits up at ~u(300)/f with a vertical-only blur)
  const enterY = (fr: number) => (1 - interpolate(fr, [0, 18], [0, 1], {...clamp, easing: E.out})) * u(520);
  const stageY = enterY(f);
  const vBlur = Math.min(u(60), Math.abs(enterY(f + 1) - stageY) * 0.32);
  const push = interpolate(f, [198, 240], [1, CAMERA_END], {...clamp, easing: E.smooth});

  /* tag + seed */
  const ring = ringPos(f, g, u);
  const sc = f < TAG_RELEASE ? 0 : tagScale(f);
  const th = swing(f, g, u);
  const heat = interpolate(f, HEAT as unknown as number[], [0, 1], {...clamp, easing: E.out});
  const tagOpacity = interpolate(f, [TAG_RELEASE, TAG_RELEASE + 3], [0, 1], clamp);
  const seedOpacity = interpolate(f, [SEED_DROP[0], SEED_DROP[0] + 3], [0, 1], clamp);
  const dropP = interpolate(f, [SEED_DROP[0], SEED_DROP[1]], [0, 1], {...clamp, easing: E.in});
  const sinceLand = f - SEED_DROP[1];
  const seedSx = f < SEED_DROP[1] ? 1 - 0.28 * dropP : 1 + 0.4 * Math.exp(-sinceLand / 2.4) * Math.cos((Math.PI * sinceLand) / 5);
  const seedSy = f < SEED_DROP[1] ? 1 + 0.7 * dropP : 1 - 0.4 * Math.exp(-sinceLand / 2.4) * Math.cos((Math.PI * sinceLand) / 5);
  let pulse = 0;
  for (let b = 45; b <= 195; b += 15) if (f >= b) pulse = Math.max(pulse, Math.exp(-(f - b) / 4));

  /* rail + trail */
  const [r0, r1] = g.rail;
  const a0 = g.anchors[0];
  const railA = interpolate(f, [SEED_DROP[1], SEED_DROP[1] + 10], [0, 1], {...clamp, easing: E.out});
  const railB = interpolate(f, [SEED_DROP[1], SEED_DROP[1] + 26], [0, 1], {...clamp, easing: E.out});
  const railFrom = {x: a0.x + (r0.x - a0.x) * railA, y: a0.y + (r0.y - a0.y) * railA};
  const railTo = {x: a0.x + (r1.x - a0.x) * railB, y: a0.y + (r1.y - a0.y) * railB};
  const trailEnd = g.arrowAxis === 'x' ? {x: Math.max(a0.x, Math.min(ring.x, g.anchors[4].x)), y: a0.y} : {x: a0.x, y: Math.max(a0.y, Math.min(ring.y, g.anchors[4].y))};

  /* cards */
  const poses = computePoses(f, fps, u, g);
  const order = poses.map((p, i) => ({p, i})).sort((a, b) => a.p.depth - b.p.depth);

  /* headline dims when the verdict arrives */
  const hd = interpolate(f, [166, 184], [1, 0.48], {...clamp, easing: E.inOut});

  /* background glow follows the tag and warms with it */
  const tagCx = ring.x;
  const tagCy = ring.y + g.stringLen + sc * TAG_BASE * u(48);
  const glowCol = `rgba(${240},${Math.round(180 - 70 * heat)},${Math.round(41 + 62 * heat)},${0.1 + 0.05 * Math.min(sc, 2.1) / 2.1 + 0.06 * heat})`;

  const headSize = vertical ? u(82) : u(78);
  const headLines = vertical ? ['Каждый', 'перекупщик', 'забирает', 'свою долю.'] : ['Каждый перекупщик', 'забирает свою долю.'];
  const sunWord = (w: string) => (w === 'свою' || w === 'долю.' ? {color: C.sun} : undefined);
  const left = vertical ? u(72) : u(140);

  const baseResult = vertical ? u(66) : u(64);

  return (
    <AbsoluteFill style={{background: C.night}}>
      <NightBg glowX={(tagCx / W) * 100} glowY={(tagCy / H) * 100} glow={glowCol} intensity={0.75 + 0.18 * Math.max(0, sc - 1)} />
      <svg width={0} height={0} style={{position: 'absolute'}}>
        <defs>
          <filter id="s02-vblur" x="-5%" y="-40%" width="110%" height="180%">
            <feGaussianBlur stdDeviation={`0 ${vBlur.toFixed(2)}`} />
          </filter>
        </defs>
      </svg>
      <AbsoluteFill
        style={{
          transform: `translateY(${stageY}px) scale(${push})`,
          transformOrigin: '50% 50%',
          filter: vBlur > 0.4 ? 'url(#s02-vblur)' : undefined,
        }}
      >
        {/* ── headline ── */}
        <div style={{position: 'absolute', left, top: vertical ? u(168) : u(88), opacity: hd}}>
          <div
            style={{
              display: 'inline-block',
              fontFamily: F.mono,
              fontSize: u(23),
              fontWeight: 500,
              color: 'rgba(243,239,228,0.82)',
              padding: `${u(7)}px ${u(18)}px`,
              borderRadius: 999,
              border: `${Math.max(1, u(1.5))}px solid rgba(243,239,228,0.34)`,
              letterSpacing: '0.02em',
            }}
          >
            Сейчас
          </div>
          <div
            style={{
              marginTop: vertical ? u(26) : u(20),
              fontFamily: F.display,
              fontWeight: 800,
              fontSize: headSize,
              lineHeight: 1.05,
              letterSpacing: '-0.03em',
              color: C.cream,
            }}
          >
            {headLines.map((line, li) => (
              <div key={li}>
                <RiseText text={line} start={-6 + li * (vertical ? 2 : 3)} stagger={3} dur={17} wordStyle={sunWord} />
              </div>
            ))}
          </div>
        </div>

        {/* ── price line (rail) + arrows ── */}
        <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
          {f >= SEED_DROP[1] ? (
            <line x1={railFrom.x} y1={railFrom.y} x2={railTo.x} y2={railTo.y} stroke="rgba(243,239,228,0.16)" strokeWidth={Math.max(1, u(1.6))} strokeLinecap="round" />
          ) : null}
          {f >= hopStart(1) ? (
            <line x1={a0.x} y1={a0.y} x2={trailEnd.x} y2={trailEnd.y} stroke="rgba(240,180,41,0.55)" strokeWidth={u(2.4)} strokeLinecap="round" />
          ) : null}
          {[1, 2, 3, 4].map((k) => {
            const p = interpolate(f, [LAND[k] + 2, LAND[k] + 14], [0, 1], {...clamp, easing: E.out});
            if (p <= 0) return null;
            const A = g.cards[k - 1];
            const B = g.cards[k];
            const pad = u(16);
            const s = g.arrowAxis === 'x' ? {x: A.x + A.w + pad, y: A.y + A.h / 2} : {x: A.x + u(62), y: A.y + A.h + pad * 0.7};
            const e = g.arrowAxis === 'x' ? {x: B.x - pad, y: B.y + B.h / 2} : {x: B.x + u(62), y: B.y - pad * 0.7};
            const tip = {x: s.x + (e.x - s.x) * p, y: s.y + (e.y - s.y) * p};
            const hl = u(9);
            const head = interpolate(p, [0.55, 1], [0, 1], clamp);
            const col = 'rgba(243,239,228,0.5)';
            const sw = Math.max(1, u(2.4));
            return (
              <g key={k}>
                <line x1={s.x} y1={s.y} x2={tip.x} y2={tip.y} stroke={col} strokeWidth={sw} strokeLinecap="round" />
                {g.arrowAxis === 'x' ? (
                  <polyline points={`${tip.x - hl},${tip.y - hl} ${tip.x},${tip.y} ${tip.x - hl},${tip.y + hl}`} fill="none" stroke={col} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" opacity={head} />
                ) : (
                  <polyline points={`${tip.x - hl},${tip.y - hl} ${tip.x},${tip.y} ${tip.x + hl},${tip.y - hl}`} fill="none" stroke={col} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" opacity={head} />
                )}
              </g>
            );
          })}
        </svg>

        {/* ── cards (deck → dealt) ── */}
        {order.map(({p, i}) => {
          const w = card.w;
          const h = card.h;
          const shadowA = p.state === 'flight' ? 0.5 - 0.3 * p.z : 0.55;
          const shadowY = u(10 + 64 * p.z);
          const shadowB = u(18 + 52 * p.z + 10 * p.contact);
          const st = STAMP_AT[i];
          const face = (
            <CardFace
              label={CARDS[i].label}
              icon={CARDS[i].icon}
              mid={CARDS[i].mid}
              vertical={vertical}
              w={w}
              h={h}
              u={u}
              index={i}
              stampT={st > 0 ? f - st : undefined}
              stampRot={[0, -7, 5, -8, 0][i]}
              warm={i === 4 ? heat : 0}
            />
          );
          return (
            <div key={i} style={{position: 'absolute', left: p.x, top: p.y, width: 0, height: 0, transform: `rotate(${p.rot}deg) scale(${p.scale})`}}>
              {/* table shadow */}
              <div
                style={{
                  position: 'absolute',
                  left: -w / 2 + u(6),
                  top: -h / 2 + shadowY,
                  width: w - u(12),
                  height: h - u(8),
                  borderRadius: u(26),
                  background: `rgba(0,0,0,${shadowA})`,
                  filter: `blur(${shadowB}px)`,
                  transform: `scaleX(${p.state === 'flight' ? Math.max(0.2, Math.abs(Math.cos((p.flipY * Math.PI) / 180))) : 1})`,
                }}
              />
              <div style={{position: 'absolute', left: -w / 2, top: -h / 2, width: w, height: h, transform: `scale(${p.sx}, ${p.sy})`, transformOrigin: '50% 100%'}}>
                {p.state === 'flight' ? (
                  <div style={{position: 'absolute', inset: 0, perspective: u(1500)}}>
                    <div style={{position: 'absolute', inset: 0, transformStyle: 'preserve-3d', transform: `rotateY(${p.flipY}deg)`}}>
                      <div style={{position: 'absolute', inset: 0, backfaceVisibility: 'hidden'}}>{face}</div>
                      <div style={{position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)'}}>
                        <CardBack w={w} h={h} u={u} vertical={vertical} />
                      </div>
                    </div>
                  </div>
                ) : p.state === 'deck' ? (
                  <CardBack w={w} h={h} u={u} vertical={vertical} />
                ) : (
                  face
                )}
              </div>
            </div>
          );
        })}

        {/* ── price tag hanging from the seed ── */}
        {f >= SEED_DROP[0] ? (
          <div style={{position: 'absolute', left: ring.x, top: ring.y, width: 0, height: 0}}>
            {f >= TAG_RELEASE ? (
              <div style={{position: 'absolute', left: 0, top: 0, width: 0, height: 0, transform: `rotate(${(-th * 180) / Math.PI}deg)`, opacity: tagOpacity}}>
                {/* tag hangs by its apex; scaled about the apex so the string stays visible as it grows */}
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: g.stringLen,
                    width: 0,
                    height: 0,
                    transform: `scale(${sc * TAG_BASE})`,
                    transformOrigin: '0 0',
                    filter: `drop-shadow(0 ${u(7)}px ${u(10)}px rgba(0,0,0,0.45)) drop-shadow(0 0 ${u(18 + 14 * heat)}px rgba(240,${Math.round(150 - 40 * heat)},${Math.round(60 + 40 * heat)},${0.18 + 0.4 * heat}))`,
                  }}
                >
                  <div style={{position: 'absolute', left: 0, top: u(TAG_APEX), width: 0, height: 0}}>
                    <PriceTag u={u} heat={heat} />
                  </div>
                </div>
                {/* string: ring → through the punched hole */}
                <div
                  style={{
                    position: 'absolute',
                    left: -u(1.1),
                    top: 0,
                    width: u(2.2),
                    height: g.stringLen + u(TAG_APEX) * sc * TAG_BASE,
                    background: 'rgba(243,239,228,0.8)',
                    borderRadius: u(2),
                  }}
                />
              </div>
            ) : null}
            <div style={{position: 'absolute', left: 0, top: 0, opacity: seedOpacity}}>
              <Seed u={u} r={vertical ? 9.5 : 9} pulse={pulse} sx={seedSx} sy={seedSy} />
            </div>
          </div>
        ) : null}

        {/* ── verdict ── */}
        <div
          style={{
            position: 'absolute',
            left,
            top: vertical ? u(1590) : u(868),
            fontFamily: F.display,
            fontWeight: 800,
            fontSize: baseResult,
            lineHeight: 1.08,
            letterSpacing: '-0.03em',
            color: C.cream,
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{display: vertical ? 'block' : 'inline'}}>
            <RiseWords start={RESULT_1} words={[{t: 'Фермеру —'}, {t: 'мало.', style: {fontSize: '0.6em', color: C.creamDim}}]} />
          </span>
          <span style={{display: vertical ? 'block' : 'inline', marginLeft: vertical ? 0 : u(44), marginTop: vertical ? u(6) : 0}}>
            <RiseWords start={RESULT_2} words={[{t: 'Вам —'}, {t: 'дорого.', style: {fontSize: '1.4em', color: C.coral}}]} />
          </span>
        </div>
      </AbsoluteFill>
      <Vignette strength={interpolate(f, [196, 220], [0.5, 0.64], {...clamp, easing: E.inOut})} />
    </AbsoluteFill>
  );
};

export default Scene;
