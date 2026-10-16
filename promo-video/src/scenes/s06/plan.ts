/* S06 · Order · relative frames (abs 990–1230 → 0–240) */
export const T = {
  chip: 1,
  head: 2,
  headOut: 104,
  notif: 15, // banner drops + phone vibrates (15–24)
  tapNotif: 60,
  screen: 60, // orders screen slides in
  liftPre: 85, // card appears over the screenshot card
  lift: 90, // lift off
  land: 120, // card settled
  words: [120, 150, 180] as const, // Созвонились. Договорились. Продано.
  ringCall: 120,
  ringWrite: 150,
  tapSold: 180,
  sold: 182, // pill morph
  exit: [226, 239] as const,
};
export const SCREEN_ORDERS = 'screens/m-light-orders-seller.png';
export const SCREEN_HOME = 'screens/m-light-home-farmer.png';
// where the order card sits in m-light-orders-seller (390×844 css px)
export const CARD_AT = {x: 17, y: 304};
