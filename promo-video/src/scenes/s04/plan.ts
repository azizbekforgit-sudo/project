/* S04 «Фермер выставляет товар» — timing + app-space geometry (pure data).
   All frames are RELATIVE to the scene start (abs 600). App space = 390×844 CSS px of the real app. */

export const T = {
  chip: 4, // «01» decodes
  head: 7, // headline words rise
  sub: 20, // sub line rises
  emoji: [14, 20, 26] as const, // tomato / carrot / apple float out of the phone
  emojiOut: 66,
  scroll1: [40, 60] as const, // step 1: scroll down to the wizard bar
  tap1: 72, // «Дальше» (step 1)
  step2: 75, // step 2 slides in
  scroll2: [98, 110] as const, // small nudge so the whole bar is visible
  tap2: 127, // «Дальше» (step 2)
  step3: 130, // step 3 slides in
  scroll3: [146, 162] as const, // step 3: scroll to «Опубликовать товар»
  tap3: 175, // «Опубликовать товар»
  seedFly: [176, 182] as const, // the seed shoots up into the toast
  toast: 180, // toast drops in (on the beat, abs 780)
  check: 183, // green check pops around the seed
  lift: [185, 197] as const, // toast lifts off the screen toward the camera
  textOut: 191,
  exit: [201, 210] as const, // phone pushes out left; swish peaks ~208
  slideDur: 14,
} as const;

/* ── app space ── */
export const STATUS = 47; // synthesized iOS status bar (keeps the dynamic island off the app's top bar)
export const SHOT_TOP = 72; // the app's fixed top bar in the screenshots: y 0–72
export const NAV_Y = 763; // the app's fixed bottom nav starts here (screen and shot)
export const CLIP_TOP = STATUS + SHOT_TOP; // 119: content is visible between CLIP_TOP and NAV_Y
/** screen y of a page y at a given scroll */
export const toScreen = (pageY: number, scroll: number) => pageY + STATUS - scroll;

/* Step 2 «Назад | Дальше» bar inside m-light-new-step2-price.png (measured, ÷3) */
export const BAR = {ruleY: 681, top: 700, h: 60, backX: [16, 188.7], nextX: [201, 374], radius: 10} as const;

/* Step 1: screenshot is cut just below the name input (ends 743.7); the rest is rebuilt */
export const S1 = {
  cut: 750,
  catLabelTop: 759.7,
  gridTop: 790.3,
  tileH: 92,
  gap: 8,
  barRule: 0, // filled below
  scroll: 0,
};
S1.barRule = S1.gridTop + 4 * S1.tileH + 3 * S1.gap + 22; // 1204.3 — same 22 px gap as step 2
S1.scroll = S1.barRule + (BAR.top - BAR.ruleY) + BAR.h + STATUS - 760; // bar bottom lands on screen y 760

/* Step 2: the bar is at the very bottom of the shot; a 47 px nudge reveals it under the status bar shift */
export const S2 = {cut: NAV_Y, scroll: STATUS};

/* Step 3: screenshot cut at the card's divider (729–730); farmer row, «В корзину», card bottom and bar rebuilt */
export const S3 = {
  cut: 730,
  cardBottom: 839, // 730 + 10 pad + 28 row + 10 + 48 btn + 12 pad + 1 border
  barRule: 861,
  scroll: 0,
  backW: 118,
};
S3.scroll = S3.barRule + (BAR.top - BAR.ruleY) + BAR.h + STATUS - 760;

/** Tap targets in SCREEN app space (after scroll) */
export const TAPS = {
  // fingertip lands in the lower half of the button so the label stays readable under the seed
  next: {x: (BAR.nextX[0] + BAR.nextX[1]) / 2 + 4, y: 744},
  publish: {x: (16 + S3.backW + 12 + 374) / 2 + 6, y: 744},
};

/* Toast (native: #toast-container top = top-h + 8, left/right 12; padding 16/20; radius 14; 17 px / 600) */
export const TOAST = {x: 12, y: STATUS + SHOT_TOP + 8, w: 366, h: 56, checkX: 12 + 20 + 13, checkY: STATUS + SHOT_TOP + 8 + 28};
