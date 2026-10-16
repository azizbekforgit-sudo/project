import React from 'react';
import {Img, staticFile} from 'remotion';
import {FA} from '../fa-data';

/** Font Awesome 6.4 icon as inline SVG (inherits colour via `color`). */
export const Icon: React.FC<{name: keyof typeof FA | string; size?: number; color?: string; style?: React.CSSProperties}> = ({name, size = 32, color = 'currentColor', style}) => {
  const ic = FA[name];
  if (!ic) throw new Error(`Unknown icon ${name}`);
  return (
    <svg viewBox={`0 0 ${ic.w} ${ic.h}`} width={(size * ic.w) / ic.h} height={size} style={{display: 'inline-block', flex: '0 0 auto', ...style}}>
      <path d={ic.d} fill={color} />
    </svg>
  );
};

/** Fluent emoji (MIT, © Microsoft) from public/emoji/<name>.svg */
export const Emoji: React.FC<{name: string; size?: number; style?: React.CSSProperties}> = ({name, size = 64, style}) => (
  <Img src={staticFile(`emoji/${name}.svg`)} style={{width: size, height: size, display: 'block', ...style}} />
);
