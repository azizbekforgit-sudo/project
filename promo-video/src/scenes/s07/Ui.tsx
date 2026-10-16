import React from 'react';
import {Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, E, F, SPR, clamp} from '../../theme';
import {Icon} from '../../components/Icons';
import {LogoMark} from '../../components/Logo';
import {Tap} from '../../components/Device';
import {ANSWER, QUESTION, T} from './plan';

/* Rebuilt dark-theme app UI. Coordinates are in 390×844 app space (children of <Phone/>). */

const OWN = '#237347';
const SUB = '#8FA095';
const FIELD = '#17251D';
const CARD_X = 16;
const CARD_Y = 112;
const CARD_W = 358;
const CARD_H = 690;

/** bubble that pops with a spring from its corner */
const Pop: React.FC<{at: number; side: 'l' | 'r'; children: React.ReactNode; style?: React.CSSProperties}> = ({at, side, children, style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f - at, fps, config: SPR.pop});
  const o = interpolate(f, [at, at + 4], [0, 1], clamp);
  return (
    <div
      style={{
        alignSelf: side === 'r' ? 'flex-end' : 'flex-start',
        opacity: o,
        transform: `translateY(${(1 - s) * 18}px) scale(${0.8 + 0.2 * s})`,
        transformOrigin: side === 'r' ? '100% 100%' : '0% 100%',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

const bubbleBase: React.CSSProperties = {fontFamily: F.body, fontSize: 19.5, lineHeight: 1.3, padding: '13px 17px 14px', maxWidth: 286, borderRadius: 18};

const OwnBubble: React.FC<{children: React.ReactNode}> = ({children}) => (
  <div style={{...bubbleBase, background: OWN, color: '#fff', borderBottomRightRadius: 6, fontWeight: 500}}>{children}</div>
);

const OtherBubble: React.FC<{name?: string; children: React.ReactNode}> = ({name, children}) => (
  <div style={{...bubbleBase, background: C.nightCard, border: `1px solid ${C.nightRule}`, color: C.cream, borderBottomLeftRadius: 6, fontWeight: 500}}>
    {name ? <div style={{fontSize: 14, fontWeight: 700, color: C.mint, marginBottom: 3}}>{name}</div> : null}
    {children}
  </div>
);

const Dots: React.FC<{show: readonly [number, number]}> = ({show}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sIn = spring({frame: f - show[0], fps, config: SPR.pop});
  const out = interpolate(f, [show[1] - 3, show[1]], [1, 0], clamp);
  if (f < show[0] || f >= show[1]) return null;
  return (
    <div
      style={{
        display: 'flex',
        gap: 6,
        padding: '15px 16px',
        borderRadius: 18,
        borderBottomLeftRadius: 6,
        background: C.nightCard,
        border: `1px solid ${C.nightRule}`,
        transform: `scale(${(0.7 + 0.3 * sIn) * (0.9 + 0.1 * out)})`,
        opacity: out,
        transformOrigin: '0% 100%',
      }}
    >
      {[0, 1, 2].map((i) => (
        <div key={i} style={{width: 8, height: 8, borderRadius: '50%', background: C.mint, opacity: 0.55 + 0.45 * Math.max(0, Math.sin(((f - show[0]) / 9 - i * 0.28) * Math.PI * 2)), transform: `translateY(${-3.5 * Math.max(0, Math.sin(((f - show[0]) / 9 - i * 0.28) * Math.PI * 2))}px)`}} />
      ))}
    </div>
  );
};

/** fixed brand bar like the real app */
export const BrandBar: React.FC = () => (
  <div style={{position: 'absolute', left: 0, top: 0, width: 390, height: CARD_Y - 8, background: C.night2}}>
    <div style={{position: 'absolute', left: 18, top: 54, display: 'flex', alignItems: 'center', gap: 10}}>
      <LogoMark size={34} isStatic />
      <span style={{fontFamily: F.brand, fontWeight: 700, fontSize: 24, color: C.mint, letterSpacing: '-0.02em'}}>AgroVerse</span>
    </div>
    <div style={{position: 'absolute', right: 18, top: 54, display: 'flex', gap: 8}}>
      <div style={{height: 34, padding: '0 11px', borderRadius: 12, border: `1px solid ${C.nightRule}`, display: 'flex', alignItems: 'center', gap: 6, color: C.cream, fontFamily: F.body, fontWeight: 700, fontSize: 13}}>
        <Icon name="globe" size={14} color={C.mint} /> RU
      </div>
      <div style={{height: 34, width: 34, borderRadius: 12, border: `1px solid ${C.nightRule}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.cream, fontFamily: F.body, fontWeight: 800, fontSize: 14}}>Aa</div>
    </div>
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 1, background: C.nightRule}} />
  </div>
);

const Card: React.FC<{x?: number; children: React.ReactNode}> = ({x = 0, children}) => (
  <div style={{position: 'absolute', left: CARD_X, top: CARD_Y, width: CARD_W, height: CARD_H, transform: `translateX(${x}px)`}}>
    <div style={{position: 'absolute', inset: 0, borderRadius: 24, background: '#101A14', border: `1px solid ${C.nightRule}`, overflow: 'hidden'}}>{children}</div>
  </div>
);

const InputBar: React.FC<{text?: string; caret?: boolean; hot?: number; pressAt?: number}> = ({text, caret, hot = 0, pressAt}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const press = pressAt === undefined ? 1 : spring({frame: f - pressAt, fps, config: SPR.snap});
  const sScale = pressAt !== undefined && f >= pressAt ? 0.84 + 0.16 * press : 1;
  return (
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 78, borderTop: `1px solid ${C.nightRule}`, display: 'flex', alignItems: 'center', padding: '0 14px', gap: 10}}>
      <div style={{width: 42, height: 42, borderRadius: 13, background: FIELD, border: `1px solid ${C.nightRule}`, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <Icon name="image" size={18} color={C.mint} />
      </div>
      <div style={{flex: 1, height: 46, borderRadius: 23, border: `1.5px solid ${hot > 0 ? 'rgba(121,204,151,0.55)' : C.nightRule}`, display: 'flex', alignItems: 'center', padding: '0 16px', fontFamily: F.body, fontSize: 15.5, fontWeight: 500, color: text ? C.cream : '#6F8076', whiteSpace: 'nowrap', overflow: 'hidden', background: hot > 0 ? 'rgba(121,204,151,0.05)' : undefined}}>
        {text ? text : 'Напишите сообщение…'}
        {caret ? <span style={{display: 'inline-block', width: 1.5, height: 19, marginLeft: 2, background: C.mint, opacity: Math.floor(f / 7) % 2 === 0 ? 1 : 0.15}} /> : null}
      </div>
      <div
        style={{
          width: 46,
          height: 46,
          borderRadius: '50%',
          background: OWN,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `scale(${sScale})`,
          boxShadow: hot > 0 ? `0 0 ${14 * hot}px rgba(121,204,151,${0.45 * hot})` : undefined,
        }}
      >
        <Icon name="paper-plane" size={19} color="#fff" />
      </div>
    </div>
  );
};

/* ───────────── Chat card ───────────── */
const ChatCard: React.FC<{x: number}> = ({x}) => {
  const f = useCurrentFrame();
  const ringT = f - T.call;
  return (
    <Card x={x}>
      {/* header */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 78, borderBottom: `1px solid ${C.nightRule}`}}>
        <div style={{position: 'absolute', left: 14, top: 22, width: 34, height: 34, borderRadius: 11, background: FIELD, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.cream, fontSize: 17}}>←</div>
        <div style={{position: 'absolute', left: 58, top: 17, width: 44, height: 44, borderRadius: '50%', background: '#1E3B2A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.brand, fontWeight: 700, fontSize: 20, color: C.mint}}>А</div>
        <div style={{position: 'absolute', left: 112, top: 18}}>
          <div style={{fontFamily: F.body, fontWeight: 700, fontSize: 16, color: C.cream, whiteSpace: 'nowrap'}}>Алишер Усмонов</div>
          <div style={{fontFamily: F.body, fontWeight: 500, fontSize: 12.5, color: SUB, marginTop: 3, display: 'flex', alignItems: 'center', gap: 6}}>
            <span style={{width: 7, height: 7, borderRadius: '50%', background: C.mint}} /> Фермер · в сети
          </div>
        </div>
        <div style={{position: 'absolute', right: 14, top: 18, width: 42, height: 42}}>
          {[0, 8].map((d) => {
            const p = interpolate(ringT - d, [0, 22], [0, 1], {...clamp, easing: E.out});
            return ringT - d >= 0 && p < 1 ? <div key={d} style={{position: 'absolute', inset: -p * 16, borderRadius: '50%', border: `2px solid rgba(121,204,151,${0.7 * (1 - p)})`}} /> : null;
          })}
          <div style={{position: 'absolute', inset: 0, borderRadius: '50%', background: OWN, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${1 + 0.12 * Math.max(0, 1 - Math.abs(ringT - 3) / 5)})`}}>
            <Icon name="phone" size={18} color="#fff" />
          </div>
        </div>
      </div>
      {/* product strip */}
      <div style={{position: 'absolute', left: 12, right: 12, top: 90, height: 64, borderRadius: 16, background: C.nightCard, border: `1px solid ${C.nightRule}`, display: 'flex', alignItems: 'center', gap: 12, padding: '0 9px'}}>
        <Img src={staticFile('photos/tomato.jpg')} style={{width: 46, height: 46, borderRadius: 11, objectFit: 'cover'}} />
        <div>
          <div style={{fontFamily: F.body, fontWeight: 700, fontSize: 14.5, color: C.cream, whiteSpace: 'nowrap'}}>Помидоры «Бычье сердце»</div>
          <div style={{fontFamily: F.body, fontWeight: 500, fontSize: 12.5, color: SUB, marginTop: 4, display: 'flex', alignItems: 'center', gap: 5}}>
            <Icon name="location-dot" size={12} color={C.mint} /> Самарканд
          </div>
        </div>
      </div>
      {/* messages */}
      <div style={{position: 'absolute', left: 14, right: 14, top: 186, display: 'flex', flexDirection: 'column', gap: 24}}>
        <Pop at={T.b1} side="r">
          <OwnBubble>Здравствуйте! Помидоры ещё есть?</OwnBubble>
        </Pop>
        <div style={{position: 'relative', alignSelf: 'flex-start'}}>
          <Pop at={T.b2} side="l">
            <OtherBubble name="Алишер Усмонов">Да, есть. Соберём утром — будут свежие.</OtherBubble>
          </Pop>
          <div style={{position: 'absolute', left: 0, bottom: 0}}>
            <Dots show={T.dots} />
          </div>
        </div>
        <Pop at={T.b3} side="r">
          <OwnBubble>Отлично, заберу завтра.</OwnBubble>
        </Pop>
      </div>
      <InputBar />
    </Card>
  );
};

/* ───────────── Orb ───────────── */
export const Orb: React.FC<{size: number; flare?: number; rings?: boolean; icon?: number}> = ({size, flare = 0, rings = false, icon}) => {
  const f = useCurrentFrame();
  const pulse = 0.5 + 0.5 * Math.cos((2 * Math.PI * (f % 30)) / 30);
  const g = size * (0.28 + 0.18 * pulse + 0.5 * flare);
  return (
    <div style={{position: 'relative', width: size, height: size}}>
      {rings
        ? [0, 1].map((k) => {
            const p = ((f + k * 15) % 30) / 30;
            return <div key={k} style={{position: 'absolute', inset: -size * 0.9 * p, borderRadius: '50%', border: `1.5px solid rgba(121,204,151,${0.38 * (1 - p)})`}} />;
          })
        : null}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 34% 28%, #D5F5E1 0%, #79CC97 32%, #2B8654 70%, #1A5B38 100%)',
          boxShadow: `0 0 ${g}px rgba(121,204,151,${0.5 + 0.25 * pulse + 0.25 * flare}), inset 0 -${size * 0.1}px ${size * 0.2}px rgba(10,40,24,0.45)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="wand-magic-sparkles" size={icon ?? size * 0.4} color="#0E2417" />
      </div>
    </div>
  );
};

/* ───────────── Assistant card ───────────── */
const AiCard: React.FC<{x: number}> = ({x}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const flare = interpolate(f, [T.orb, T.orb + 6, T.orb + 26], [0, 1, 0.15], {...clamp, easing: E.out});
  const n = Math.round(interpolate(f, [T.typeStart, T.typeEnd], [0, Array.from(QUESTION).length], clamp));
  const typed = f >= T.typeStart && f < T.send + 1 ? Array.from(QUESTION).slice(0, n).join('') : '';
  const chipIn = interpolate(f, [T.chip, T.chip + 12], [0, 1], {...clamp, easing: E.out});
  const chipSel = interpolate(f, [T.typeStart - 3, T.typeStart + 3], [0, 1], clamp);
  const chipOut = interpolate(f, [T.send - 2, T.send + 4], [1, 0], clamp);
  const hot = interpolate(f, [T.typeStart, T.typeEnd], [0, 1], clamp) * (f < T.send + 2 ? 1 : 0);
  const heroIn = spring({frame: f - T.slide[0] + 4, fps, config: SPR.settle});
  const dotsA = f >= T.aiDots[0] && f < T.aiDots[1];
  return (
    <Card x={x}>
      {/* hero */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: heroIn}}>
        <Orb size={78} flare={flare} rings />
        <div style={{fontFamily: F.brand, fontWeight: 700, fontSize: 21, color: C.cream, marginTop: 18, letterSpacing: '-0.01em'}}>ИИ-помощник AgroVerse</div>
        <div style={{marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 999, border: `1px solid ${C.nightRule}`, background: '#0B140F', fontFamily: F.body, fontWeight: 600, fontSize: 13.5, color: C.cream}}>
          <span style={{width: 8, height: 8, borderRadius: '50%', background: C.mint, boxShadow: `0 0 ${6 + 4 * Math.max(0, Math.sin(f / 5))}px ${C.mint}`}} />в сети
        </div>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 176, height: 1, background: C.nightRule}} />
      {/* messages */}
      <div style={{position: 'absolute', left: 14, right: 14, top: 196, display: 'flex', flexDirection: 'column', gap: 24}}>
        {chipOut > 0 ? (
          <div style={{position: 'absolute', left: 0, right: 0, top: 0, display: 'flex', justifyContent: 'center', opacity: chipIn * chipOut, transform: `translateY(${(1 - chipIn) * 14}px) scale(${1 + 0.03 * chipSel})`}}>
            <div style={{padding: '11px 17px', borderRadius: 999, border: `1.5px solid ${chipSel > 0 ? 'rgba(121,204,151,0.7)' : C.nightRule}`, background: chipSel > 0 ? 'rgba(121,204,151,0.12)' : C.nightCard, color: chipSel > 0 ? C.mintPale : C.cream, fontFamily: F.body, fontWeight: 600, fontSize: 15.5, whiteSpace: 'nowrap'}}>{QUESTION}</div>
          </div>
        ) : null}
        <Pop at={T.user} side="r">
          <OwnBubble>{QUESTION}</OwnBubble>
        </Pop>
        <div style={{position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 8}}>
          <div style={{width: 34, paddingTop: 2, opacity: interpolate(f, [T.aiDots[0] - 1, T.aiDots[0] + 3], [0, 1], clamp)}}>
            <Orb size={32} icon={15} flare={0} />
          </div>
          <div style={{position: 'relative', flex: 1}}>
            <div style={{position: 'absolute', left: 0, top: 0, opacity: dotsA ? 1 : 0}}>
              <Dots show={T.aiDots} />
            </div>
            <Pop at={T.lines[0] - 2} side="l" style={{alignSelf: 'stretch', maxWidth: 300}}>
              <div style={{background: C.nightCard, border: `1px solid ${C.nightRule}`, borderRadius: 18, borderBottomLeftRadius: 6, padding: '14px 16px 15px', fontFamily: F.body, fontWeight: 500, fontSize: 18, lineHeight: '26px', color: C.cream, width: 'fit-content'}}>
                {ANSWER.map((l, i) => {
                  const p = interpolate(f, [T.lines[i], T.lines[i] + 9], [0, 1], {...clamp, easing: E.out});
                  return (
                    <div key={i} style={{whiteSpace: 'nowrap', opacity: p, transform: `translateY(${(1 - p) * 7}px)`, filter: p < 1 ? `blur(${(1 - p) * 3}px)` : undefined}}>
                      {l}
                    </div>
                  );
                })}
              </div>
            </Pop>
          </div>
        </div>
      </div>
      <InputBar text={typed} caret={f >= T.typeStart - 2 && f <= T.send} hot={hot} pressAt={T.send} />
    </Card>
  );
};

/** the whole app screen content (app space) */
export const AppUi: React.FC = () => {
  const f = useCurrentFrame();
  const p = interpolate(f, [...T.slide], [0, 1], {...clamp, easing: E.inOut});
  return (
    <div style={{position: 'absolute', inset: 0, background: C.night2, overflow: 'hidden'}}>
      <BrandBar />
      {p < 1 ? <ChatCard x={-p * 390 * 0.9} /> : null}
      {p > 0 ? <AiCard x={(1 - p) * 390} /> : null}
      <Tap x={338} y={CARD_Y + CARD_H - 39} at={T.send} size={46} color="rgba(166,224,186,0.6)" />
    </div>
  );
};
