/* S07 timing — relative frames (scene = abs 1230–1380). */
export const T = {
  b1: 12, // buyer bubble
  b2: 32, // farmer bubble (typing dots 20–32)
  b3: 52, // buyer bubble
  dots: [20, 32] as const,
  call: 57, // call button ring pulse
  capOut: 54, // chat caption leaves
  slide: [62, 76] as const, // chat → assistant (app-style push)
  capAi: 62, // assistant caption enters
  orb: 74, // orb flare (assistant screen settled)
  chip: 74, // suggestion chip appears
  typeStart: 82,
  typeEnd: 101,
  send: 104, // tap send
  user: 106, // user bubble pops
  aiDots: [112, 122] as const,
  lines: [122, 127, 132, 137] as const,
};
export const QUESTION = 'Что выгодно сажать этой весной?';
export const ANSWER = [
  'Посмотрите, что ищут на',
  'рынке в вашем районе,',
  'и выберите культуры,',
  'которые хорошо растут у вас.',
];
