import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, getStaticFiles} from 'remotion';
import {SCENES} from './timing';
import {Grain} from './components/Atmos';
import S01 from './scenes/s01';
import S02 from './scenes/s02';
import S03 from './scenes/s03';
import S04 from './scenes/s04';
import S05 from './scenes/s05';
import S06 from './scenes/s06';
import S07 from './scenes/s07';
import S08 from './scenes/s08';
import S09 from './scenes/s09';
import S10 from './scenes/s10';

export const SCENE_COMPONENTS: Record<string, React.FC> = {s01: S01, s02: S02, s03: S03, s04: S04, s05: S05, s06: S06, s07: S07, s08: S08, s09: S09, s10: S10};

/** The whole 60 s film. Scenes are absolute Sequences; each scene owns its entrance/exit motion. */
export const Film: React.FC<{withAudio?: boolean}> = ({withAudio = false}) => {
  const hasMaster = getStaticFiles().some((f) => f.name === 'audio/master.wav');
  return (
    <AbsoluteFill style={{background: '#000'}}>
      {SCENES.map((s) => {
        const Comp = SCENE_COMPONENTS[s.id];
        return (
          <Sequence key={s.id} from={s.from} durationInFrames={s.to - s.from} name={`${s.id} ${s.name}`} premountFor={30}>
            <Comp />
          </Sequence>
        );
      })}
      <Grain opacity={0.06} />
      {withAudio && hasMaster ? <Audio src={staticFile('audio/master.wav')} /> : null}
    </AbsoluteFill>
  );
};

/** One scene alone (for fast stills/renders while building). */
export const SceneOnly: React.FC<{id: string}> = ({id}) => {
  const Comp = SCENE_COMPONENTS[id];
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Comp />
      <Grain opacity={0.06} />
    </AbsoluteFill>
  );
};
