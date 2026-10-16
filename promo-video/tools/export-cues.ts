// Collects every scene's SFX cues (relative frames) → absolute → audio/cues.json for the Python audio builder.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {SCENES, MUSIC, FPS, BEAT, BAR, TOTAL} from '../src/timing';

async function main() {
  const all: any[] = [];
  for (const s of SCENES) {
    const m: any = await import(pathToFileURL(path.resolve('src/scenes', `${s.id}.cues.ts`)).href);
    const cues = m.cues ?? m.default?.cues ?? [];
    for (const c of cues) {
      const abs = s.from + c.f;
      if (abs < 0 || abs > TOTAL) throw new Error(`${s.id}: cue at ${abs} outside film`);
      all.push({...c, f: abs, t: +(abs / FPS).toFixed(4), scene: s.id});
    }
  }
  all.sort((a, b) => a.f - b.f);
  fs.mkdirSync('audio', {recursive: true});
  fs.writeFileSync('audio/cues.json', JSON.stringify({fps: FPS, beat: BEAT, bar: BAR, total: TOTAL, scenes: SCENES, music: MUSIC, cues: all}, null, 2));
  console.log(`audio/cues.json: ${all.length} cues`);
}
main();
