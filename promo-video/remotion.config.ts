import {Config} from '@remotion/cli/config';

// Remotion would download chrome-headless-shell from a CDN that the proxy blocks.
// Use the Playwright build that ships in this container instead (Chromium 141.0.7390.37).
Config.setBrowserExecutable('/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell');
Config.setChromeMode('headless-shell');
// 'angle' is ~2.5x faster than 'swangle' here (DOM/CSS raster); WebGL2 still works (SwiftShader Vulkan).
Config.setChromiumOpenGlRenderer('angle');
Config.setVideoImageFormat('jpeg'); // png is ~40% slower; only needed for transparency
Config.setJpegQuality(92);
Config.setCodec('h264');
Config.setCrf(16);
Config.setPixelFormat('yuv420p');
// Without this, jpeg frames produce yuvj420p / full-range / bt470bg output.
Config.setColorSpace('bt709');
Config.setAudioCodec('aac');
Config.setAudioBitrate('256k');
Config.setConcurrency(4); // max = CPU count (4); higher values throw
Config.setOverwriteOutput(true);
