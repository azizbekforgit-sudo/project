import React from 'react';
import {Img, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, E, clamp} from '../../theme';

/**
 * Tactile emoji card deal: a face-down deck (behind, right) and a face-up pile (front).
 * On every `lands[k]` the next card lifts off the deck, flips over in 3D on an arc and slaps onto the
 * pile with its own seeded rotation; the cards underneath get nudged and shaded. After the last card
 * the pile squares up (the «lock»). All positions are in the parent's px.
 */
type Props = {
  cx: number; // pile centre
  cy: number;
  w: number; // card size
  h: number;
  deckDx: number; // deck centre relative to the pile
  deckDy: number;
  deckRot: number;
  deckScale: number;
  emojis: string[];
  lands: number[]; // frame each card lands on the pile (= slot swap frames)
  flight: number; // frames in the air
  deckIn: number; // frame the deck starts sliding in
  enterDx: number; // deck slides in from this offset
  enterDy: number;
  square: number; // pile squares up
  arc: number; // px the card rises during its flight
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const rad = (d: number) => (d * Math.PI) / 180;

export const CardDeck: React.FC<Props> = (p) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {w, h, emojis, lands, flight} = p;
  const n = emojis.length;
  const R = w * 0.085;

  const cards = emojis.map((emoji, k) => {
    const rnd = (s: string) => random(`s01-card-${k}-${s}`);
    // resting poses
    const last = k === n - 1;
    const sign = k % 2 === 0 ? -1 : 1;
    const pileRot = last ? 1.5 : sign * (4.5 + 6 * rnd('rot'));
    const pileX = p.cx + (last ? 0 : (rnd('px') - 0.5) * w * 0.16);
    const pileY = p.cy + (last ? 0 : (rnd('py') - 0.5) * w * 0.1);
    const deckX = p.cx + p.deckDx + k * w * 0.009;
    const deckY = p.cy + p.deckDy + k * w * 0.012;
    const dRot = p.deckRot + (rnd('drot') - 0.5) * 3;
    const flipDir = rnd('dir') > 0.45 ? 1 : -1;
    const tiltDir = rnd('tilt') > 0.5 ? 1 : -1;

    // deck entrance (bottom card first)
    const inStart = p.deckIn + (n - 1 - k) * 1.5;
    const sIn = spring({frame: f - inStart, fps, config: {damping: 16, stiffness: 170, mass: 0.8}});
    const inO = interpolate(f, [inStart, inStart + 4], [0, 1], clamp);

    // flight
    const t1 = lands[k];
    const t0 = t1 - flight;
    // planar travel decelerates; height rises (out) then FALLS (in) so the card slaps onto the pile
    const travel = interpolate(f, [t0, t1 - 1], [0, 1], {...clamp, easing: E.inOut});
    const tm = t0 + flight * 0.42;
    const lift = f < tm ? interpolate(f, [t0, tm], [0, 1], {...clamp, easing: E.out}) : interpolate(f, [tm, t1], [1, 0], {...clamp, easing: E.in});
    const flip = interpolate(f, [t0 + 1, t1 - 1], [0, 1], {...clamp, easing: E.smooth});
    const slide = interpolate(f, [t1, t1 + 7], [0, 1], {...clamp, easing: E.out});
    const rotS = spring({frame: f - t0, fps, config: {damping: 14, stiffness: 160, mass: 0.7}});
    const impact = f < t1 ? 0 : interpolate(f, [t1, t1 + 1, t1 + 8], [0, 1, 0], {...clamp, easing: E.out});

    // nudges from cards landing on top
    let nx = 0;
    let ny = 0;
    let depth = 0;
    for (let j = k + 1; j < n; j++) {
      const q = interpolate(f, [lands[j] - 1, lands[j] + 5], [0, 1], {...clamp, easing: E.out});
      const fall = 1 / (j - k);
      nx += -q * w * 0.022 * fall;
      ny += q * w * 0.014 * fall;
      depth += interpolate(f, [lands[j] - 4, lands[j]], [0, 1], clamp);
    }

    // square-up after the last card
    const sq = spring({frame: f - p.square - (n - 1 - k) * 1.2, fps, config: {damping: 200, stiffness: 120, mass: 1}});

    let x: number;
    let y: number;
    let rz: number;
    let ry: number;
    let rx = 0;
    let s: number;
    const flying = f >= t0 && f < t1;
    const landed = f >= t1;
    if (!landed && f < t0) {
      // in the deck
      x = deckX + (1 - sIn) * p.enterDx;
      y = deckY + (1 - sIn) * p.enterDy;
      rz = dRot + (1 - sIn) * 14;
      ry = flipDir * 180;
      s = p.deckScale;
    } else {
      x = lerp(deckX, pileX, travel) + nx - slide * w * 0.03;
      y = lerp(deckY, pileY, travel) - lift * p.arc + ny + slide * w * 0.012;
      rz = lerp(dRot, pileRot, rotS);
      ry = flipDir * 180 * (1 - flip);
      rx = tiltDir * 16 * lift;
      s = lerp(p.deckScale, 1, travel) * (1 + 0.1 * lift) * (1 - 0.025 * impact);
      if (landed) {
        rz = lerp(rz, pileRot * 0.4, sq);
        x = lerp(x, p.cx - (n - 1 - k) * w * 0.02, sq);
        y = lerp(y, p.cy + (n - 1 - k) * w * 0.028, sq);
      }
    }
    const o = f < t0 ? inO : 1;
    const z = flying ? 100 : landed ? 40 + k : 20 - k;
    const cosY = Math.abs(Math.cos(rad(ry)));
    const shade = Math.min(0.5, depth * 0.13);
    const sheen = Math.sin(rad(ry)); // −1…1: drives a specular band sweeping across the card
    const rim = last ? interpolate(f, [t1, t1 + 4, t1 + 26], [0, 1, 0.35], clamp) : 0;
    return {k, emoji, x, y, rz, ry, rx, s, o, z, lift: flying ? lift : 0, cosY, shade, sheen, rim, ryDeg: ry};
  });

  return (
    <>
      {cards.map((c) => {
        const sh = c.lift;
        const sOx = w * 0.03 + sh * w * 0.12;
        const sOy = w * 0.06 + sh * w * 0.2;
        const sBlur = w * 0.05 + sh * w * 0.12;
        return (
          <React.Fragment key={c.k}>
            {/* cast shadow (2D, on the night behind) */}
            <div
              style={{
                position: 'absolute',
                left: c.x - w / 2 + sOx,
                top: c.y - h / 2 + sOy,
                width: w,
                height: h,
                borderRadius: R,
                background: 'rgba(1,6,3,1)',
                opacity: c.o * (0.55 - 0.2 * sh),
                filter: `blur(${sBlur}px)`,
                transform: `rotate(${c.rz}deg) scale(${c.s * Math.max(0.06, c.cosY)}, ${c.s})`,
                zIndex: c.z * 2 - 1,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: c.x - w / 2,
                top: c.y - h / 2,
                width: w,
                height: h,
                perspective: w * 4.2,
                opacity: c.o,
                zIndex: c.z * 2,
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: w,
                  height: h,
                  transformStyle: 'preserve-3d',
                  transform: `rotateZ(${c.rz}deg) rotateX(${c.rx}deg) rotateY(${c.ry}deg) scale(${c.s})`,
                }}
              >
                <CardFace w={w} h={h} R={R} emoji={c.emoji} shade={c.shade + (1 - c.cosY) * 0.35} sheen={c.sheen} rim={c.rim} />
                <CardBack w={w} h={h} R={R} shade={(1 - c.cosY) * 0.35} sheen={c.sheen} />
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </>
  );
};

const faceBase: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  overflow: 'hidden',
  backfaceVisibility: 'hidden',
  WebkitBackfaceVisibility: 'hidden',
};

const Pip: React.FC<{size: number; style: React.CSSProperties}> = ({size, style}) => (
  <div
    style={{
      position: 'absolute',
      width: size,
      height: size,
      borderRadius: '50%',
      background: C.sun,
      boxShadow: `0 0 ${size * 1.2}px rgba(240,180,41,0.55)`,
      ...style,
    }}
  />
);

const CardFace: React.FC<{w: number; h: number; R: number; emoji: string; shade: number; sheen: number; rim: number}> = ({w, h, R, emoji, shade, sheen, rim}) => {
  const b = Math.max(1, w * 0.006);
  const es = w * 0.6;
  return (
    <div
      style={{
        ...faceBase,
        borderRadius: R,
        background: 'radial-gradient(120% 90% at 28% 6%, #2A4535 0%, #1A2B21 50%, #121E17 100%)',
        boxShadow: `inset 0 0 0 ${b}px rgba(243,239,228,${0.1 + rim * 0.25}), inset 0 ${b * 1.5}px 0 rgba(255,255,255,0.07), 0 0 0 ${b * 1.5}px rgba(240,180,41,${rim * 0.8}), 0 0 ${w * 0.18}px rgba(240,180,41,${rim * 0.45})`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: w / 2 - w * 0.5,
          top: h * 0.47 - w * 0.5,
          width: w,
          height: w,
          background: 'radial-gradient(circle, rgba(240,180,41,0.16) 0%, rgba(240,180,41,0.05) 40%, rgba(240,180,41,0) 66%)',
        }}
      />
      {/* contact shadow under the emoji */}
      <div
        style={{
          position: 'absolute',
          left: w / 2 - es * 0.36,
          top: h * 0.47 + es * 0.4,
          width: es * 0.72,
          height: es * 0.12,
          borderRadius: '50%',
          background: 'rgba(0,0,0,0.45)',
          filter: `blur(${w * 0.025}px)`,
        }}
      />
      <Img src={staticFile(`emoji/${emoji}.svg`)} style={{position: 'absolute', left: w / 2 - es / 2, top: h * 0.47 - es / 2, width: es, height: es, display: 'block'}} />
      <Pip size={w * 0.04} style={{left: w * 0.085, top: w * 0.085}} />
      <Pip size={w * 0.04} style={{right: w * 0.085, bottom: w * 0.085}} />
      <div style={{position: 'absolute', inset: 0, background: '#000', opacity: shade}} />
      <Sheen v={sheen} />
    </div>
  );
};

/** Specular band that sweeps across the card as it turns (v = sin(rotateY)). Invisible when flat. */
const Sheen: React.FC<{v: number; k?: number}> = ({v, k = 1}) => {
  const a = Math.abs(v);
  if (a < 0.02) return null;
  const c = 50 - v * 75;
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: `linear-gradient(110deg, rgba(255,240,200,0) ${c - 14}%, rgba(255,240,200,${0.16 * a * k}) ${c}%, rgba(255,240,200,0) ${c + 14}%)`,
      }}
    />
  );
};

const CardBack: React.FC<{w: number; h: number; R: number; shade: number; sheen: number}> = ({w, h, R, shade, sheen}) => {
  const b = Math.max(1, w * 0.006);
  const vw = 100;
  const vh = (100 * h) / w;
  const cy = vh / 2;
  return (
    <div
      style={{
        ...faceBase,
        borderRadius: R,
        transform: 'rotateY(180deg)',
        background: 'radial-gradient(90% 70% at 50% 50%, #17271D 0%, #0E1812 70%)',
        boxShadow: `inset 0 0 0 ${b}px rgba(243,239,228,0.08), inset 0 ${b * 1.5}px 0 rgba(255,255,255,0.05)`,
      }}
    >
      <svg viewBox={`0 0 ${vw} ${vh}`} width={w} height={h} style={{position: 'absolute', inset: 0}}>
        <rect x={7} y={7} width={vw - 14} height={vh - 14} rx={5.5} fill="none" stroke={C.sun} strokeOpacity={0.4} strokeWidth={0.55} />
        {[9, 15, 21, 27, 33].map((r, i) => (
          <circle key={r} cx={50} cy={cy} r={r} fill="none" stroke={C.sun} strokeOpacity={0.3 - i * 0.05} strokeWidth={0.5} />
        ))}
        <circle cx={50} cy={cy} r={7} fill={C.sun} opacity={0.14} />
        <circle cx={50} cy={cy} r={3.4} fill={C.sun} />
      </svg>
      <div style={{position: 'absolute', inset: 0, background: '#000', opacity: shade}} />
      <Sheen v={-sheen} k={0.8} />
    </div>
  );
};
