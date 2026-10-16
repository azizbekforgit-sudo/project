// Usage: node tools/vendor-google-font.mjs <Module> <weights,comma> [subsets,comma]
// Prints a shell script that curls the woff2 files into public/fonts/gf/ and
// writes src/gf-<Module>.ts which registers them via @remotion/fonts loadFont + staticFile.
import fs from 'node:fs';
const [mod, weightsArg, subsetsArg = 'cyrillic,latin'] = process.argv.slice(2);
const {getInfo} = await import(`@remotion/google-fonts/${mod}`);
const info = getInfo();
const weights = weightsArg.split(',');
const subsets = subsetsArg.split(',');
const lines = [];
const entries = [];
for (const w of weights) {
  for (const sub of subsets) {
    const url = info.fonts.normal?.[w]?.[sub];
    if (!url) { console.error(`missing ${mod} ${w} ${sub}`); continue; }
    const file = `fonts/gf/${mod}-${w}-${sub}.woff2`;
    lines.push(`curl -sSf -o public/${file} '${url}'`);
    entries.push({file, weight: w, range: info.unicodeRanges[sub]});
  }
}
fs.mkdirSync('public/fonts/gf', {recursive: true});
fs.writeFileSync(`src/gf-${mod}.ts`,
`import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';
export const fontFamily = ${JSON.stringify(info.fontFamily)};
${entries.map(e => `loadFont({family: fontFamily, url: staticFile(${JSON.stringify(e.file)}), weight: ${JSON.stringify(e.weight)}, format: 'woff2', unicodeRange: ${JSON.stringify(e.range)}});`).join('\n')}
`);
console.log(lines.join('\n'));
