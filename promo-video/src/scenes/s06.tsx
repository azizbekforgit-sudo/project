import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, F} from '../theme';

// PLACEHOLDER — replaced by the scene builder
const Scene: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: C.night, color: C.cream, fontFamily: F.display, fontSize: 80, alignItems: 'center', justifyContent: 'center'}}>
      s06 · {f}
    </AbsoluteFill>
  );
};
export default Scene;
