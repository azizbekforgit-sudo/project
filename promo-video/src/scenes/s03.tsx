import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {C, E, F, clamp} from '../theme';
import {useLayout} from '../layout';
import {LightBg, NightBg, Vignette} from '../components/Atmos';
import {RiseText} from '../components/Text';
import {ScrambleText} from '../components/ScrambleText';
import {LogoMark, Wordmark} from '../components/Logo';
import {CardFace} from './s02/Cards';
import {PriceTag} from './s02/PriceTag';
import {CARDS, CAMERA_END, Pt, TAG_APEX, TAG_BASE, chainGeometry} from './s02/geometry';
import {T, LEAF_AT, lockupGeom, seedOnLogo} from './s03/timeline';
import {chainAt, handoff, heatAt, ringAt, tagScaleAt, tagSwing} from './s03/chain';
import {MorphPill, SeedDot, WordsOut, exitFade} from './s03/parts';

type U = (n: number) => number;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ci = (f: number, inp: readonly number[], out: number[], easing?: (t: number) => number) =>
  interpolate(f, inp as number[], out, easing ? {...clamp, easing} : clamp);

/* ── chain camera: S02 ends at CAMERA_END (about the frame centre) with zero velocity. From there it
   pushes in about a second pivot (above the chain in 16:9, on the left margin in 9:16) so the two
   remaining cards grow into the empty space, then keeps creeping into the drop. ── */
type Cam = {s: number; dx: number; dy: number};
const camAt = (f: number, vertical: boolean, W: number, H: number, u: U): Cam => {
  const s = CAMERA_END + (vertical ? 0.045 : 0.11) * ci(f, [4, 42], [0, 1], E.inOut) + (vertical ? 0.02 : 0.03) * ci(f, [42, 60], [0, 1], E.in);
  const pivot = vertical ? {x: u(72), y: u(1030)} : {x: W / 2, y: u(60)};
  return {s, dx: (pivot.x - W / 2) * (CAMERA_END - s), dy: (pivot.y - H / 2) * (CAMERA_END - s)};
};
const toScreen = (p: Pt, c: Cam, W: number, H: number): Pt => ({x: W / 2 + (p.x - W / 2) * c.s + c.dx, y: H / 2 + (p.y - H / 2) * c.s + c.dy});

/* ── middleman card flight (riffle out) ── */
const flyPose = (k: number, fr: number, g: ReturnType<typeof chainGeometry>, vertical: boolean, W: number, u: U) => {
  const c = g.centers[k];
  const card = g.cards[k];
  const t0 = T.exit[k - 1];
  const pre = ci(fr, [t0 - 2, t0], [0, 1], E.out);
  const lift = ci(fr, [t0, t0 + 8], [0, 1], E.out);
  const p = ci(fr, [t0, t0 + T.exitDur], [0, 1], E.in);
  if (!vertical) {
    const DX = [-u(260), u(30), u(280)][k - 1];
    const ROT = [-12, 8, 12][k - 1];
    return {
      x: c.x + DX * p,
      y: c.y + u(7) * pre * (1 - lift) - u(18) * lift - p * (c.y + card.h + u(320)),
      rot: ROT * lift + ROT * 0.6 * p,
      scale: 1 + 0.07 * lift + 0.1 * p,
      lift,
    };
  }
  const dir = [-1, 1, -1][k - 1];
  const dist = dir < 0 ? c.x + card.w / 2 + u(260) : W - c.x + card.w / 2 + u(260);
  return {
    x: c.x + dir * dist * p,
    y: c.y + u(6) * pre * (1 - lift) - u(16) * lift - u(300) * p,
    rot: dir * (12 * lift + 6 * p),
    scale: 1 + 0.06 * lift + 0.06 * p,
    lift,
  };
};

const Scene: React.FC = () => {
  const f = useCurrentFrame();
  const {W, H, vertical, u} = useLayout();
  const g = chainGeometry(W, H, vertical, u);
  const card = g.cards[0];
  const lk = lockupGeom(W, H, vertical, u);
  const O = seedOnLogo(lk);

  /* ── S02 hand-off + chain state ── */
  const h0 = handoff(W, H, vertical, u);
  const st = chainAt(f, g, vertical, W, u);
  const cam = camAt(f, vertical, W, H, u);
  const ring = ringAt(f, g, vertical, W, u);
  const sc = tagScaleAt(f, h0.sc);
  const heat = heatAt(f);
  const sw = tagSwing(f, g, vertical, W, H, u);

  /* tag detaches when the seed lifts off; it drops and fades */
  const detached = f >= T.rise[0];
  const tDet = f - T.rise[0];
  const ringDet = ringAt(T.rise[0], g, vertical, W, u);
  const tagPos = detached ? {x: ringDet.x, y: ringDet.y + 0.5 * u(1.5) * tDet * tDet} : ring;
  const th = detached ? sw.th + sw.w * tDet * 0.6 : sw.th;
  const tagOpacity = detached ? ci(tDet, [0, 9], [1, 0], E.in) : 1;

  /* ── seed (screen space) ── */
  const seedStart = toScreen(ringDet, camAt(T.rise[0], vertical, W, H, u), W, H);
  const r0 = u(vertical ? 9.5 : 9);
  let seed: Pt;
  if (f < T.rise[0]) seed = toScreen(ring, cam, W, H);
  else {
    const e = ci(f, T.rise, [0, 1], E.inOut);
    // 9:16: a real rise (up the rail, then curving in over the farmer); 16:9: a level glide to centre
    const P1 = {x: seedStart.x + (O.x - seedStart.x) * 0.15, y: O.y + (seedStart.y - O.y) * 0.12 - (vertical ? u(60) : 0)};
    seed = {
      x: (1 - e) * (1 - e) * seedStart.x + 2 * (1 - e) * e * P1.x + e * e * O.x,
      y: (1 - e) * (1 - e) * seedStart.y + 2 * (1 - e) * e * P1.y + e * e * O.y,
    };
  }
  const swell = ci(f, [T.arrive, T.drop], [0, 1], E.in);
  const rSwell = r0 * cam.s * (1 + 2.3 * swell);
  const rAfter = lerp(r0 * cam.s * 3.3, r0 * 1.35, ci(f, [T.drop, T.drop + 7], [0, 1], E.out));
  const rLeaf = ci(f, [LEAF_AT, LEAF_AT + 7], [1, 0], E.in);
  const seedR = (f < T.drop ? rSwell : rAfter) * rLeaf;
  let pulse = 0;
  for (const b of [15, 30, T.arrive]) if (f >= b) pulse = Math.max(pulse, Math.exp(-(f - b) / 4));
  const seedGlow = Math.max(pulse, 1.5 * swell);

  /* ── flood ── */
  const corners = [
    [0, 0],
    [W, 0],
    [0, H],
    [W, H],
  ].map(([x, y]) => Math.hypot(x - O.x, y - O.y));
  const Rend = Math.max(...corners) * 1.04 + u(60);
  // half expo-out (the hit lands on the drop frame) + half inOut (the edge still takes several frames to clear the far corners)
  const flood = (fr: number, rng: readonly number[]) => 0.5 * ci(fr, rng, [0, 1], E.out) + 0.5 * ci(fr, rng, [0, 1], E.inOut);
  const rSun = lerp(r0 * 3.3, Rend, flood(f, T.sunFlood));
  const rCream = lerp(0, Rend, flood(f, T.creamFlood));
  const showNight = f < T.sunFlood[1];
  const showSun = f >= T.drop && f < T.creamFlood[1];
  const showDay = f >= T.creamFlood[0];

  return (
    <AbsoluteFill style={{background: C.night}}>
      {showNight ? (
        <NightLayer
          f={f}
          W={W}
          H={H}
          vertical={vertical}
          u={u}
          g={g}
          st={st}
          cam={cam}
          ring={ring}
          sc={sc}
          heat={heat}
          th={th}
          tagPos={tagPos}
          tagOpacity={tagOpacity}
          seed={seed}
          swell={swell}
          card={card}
        />
      ) : null}

      {showSun ? (
        <div
          style={{
            position: 'absolute',
            left: O.x - rSun,
            top: O.y - rSun,
            width: rSun * 2,
            height: rSun * 2,
            borderRadius: '50%',
            background: `radial-gradient(circle, #FFF1C2 0%, #FAD266 ${Math.max(4, 22 - (f - T.drop))}%, ${C.sun} 62%, #EEA21C 100%)`,
            boxShadow: `0 0 ${u(110)}px ${u(24)}px rgba(240,180,41,0.55)`,
          }}
        />
      ) : null}

      {showDay ? <DayLayer f={f} W={W} H={H} vertical={vertical} u={u} lk={lk} O={O} rCream={rCream} /> : null}

      <SeedDot x={seed.x} y={seed.y} r={seedR} glow={seedGlow} core={swell} />
    </AbsoluteFill>
  );
};

/* ───────────────────────── NIGHT: the chain collapses ───────────────────────── */
const NightLayer: React.FC<{
  f: number;
  W: number;
  H: number;
  vertical: boolean;
  u: U;
  g: ReturnType<typeof chainGeometry>;
  st: ReturnType<typeof chainAt>;
  cam: Cam;
  ring: Pt;
  sc: number;
  heat: number;
  th: number;
  tagPos: Pt;
  tagOpacity: number;
  seed: Pt;
  swell: number;
  card: {w: number; h: number};
}> = ({f, W, H, vertical, u, g, st, cam, ring, sc, heat, th, tagPos, tagOpacity, seed, swell, card}) => {
  const w = card.w;
  const h = card.h;
  const left = vertical ? u(72) : u(140);

  /* S02 background glow follows the tag (S02 used stage coords; blend to true screen coords) */
  const tagStage = {x: ring.x, y: ring.y + g.stringLen + sc * TAG_BASE * u(48)};
  const tagScr = toScreen(tagStage, cam, W, H);
  const gb = ci(f, [0, 10], [0, 1], E.inOut);
  const tagCx = lerp(tagStage.x, tagScr.x, gb);
  const tagCy = lerp(tagStage.y, tagScr.y, gb);
  const glowCol = `rgba(${240},${Math.round(180 - 70 * heat)},${Math.round(41 + 62 * heat)},${0.1 + (0.05 * Math.min(sc, 2.1)) / 2.1 + 0.06 * heat})`;

  /* trail: the old (dim) price trail retracts with the rewind; the new one is bright */
  const bright = ci(f, [T.travel[0] - 2, T.travel[0] + 4], [0, 1], E.out);
  const trailEnd = vertical ? {x: st.a0.x, y: Math.max(st.a0.y, Math.min(ring.y, st.a4.y))} : {x: Math.max(st.a0.x, Math.min(ring.x, st.a4.x)), y: st.a0.y};
  const arrive = ci(f, [T.arrive - 1, T.arrive + 2, T.drop], [0, 1, 0.75], E.out);
  const arrowsO = 1 - ci(f, T.arrowsOut, [0, 1], E.in);

  /* card glows: farmer when the seed departs, «Вы» when it arrives */
  const g0 = ci(f, [T.travel[0] - 2, T.travel[0] + 2, T.arrive], [0, 1, 0.3], E.out);
  const g4 = arrive;

  const dim = 0.42 * ci(f, [T.rise[0], T.drop], [0, 1], E.in);
  const seedGlowA = ci(f, [T.arrive - 2, T.drop], [0, 1], E.in);

  /* old headline + verdict (text stage stays at S02's camera scale) */
  const headSize = vertical ? u(82) : u(78);
  const headLines = vertical ? ['Каждый', 'перекупщик', 'забирает', 'свою долю.'] : ['Каждый перекупщик', 'забирает свою долю.'];
  const sunWord = (wd: string) => (wd === 'свою' || wd === 'долю.' ? {color: C.sun} : undefined);
  const baseResult = vertical ? u(66) : u(64);

  const blurIds = [1, 2, 3].map((k) => `s03-mb-${k}`);
  const flights = [1, 2, 3].map((k) => {
    const p = flyPose(k, f, g, vertical, W, u);
    const q = flyPose(k, f - 1, g, vertical, W, u);
    return {k, p, bx: Math.min(u(36), Math.abs(p.x - q.x) * 0.22), by: Math.min(u(46), Math.abs(p.y - q.y) * 0.22)};
  });

  const cardEl = (k: number, warm: number, glow: number) => (
    <div style={{position: 'absolute', left: -w / 2, top: -h / 2, width: w, height: h}}>
      <CardFace
        label={CARDS[k].label}
        icon={CARDS[k].icon}
        mid={CARDS[k].mid}
        vertical={vertical}
        w={w}
        h={h}
        u={u}
        index={k}
        stampT={CARDS[k].mid ? 200 : undefined}
        stampRot={[0, -7, 5, -8, 0][k]}
        warm={warm}
      />
      {glow > 0.01 ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: u(26),
            boxShadow: `0 0 ${u(44) * glow}px rgba(240,180,41,${0.4 * glow}), inset 0 0 0 ${Math.max(1.5, u(2.2))}px rgba(240,180,41,${0.85 * glow})`,
            background: `radial-gradient(ellipse at 50% 0%, rgba(240,180,41,${0.16 * glow}) 0%, rgba(240,180,41,0) 70%)`,
          }}
        />
      ) : null}
    </div>
  );
  const shadow = (lift: number) => (
    <div
      style={{
        position: 'absolute',
        left: -w / 2 + u(6),
        top: -h / 2 + u(10 + 46 * lift),
        width: w - u(12),
        height: h - u(8),
        borderRadius: u(26),
        background: `rgba(0,0,0,${0.55 - 0.25 * lift})`,
        filter: `blur(${u(18 + 34 * lift)}px)`,
      }}
    />
  );

  return (
    <AbsoluteFill>
      <NightBg glowX={(tagCx / W) * 100} glowY={(tagCy / H) * 100} glow={glowCol} intensity={0.75 + 0.18 * Math.max(0, sc - 1)} />
      <svg width={0} height={0} style={{position: 'absolute'}}>
        <defs>
          {flights.map(({k, bx, by}) => (
            <filter key={k} id={blurIds[k - 1]} x="-40%" y="-60%" width="180%" height="220%">
              <feGaussianBlur stdDeviation={`${bx.toFixed(2)} ${by.toFixed(2)}`} />
            </filter>
          ))}
          <filter id="s03-lineglow" x="-20%" y="-200%" width="140%" height="500%">
            <feGaussianBlur stdDeviation={u(5)} />
          </filter>
        </defs>
      </svg>

      {/* ── chain stage ── */}
      <AbsoluteFill style={{transform: `translate(${cam.dx}px, ${cam.dy}px) scale(${cam.s})`, transformOrigin: '50% 50%'}}>
        <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
          <line x1={st.rail[0].x} y1={st.rail[0].y} x2={st.rail[1].x} y2={st.rail[1].y} stroke="rgba(243,239,228,0.16)" strokeWidth={Math.max(1, u(1.6))} strokeLinecap="round" />
          {/* glow under the bright line */}
          {bright > 0 ? (
            <line
              x1={st.a0.x}
              y1={st.a0.y}
              x2={trailEnd.x}
              y2={trailEnd.y}
              stroke={C.sun}
              strokeWidth={u(7)}
              strokeLinecap="round"
              opacity={bright * (0.45 + 0.35 * arrive)}
              filter="url(#s03-lineglow)"
            />
          ) : null}
          <line
            x1={st.a0.x}
            y1={st.a0.y}
            x2={trailEnd.x}
            y2={trailEnd.y}
            stroke={bright > 0 ? C.sun : 'rgba(240,180,41,0.55)'}
            strokeOpacity={bright > 0 ? 0.55 + 0.45 * bright : 1}
            strokeWidth={u(2.4 + 1.2 * bright)}
            strokeLinecap="round"
          />
          {arrowsO > 0
            ? [1, 2, 3, 4].map((k) => {
                const A = g.cards[k - 1];
                const B = g.cards[k];
                const pad = u(16);
                const s = g.arrowAxis === 'x' ? {x: A.x + A.w + pad, y: A.y + A.h / 2} : {x: A.x + u(62), y: A.y + A.h + pad * 0.7};
                const e = g.arrowAxis === 'x' ? {x: B.x - pad, y: B.y + B.h / 2} : {x: B.x + u(62), y: B.y - pad * 0.7};
                const hl = u(9);
                const col = 'rgba(243,239,228,0.5)';
                const swd = Math.max(1, u(2.4));
                return (
                  <g key={k} opacity={arrowsO}>
                    <line x1={s.x} y1={s.y} x2={e.x} y2={e.y} stroke={col} strokeWidth={swd} strokeLinecap="round" />
                    {g.arrowAxis === 'x' ? (
                      <polyline points={`${e.x - hl},${e.y - hl} ${e.x},${e.y} ${e.x - hl},${e.y + hl}`} fill="none" stroke={col} strokeWidth={swd} strokeLinecap="round" strokeLinejoin="round" />
                    ) : (
                      <polyline points={`${e.x - hl},${e.y - hl} ${e.x},${e.y} ${e.x + hl},${e.y - hl}`} fill="none" stroke={col} strokeWidth={swd} strokeLinecap="round" strokeLinejoin="round" />
                    )}
                  </g>
                );
              })
            : null}
        </svg>

        {/* Фермер + Вы */}
        {[
          {k: 0, r: st.c0, warm: 0, glow: g0},
          {k: 4, r: st.c4, warm: heat, glow: g4},
        ].map(({k, r, warm, glow}) => (
          <div key={k} style={{position: 'absolute', left: r.x + r.w / 2, top: r.y + r.h / 2, width: 0, height: 0}}>
            {shadow(0)}
            {cardEl(k, warm, glow)}
          </div>
        ))}

        {/* price tag hanging from the seed (seed itself is drawn in screen space) */}
        {tagOpacity > 0 ? (
          <div style={{position: 'absolute', left: tagPos.x, top: tagPos.y, width: 0, height: 0}}>
            <div style={{position: 'absolute', left: 0, top: 0, width: 0, height: 0, transform: `rotate(${(-th * 180) / Math.PI}deg)`, opacity: tagOpacity}}>
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
          </div>
        ) : null}

        {/* middlemen riffle out (on top) */}
        {flights.map(({k, p}) =>
          p.y + h * p.scale < -u(40) || p.x + w < -u(200) || p.x - w > W + u(200) ? null : (
            <div key={k} style={{position: 'absolute', left: 0, top: 0, width: W, height: H, filter: `url(#${blurIds[k - 1]})`}}>
              <div style={{position: 'absolute', left: p.x, top: p.y, width: 0, height: 0, transform: `rotate(${p.rot}deg) scale(${p.scale})`}}>
                {shadow(p.lift)}
                {cardEl(k, 0, 0)}
              </div>
            </div>
          ),
        )}
      </AbsoluteFill>

      {/* ── text stage (stays at S02's final camera) ── */}
      <AbsoluteFill style={{transform: `scale(${CAMERA_END})`, transformOrigin: '50% 50%'}}>
        <div style={{position: 'absolute', left, top: vertical ? u(168) : u(88)}}>
          <MorphPill at={T.pill} dur={T.pillDur} u={u} dimFrom={0.48} />
          <div
            style={{
              position: 'relative',
              marginTop: vertical ? u(26) : u(20),
              fontFamily: F.display,
              fontWeight: 800,
              fontSize: headSize,
              lineHeight: 1.05,
              letterSpacing: '-0.03em',
              color: C.cream,
            }}
          >
            <div style={{opacity: 0.48}}>
              {headLines.map((line, li) => (
                <div key={li} style={{opacity: exitFade(f, T.headOut + li * 1.5, line.split(' ').length, 8)}}>
                  <RiseText text={line} start={-400} stagger={3} dur={17} out={T.headOut + li * 1.5} outDur={8} wordStyle={sunWord} />
                </div>
              ))}
            </div>
            <div style={{position: 'absolute', left: 0, top: vertical ? u(4) : u(2), fontSize: vertical ? u(118) : u(136), whiteSpace: 'nowrap', lineHeight: 1}}>
              <RiseText text="Напрямую." start={T.word} dur={18} />
            </div>
          </div>
        </div>

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
            <WordsOut out={T.verdictOut} words={[{t: 'Фермеру —'}, {t: 'мало.', style: {fontSize: '0.6em', color: C.creamDim}}]} />
          </span>
          <span style={{display: vertical ? 'block' : 'inline', marginLeft: vertical ? 0 : u(44), marginTop: vertical ? u(6) : 0}}>
            <WordsOut out={T.verdictOut + 3} words={[{t: 'Вам —'}, {t: 'дорого.', style: {fontSize: '1.4em', color: C.coral}}]} />
          </span>
        </div>
      </AbsoluteFill>

      {/* pre-drop: the world dims, light gathers around the seed */}
      {dim > 0 ? <AbsoluteFill style={{background: `rgba(11,20,15,${dim})`}} /> : null}
      {seedGlowA > 0 ? (
        <AbsoluteFill
          style={{
            background: `radial-gradient(circle at ${seed.x}px ${seed.y}px, rgba(240,180,41,${0.42 * seedGlowA}) 0%, rgba(240,180,41,${0.12 * seedGlowA}) ${u(220 + 260 * swell)}px, rgba(240,180,41,0) ${u(420 + 420 * swell)}px)`,
          }}
        />
      ) : null}
      <Vignette strength={0.64 + 0.1 * ci(f, [20, 60], [0, 1], E.inOut)} />
    </AbsoluteFill>
  );
};

/* ───────────────────────── DAY: brand reveal ───────────────────────── */
const DayLayer: React.FC<{f: number; W: number; H: number; vertical: boolean; u: U; lk: ReturnType<typeof lockupGeom>; O: Pt; rCream: number}> = ({f, W, H, vertical, u, lk, O, rCream}) => {
  const clip = f < T.creamFlood[1] ? `circle(${rCream}px at ${O.x}px ${O.y}px)` : undefined;
  /* lockup unit: anchor = icon top-left in screen px, k = unit scale; the wordmark is placed in the
     icon's local (unscaled) space so the pair always moves together */
  const sm = lk.small;
  const kEnd = sm.S / lk.S;
  const p = ci(f, T.drift, [0, 1], E.inOut);
  const px = ci(f, T.relayX, [0, 1], E.inOut);
  const py = ci(f, T.relayY, [0, 1], E.inOut);
  const lift = lerp(lk.logoTopA - lk.logoTop, 0, ci(f, T.lift, [0, 1], E.inOut));
  const k = lerp(1, kEnd, p);
  const logoX = lerp(lk.logoCx - lk.S / 2, sm.x, p);
  const logoY = lerp(lk.logoTop + lift, sm.y, p);
  const logoScale = k;
  const stacked = {x: lk.S / 2, y: lk.wmTop - lk.logoTop};
  const inline = {x: (sm.S + sm.gap) / kEnd, y: ((sm.S - sm.wm) / 2 + sm.wm * 0.02) / kEnd};
  const wmScale = k * lerp(1, sm.wm / (lk.wmSize * kEnd), py);
  const wmX = logoX + k * lerp(stacked.x, inline.x, px);
  const wmY = logoY + k * lerp(stacked.y, inline.y, py);

  const bloom = ci(f, [T.creamFlood[0], T.logo + 14, 130, T.drift[1]], [0.7, 0.42, 0.2, 0.08]);
  const bloomPos = {x: logoX + (k * lk.S) / 2, y: logoY + (k * lk.S * 240) / 512};

  const eyebrowIn = ci(f, [T.eyebrow, T.eyebrow + 16], [0, 1], E.out);
  const eyebrowOut = ci(f, [T.textOut - 2, T.textOut + 6], [0, 1], E.in);

  return (
    <AbsoluteFill style={{clipPath: clip}}>
      <LightBg glowX={(bloomPos.x / W) * 100} glowY={(bloomPos.y / H) * 100} />
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at ${bloomPos.x}px ${bloomPos.y}px, rgba(253,226,150,${bloom}) 0%, rgba(240,180,41,${bloom * 0.35}) ${u(260)}px, rgba(240,180,41,0) ${u(vertical ? 760 : 820)}px)`,
        }}
      />

      {/* icon */}
      <div style={{position: 'absolute', left: logoX, top: logoY, width: lk.S, height: lk.S, transform: `scale(${logoScale})`, transformOrigin: '0 0'}}>
        <div style={{position: 'absolute', inset: 0, filter: `drop-shadow(0 ${u(14)}px ${u(26)}px rgba(20,61,36,0.22))`}}>
          <LogoMark size={lk.S} start={T.logo} />
        </div>
      </div>

      {/* wordmark */}
      <div
        style={{
          position: 'absolute',
          left: wmX,
          top: wmY,
          whiteSpace: 'nowrap',
          transform: `scale(${wmScale}) translateX(${-50 * (1 - px)}%)`,
          transformOrigin: '0 0',
        }}
      >
        <Wordmark size={lk.wmSize} color={C.fieldDeep} style={{display: 'block'}}>
          <ScrambleText text="AgroVerse" start={T.wordmark} stagger={T.wmStagger} scramble={T.wmScramble} tick={2} seed="s03wm" glyphColor="#D99A0F" flashColor={C.sunLight} />
        </Wordmark>
      </div>

      {/* eyebrow */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          width: W,
          top: lk.eyebrowTop + lift,
          textAlign: 'center',
          fontFamily: F.mono,
          fontWeight: 500,
          fontSize: lk.eyebrowSize,
          letterSpacing: '0.02em',
          color: C.ink3,
          opacity: eyebrowIn * (1 - eyebrowOut),
          transform: `translateY(${(1 - eyebrowIn) * u(14) - eyebrowOut * u(12)}px)`,
          whiteSpace: 'nowrap',
        }}
      >
        Рынок фермеров Узбекистана
      </div>

      {/* hero line */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          width: W,
          top: lk.heroTop + lift,
          textAlign: 'center',
          fontFamily: F.display,
          fontWeight: 800,
          fontSize: lk.heroSize,
          lineHeight: 1.1,
          letterSpacing: '-0.03em',
          color: C.ink,
        }}
      >
        {lk.heroLines.map(([line, tone], li) => (
          <div key={li} style={{opacity: exitFade(f, T.textOut + li * 1.5, line.split(' ').length, 7)}}>
            <RiseText text={line} start={T.hero[li]} stagger={3} dur={16} out={T.textOut + li * 1.5} outDur={7} wordStyle={() => (tone ? {color: C.field} : undefined)} />
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};


export default Scene;
