import React from 'react';
import {Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {E, F, SPR, clamp} from '../../theme';
import {Icon} from '../../components/Icons';
import {BAR, CLIP_TOP, NAV_Y, S1, S2, S3, SHOT_TOP, STATUS, T} from './plan';

/* App design tokens (agroverse front/css/theme.css, light) */
const A = {
  ground: '#F6F6F1',
  card: '#FFFFFF',
  ink: '#1A201C',
  ink2: '#434B45',
  ink3: '#5F6761',
  rule: '#E2E5DC',
  rule2: '#CDD3C8',
  field: '#1F5C35',
  fillDeep: '#143D24',
  sprout: '#EAF2E6',
  danger: '#B42318',
};

const SHOT1 = 'screens/m-light-new-step1-filled.png';
const SHOT2 = 'screens/m-light-new-step2-price.png';
const SHOT3 = 'screens/m-light-new-step3-review.png';

/** A rectangular crop of a screenshot, in app px. Drawn at (x, y) of its parent. */
const Crop: React.FC<{src: string; sx: number; sy: number; w: number; h: number; x?: number; y?: number; style?: React.CSSProperties}> = ({src, sx, sy, w, h, x = sx, y = sy, style}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, height: h, overflow: 'hidden', ...style}}>
    <Img src={staticFile(src)} style={{position: 'absolute', left: -sx, top: -sy, width: 390, height: 844, display: 'block'}} />
  </div>
);

/** 0 → 1 while the finger presses, springs back after the tap frame */
export const usePress = (at: number) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (f < at - 2 || f > at + 14) return 0;
  if (f < at) return interpolate(f, [at - 2, at], [0, 1], clamp);
  return 1 - spring({frame: f - at, fps, config: SPR.snap});
};

/**
 * The real «Дальше» button (cropped from the step-2 shot) that can be pressed.
 * Region starts below the bar's rule line so scaling never doubles the rule.
 */
const PressableNext: React.FC<{y0: number; press: number}> = ({y0, press}) => {
  const top = 690;
  const cx = (BAR.nextX[0] + BAR.nextX[1]) / 2;
  const cy = BAR.top + BAR.h / 2;
  const s = 1 - 0.035 * press;
  return (
    <div style={{position: 'absolute', left: 195, top: y0 + (top - BAR.ruleY), width: 195, height: NAV_Y - top, background: A.ground}}>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${s})`, transformOrigin: `${cx - 195}px ${cy - top}px`}}>
        <Crop src={SHOT2} sx={195} sy={top} w={195} h={NAV_Y - top} x={0} y={0} />
        <div
          style={{
            position: 'absolute',
            left: BAR.nextX[0] - 195,
            top: BAR.top - top,
            width: BAR.nextX[1] - BAR.nextX[0],
            height: BAR.h,
            borderRadius: BAR.radius,
            background: `rgba(0,0,0,${0.16 * press})`,
          }}
        />
      </div>
    </div>
  );
};

/* ── Step 1 tail: «Категория» tiles + the wizard bar ── */
const CATS: [string, string][] = [
  ['Овощи', 'carrot'],
  ['Фрукты', 'red-apple'],
  ['Зелень', 'leafy-green'],
  ['Зерновые', 'sheaf-of-rice'],
  ['Молочные', 'glass-of-milk'],
  ['Мёд', 'honey-pot'],
  ['Цветы', 'tulip'],
  ['Саженцы', 'potted-plant'],
  ['Бахчевые', 'watermelon'],
  ['Семена', 'seedling'],
  ['Земля', 'national-park'],
];

const Label: React.FC<{top: number; children: React.ReactNode}> = ({top, children}) => (
  <div style={{position: 'absolute', left: 16, top, fontFamily: F.body, fontWeight: 700, fontSize: 16, lineHeight: '22.6px', color: A.ink, whiteSpace: 'nowrap'}}>
    {children} <span style={{color: A.danger}}>*</span>
  </div>
);

const Step1Tail: React.FC<{press: number}> = ({press}) => {
  const tileW = (358 - 2 * S1.gap) / 3;
  return (
    <>
      <div style={{position: 'absolute', left: 0, top: S1.cut, width: 390, height: 900, background: A.ground}} />
      <Label top={S1.catLabelTop}>Категория</Label>
      {CATS.map(([name, emoji], i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const active = i === 0;
        return (
          <div
            key={name}
            style={{
              position: 'absolute',
              left: 16 + col * (tileW + S1.gap),
              top: S1.gridTop + row * (S1.tileH + S1.gap),
              width: tileW,
              height: S1.tileH,
              boxSizing: 'border-box',
              borderRadius: 12,
              border: `2px solid ${active ? A.field : A.rule}`,
              background: active ? A.sprout : A.card,
              boxShadow: active ? `inset 0 0 0 1px ${A.field}` : undefined,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '10px 4px',
              fontFamily: F.body,
              fontWeight: 700,
              fontSize: 13,
              lineHeight: 1.2,
              color: A.ink,
            }}
          >
            <Img src={staticFile(`emoji/${emoji}.svg`)} style={{width: 38, height: 38, display: 'block'}} />
            <span>{name}</span>
          </div>
        );
      })}
      {/* real bar: rule + «Назад» crop, and the pressable «Дальше» */}
      <Crop src={SHOT2} sx={0} sy={BAR.ruleY} w={195} h={NAV_Y - BAR.ruleY} x={0} y={S1.barRule} />
      <Crop src={SHOT2} sx={195} sy={BAR.ruleY} w={195} h={690 - BAR.ruleY} x={195} y={S1.barRule} />
      <PressableNext y0={S1.barRule} press={press} />
    </>
  );
};

/* ── Step 3 tail: rest of the preview card, then «Назад | Опубликовать товар» ── */
const Step3Tail: React.FC<{press: number}> = ({press}) => {
  const btnTop = S3.barRule + (BAR.top - BAR.ruleY);
  const pubX = 16 + S3.backW + 12;
  const pubW = 374 - pubX;
  const s = 1 - 0.035 * press;
  return (
    <>
      <div style={{position: 'absolute', left: 0, top: S3.cut, width: 390, height: 600, background: A.ground}} />
      {/* card continuation (white, 1 px rule-2 sides, rounded bottom) */}
      <div
        style={{
          position: 'absolute',
          left: 16,
          top: S3.cut - 1,
          width: 358,
          height: S3.cardBottom - S3.cut + 1,
          boxSizing: 'border-box',
          background: A.card,
          border: `1px solid ${A.rule2}`,
          borderTop: 'none',
          borderRadius: '0 0 14px 14px',
        }}
      >
        <div style={{position: 'absolute', left: 12, right: 12, top: 1, height: 1, background: A.rule}} />
        <div style={{position: 'absolute', left: 12, top: 11, display: 'flex', alignItems: 'center', gap: 8, height: 28}}>
          <div style={{width: 28, height: 28, borderRadius: 14, background: A.sprout, color: A.field, display: 'grid', placeItems: 'center', fontFamily: F.body, fontWeight: 700, fontSize: 13}}>А</div>
          <span style={{fontFamily: F.body, fontWeight: 600, fontSize: 13, color: A.ink2}}>Алишер Усмонов</span>
        </div>
        <div
          style={{
            position: 'absolute',
            left: 12,
            right: 12,
            top: 49,
            height: 48,
            boxSizing: 'border-box',
            borderRadius: 10,
            border: `2px solid ${A.field}`,
            display: 'grid',
            placeItems: 'center',
            fontFamily: F.body,
            fontWeight: 600,
            fontSize: 14,
            color: A.field,
          }}
        >
          В корзину
        </div>
      </div>
      {/* wizard bar */}
      <div style={{position: 'absolute', left: 16, top: S3.barRule, width: 358, height: 1, background: A.rule}} />
      <div
        style={{
          position: 'absolute',
          left: 16,
          top: btnTop,
          width: S3.backW,
          height: BAR.h,
          boxSizing: 'border-box',
          borderRadius: BAR.radius,
          border: `2px solid ${A.field}`,
          background: A.card,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 9,
          fontFamily: F.body,
          fontWeight: 600,
          fontSize: 18,
          color: A.field,
        }}
      >
        <Icon name="arrow-right" size={17} color={A.field} style={{transform: 'scaleX(-1)'}} />
        Назад
      </div>
      <div
        style={{
          position: 'absolute',
          left: pubX,
          top: btnTop,
          width: pubW,
          height: BAR.h,
          boxSizing: 'border-box',
          borderRadius: BAR.radius,
          border: `2px solid ${A.field}`,
          background: A.field,
          boxShadow: `0 2px 0 ${A.fillDeep}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 9,
          fontFamily: F.body,
          fontWeight: 600,
          fontSize: 17,
          letterSpacing: '-0.01em',
          color: '#fff',
          whiteSpace: 'nowrap',
          transform: `scale(${s})`,
          overflow: 'hidden',
        }}
      >
        <Icon name="paper-plane" size={16} color="#fff" />
        Опубликовать товар
        <div style={{position: 'absolute', inset: -2, background: `rgba(0,0,0,${0.16 * press})`}} />
      </div>
    </>
  );
};

/* ── iOS-style status bar so the phone's dynamic island never sits on the app's own top bar ── */
const StatusBar: React.FC = () => (
  <div style={{position: 'absolute', left: 0, top: 0, width: 390, height: STATUS, background: '#fff'}}>
    <div style={{position: 'absolute', left: 0, width: 132, top: 15, textAlign: 'center', fontFamily: F.body, fontWeight: 600, fontSize: 16.5, letterSpacing: '-0.01em', color: A.ink}}>9:41</div>
    <svg width={80} height={14} viewBox="0 0 80 14" style={{position: 'absolute', left: 284, top: 20}}>
      {/* signal */}
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={i * 5} y={10 - i * 3} width={3.2} height={3 + i * 3} rx={0.9} fill={A.ink} />
      ))}
      {/* wifi */}
      <g transform="translate(30 1)" fill={A.ink}>
        <path d="M8 2.2c2.6 0 4.9 1 6.6 2.6l1.2-1.3C13.8 1.6 11 .4 8 .4S2.2 1.6.2 3.5l1.2 1.3C3.1 3.2 5.4 2.2 8 2.2z" />
        <path d="M8 5.6c1.6 0 3 .6 4.1 1.6l1.2-1.3C11.9 4.6 10 3.8 8 3.8s-3.9.8-5.3 2.1l1.2 1.3C5 6.2 6.4 5.6 8 5.6z" />
        <path d="M8 9c.7 0 1.3.3 1.8.7L8 11.6 6.2 9.7C6.7 9.3 7.3 9 8 9z" />
      </g>
      {/* battery */}
      <rect x={52.5} y={1.5} width={22} height={11} rx={3.2} fill="none" stroke={A.ink} strokeOpacity={0.4} strokeWidth={1} />
      <rect x={54.5} y={3.5} width={18} height={7} rx={1.8} fill={A.ink} />
      <rect x={75.5} y={5} width={1.6} height={4} rx={0.8} fill={A.ink} fillOpacity={0.45} />
    </svg>
  </div>
);

/** Vertical motion blur for fast scrolls (SVG filter, std in app px). */
const BlurDefs: React.FC<{id: string; std: number}> = ({id, std}) => (
  <svg width={0} height={0} style={{position: 'absolute'}}>
    <defs>
      <filter id={id} x="0" y="-5%" width="100%" height="110%">
        <feGaussianBlur stdDeviation={`0 ${std.toFixed(2)}`} />
      </filter>
    </defs>
  </svg>
);

const scrollAt = (fr: number) => {
  const o = {...clamp, easing: E.inOut};
  return {
    s1: interpolate(fr, [...T.scroll1], [0, S1.scroll], o),
    s2: interpolate(fr, [...T.scroll2], [0, S2.scroll], o),
    s3: interpolate(fr, [...T.scroll3], [0, S3.scroll], o),
  };
};

/** Everything inside the phone screen (390×844 app space). */
export const AppScreen: React.FC<{idPrefix: string}> = ({idPrefix}) => {
  const f = useCurrentFrame();
  const p2 = interpolate(f, [T.step2, T.step2 + T.slideDur], [0, 1], {...clamp, easing: E.inOut});
  const p3 = interpolate(f, [T.step3, T.step3 + T.slideDur], [0, 1], {...clamp, easing: E.inOut});
  const sc = scrollAt(f);
  const prev = scrollAt(f - 1);
  const next = scrollAt(f + 1);
  const speed = (k: 's1' | 's2' | 's3') => Math.abs(next[k] - prev[k]) / 2;
  const press1 = usePress(T.tap1);
  const press2 = usePress(T.tap2);
  const press3 = usePress(T.tap3);

  const panels = [
    {k: 1, x: -p2 * 390 * 0.3, on: p2 < 1, dim: p2, scroll: sc.s1, blur: speed('s1'), shot: SHOT1, cut: S1.cut},
    {k: 2, x: (1 - p2) * 390 - p3 * 390 * 0.3, on: p2 > 0 && p3 < 1, dim: p3, scroll: sc.s2, blur: speed('s2'), shot: SHOT2, cut: S2.cut, edge: p2 < 1},
    {k: 3, x: (1 - p3) * 390, on: p3 > 0, dim: 0, scroll: sc.s3, blur: speed('s3'), shot: SHOT3, cut: S3.cut, edge: p3 < 1},
  ];

  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: 390, height: 844, background: A.ground, overflow: 'hidden'}}>
      {/* scrolling content */}
      <div style={{position: 'absolute', left: 0, top: CLIP_TOP, width: 390, height: NAV_Y - CLIP_TOP, overflow: 'hidden'}}>
        {panels.map((p) => {
          if (!p.on) return null;
          const std = Math.min(7, p.blur * 0.16);
          const fid = `${idPrefix}-vb${p.k}`;
          return (
            <div
              key={p.k}
              style={{
                position: 'absolute',
                left: p.x,
                top: STATUS - p.scroll - CLIP_TOP,
                width: 390,
                height: 1600,
                boxShadow: p.edge ? '-18px 0 36px rgba(20,40,25,0.16)' : undefined,
                filter: std > 0.35 ? `url(#${fid})` : undefined,
              }}
            >
              {std > 0.35 ? <BlurDefs id={fid} std={std} /> : null}
              <div style={{position: 'absolute', left: 0, top: 0, width: 390, height: 1600, background: A.ground}} />
              <Crop src={p.shot} sx={0} sy={SHOT_TOP} w={390} h={p.cut - SHOT_TOP} />
              {p.k === 1 ? <Step1Tail press={press1} /> : null}
              {p.k === 2 ? <PressableNext y0={BAR.ruleY} press={press2} /> : null}
              {p.k === 3 ? <Step3Tail press={press3} /> : null}
              {p.dim > 0 ? <div style={{position: 'absolute', inset: 0, background: `rgba(20,30,24,${0.1 * p.dim})`}} /> : null}
            </div>
          );
        })}
      </div>
      {/* fixed chrome: status bar, the app's top bar, the app's bottom nav */}
      <StatusBar />
      <Crop src={SHOT1} sx={0} sy={0} w={390} h={SHOT_TOP} x={0} y={STATUS} />
      <div style={{position: 'absolute', left: 0, top: NAV_Y - 14, width: 390, height: 14, background: 'linear-gradient(to top, rgba(20,40,25,0.05), rgba(20,40,25,0))'}} />
      <Crop src={SHOT1} sx={0} sy={NAV_Y} w={390} h={844 - NAV_Y} />
    </div>
  );
};

export {A as APP_TOKENS};
