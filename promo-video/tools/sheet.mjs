// Fast contact sheet: bundle once, open one browser, render several stills, tile them.
// usage: node tools/sheet.mjs <compositionId> <frames comma list> <out.jpg> [scale=0.5] [cols=4]
// e.g.   node tools/sheet.mjs s04 0,20,40,60,90,120,150,200 out/s04-sheet.jpg
import {bundle} from '@remotion/bundler';
import {openBrowser, renderStill, selectComposition} from '@remotion/renderer';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const [comp, framesArg, out, scaleArg = '0.5', colsArg = '4'] = process.argv.slice(2);
if (!comp || !framesArg || !out) { console.error('usage: node tools/sheet.mjs <comp> <f1,f2,..> <out.jpg> [scale] [cols]'); process.exit(1); }
const frames = framesArg.split(',').map(Number);
const scale = Number(scaleArg);
const tmp = path.resolve('out', `.sheet-${comp}-${process.pid}`);
fs.mkdirSync(tmp, {recursive: true});
const BROWSER = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts'), outDir: path.join(tmp, 'bundle')});
const browser = await openBrowser('chrome', {browserExecutable: BROWSER, chromeMode: 'headless-shell', chromiumOptions: {gl: 'angle'}});
const composition = await selectComposition({serveUrl, id: comp, puppeteerInstance: browser, browserExecutable: BROWSER, chromeMode: 'headless-shell'});
const files = [];
for (const fr of frames) {
  const file = path.join(tmp, `f${String(fr).padStart(4, '0')}.png`);
  await renderStill({serveUrl, composition, frame: fr, output: file, scale, puppeteerInstance: browser, imageFormat: 'png', browserExecutable: BROWSER, chromeMode: 'headless-shell'});
  files.push(file);
}
await browser.close({silent: true});
// label + tile with ffmpeg
const cols = Math.min(Number(colsArg), files.length);
const rows = Math.ceil(files.length / cols);
const inputs = files.flatMap((f) => ['-i', f]);
const labels = files.map((f, i) => `[${i}:v]drawtext=text='f${frames[i]}':x=12:y=10:fontsize=28:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=6[v${i}]`).join(';');
const layout = files.map((_, i) => `${(i % cols) === 0 ? '0' : Array.from({length: i % cols}, (_, k) => `w${k}`).join('+')}_${Math.floor(i / cols) === 0 ? '0' : Array.from({length: Math.floor(i / cols)}, (_, k) => `h${k * cols}`).join('+')}`).join('|');
const stack = files.length > 1 ? `${labels};${files.map((_, i) => `[v${i}]`).join('')}xstack=inputs=${files.length}:layout=${layout}:fill=gray[o]` : `${labels.replace('[v0]', '[o]')}`;
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', stack, '-map', '[o]', '-q:v', '3', out]);
fs.rmSync(tmp, {recursive: true, force: true});
console.log(`wrote ${out} (${files.length} frames, ${rows}x${cols})`);
