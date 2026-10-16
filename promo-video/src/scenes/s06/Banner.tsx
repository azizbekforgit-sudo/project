import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, E, F, SPR, clamp} from '../../theme';
import {LogoMark} from '../../components/Logo';
import {T} from './plan';

/** iOS-style push banner, in 390×844 app space (child of <Phone>). */
export const Banner: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (f < T.notif - 1 || f > T.tapNotif + 16) return null;
  const drop = spring({frame: f - T.notif, fps, config: {damping: 15, stiffness: 190, mass: 0.8}});
  const press = interpolate(f, [T.tapNotif - 3, T.tapNotif, T.tapNotif + 3], [0, 1, 0.6], clamp);
  const out = interpolate(f, [T.tapNotif + 3, T.tapNotif + 13], [0, 1], {...clamp, easing: E.in});
  const y = (1 - drop) * -120 - out * 150;
  const sc = (0.9 + 0.1 * drop) * (1 - 0.03 * press);
  const o = interpolate(f, [T.notif, T.notif + 4], [0, 1], clamp) * (1 - interpolate(out, [0.6, 1], [0, 1], clamp));
  const pulse = 1 + 0.18 * Math.sin(((f - T.notif) * Math.PI) / 7.5) * interpolate(f, [T.notif + 8, T.notif + 12], [0, 1], clamp);
  return (
    <div
      style={{
        position: 'absolute',
        left: 8,
        top: 50,
        width: 374,
        transform: `translateY(${y}px) scale(${sc})`,
        transformOrigin: '50% 0',
        opacity: o,
        borderRadius: 24,
        padding: '13px 14px 14px 13px',
        boxSizing: 'border-box',
        background: 'rgba(250,250,246,0.80)',
        backdropFilter: 'blur(24px) saturate(1.6)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.6)',
        border: '1px solid rgba(255,255,255,0.7)',
        boxShadow: '0 14px 34px rgba(10,30,18,0.28), 0 2px 6px rgba(10,30,18,0.12)',
        display: 'flex',
        gap: 12,
        fontFamily: F.body,
      }}
    >
      <div style={{position: 'relative', flex: '0 0 auto', width: 48, height: 48}}>
        <LogoMark size={48} isStatic style={{borderRadius: 10}} />
        <div style={{position: 'absolute', right: -4, top: -4, width: 13, height: 13, borderRadius: '50%', background: C.sun, border: '2px solid #fff', transform: `scale(${pulse})`}} />
      </div>
      <div style={{flex: 1, minWidth: 0}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
          <span style={{fontWeight: 700, fontSize: 19.5, color: C.ink, letterSpacing: '-0.01em'}}>Новый заказ</span>
          <span style={{fontSize: 14, color: C.ink3, fontWeight: 500}}>сейчас</span>
        </div>
        <div style={{fontSize: 17.5, lineHeight: 1.26, color: C.ink2, fontWeight: 500, marginTop: 2}}>Дилноза: Помидоры «Бычье&nbsp;сердце» — 20&nbsp;кг</div>
      </div>
    </div>
  );
};
