import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {E, clamp} from '../theme';

/**
 * Mask reveal: each word rises from below its own clip box.
 * start = first word starts (relative frame), stagger = frames between words, dur = frames per word.
 * Pass `out` (relative frame) to make the words leave upward (faster than the entrance).
 */
export const RiseText: React.FC<{
  text: string;
  start?: number;
  stagger?: number;
  dur?: number;
  out?: number;
  outDur?: number;
  style?: React.CSSProperties;
  wordStyle?: (word: string, i: number) => React.CSSProperties | undefined;
}> = ({text, start = 0, stagger = 3, dur = 16, out, outDur = 9, style, wordStyle}) => {
  const f = useCurrentFrame();
  const words = text.split(' ');
  return (
    <span style={{display: 'inline', ...style}}>
      {words.map((w, i) => {
        const s = start + i * stagger;
        const pIn = interpolate(f, [s, s + dur], [1, 0], {...clamp, easing: E.out});
        const pOut = out === undefined ? 0 : interpolate(f, [out + i * 1.5, out + i * 1.5 + outDur], [0, -1], {...clamp, easing: E.in});
        const y = pIn > 0 ? pIn * 110 : pOut * 110;
        return (
          <React.Fragment key={i}>
            {i > 0 ? ' ' : null}
            <span style={{display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', paddingBottom: '0.08em', marginBottom: '-0.08em'}}>
              <span style={{display: 'inline-block', transform: `translateY(${y}%)`, whiteSpace: 'nowrap', ...(wordStyle?.(w, i) ?? {})}}>{w}</span>
            </span>
          </React.Fragment>
        );
      })}
    </span>
  );
};

/**
 * Slot / word swap: one slot cycles through `words`, switching at the given relative frames.
 * swaps[k] is the frame where words[k+1] replaces words[k]. Each swap rolls up through a mask.
 * The slot reserves the width of the widest word (grid stacking), align with `align`.
 */
export const WordSwap: React.FC<{
  words: React.ReactNode[];
  swaps: number[];
  dur?: number;
  style?: React.CSSProperties;
  align?: 'left' | 'center' | 'right';
  /** extra per-word style */
  wordStyle?: (i: number) => React.CSSProperties | undefined;
}> = ({words, swaps, dur = 9, style, align = 'left', wordStyle}) => {
  const f = useCurrentFrame();
  let idx = 0;
  swaps.forEach((s, k) => {
    if (f >= s) idx = k + 1;
  });
  return (
    <span style={{display: 'inline-grid', overflow: 'hidden', verticalAlign: 'bottom', justifyItems: align === 'left' ? 'start' : align === 'right' ? 'end' : 'center', paddingBottom: '0.1em', marginBottom: '-0.1em', ...style}}>
      {words.map((w, i) => {
        // i enters at swaps[i-1], leaves at swaps[i]
        const enterAt = i === 0 ? -Infinity : swaps[i - 1];
        const leaveAt = i < swaps.length ? swaps[i] : Infinity;
        let y = 0;
        let o = 1;
        if (f < enterAt) {
          y = 110;
          o = 0;
        } else if (f < enterAt + dur) {
          y = interpolate(f, [enterAt, enterAt + dur], [110, 0], {...clamp, easing: E.out});
        }
        if (f >= leaveAt) {
          y = interpolate(f, [leaveAt, leaveAt + dur * 0.8], [0, -110], {...clamp, easing: E.in});
          o = f > leaveAt + dur ? 0 : 1;
        }
        const visible = i === idx || (i === idx - 1 && f < swaps[idx - 1] + dur);
        return (
          <span
            key={i}
            style={{
              gridArea: '1 / 1',
              display: 'inline-block',
              transform: `translateY(${y}%)`,
              opacity: visible ? o : 0,
              whiteSpace: 'nowrap',
              ...(wordStyle?.(i) ?? {}),
            }}
          >
            {w}
          </span>
        );
      })}
    </span>
  );
};

/** Simple fade+lift entrance for a block; returns style. */
export const useEnter = (start: number, dur = 18, dist = 24) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [start, start + dur], [0, 1], {...clamp, easing: E.out});
  return {opacity: p, transform: `translateY(${(1 - p) * dist}px)`} as React.CSSProperties;
};
