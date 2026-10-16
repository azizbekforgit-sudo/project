import React from 'react';
import {AbsoluteFill} from 'remotion';
import {useCurrentFrame} from 'remotion';
import {NightBg, Vignette} from '../components/Atmos';
import {ValuesStack, SunSeed, beatPulse, useGeo, HITS} from './s09/shared';

/** S09 Values: three words on beats (stop-time), the sun seed is the full stop of «Рядом.» and rises into s10. */
const Scene: React.FC = () => {
  const t = useCurrentFrame();
  const g = useGeo();
  // glow dips and flares on every word hit, then settles to a beat breathing
  const hitFlare = HITS.reduce((a, h) => a + (t >= h ? Math.exp(-(t - h) / 5) : 0), 0);
  const a = 0.1 + 0.05 * beatPulse(t) + 0.08 * Math.min(hitFlare, 1);
  return (
    <AbsoluteFill>
      <NightBg glowX={(g.sun.x / g.W) * 100} glowY={(g.sun.y / g.H) * 100} glow={`rgba(240,180,41,${a})`} intensity={g.vertical ? 1.3 : 1.15} />
      <ValuesStack t={t} />
      <SunSeed t={t} />
      <Vignette strength={0.5} />
    </AbsoluteFill>
  );
};
export default Scene;
