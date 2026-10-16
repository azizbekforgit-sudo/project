import React from 'react';
import {Img, interpolate, interpolateColors, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, E, F, clamp} from '../../theme';
import {Icon} from '../../components/Icons';
import {Tap} from '../../components/Device';
import {T} from './plan';

export const CARD_W = 357;
export const CARD_H = 440;
const PAD = 18;
const BTN_H = 42;
const COLW = (CARD_W - PAD * 2 - 9) / 2;

const Ring: React.FC<{at: number; color: string; r?: number}> = ({at, color, r = 12}) => {
  const f = useCurrentFrame();
  return (
    <>
      {[0, 7].map((d) => {
        const p = interpolate(f, [at + d, at + d + 20], [0, 1], {...clamp, easing: E.out});
        if (p <= 0 || p >= 1) return null;
        const g = 14 * p;
        return <div key={d} style={{position: 'absolute', left: -g, top: -g, right: -g, bottom: -g, borderRadius: r + g, border: `2.5px solid ${color}`, opacity: (1 - p) * 0.8, pointerEvents: 'none'}} />;
      })}
    </>
  );
};

const Btn: React.FC<{label: string; icon: string; kind: 'solid' | 'outline' | 'sun' | 'danger'; ring?: number; ringColor?: string; press?: number; dim?: number}> = ({label, icon, kind, ring, ringColor, press = 0, dim = 1}) => {
  const f = useCurrentFrame();
  const bump = ring !== undefined ? interpolate(f, [ring, ring + 4, ring + 14], [0, 1, 0], clamp) : 0;
  const st: React.CSSProperties =
    kind === 'solid' ? {background: C.field, color: '#fff', border: `2px solid ${C.field}`} :
    kind === 'sun' ? {background: C.sun, color: C.onSun, border: `2px solid ${C.sun}`} :
    kind === 'danger' ? {background: '#fff', color: C.danger, border: `2px solid ${C.danger}`} :
    {background: '#fff', color: C.field, border: `2px solid ${C.field}`};
  const ic = kind === 'solid' ? '#fff' : kind === 'sun' ? C.onSun : kind === 'danger' ? C.danger : C.field;
  return (
    <div style={{position: 'relative', width: COLW, height: BTN_H, transform: `scale(${1 + 0.04 * bump - 0.04 * press})`, opacity: dim}}>
      {ring !== undefined ? <Ring at={ring} color={ringColor ?? C.field} /> : null}
      <div style={{...st, boxSizing: 'border-box', width: '100%', height: '100%', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 600, fontSize: 15.5, fontFamily: F.body}}>
        <Icon name={icon} size={14} color={ic} />
        {label}
      </div>
    </div>
  );
};

/** Rebuilt order card (design space 357×440 css px — same width as the card in the app screenshot). */
export const OrderCard: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const m = interpolate(f, [T.sold, T.sold + 9], [0, 1], {...clamp, easing: E.out}); // pill morph
  const bump = spring({frame: f - T.sold, fps, config: {damping: 11, stiffness: 260, mass: 0.6}});
  const pillScale = f < T.sold ? 1 : 1 + 0.10 * Math.sin(Math.min(1, (f - T.sold) / 14) * Math.PI) * (1 - 0.0 * bump);
  const dim = 1 - 0.62 * interpolate(f, [T.sold + 4, T.sold + 16], [0, 1], clamp);
  const press = f >= T.tapSold ? interpolate(f, [T.tapSold, T.tapSold + 3, T.tapSold + 9], [0, 1, 0], clamp) : interpolate(f, [T.tapSold - 3, T.tapSold], [0, 1], clamp);
  const pillW = interpolate(m, [0, 1], [146, 124]);
  const border = interpolateColors(m, [0, 1], [C.sun, C.field]);
  const dots = Array.from({length: 6}, (_, i) => i);
  const dp = interpolate(f, [T.sold, T.sold + 22], [0, 1], {...clamp, easing: E.out});
  return (
    <div
      style={{
        width: CARD_W,
        height: CARD_H,
        boxSizing: 'border-box',
        padding: PAD,
        background: '#fff',
        borderRadius: 24,
        border: `3px solid ${border}`,
        fontFamily: F.body,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* status pill + order no. */}
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 32}}>
        <div style={{position: 'relative', width: 146, height: 32}}>
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: pillW,
              height: 32,
              borderRadius: 999,
              boxSizing: 'border-box',
              background: interpolateColors(m, [0, 1], [C.sunPale, C.field]),
              border: `1.5px solid ${interpolateColors(m, [0, 1], [C.sun, C.field])}`,
              transform: `scale(${pillScale})`,
              transformOrigin: '0 50%',
              overflow: 'hidden',
            }}
          >
            <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, color: '#7A5200', fontWeight: 700, fontSize: 14.5, opacity: 1 - Math.min(1, m * 2.2), transform: `translateY(${-m * 10}px)`, whiteSpace: 'nowrap'}}>
              <Icon name="bell" size={13} color="#7A5200" />
              Новый заказ
            </div>
            <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, color: '#fff', fontWeight: 700, fontSize: 14.5, opacity: Math.max(0, Math.min(1, m * 2 - 0.9)), transform: `translateY(${(1 - m) * 10}px)`, whiteSpace: 'nowrap'}}>
              <Icon name="check" size={13} color="#fff" />
              Продано
            </div>
          </div>
          {f >= T.sold && dp < 1
            ? dots.map((i) => {
                const a = (i / 6) * Math.PI * 2 + 0.5;
                const r = 16 + 40 * dp;
                return <div key={i} style={{position: 'absolute', left: 62 + Math.cos(a) * r - 3, top: 16 + Math.sin(a) * r * 0.9 - 3, width: 6, height: 6, borderRadius: '50%', background: C.sun, opacity: (1 - dp) * 0.95, transform: `scale(${1 - 0.4 * dp})`}} />;
              })
            : null}
        </div>
        <span style={{fontFamily: F.mono, fontSize: 13, color: C.ink3, fontWeight: 500}}>№45</span>
      </div>

      {/* product */}
      <div style={{display: 'flex', gap: 14, marginTop: 16, alignItems: 'center'}}>
        <Img src={staticFile('photos/tomato.jpg')} style={{width: 68, height: 68, borderRadius: 15, objectFit: 'cover', flex: '0 0 auto'}} />
        <div style={{fontFamily: F.brand, fontWeight: 600, fontSize: 21, lineHeight: 1.18, color: C.ink, letterSpacing: '-0.01em'}}>Помидоры «Бычье&nbsp;сердце»</div>
      </div>

      {/* qty / sum */}
      <div style={{display: 'flex', gap: 10, marginTop: 14}}>
        {[
          ['Количество', '20 кг'],
          ['Сумма', '240 000 сум'],
        ].map(([l, v]) => (
          <div key={l} style={{flex: 1, background: C.ground, borderRadius: 13, padding: '10px 13px'}}>
            <div style={{fontSize: 13, color: C.ink3, fontWeight: 500}}>{l}</div>
            <div style={{fontFamily: F.brand, fontWeight: 700, fontSize: 21, color: C.ink, marginTop: 2, whiteSpace: 'nowrap', letterSpacing: '-0.01em'}}>{v.replace(' ', ' ')}</div>
          </div>
        ))}
      </div>

      {/* buyer (phone masked) */}
      <div style={{display: 'flex', alignItems: 'center', gap: 12, marginTop: 14, border: `1.5px dashed ${C.rule}`, borderRadius: 15, padding: '10px 12px'}}>
        <div style={{width: 42, height: 42, borderRadius: '50%', background: C.sprout, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto'}}>
          <Icon name="user" size={19} color={C.field} />
        </div>
        <div>
          <div style={{fontSize: 12.5, color: C.ink3, fontWeight: 500}}>Покупатель</div>
          <div style={{fontFamily: F.brand, fontWeight: 600, fontSize: 18.5, color: C.ink, lineHeight: 1.2}}>Дилноза Каримова</div>
          <div style={{fontFamily: F.brand, fontWeight: 600, fontSize: 16.5, color: C.field, letterSpacing: '0.01em', whiteSpace: 'nowrap'}}>{'+998 •• ••• •• ••'.replace(/ /g, ' ')}</div>
        </div>
      </div>

      {/* actions */}
      <div style={{marginTop: 'auto', display: 'grid', gridTemplateColumns: `${COLW}px ${COLW}px`, gap: 9, position: 'relative'}}>
        <Btn label="Позвонить" icon="phone" kind="solid" ring={T.ringCall} ringColor={C.field} dim={dim} />
        <Btn label="Написать" icon="comment-dots" kind="outline" ring={T.ringWrite} ringColor={C.field} dim={dim} />
        <Btn label="Продано" icon="check" kind="sun" press={press} />
        <Btn label="Отклонить" icon="xmark" kind="danger" dim={dim} />
        <Tap x={PAD + COLW / 2 - PAD - 0} y={BTN_H * 1.5 + 9} at={T.tapSold} size={30} />
      </div>
    </div>
  );
};
