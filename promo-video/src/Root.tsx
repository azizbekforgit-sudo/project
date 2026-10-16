import React from 'react';
import {Composition} from 'remotion';
import './fonts';
import {Film, SceneOnly} from './Film';
import {FPS, SCENES, TOTAL} from './timing';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Main" component={Film} durationInFrames={TOTAL} fps={FPS} width={1920} height={1080} defaultProps={{withAudio: false}} />
    <Composition id="Vertical" component={Film} durationInFrames={TOTAL} fps={FPS} width={1080} height={1920} defaultProps={{withAudio: false}} />
    {SCENES.map((s) => (
      <React.Fragment key={s.id}>
        <Composition id={`${s.id}`} component={SceneOnly} durationInFrames={s.to - s.from} fps={FPS} width={1920} height={1080} defaultProps={{id: s.id}} />
        <Composition id={`${s.id}v`} component={SceneOnly} durationInFrames={s.to - s.from} fps={FPS} width={1080} height={1920} defaultProps={{id: s.id}} />
      </React.Fragment>
    ))}
  </>
);
