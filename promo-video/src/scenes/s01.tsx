import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {BEAT, C, E, F, clamp, nbsp} from '../theme';
import {useLayout} from '../layout';
import {NightBg, Vignette} from '../components/Atmos';
import {ScrambleText} from '../components/ScrambleText';
import {CardDeck} from './s01/CardDeck';
import {Marker} from './s01/Marker';
import {Ripple, Seed} from './s01/Seed';
import {Slot} from './s01/Slot';
import {CARD_EMOJI, L1_TEXT, SLOT_WORDS, T} from './s01/timing';

/*
 * S01 · Hook (f0–180, NIGHT). The sun seed drops in and lands (f16); «Фермер вырастил» decodes out of it;
 * the seed glides over a face-down deck; on every beat a card flips onto the pile while the slot word rolls
 * (помидоры → яблоки → пшеницу → дыни → урожай.). Then the sentence steps back and the problem decodes:
 * «Но цену назначает не он.» with a coral marker under «не он.». Exit: whip up with vertical blur.
 */

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const BG_TALL = 1.4; // background box is taller than the frame (parallax during the whip)

type Pt = {x: number; y: number};

const useS01Layout = () => {
  const {W, H, vertical, u} = useLayout();
  if (!vertical) {
    const FS = u(100);
    const lh = FS * 1.05;
    const L = u(144);
    const l1Top = H / 2 - lh;
    const l1W = 11.76 * FS; // measured: «Фермер вырастил» in Unbounded 800, −0.03em
    const cw = u(262);
    const ch = u(346);
    const pile: Pt = {x: L + l1W + u(92) + cw / 2, y: H / 2 + u(4)};
    return {
      W, H, vertical, u, FS, lh, L,
      l1Top,
      cw, ch, pile,
      deck: {dx: u(84), dy: -u(30), rot: 9, scale: 0.95, enterDx: u(440), enterDy: u(36)},
      seedSize: u(22),
      seedLand: {x: L + 5.365 * FS, y: l1Top + 0.607 * FS} as Pt,
      seedRest: {x: pile.x + u(6), y: pile.y - ch / 2 - u(92)} as Pt,
      seedArc: u(80),
      groupOrigin: {x: L, y: l1Top} as Pt,
      groupDy: u(236) - l1Top,
      groupS: 0.86,
      FS2: u(114),
      l2Top: u(590),
      cardArc: u(64),
    };
  }
  const FS = u(116);
  const lh = FS * 1.05;
  const cw = u(320);
  const ch = u(424);
  const y0 = H / 2 - u(480); // seed rest
  const cardTop = y0 + u(84);
  const textTop = cardTop + ch + u(96);
  const pile: Pt = {x: W / 2, y: cardTop + ch / 2};
  return {
    W, H, vertical, u, FS, lh, L: 0,
    l1Top: textTop,
    cw, ch, pile,
    deck: {dx: u(104), dy: -u(32), rot: 9, scale: 0.95, enterDx: u(520), enterDy: u(30)},
    seedSize: u(26),
    seedLand: {x: W / 2, y: (textTop + 0.9 * FS + textTop + lh + 0.314 * FS) / 2} as Pt,
    seedRest: {x: W / 2, y: y0} as Pt,
    seedArc: 0,
    groupOrigin: {x: W / 2, y: y0} as Pt,
    groupDy: u(320) - y0,
    groupS: 0.7,
    FS2: u(118),
    l2Top: u(1080),
    cardArc: u(70),
  };
};

const Scene: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const Lt = useS01Layout();
  const {W, H, vertical, u, FS} = Lt;

  /* ── global: fade-in, camera push, exit whip ── */
  const bgIn = interpolate(f, [0, T.bgIn], [0, 1], {...clamp, easing: E.out});
  const push = interpolate(f, [0, 180], [1, 1.04], {...clamp, easing: E.smooth});
  const exitY = (fr: number) => -u(1100) * interpolate(fr, [T.exit[0], T.exit[1]], [0, 1], {...clamp, easing: E.in});
  const ey = exitY(f);
  const vBlur = Math.min(u(60), Math.abs(ey - exitY(f - 1)) * 0.32);

  /* ── phase B: line 1 + slot + pile step back ── */
  const b = interpolate(f, [T.groupUp[0], T.groupUp[1]], [0, 1], {...clamp, easing: E.inOut});
  const gS = 1 - (1 - Lt.groupS) * b;
  const gDy = Lt.groupDy * b;
  const mapB = (p: Pt): Pt => ({x: Lt.groupOrigin.x + (p.x - Lt.groupOrigin.x) * gS, y: Lt.groupOrigin.y + (p.y - Lt.groupOrigin.y) * gS + gDy});

  /* ── seed ── */
  const beatPhase = f % BEAT;
  const breath = f < T.land ? 0 : beatPhase < 2 ? beatPhase / 2 : Math.exp(-(beatPhase - 2) / 5);
  const flash = interpolate(f, [T.land, T.land + 1, T.land + 16], [0, 1, 0], clamp);
  const lockFlash = interpolate(f, [T.swaps[4], T.swaps[4] + 2, T.swaps[4] + 20], [0, 1, 0], clamp);
  const seedPos = (fr: number): Pt => {
    if (fr <= T.land) {
      const t = interpolate(fr, [T.dropFrom, T.land], [0, 1], {...clamp, easing: E.in});
      return {x: Lt.seedLand.x, y: lerp(u(70), Lt.seedLand.y, t)};
    }
    const e = interpolate(fr, [T.seedGo, T.seedArrive], [0, 1], {...clamp, easing: E.inOut});
    return {x: lerp(Lt.seedLand.x, Lt.seedRest.x, e), y: lerp(Lt.seedLand.y, Lt.seedRest.y, e) - Lt.seedArc * Math.sin(Math.PI * e)};
  };
  const sp0 = seedPos(f);
  const vy = f <= T.land ? sp0.y - seedPos(f - 1).y : 0;
  let sx = 1;
  let sy = 1;
  if (f < T.land) {
    sy = 1 + Math.min(0.9, vy / u(70));
    sx = 1 / Math.sqrt(sy);
  } else {
    const k = 1 - spring({frame: f - T.land, fps, config: {damping: 11, stiffness: 260, mass: 0.6}});
    sx = 1 + 0.6 * k;
    sy = 1 - 0.42 * k;
  }
  const seedP = mapB(sp0);
  const seedAppear = interpolate(f, [T.dropFrom, T.dropFrom + 4], [0, 1], {...clamp, easing: E.out});
  const seedDim = interpolate(f, [T.groupUp[0], T.groupUp[1]], [1, 0.8], clamp) * interpolate(f, [T.underline[0], T.underline[0] + 10], [1, 0.7], clamp);
  const seedGlow = (1 + 0.28 * breath + 1.1 * flash + 0.5 * lockFlash) * (0.85 + 0.15 * seedDim);

  /* ── type ── */
  const TYPE: React.CSSProperties = {
    fontFamily: F.display,
    fontWeight: 800,
    fontSize: FS,
    letterSpacing: '-0.03em',
    lineHeight: 1.05,
    color: C.cream,
  };
  const slotGlow = interpolate(f, [T.swaps[4], T.swaps[4] + 3, T.swaps[4] + 24], [0, 1, 0.25], clamp);
  const slot = (
    <Slot
      id="s01-slot"
      words={SLOT_WORDS}
      swaps={T.swaps}
      dur={T.slotDur}
      lead={T.slotLead}
      blur={u(7)}
      align={vertical ? 'center' : 'right'}
      style={{color: C.sun}}
      wordStyle={(i) => (i === SLOT_WORDS.length - 1 ? {textShadow: `0 0 ${u(36)}px rgba(240,180,41,${0.55 * slotGlow})`} : undefined)}
    />
  );
  const l1 = (text: string, offsetStagger: number, stagger: number, seed: string) => (
    <ScrambleText text={text} start={T.l1Start + offsetStagger} stagger={stagger} scramble={T.l1Scramble} order="center" seed={seed} glyphColor={C.sun} flashColor={C.sun} />
  );
  const l2 = (text: string, charOffset: number, seed: string, glyph: string) => (
    <ScrambleText text={nbsp(text)} start={T.l2Start + charOffset * T.l2Stagger} stagger={T.l2Stagger} scramble={T.l2Scramble} order="ltr" seed={seed} glyphColor={glyph} />
  );
  const TYPE2: React.CSSProperties = {...TYPE, fontSize: Lt.FS2};
  const thump = interpolate(f, [T.underline[0] - 1, T.underline[0] + 1, T.underline[0] + 10], [0, 1, 0], {...clamp, easing: E.out});
  const neOn = (
    <span style={{position: 'relative', display: 'inline-block', color: C.coral, transform: `scale(${1 + 0.035 * thump})`, transformOrigin: '30% 80%'}}>
      {l2('не он.', 18, 's01-l2c', C.coral)}
      <Marker f={f} from={T.underline[0]} to={T.underline[1]} color={C.coral} id="s01-marker" style={{left: '-4%', width: '108%', top: '0.84em', height: '0.42em'}} />
    </span>
  );

  return (
    <AbsoluteFill style={{background: '#000'}}>
      {/* background: night + seed-following glow (parallax on exit) */}
      <div style={{position: 'absolute', left: 0, top: 0, width: W, height: H * BG_TALL, opacity: bgIn, transform: `translateY(${ey * 0.35}px)`}}>
        <NightBg
          glowX={(seedP.x / W) * 100}
          glowY={(seedP.y / (H * BG_TALL)) * 100}
          glow={`rgba(240,180,41,${(0.13 + 0.05 * breath + 0.08 * flash) * seedDim})`}
          intensity={(0.9 + 0.08 * breath) / BG_TALL}
        />
      </div>

      <svg width={0} height={0} style={{position: 'absolute'}}>
        <defs>
          <filter id="s01-vblur" x="-5%" y="-40%" width="110%" height="180%">
            <feGaussianBlur stdDeviation={`0 ${vBlur.toFixed(2)}`} />
          </filter>
        </defs>
      </svg>

      {/* camera: slow push + whip exit */}
      <AbsoluteFill
        style={{
          transform: `translateY(${ey}px) scale(${push})`,
          transformOrigin: `${W / 2}px ${H / 2}px`,
          filter: vBlur > 0.4 ? 'url(#s01-vblur)' : undefined,
        }}
      >
        {/* group A: line 1 + slot + deck (steps back in phase B) */}
        <AbsoluteFill
          style={{
            transform: `translateY(${gDy}px) scale(${gS})`,
            transformOrigin: `${Lt.groupOrigin.x}px ${Lt.groupOrigin.y}px`,
            opacity: 1 - 0.65 * b,
            filter: b > 0.01 ? `blur(${(u(2.2) * b).toFixed(2)}px)` : undefined,
          }}
        >
          <CardDeck
            cx={Lt.pile.x}
            cy={Lt.pile.y}
            w={Lt.cw}
            h={Lt.ch}
            deckDx={Lt.deck.dx}
            deckDy={Lt.deck.dy}
            deckRot={Lt.deck.rot}
            deckScale={Lt.deck.scale}
            enterDx={Lt.deck.enterDx}
            enterDy={Lt.deck.enterDy}
            emojis={CARD_EMOJI}
            lands={T.swaps}
            flight={T.flight}
            deckIn={T.deckIn}
            square={T.square}
            arc={Lt.cardArc}
          />
          {vertical ? (
            <div style={{position: 'absolute', left: 0, right: 0, top: Lt.l1Top, textAlign: 'center', ...TYPE}}>
              <div style={{whiteSpace: 'nowrap'}}>{l1('Фермер', 0, T.l1StaggerV, 's01-l1a')}</div>
              <div style={{whiteSpace: 'nowrap'}}>{l1('вырастил', 0, T.l1StaggerV, 's01-l1b')}</div>
              <div style={{marginTop: '0.1em'}}>{slot}</div>
            </div>
          ) : (
            <div style={{position: 'absolute', left: Lt.L, top: Lt.l1Top, ...TYPE}}>
              <div style={{display: 'inline-block'}}>
                <div style={{whiteSpace: 'nowrap'}}>{l1(L1_TEXT, 0, T.l1Stagger, 's01-l1')}</div>
                <div style={{textAlign: 'right', marginTop: '0.1em'}}>{slot}</div>
              </div>
            </div>
          )}
        </AbsoluteFill>

        {/* the seed (its own dimming, follows the group) */}
        {f >= T.dropFrom ? (
          <>
            <Ripple x={Lt.seedLand.x} y={Lt.seedLand.y} f={f} at={T.land} maxW={u(vertical ? 560 : 640)} dur={22} ratio={0.16} stroke={Math.max(1.5, u(2))} />
            <Seed x={seedP.x} y={seedP.y} size={Lt.seedSize * gS} sx={sx} sy={sy} glow={seedGlow} opacity={seedDim * seedAppear} streak={f < T.land ? vy * 1.6 : 0} />
          </>
        ) : null}

        {/* line 2: the problem */}
        {f >= T.l2Start - 1 ? (
          vertical ? (
            <div style={{position: 'absolute', left: 0, right: 0, top: Lt.l2Top, textAlign: 'center', ...TYPE2}}>
              <div style={{whiteSpace: 'nowrap'}}>{l2('Но цену', 0, 's01-l2a', C.sun)}</div>
              <div style={{whiteSpace: 'nowrap'}}>{l2('назначает', 8, 's01-l2b', C.sun)}</div>
              <div style={{whiteSpace: 'nowrap'}}>{neOn}</div>
            </div>
          ) : (
            <div style={{position: 'absolute', left: Lt.L, top: Lt.l2Top, ...TYPE2}}>
              <div style={{whiteSpace: 'nowrap'}}>{l2('Но цену назначает', 0, 's01-l2a', C.sun)}</div>
              <div style={{whiteSpace: 'nowrap'}}>{neOn}</div>
            </div>
          )
        ) : null}
      </AbsoluteFill>

      <AbsoluteFill style={{opacity: bgIn}}>
        <Vignette strength={0.5} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default Scene;
