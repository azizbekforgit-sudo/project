import {useVideoConfig} from 'remotion';

/**
 * Layout helper. Write sizes in "1080-px units": u(100) = 100px at 1920×1080, and the same visual
 * size (relative to the short side) in the 1080×1920 vertical cut.
 * `vertical` = 9:16 version — scenes must lay out for both.
 */
export const useLayout = () => {
  const {width: W, height: H} = useVideoConfig();
  const vertical = H > W;
  const short = Math.min(W, H);
  const u = (px: number) => (px * short) / 1080;
  return {W, H, vertical, u};
};
