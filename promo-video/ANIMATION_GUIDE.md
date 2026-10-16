# ANIMATION GUIDE — read before touching a scene

Project: `/home/user/project/promo-video` (Remotion 4.0.536, React 19, TypeScript). Read `STORYBOARD.md` first: it is the creative spec. This file is the house style + API.

## Ownership — avoid collisions
- You own ONLY `src/scenes/<id>.tsx` and `src/scenes/<id>.cues.ts` (and new files you create under `src/scenes/<id>/`). Do NOT edit shared files (`src/components/*`, `src/theme.ts`, `src/timing.ts`, `src/Film.tsx`, `src/Root.tsx`, `remotion.config.ts`, `package.json`). If you need a helper, put it in `src/scenes/<id>/`. If a shared component has a bug, work around it locally and report it in your final message.
- Do not run `npm install`. Do not delete files you didn't create.

## Frame rules (non-negotiable)
- Scene components receive frames **relative to their scene start** (`useCurrentFrame()` = 0 at scene start). Scene length = `to - from` from `src/timing.ts` (the storyboard's absolute frames minus the scene's `from`).
- Every frame is a pure function of `useCurrentFrame()`. Forbidden: CSS transitions/animations, `Math.random()`, `Date.now()`, timers, `useState` accumulation. Use `random('seed-'+i)` from remotion.
- No remote URLs. Assets via `staticFile('...')` from `public/`. Use `<Img>` (never CSS `background-image: url()`).
- Use `interpolate(..., {...clamp, easing: E.out})` and `spring({frame, fps, config: SPR.pop})`. Easing vocabulary only from `E` (out / outStrong for entrances, in for exits, inOut/smooth for moves). No linear motion except grain/marquees.
- Exits are faster than entrances. Don't start motion at frame 0 of a scene unless it is continuing a velocity-matched transition from the previous scene.
- Every scene must look complete at its first and last frames (no empty frames at seams). Seams are hard cuts between Sequences, so make the cut feel intentional: exit with acceleration + blur (whip) or a colour flood, enter already moving.

## Layout: two aspect ratios
- Compositions: `<id>` = 1920×1080, `<id>v` = 1080×1920. `const {W, H, vertical, u} = useLayout()` from `src/layout.ts`; write sizes as `u(px)` where px is the size at 1080p short side.
- Safe area: keep text ≥ `u(96)` from left/right edges and ≥ `u(80)` from top/bottom in 16:9; in vertical keep ≥ `u(72)` sides, ≥ `u(160)` top and bottom (social UI overlays).
- Headlines `u(84)`–`u(120)` (Unbounded 800, letterSpacing −0.03em, lineHeight 1.05). Subtitles `u(36)`–`u(44)` Golos 500. Labels `u(22)`–`u(26)` mono. Vertical: headlines may go to `u(96)` but max ~12 characters per line.
- Frames are not web pages: hero text fills 50–75 % width, ≥ 3 depth layers (bg glow / midground / foreground accents), not everything centred.

## Shared building blocks (import, don't copy)
- `theme.ts`: `C` colours, `F` fonts (`F.display` Unbounded, `F.brand` Rubik, `F.body` Golos, `F.mono` JetBrains Mono), `E` easings, `SPR` springs, `clamp`, `nbsp()` (non-breaking spaces for Russian), `BEAT=15`, `BAR=60`.
- `components/ScrambleText.tsx`: `<ScrambleText text start stagger scramble tick seed order glyphColor flashColor style/>` + `scrambleEnd(text,start,stagger,scramble,order)` (from timing.ts, pure) to know the lock frame. Defaults: stagger 1.5, scramble 10, tick 2.
- `components/Text.tsx`: `<RiseText text start stagger dur out/>` (per-word mask rise), `<WordSwap words swaps dur/>` (slot roll), `useEnter(start,dur,dist)`.
- `components/Device.tsx`: `<Phone width rotateY rotateX dark>` with children in **390×844 app space** (CSS px of the real app); `<Screen src="screens/m-light-market.png" scrollY/>`; `<ScreenSequence items=[{src, at}] mode='slide'|'fade'/>`; `<Tap x y at/>` (x,y in app space when placed inside Phone). Screenshot PNGs are 1170×2532 (3× of 390×844) — to find a button position, open the PNG with the Read tool and divide pixel coords by 3.
- `components/Atmos.tsx`: `<NightBg/>`, `<LightBg/>`, `<Vignette/>`, `<GhostType/>`. (Film already overlays `<Grain/>` on top — don't add another.)
- `components/Icons.tsx`: `<Icon name="phone" size color/>` (Font Awesome 6.4 subset: see `src/fa-data.ts` keys), `<Emoji name="tomato" size/>` (Fluent emoji in `public/emoji/*.svg`; list the folder for names).
- `components/Logo.tsx`: `<LogoMark size start isStatic/>` (animated icon build ≈34 f), `<Wordmark size color/>`.
- `components/ProductCard.tsx`: `PRODUCTS` (8 listings that match the screenshots) and `<ProductCard p w dark added/>`.
- Assets: `public/screens/*.png` (real app, mobile `m-{light|dark}-*.png`, some desktop `d-*`), `public/photos/*.jpg`, `public/brand/{icon.svg,badge.svg,hero-dusk.svg}`, `public/emoji/*.svg`.

## Sound cues
- In `src/scenes/<id>.cues.ts` export `cues: Cue[]` with frames RELATIVE to the scene start. Vocabulary is the `Sfx` union in `src/timing.ts` (whoosh, swish, riser, reverse_cymbal, boom, impact, hit_soft, tick, scramble, lock, pop, ui_tap, notification, vibrate, success, card_shuffle, card_place, stamp, bubble, typing, switch, shimmer, logo_sting, glitch).
- Every visible event with weight gets a sound and every sound has a visible cause. Whoosh/swish `f` = the frame of PEAK speed. Riser/reverse_cymbal `f` = END (the hit frame). For scrambles add one `scramble` cue with `params.frames` = scramble duration and one `lock` at the final lock frame. Gains in dB: UI sounds −8…−4, whooshes −10…−6, impacts −4…0. Don't stack more than ~3 sounds on the same frame.
- Music accents are fixed (timing.ts `MUSIC.accents`) — align big visual hits to them.

## Verify (you must look at your frames)
- Typecheck: `npx tsc -p .` (must be clean for your files).
- Contact sheet (≈8–20 s): `node tools/sheet.mjs <id> 0,15,30,... out/<id>-sheet.jpg 0.5 4` and the vertical `node tools/sheet.mjs <id>v ... out/<id>v-sheet.jpg 0.35 4`. Open the JPG with the Read tool and LOOK: legibility, overlaps, clipped text, empty frames, seams (first/last frame), Cyrillic rendering, both aspect ratios.
- Strip for a fast move: render 6–8 consecutive frames around it.
- Single still: `npx remotion still src/index.ts <id> out/<id>-f123.png --frame=123`.
- Iterate until it looks like a premium launch film. Check every headline is fully readable for ≥ 1.2 s.
