import React from 'react';
import {interpolate, interpolateColors, useCurrentFrame} from 'remotion';
import {C, E, F, clamp} from '../../theme';
import {RiseText} from '../../components/Text';
import {ScrambleText} from '../../components/ScrambleText';
import {T} from './plan';

/** Marker windows for the sub line — synced to the wizard step that is on screen. */
export const MARKS = {
  photo: [30, T.step2 + 2] as const, // step 1: photos
  price: [T.step2 + 6, T.step3 + 2] as const, // step 2: price + quantity
  quick: [T.step3 + 6, 999] as const, // step 3 → publish: «пара минут.»
};

/** a word group that rises through a mask, with a marker sweep behind it */
const Seg: React.FC<{text: string; start: number; mark?: readonly [number, number]; out: number}> = ({text, start, mark, out}) => {
  const f = useCurrentFrame();
  const pIn = interpolate(f, [start, start + 16], [1, 0], {...clamp, easing: E.out});
  const pOut = interpolate(f, [out, out + 8], [0, -1], {...clamp, easing: E.in});
  const y = pIn > 0 ? pIn * 110 : pOut * 110;
  let m = 0;
  let origin = 'left';
  if (mark) {
    const a = interpolate(f, [mark[0], mark[0] + 10], [0, 1], {...clamp, easing: E.out});
    const b = interpolate(f, [mark[1], mark[1] + 7], [0, 1], {...clamp, easing: E.in});
    m = a * (1 - b);
    origin = f >= mark[1] ? 'right' : 'left';
  }
  const markOut = interpolate(f, [out, out + 6], [1, 0], clamp);
  return (
    <span style={{position: 'relative', display: 'inline-block'}}>
      <span
        style={{
          position: 'absolute',
          left: '-0.14em',
          right: '-0.14em',
          top: '0.46em',
          bottom: '0.02em',
          borderRadius: '0.12em',
          background: 'rgba(240,180,41,0.36)',
          transform: `scaleX(${m})`,
          transformOrigin: origin,
          opacity: markOut,
        }}
      />
      <span style={{display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', paddingBottom: '0.1em', marginBottom: '-0.1em', position: 'relative'}}>
        <span style={{display: 'inline-block', transform: `translateY(${y}%)`, whiteSpace: 'nowrap', color: interpolateColors(m, [0, 1], [C.ink2, C.ink])}}>{text}</span>
      </span>
    </span>
  );
};

export const Copy: React.FC<{vertical: boolean; u: (n: number) => number; left: number; top: number}> = ({vertical, u, left, top}) => {
  const f = useCurrentFrame();
  const chipIn = interpolate(f, [T.chip, T.chip + 12], [0, 1], {...clamp, easing: E.out});
  const chipOut = interpolate(f, [T.textOut, T.textOut + 7], [0, 1], {...clamp, easing: E.in});
  const head = vertical ? u(100) : u(108);
  const sub = vertical ? u(42) : u(38);
  const lines = ['Фермер', 'выставляет', 'товар'];
  const subStart = T.sub;
  return (
    <div style={{position: 'absolute', left, top}}>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: u(10),
          fontFamily: F.mono,
          fontSize: u(26),
          fontWeight: 500,
          color: C.field,
          padding: `${u(7)}px ${u(18)}px`,
          borderRadius: 999,
          border: `${Math.max(1, u(1.5))}px solid rgba(31,92,53,0.32)`,
          letterSpacing: '0.04em',
          opacity: chipIn * (1 - chipOut),
          transform: `translateY(${(1 - chipIn) * u(14) - chipOut * u(18)}px)`,
        }}
      >
        <ScrambleText text="01" start={T.chip} stagger={3} scramble={8} tick={2} seed="s04chip" glyphColor={C.sunLight} />
      </div>
      <div
        style={{
          marginTop: vertical ? u(30) : u(26),
          fontFamily: F.display,
          fontWeight: 800,
          fontSize: head,
          lineHeight: 1.05,
          letterSpacing: '-0.03em',
          color: C.ink,
        }}
      >
        {lines.map((line, li) => (
          <div key={li}>
            <RiseText
              text={line}
              start={T.head + li * 3}
              dur={18}
              out={T.textOut + li * 1.5}
              outDur={8}
              wordStyle={() => (li === 2 ? {color: C.field} : undefined)}
            />
          </div>
        ))}
      </div>
      <div style={{marginTop: vertical ? u(34) : u(30), fontFamily: F.body, fontWeight: 500, fontSize: sub, lineHeight: 1.32, color: C.ink2}}>
        <div>
          <Seg text="Фото," start={subStart} mark={MARKS.photo} out={T.textOut + 3} /> <Seg text="цена, количество" start={subStart + 2} mark={MARKS.price} out={T.textOut + 3.5} />{'\u00A0'}
          <Seg text="—" start={subStart + 4} out={T.textOut + 4} />
        </div>
        <div>
          <Seg text="пара минут." start={subStart + 6} mark={MARKS.quick} out={T.textOut + 4.5} />
        </div>
      </div>
    </div>
  );
};
