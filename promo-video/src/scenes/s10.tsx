import React from 'react';
import {AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {NightBg, Vignette} from '../components/Atmos';
import {Icon} from '../components/Icons';
import {LogoMark, Wordmark} from '../components/Logo';
import {RiseText} from '../components/Text';
import {C, E, F, SPR, clamp} from '../theme';
import {SunSeed, ValuesStack, beatPulse, useGeo, SCENE9_LEN} from './s09/shared';

const GLINT = 120;

/** S10 End card: the seed becomes the sun, dusk field opens from it, logo + taglines + contacts, calm hold. */
const Scene: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const g = useGeo();
  const {u, vertical, W, H, sun, img} = g;

  /* ── reveal: sun-coloured disc, followed 3 f later by the dusk field ── */
  const maxR = (vertical ? 1180 : 1400) * 1;
  const R = (ff: number) => interpolate(ff, [3, 44], [sun.r * 0.4, maxR], {...clamp, easing: E.smooth});
  const yellowR = f < 3 ? 0 : R(f);
  const duskR = f < 4 ? 0 : R(f - 1);
  const done = f > 50;

  /* ── slow push-in around the sun, glow on beats ── */
  const push = 1 + 0.06 * interpolate(f, [0, 180], [0, 1], {...clamp, easing: E.smooth});
  const glint = interpolate(f, [GLINT, GLINT + 6, GLINT + 40], [0, 1, 0], {...clamp, easing: E.out});
  const glow = 0.42 + 0.22 * beatPulse(f, 5) + 0.35 * glint;
  const seedFade = interpolate(f, [8, 20], [1, 0], {...clamp, easing: E.out});

  /* ── lockup ── */
  const logo = vertical ? u(118) : u(96);
  const wm = vertical ? u(96) : u(80);
  const lockX = vertical ? u(72) : u(150);
  const lockY = vertical ? 200 : u(80);
  const logoSpr = spring({frame: f - 12, fps, config: SPR.pop});
  const logoOp = interpolate(f, [12, 18], [0, 1], clamp);
  const gp = interpolate(f, [GLINT, GLINT + 18], [0, 1], {...clamp, easing: E.inOut});
  const glintOn = f >= GLINT - 1 && f <= GLINT + 20;

  /* ── taglines ── */
  const t1 = vertical ? u(92) : u(120);
  const t2 = vertical ? u(56) : u(60);
  const t1Y = vertical ? 400 : u(250);
  const t1H = t1 * 1.08;
  const t2Y = t1Y + 2 * t1H + (vertical ? u(40) : u(40));

  /* ── contacts ── */
  const items = [
    {icon: 'phone', text: '+998\u00A050\u00A0900\u00A025\u00A041', size: vertical ? u(84) : u(112), at: 74},
    {icon: 'telegram', text: '@agroverseai', size: vertical ? u(54) : u(54), at: 84},
    {icon: 'instagram', text: '@agroverse_uz', size: vertical ? u(54) : u(54), at: 92},
  ];
  const contactsBottom = vertical ? H - 190 : H - u(104);

  return (
    <AbsoluteFill style={{background: C.night}}>
      {/* seam: same frame as the end of s09 (night, words, seed), then swallowed by the reveal */}
      {!done ? (
        <AbsoluteFill>
          <NightBg glowX={(sun.x / W) * 100} glowY={(sun.y / H) * 100} glow="rgba(240,180,41,0.2)" intensity={vertical ? 1.3 : 1.15} />
          <ValuesStack t={SCENE9_LEN + f} />
          <Vignette strength={0.5} />
        </AbsoluteFill>
      ) : null}

      {yellowR > 0 ? (
        <div style={{position: 'absolute', inset: 0, clipPath: `circle(${yellowR}px at ${sun.x}px ${sun.y}px)`, background: C.sun}} />
      ) : null}

      {/* dusk field */}
      {duskR > 0 ? (
        <div style={{position: 'absolute', inset: 0, clipPath: `circle(${duskR}px at ${sun.x}px ${sun.y}px)`}}>
          <div style={{position: 'absolute', inset: 0, transformOrigin: `${sun.x}px ${sun.y}px`, transform: `scale(${push})`}}>
            <Img src={staticFile('brand/hero-dusk.svg')} style={{position: 'absolute', left: img.left, top: img.top, width: img.w, height: img.h}} />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: `radial-gradient(circle at ${sun.x}px ${sun.y}px, rgba(255,214,130,${0.5 * glow}) 0%, rgba(255,190,100,${0.22 * glow}) ${sun.r * 2.4}px, rgba(255,190,100,0) ${sun.r * 6}px)`,
                mixBlendMode: 'screen',
              }}
            />
          </div>
          {/* legibility scrims (static, outside the push) */}
          <div style={{position: 'absolute', inset: 0, background: vertical ? 'linear-gradient(180deg, rgba(11,20,15,0.72) 0%, rgba(11,20,15,0.5) 36%, rgba(11,20,15,0) 52%, rgba(11,20,15,0.55) 70%, rgba(11,20,15,0.9) 100%)' : 'linear-gradient(90deg, rgba(11,20,15,0.62) 0%, rgba(11,20,15,0.38) 45%, rgba(11,20,15,0) 72%)'}} />
          {!vertical ? <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(11,20,15,0.45) 0%, rgba(11,20,15,0) 22%, rgba(11,20,15,0) 66%, rgba(11,20,15,0.88) 100%)'}} /> : null}
        </div>
      ) : null}

      {/* the seed turning into the sun */}
      {f < 22 ? <SunSeed t={SCENE9_LEN + f} fade={seedFade} /> : null}

      {/* lockup */}
      <div style={{position: 'absolute', left: lockX, top: lockY, display: 'flex', alignItems: 'center', gap: u(vertical ? 26 : 24)}}>
        <div style={{position: 'relative', width: logo, height: logo, opacity: logoOp, transform: `scale(${0.7 + 0.3 * logoSpr})`, filter: `drop-shadow(0 ${u(8)}px ${u(24)}px rgba(0,0,0,0.35))`}}>
          <LogoMark size={logo} isStatic />
          {glintOn ? (
            <div style={{position: 'absolute', inset: 0, borderRadius: logo * 0.219, overflow: 'hidden'}}>
              <div style={{position: 'absolute', top: '-20%', bottom: '-20%', width: '34%', left: `${-50 + 170 * gp}%`, transform: 'skewX(-18deg)', background: 'linear-gradient(90deg, rgba(255,240,200,0) 0%, rgba(255,240,200,0.75) 50%, rgba(255,240,200,0) 100%)'}} />
            </div>
          ) : null}
        </div>
        <div style={{overflow: 'hidden', paddingBottom: wm * 0.12, marginBottom: -wm * 0.12}}>
          <div
            style={{
              transform: `translateY(${interpolate(f, [16, 32], [110, 0], {...clamp, easing: E.out})}%)`,
            }}
          >
            <Wordmark
              size={wm}
              color={glintOn ? 'transparent' : C.cream}
              style={
                glintOn
                  ? {
                      backgroundImage: `linear-gradient(100deg, ${C.cream} 0%, ${C.cream} 42%, #FFD97A 50%, ${C.cream} 58%, ${C.cream} 100%)`,
                      backgroundSize: '320% 100%',
                      backgroundPosition: `${100 - 100 * gp}% 0`,
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                    }
                  : undefined
              }
            />
          </div>
        </div>
      </div>

      {/* taglines */}
      <div style={{position: 'absolute', left: lockX, top: t1Y, fontFamily: F.display, fontWeight: 800, letterSpacing: '-0.03em', color: C.cream, textShadow: '0 2px 30px rgba(11,20,15,0.45)'}}>
        <div style={{fontSize: t1, lineHeight: `${t1H}px`}}>
          <RiseText text={'Ваш урожай —'} start={20} stagger={4} dur={18} />
        </div>
        <div style={{fontSize: t1, lineHeight: `${t1H}px`}}>
          <RiseText text={'ваша цена.'} start={28} stagger={4} dur={18} />
        </div>
      </div>
      <div style={{position: 'absolute', left: lockX, top: t2Y, fontFamily: F.display, fontWeight: 800, letterSpacing: '-0.03em', color: C.sun, textShadow: '0 2px 24px rgba(11,20,15,0.55)'}}>
        <div style={{fontSize: t2, lineHeight: `${t2 * 1.25}px`}}>
          <RiseText text={'Свежие продукты —'} start={46} stagger={4} dur={18} />
        </div>
        <div style={{fontSize: t2, lineHeight: `${t2 * 1.25}px`}}>
          <RiseText text={'прямо с поля.'} start={54} stagger={4} dur={18} />
        </div>
      </div>

      {/* contacts */}
      <div
        style={{
          position: 'absolute',
          left: lockX,
          right: lockX,
          bottom: H - contactsBottom,
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: vertical ? `${u(28)}px ${u(60)}px` : `${u(34)}px ${u(72)}px`,
        }}
      >
        {items.map((it, i) => {
          const p = interpolate(f, [it.at, it.at + 18], [0, 1], {...clamp, easing: E.out});
          const isPhone = it.icon === 'phone';
          return (
            <div
              key={i}
              style={{
                width: isPhone ? '100%' : undefined,
                display: 'flex',
                alignItems: 'center',
                gap: it.size * 0.34,
                opacity: p,
                transform: `translateY(${(1 - p) * u(28)}px)`,
                fontFamily: F.body,
                fontWeight: 600,
                fontSize: it.size,
                lineHeight: 1,
                letterSpacing: isPhone ? '0.01em' : undefined,
                color: C.cream,
                whiteSpace: 'nowrap',
                textShadow: '0 2px 20px rgba(11,20,15,0.6)',
              }}
            >
              <Icon name={it.icon} size={it.size * (isPhone ? 0.92 : 0.95)} color={C.sun} />
              <span>{it.text}</span>
            </div>
          );
        })}
      </div>

      <Vignette strength={0.28} />
    </AbsoluteFill>
  );
};
export default Scene;
