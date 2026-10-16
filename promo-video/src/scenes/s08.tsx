import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {C, E, F, clamp} from '../theme';
import {useLayout} from '../layout';
import {LightBg, NightBg} from '../components/Atmos';
import {Phone, Screen, Tap, SHOT_CSS_W, SHOT_CSS_H} from '../components/Device';
import {ScrambleText} from '../components/ScrambleText';
import {RiseText} from '../components/Text';

/* ───────── timing (relative frames) ───────── */
const LANG = {uz: 15, en: 30, ru: 45}; // screens + word change
const MARKET_IN = 60; // welcome → market (card flick)
const THEME_AT = 75; // circular reveal starts
const THEME_DUR = 24;
const XL_AT = 135; // zoom-swap to big text
const TEXT_OUT_1 = 60;
const TEXT_IN_2 = 68;
const TEXT_OUT_2 = 111;
const TEXT_IN_3 = 118;

/* moon / AA / language buttons in 390×844 app space (measured from the screenshots) */
const MOON = {x: 356, y: 36};
const AA = {x: 301, y: 37};
const LANG_BTN = {x: 159, y: 33};

const phoneHeight = (w: number) => {
  const b = w * 0.035;
  return ((w - 2 * b) * SHOT_CSS_H) / SHOT_CSS_W + 2 * b;
};

/* ───────── screens ───────── */
const flickDur = 14;

/** Deck of screens: the outgoing card is flicked away (alternating sides), the next one rises from beneath. */
const Deck: React.FC<{items: {src: string; at: number}[]}> = ({items}) => {
  const f = useCurrentFrame();
  let idx = 0;
  items.forEach((it, i) => {
    if (f >= it.at) idx = i;
  });
  const cur = items[idx];
  const t = idx === 0 ? 1 : clamp01((f - cur.at) / flickDur);
  const prev = idx > 0 && t < 1 ? items[idx - 1] : null;
  const dir = idx % 2 === 1 ? -1 : 1;
  const eIn = E.out(t);
  const p = E.inOut(t);
  return (
    <>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `translateY(${(1 - eIn) * 22}px) scale(${0.93 + 0.07 * eIn})`,
          transformOrigin: '50% 60%',
        }}
      >
        <Screen src={cur.src} />
      </div>
      {prev ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transform: `translateX(${dir * p * 480}px) rotate(${dir * p * 14}deg)`,
            transformOrigin: '50% 90%',
            boxShadow: '0 24px 60px rgba(0,0,0,0.28)',
          }}
        >
          <Screen src={prev.src} />
        </div>
      ) : null}
    </>
  );
};
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** zoom-swap between two screenshots: old pushes toward the camera, new settles in over it */
const ZoomSwap: React.FC<{a: string; b: string; at: number}> = ({a, b, at}) => {
  const f = useCurrentFrame();
  const zoom = interpolate(f, [at, at + 16], [0, 1], {...clamp, easing: E.in});
  const inn = interpolate(f, [at + 1, at + 15], [0, 1], {...clamp, easing: E.out});
  return (
    <>
      {f < at + 16 ? (
        <div style={{position: 'absolute', inset: 0, transform: `scale(${1 + 0.16 * zoom})`, transformOrigin: '70% 10%'}}>
          <Screen src={a} />
        </div>
      ) : null}
      {f >= at ? (
        <div style={{position: 'absolute', inset: 0, opacity: inn, transform: `scale(${0.9 + 0.1 * inn})`, transformOrigin: '70% 10%'}}>
          <Screen src={b} />
        </div>
      ) : (
        <></>
      )}
    </>
  );
};

/* ───────── text ───────── */
const Lines: React.FC<{lines: string[]; start: number; out: number; size: number; color: string; accent?: string; accentWord?: string}> = ({
  lines,
  start,
  out,
  size,
  color,
  accent,
  accentWord,
}) => (
  <div style={{fontFamily: F.display, fontWeight: 800, fontSize: size, lineHeight: 1.08, letterSpacing: '-0.03em', color}}>
    {lines.map((l, i) => (
      <div key={i} style={{whiteSpace: 'nowrap'}}>
        <RiseText
          text={l}
          start={start + i * 5}
          out={out + i * 2}
          stagger={3}
          wordStyle={(w) => (accent && accentWord && w === accentWord ? {color: accent} : undefined)}
        />
      </div>
    ))}
  </div>
);

const WORDS = {
  ru: 'Русский',
  uz: 'O‘zbekcha',
  en: 'English',
};

const LangWord: React.FC<{size: number; color: string; dark: boolean}> = ({size, color, dark}) => {
  const f = useCurrentFrame();
  const style: React.CSSProperties = {fontFamily: F.display, fontWeight: 800, fontSize: size, lineHeight: 1.1, letterSpacing: '-0.03em', color, whiteSpace: 'nowrap'};
  const uzStyle: React.CSSProperties = {...style};
  const glyph = dark ? C.sun : '#C48A0A';
  const out = interpolate(f, [TEXT_OUT_1, TEXT_OUT_1 + 9], [0, -110], {...clamp, easing: E.in});
  return (
    <div style={{overflow: 'hidden', paddingBottom: size * 0.12, paddingTop: size * 0.04}}>
      <div style={{transform: `translateY(${out}%)`, display: 'grid'}}>
        <div style={{gridArea: '1 / 1', visibility: f < LANG.uz ? 'visible' : 'hidden', ...style}}>{WORDS.ru}</div>
        <div style={{gridArea: '1 / 1', visibility: f >= LANG.uz && f < LANG.en ? 'visible' : 'hidden'}}>
          <ScrambleText text={WORDS.uz} start={LANG.uz} stagger={0.6} scramble={8} seed="uz" glyphColor={glyph} style={uzStyle} />
        </div>
        <div style={{gridArea: '1 / 1', visibility: f >= LANG.en && f < LANG.ru ? 'visible' : 'hidden'}}>
          <ScrambleText text={WORDS.en} start={LANG.en} stagger={0.6} scramble={8} seed="en" glyphColor={glyph} style={style} />
        </div>
        <div style={{gridArea: '1 / 1', visibility: f >= LANG.ru ? 'visible' : 'hidden'}}>
          <ScrambleText text={WORDS.ru} start={LANG.ru} stagger={0.8} scramble={8} seed="ru" glyphColor={glyph} style={style} />
        </div>
      </div>
    </div>
  );
};

const Eyebrow: React.FC<{text: string; color: string; size: number}> = ({text, color, size}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: size * 0.4, fontFamily: F.body, fontWeight: 600, fontSize: size, color, marginBottom: size * 0.5}}>
    <span style={{width: size * 0.38, height: size * 0.38, borderRadius: '50%', background: C.sun, boxShadow: `0 0 ${size * 0.8}px rgba(240,180,41,0.7)`}} />
    <RiseText text={text} start={-30} out={TEXT_OUT_1} stagger={4} />
  </div>
);

/* ───────── progress ticks (three beats) ───────── */
const Ticks: React.FC<{dark: boolean; u: (n: number) => number}> = ({dark, u}) => {
  const f = useCurrentFrame();
  return (
    <div style={{display: 'flex', gap: u(10)}}>
      {[0, 1, 2].map((i) => {
        const p = interpolate(f, [i * 60 + 3, i * 60 + 57], [0, 1], {...clamp, easing: E.smooth});
        return (
          <div key={i} style={{width: u(64), height: u(6), borderRadius: u(6), background: dark ? C.nightRule : C.rule, overflow: 'hidden'}}>
            <div style={{width: `${p * 100}%`, height: '100%', background: C.sun, borderRadius: u(6)}} />
          </div>
        );
      })}
    </div>
  );
};

/* ───────── one full themed stage (bg + text + phone) ───────── */
const Stage: React.FC<{dark: boolean}> = ({dark}) => {
  const f = useCurrentFrame();
  const {W, H, vertical, u} = useLayout();

  const phoneW = vertical ? 500 : 430;
  const phoneH = phoneHeight(phoneW);
  const cx = vertical ? W / 2 : 1380;
  const cy = vertical ? 690 + phoneH / 2 : H / 2;

  const textX = vertical ? 108 : 140;
  const textCy = vertical ? 440 : 540;
  const ticksY = vertical ? 172 : 318;

  // entrance (velocity-carrying rise) and exit whip
  const enter = interpolate(f, [0, 18], [1, 0], {...clamp, easing: E.out});
  const exitY = interpolate(f, [168, 180], [0, -220], {...clamp, easing: E.in});
  const blur = interpolate(f, [170, 180], [0, 16], {...clamp, easing: E.in});
  const contentStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    transform: `translateY(${enter * 70 + exitY}px)`,
    filter: blur > 0.2 ? `blur(${blur}px)` : undefined,
  };

  const ink = dark ? C.cream : C.ink;
  const accent = dark ? C.mint : C.field;
  const tapColor = dark ? 'rgba(243,239,228,0.45)' : 'rgba(20,61,36,0.35)';

  const wordSize = vertical ? 124 : 136;
  const h2 = vertical ? 92 : 92;
  const h3 = vertical ? 84 : 76;
  const eyebrowSize = vertical ? 38 : 38;

  const grow = interpolate(f, [TEXT_IN_3 + 8, 180], [1, 1.15], {...clamp, easing: E.inOut});

  const showBeat1 = f < TEXT_OUT_1 + 12;
  const showBeat2 = f >= TEXT_IN_2 - 2 && f < TEXT_OUT_2 + 16;
  const showBeat3 = f >= TEXT_IN_3 - 2;

  const items = [
    {src: 'screens/m-light-welcome.png', at: 0},
    {src: 'screens/m-light-welcome-uz.png', at: LANG.uz},
    {src: 'screens/m-light-welcome-en.png', at: LANG.en},
    {src: 'screens/m-light-welcome.png', at: LANG.ru},
    {src: 'screens/m-light-market.png', at: MARKET_IN},
  ];

  return (
    <AbsoluteFill>
      {dark ? (
        <NightBg glowX={(cx / W) * 100} glowY={(cy / H) * 100} glow="rgba(240,180,41,0.14)" />
      ) : (
        <LightBg glowX={(cx / W) * 100} glowY={(cy / H) * 100} />
      )}
      <div style={contentStyle}>
        {/* progress ticks */}
        <div style={{position: 'absolute', left: textX, top: ticksY}}>
          <Ticks dark={dark} u={u} />
        </div>

        {/* text column: three beats stacked in one anchor */}
        <div style={{position: 'absolute', left: textX, top: textCy, transform: 'translateY(-50%)', display: 'grid', alignItems: 'center'}}>
          {showBeat1 ? (
            <div style={{gridArea: '1 / 1'}}>
              <Eyebrow text="Три языка" color={accent} size={u(eyebrowSize)} />
              <LangWord size={u(wordSize)} color={ink} dark={dark} />
            </div>
          ) : null}
          {showBeat2 ? (
            <div style={{gridArea: '1 / 1'}}>
              <Lines lines={['Светлая и', 'тёмная тема']} start={TEXT_IN_2} out={TEXT_OUT_2} size={u(h2)} color={ink} />
            </div>
          ) : null}
          {showBeat3 ? (
            <div style={{gridArea: '1 / 1', transform: `scale(${grow})`, transformOrigin: '0% 50%'}}>
              <Lines
                lines={vertical ? ['Крупный', 'текст —', 'удобно всем'] : ['Крупный текст —', 'удобно всем']}
                start={TEXT_IN_3}
                out={999}
                size={u(h3)}
                color={ink}
                accent={C.sun}
                accentWord={'удобно всем'}
              />
            </div>
          ) : null}
        </div>

        {/* phone — same place for all three beats */}
        <div style={{position: 'absolute', left: cx - phoneW / 2, top: cy - phoneH / 2}}>
          <Phone width={u(phoneW)} dark={dark}>
            {dark ? <ZoomSwap a="screens/m-dark-market.png" b="screens/m-dark-market-textxl.png" at={XL_AT} /> : <Deck items={items} />}
            <Tap x={LANG_BTN.x} y={LANG_BTN.y} at={11} size={40} color={tapColor} />
            <Tap x={MOON.x} y={MOON.y} at={70} size={40} color={tapColor} />
            <Tap x={AA.x} y={AA.y} at={129} size={40} color={tapColor} />
          </Phone>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Scene: React.FC = () => {
  const f = useCurrentFrame();
  const {W, H, vertical, u} = useLayout();

  // reveal origin = the moon button, in root pixels
  const phoneW = u(vertical ? 500 : 430);
  const phoneH = phoneHeight(phoneW);
  const cx = vertical ? W / 2 : u(1380);
  const cy = vertical ? u(690) + phoneH / 2 : H / 2;
  const bez = phoneW * 0.035;
  const sc = (phoneW - 2 * bez) / SHOT_CSS_W;
  const ox = cx - phoneW / 2 + bez + MOON.x * sc;
  const oy = cy - phoneH / 2 + bez + MOON.y * sc;
  const maxR = Math.max(Math.hypot(ox, oy), Math.hypot(W - ox, oy), Math.hypot(ox, H - oy), Math.hypot(W - ox, H - oy)) + 4;

  const p = interpolate(f, [THEME_AT, THEME_AT + THEME_DUR], [0, 1], {...clamp, easing: E.inOut});
  const R = p * maxR;
  const done = p >= 1;
  const push = interpolate(f, [0, 180], [1, 1.035], clamp);

  const ringO = p > 0 && p < 0.97 ? (1 - p) * 0.9 : 0;

  return (
    <AbsoluteFill style={{transform: `scale(${push})`}}>
      {!done ? <Stage dark={false} /> : null}
      {p > 0 ? (
        <AbsoluteFill style={{clipPath: done ? undefined : `circle(${R}px at ${ox}px ${oy}px)`}}>
          <Stage dark />
        </AbsoluteFill>
      ) : null}
      {ringO > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: ox - R,
            top: oy - R,
            width: 2 * R,
            height: 2 * R,
            borderRadius: '50%',
            border: `${u(3)}px solid ${C.sun}`,
            opacity: ringO,
            boxShadow: `0 0 ${u(24)}px rgba(240,180,41,0.55)`,
            boxSizing: 'border-box',
            pointerEvents: 'none',
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
export default Scene;
