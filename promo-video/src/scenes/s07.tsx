import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, E, F, SPR, clamp} from '../theme';
import {useLayout} from '../layout';
import {NightBg, Vignette} from '../components/Atmos';
import {Phone, SHOT_CSS_H, SHOT_CSS_W} from '../components/Device';
import {RiseText} from '../components/Text';
import {Icon} from '../components/Icons';
import {AppUi} from './s07/Ui';
import {T} from './s07/plan';

/* S07 · Talk + assistant · abs 1230–1380 (rel 0–150). Dark theme UI. */

const KEY = (c: string) => (w: string) => (w.startsWith(c) ? {color: C.mint} : undefined);

const Caption: React.FC<{
  icon: string;
  label: string;
  lines: string[];
  mint: string[];
  start: number;
  out?: number;
  size: number;
  u: (n: number) => number;
}> = ({icon, label, lines, mint, start, out, size, u}) => {
  const f = useCurrentFrame();
  const chipIn = interpolate(f, [start, start + 12], [0, 1], {...clamp, easing: E.out});
  const chipOut = out === undefined ? 1 : 1 - interpolate(f, [out, out + 8], [0, 1], {...clamp, easing: E.in});
  if (out !== undefined && f > out + 14) return null;
  return (
    <div style={{position: 'absolute', left: 0, top: 0, whiteSpace: 'nowrap'}}>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: u(12),
          fontFamily: F.mono,
          fontSize: u(25),
          fontWeight: 500,
          color: C.mint,
          padding: `${u(8)}px ${u(20)}px`,
          borderRadius: 999,
          border: `${Math.max(1, u(1.5))}px solid rgba(121,204,151,0.35)`,
          opacity: chipIn * chipOut,
          transform: `translateY(${(1 - chipIn) * u(14)}px)`,
        }}
      >
        <Icon name={icon} size={u(22)} color={C.mint} />
        {label}
      </div>
      <div style={{marginTop: u(30), fontFamily: F.display, fontWeight: 800, fontSize: size, lineHeight: 1.08, letterSpacing: '-0.03em', color: C.cream}}>
        {lines.map((l, i) => (
          <div key={i}>
            <RiseText text={l} start={start + 2 + i * 3} dur={18} out={out === undefined ? undefined : out + i * 1.5} outDur={8} wordStyle={(w) => (mint.includes(w) ? {color: C.mint} : undefined)} />
          </div>
        ))}
      </div>
    </div>
  );
};

const Scene: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {W, H, vertical, u} = useLayout();

  /* layout */
  const PW = vertical ? u(550) : u(460);
  const bezel = PW * 0.035;
  const screenW = PW - bezel * 2;
  const screenH = (screenW * SHOT_CSS_H) / SHOT_CSS_W;
  const PH = screenH + bezel * 2;
  const pcx = vertical ? W / 2 : u(1380);
  const PX = pcx - PW / 2;
  const PY = vertical ? u(610) : (H - PH) / 2;
  const textLeft = vertical ? u(72) : u(150);
  const textTop = vertical ? u(170) : u(330);
  const capSize = vertical ? u(78) : u(76);

  /* phone: enters already moving, slow push + gentle yaw */
  const pin = spring({frame: f + 9, fps, config: SPR.heavy});
  const px = (1 - pin) * (vertical ? u(0) : u(260));
  const py = (1 - pin) * (vertical ? u(200) : u(30));
  const sc = (0.95 + 0.05 * pin) * (1 + 0.035 * interpolate(f, [0, 150], [0, 1], clamp));
  const rotY = (vertical ? -5 : -7) + 1.4 * Math.sin((2 * Math.PI * f) / 150 + 0.4) + 1.2 * interpolate(f, [T.slide[0], T.slide[1] + 10], [0, 1], {...clamp, easing: E.inOut});
  const floatY = u(4) * Math.sin((2 * Math.PI * f) / 120);

  /* glows */
  const ai = interpolate(f, [T.slide[0], T.slide[1] + 10], [0, 1], {...clamp, easing: E.out});
  const flare = interpolate(f, [T.orb, T.orb + 6, T.orb + 30], [0, 1, 0.2], {...clamp, easing: E.out});
  const pulse = 0.5 + 0.5 * Math.cos((2 * Math.PI * (f % 30)) / 30);
  const glowR = u(780);

  return (
    <AbsoluteFill style={{background: C.night, overflow: 'hidden'}}>
      <NightBg glowX={(pcx / W) * 100} glowY={vertical ? 62 : 50} glow="rgba(121,204,151,0.13)" intensity={1.25} />
      {/* assistant glow behind the phone */}
      <div
        style={{
          position: 'absolute',
          left: pcx - glowR,
          top: PY + PH / 2 - glowR,
          width: glowR * 2,
          height: glowR * 2,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(121,204,151,0.30) 0%, rgba(121,204,151,0) 60%)',
          opacity: ai * (0.55 + 0.2 * pulse + 0.4 * flare),
          transform: `scale(${0.8 + 0.2 * ai})`,
        }}
      />
      <div style={{position: 'absolute', left: pcx - u(520), top: PY + PH / 2 - u(520), width: u(1040), height: u(1040), borderRadius: '50%', border: `${Math.max(1, u(1.5))}px solid rgba(121,204,151,0.10)`, opacity: 1 - ai * 0.5}} />

      <AbsoluteFill style={{transform: `scale(${1 + 0.02 * interpolate(f, [0, 150], [0, 1], clamp)})`, transformOrigin: `${(pcx / W) * 100}% 50%`}}>
        {/* copy */}
        <div style={{position: 'absolute', left: textLeft, top: textTop}}>
          <Caption icon="comment-dots" label="Чат" lines={['Пишите', 'и звоните —', 'напрямую']} mint={['напрямую']} start={-12} out={T.capOut} size={capSize} u={u} />
          <Caption icon="robot" label="ИИ-помощник" lines={['Помощник', '24/7 — ответит', 'на вопрос']} mint={['24/7 — ответит']} start={T.capAi} size={capSize} u={u} />
        </div>

        {/* phone */}
        <div style={{position: 'absolute', left: PX + px, top: PY + py + floatY, width: PW, height: PH, transform: `scale(${sc})`}}>
          <Phone width={PW} rotateY={rotY} rotateX={vertical ? 2 : 1} dark>
            <AppUi />
          </Phone>
        </div>
      </AbsoluteFill>
      <Vignette strength={0.5} />
    </AbsoluteFill>
  );
};
export default Scene;
