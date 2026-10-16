# AgroVerse — 60 s promo film · STORYBOARD (v1)

**Logline.** A harvest passes through too many hands. AgroVerse removes them: the farmer sells, the buyer buys, directly.
**Language.** All on-screen text in **Russian** (one shuffle beat shows uz/en briefly). No voice-over: music + SFX + kinetic type.
**Format.** 1920×1080 (`Main`) and 1080×1920 (`Vertical`), 30 fps, 1800 frames. 120 BPM → beat = 15 f, bar = 60 f.
**Audience.** Farmers and buyers in Uzbekistan, many older: big type, one idea per moment, reads held long enough (≈10–12 Cyrillic chars/s).

## World, palette, motif
- **Colour arc:** NIGHT (problem) → SUNRISE flood at the drop → DAYLIGHT cream (product) → NIGHT-GREEN accent beats → DUSK field (end card, rhymes with the opening).
- Night `#0B140F`, cream text `#F3EFE4`, sun `#F0B429`, coral `#F07167` (only for "+ наценка"/"не он"). Day: ground `#F6F6F1`, field green `#1F5C35`, deep `#143D24`, sprout `#EAF2E6`, ink `#1A201C`.
- **Continuity carrier: the SUN SEED** — a small glowing sun-yellow dot. It falls in at frame 4, pulses on beats, rides the price line in the chain, travels Фермер→Вы, then becomes the **yellow leaf** of the logo at the drop. Later it is the tap dot / notification dot / selected-state accent, and in the end card it is the sun of the dusk field. Keep it alive in every scene in some form.
- **Type voices:** Unbounded 800 (statements), Rubik 600/700 (brand + UI), Golos Text (UI/body), JetBrains Mono (scramble glyphs, small labels like «01»).

## Copy rules
- Max ~5 words per headline; non-breaking spaces after short words (use `nbsp()` from theme.ts). «Ёлочки», em dash with spaces.
- **No invented numbers or claims**: no %, no user counts, no «бесплатно», no «гарантия», no «доставка по всей стране». Prices appear only inside UI cards (they mirror the app's own sample listings).

---

## S01 Hook · f 0–180 (6 s) · NIGHT
Purpose: in 6 s the viewer knows the problem.
- f0–8: black → night bg fades in with grain. f4–16: the **sun seed** drops from above to the centre-left of the first line, lands with a small squash at **f16** (`hit_soft`). Glow breathes on every beat.
- f18–50: line 1 **«Фермер вырастил»** decodes (ScrambleText, order `center`, mono sun glyphs → cream Unbounded). Ticks while scrambling, `lock` on finish.
- Slot word (WordSwap, sun colour) right after/under it rolls on beats: **«помидоры» (f45) → «яблоки» (f60) → «пшеницу» (f75) → «дыни» (f90) → «урожай.» (f105)**. Next to the slot a stack of Fluent emoji **cards shuffles** in sync (tomato → red-apple → sheaf-of-rice → melon → seedling), each swap a quick card flip (`card_place`/`tick` per swap, `lock` on «урожай.»).
- f120–128: line 1 + slot slide up and dim to 35 %. f124–158: line 2 **«Но цену назначает не он.»** decodes ltr; «не он» in coral with a hand-drawn underline that draws f150–160 (`stamp` soft at f150).
- f160–180: hold, slow push-in 1.00→1.04. Exit f172–180: everything accelerates up with blur (whip up) — `whoosh` peaking at f180.
- Vertical: lines stack, ~92 px Unbounded, centred block, emoji stack above the text.

## S02 The chain · f 180–420 (8 s) · NIGHT
Purpose: show *why* (middlemen markups) without numbers.
- f182–200: entrance from below (velocity-matched with S01's whip). Pill «Сейчас» (mono, outline) + headline **«Каждый перекупщик забирает свою долю.»** (RiseText, 2 lines, cream; «свою долю» in sun).
- Cards are **dealt from a deck** (card shuffle feel) onto a horizontal line (vertical cut: a vertical column), one every 30 f, each with an FA icon + label:
  **Фермер** (wheat-awn) f210 · **Перекупщик** (user-tie) f240 · **Оптовый базар** (warehouse) f270 · **Магазин** (shop) f300 · **Вы** (user) f330. `card_place` on each.
- Between cards an arrow line draws. On each middleman card a coral rubber-stamp **«+ наценка»** slams at f255, f285, f315 (`stamp`), card shakes 2 px.
- **Price tag** (sun yellow tag shape with the word «цена», no digits) rides along the line above the cards, hopping to each card and **growing** each hop: scale 1.0 → 1.25 → 1.5 → 1.8 → 2.1 (spring pop). At the end it glows hot (sun→coral tint).
- f350–395: result line **«Фермеру — мало. Вам — дорого.»** — "мало" set small (0.6×), "дорого" set big (1.4×, coral). RiseText in two beats (f350, f365).
- f396–420: **HUSH** — everything freezes; only a very slow push-in (1.0→1.015). No new motion after f400. (Music near-silent 405–420.)

## S03 Turn + brand reveal · f 420–600 (6 s) · NIGHT → SUNRISE → DAY
Purpose: the turn. Middlemen vanish; AgroVerse appears.
- f420: the three middleman cards **lift and shuffle out** (riffle: rotate ±12°, fly up/out with blur, staggered 3 f) — `card_shuffle` + `whoosh`. Coral stamps fly off with them. The price tag shrinks back to 1.0.
- f432–460: **Фермер** and **Вы** slide toward each other; the line between them becomes one straight bright line; the **sun seed** travels along it Фермер→Вы (f440–470) leaving a light trail. Pill «С AgroVerse» appears (sun fill) and the word **«Напрямую.»** (Unbounded, big) masks up at f456.
- f470–480: riser peak; the seed swells.
- **f480 DROP** (`boom` + `logo_sting`): the seed **floods** the frame — a sun-yellow circle expands past all corners (f480–490) and is immediately followed by a cream circle (f484–496) revealing DAY. The **logo builds** (LogoMark, start f486, ~34 f: tile pops, stem draws, white leaf, yellow leaf = the seed). Wordmark **«AgroVerse»** decodes next to it (Latin ScrambleText, f500–526, Rubik 700, deep green).
- f530–575: under the lockup: eyebrow «Рынок фермеров Узбекистана» (mono caps-free, ink3) then the app's own hero line **«Продайте урожай. Найдите нужный продукт.»** (RiseText; second sentence in field green).
- f575–600: lockup scales down and drifts to top-left (it becomes the small brand mark the product scenes start from); `swish` at f596.

## S04 Farmer sells · f 600–810 (7 s) · DAY
- Layout 16:9: text column left (x≈140), phone right (~470 px wide), tilted rotateY −22° → −8° settling (spring heavy) in f600–640. Vertical: text top third, phone below, larger.
- Text: mono chip **«01»** + **«Фермер выставляет товар»** + sub **«Фото, цена, количество — пара минут.»**
- Phone screens (real screenshots): `m-light-new-step1-filled` (f610) → tap «Дальше» at **f672** → `m-light-new-step2-price` slides in (f675) → tap «Дальше» at **f727** → `m-light-new-step3-review` (f730) → tap «Опубликовать товар» at **f775** (`ui_tap` each). Locate the buttons on the screenshots precisely.
- **f780**: rebuilt toast slides down over the phone: green check + **«Товар успешно опубликован!»** (`success`). The sun seed is the dot on the toast.
- Parallax: 3 Fluent emoji (tomato, carrot, red-apple) float out of the phone at different depths during step 1 (category tiles idea), drifting slowly.
- Exit f795–810: phone pushes left/out, `swish` at f808.

## S05 Buyer finds · f 810–990 (6 s) · DAY
- Text: **«02»** + **«Покупатель находит свежее»** + sub **«Прямо у того, кто вырастил.»**
- A search bar (rebuilt from the app: magnifier, placeholder, mic icon) with a **word swap** inside: «Овощи → Фрукты → Зелень → Мёд» on beats f830, 845, 860, 875 (`tick`).
- **Card deck shuffle** of 6 rebuilt ProductCards (PRODUCTS[0..5]): the deck appears stacked f835, **riffles** f845–885 (split halves, interleave on arcs, `card_shuffle`), then **deals into a 3×2 grid** (16:9; 2×3 vertical) f890–930 with 3-f stagger (`card_place` ×6, quiet).
- f950: the «Помидоры «Бычье сердце»» card lifts (scale 1.06, shadow) and its «В корзину» button is tapped (**f960**, `ui_tap`) → turns green «В корзине» + small cart badge pops (+1) (`pop`).
- Exit f975–990.

## S06 Order goes straight to the farmer · f 990–1230 (8 s) · DAY
- Text: **«03»** + **«Заказ — сразу фермеру»**.
- Phone shows `m-light-home-farmer`. **f1005**: a rebuilt **push notification** drops from the top of the phone (iOS-like glass card: AgroVerse icon, «Новый заказ», «Дилноза: Помидоры «Бычье сердце» — 20 кг»). `notification` at f1005 + `vibrate` (phone wiggles 120-60-120 ms ≈ f1005–1013).
- f1050: tap the notification → phone screen goes to `m-light-orders-seller` (slide). f1080: the order card **lifts out of the phone** as a rebuilt, larger card (shared-element): product photo, «Помидоры «Бычье сердце»», «20 кг · 240 000 сум», buyer «Дилноза Каримова» with phone shown masked «+998 •• ••• •• ••», buttons «Позвонить» «Написать» «Продано» «Отклонить».
- Kinetic triplet on beats beside the card (Unbounded): **«Созвонились.» f1110 · «Договорились.» f1140 · «Продано.» f1170** (each RiseText; previous one dims).
  - f1110: «Позвонить» pulses (ring waves); f1140: «Написать» pulses;
  - **f1170**: tap «Продано» (`ui_tap`) → the card's status pill morphs into a green **«Продано ✓»** pill (`success`), 6 tiny sun dots burst once (subtle).
- Exit f1215–1230 (`whoosh` at 1230).

## S07 Talk + assistant · f 1230–1380 (5 s) · NIGHT-GREEN (dark theme UI)
- Background switches to night-green; UI shown in **dark theme** (the app has it).
- f1230–1300: rebuilt **chat**: header with farmer avatar «Алишер Усмонов» + call icon; bubbles pop (`bubble`):
  buyer «Здравствуйте! Помидоры ещё есть?» f1242 · farmer «Да, есть. Соберём утром — будут свежие.» f1262 · buyer «Отлично, заберу завтра.» f1282. Caption: **«Пишите и звоните — напрямую»**.
- f1300–1380: **AI assistant**: glowing orb + «ИИ-помощник AgroVerse» + badge «в сети». A suggestion chip «Что выгодно сажать этой весной?» is typed (`typing`), typing dots, then an answer card fades in line by line (generic, no numbers): «Посмотрите, что ищут на рынке в вашем районе, и выберите культуры, которые хорошо растут у вас.» Caption: **«Помощник 24/7 — ответит на вопрос»**.

## S08 Comfort · f 1380–1560 (6 s) · three fast 2 s beats
- **1380–1440 «Три языка»**: phone with `m-light-welcome`; its screen **shuffles like cards** between `m-light-welcome-uz` → `m-light-welcome-en` → `m-light-welcome` on beats (f1395, 1410, 1425, `switch`). Beside it, a big word scrambles between **«O‘zbekcha» → «English» → «Русский»** (ScrambleText each time, mono glyphs). Caption «Три языка».
- **1440–1500 «Светлая и тёмная тема»**: phone shows `m-light-market`; at **f1455** a circular reveal from the moon button turns it into `m-dark-market` (`switch`); the background behind flips cream → night in the same circle. Caption «Светлая и тёмная тема».
- **1500–1560 «Крупный текст»**: `m-dark-market` → `m-dark-market-textxl` (zoom-swap at f1515), caption **«Крупный текст — удобно всем»** with the caption itself growing 1.0→1.15.

## S09 Values · f 1560–1620 (2 s) · NIGHT
- Three words slam on beats, left-aligned, stacked (Unbounded, huge): **«Честно.»** f1560 · **«Просто.»** f1575 · **«Рядом.»** f1590 (`impact` ×3, music stop-time). Each word enters with a 6-f expo-out scale 1.15→1 + slight blur clear. The sun seed sits as the full stop of «Рядом.» and at f1605 starts to rise (→ it becomes the sun in S10).

## S10 End card · f 1620–1800 (6 s) · DUSK
- Background: `brand/hero-dusk.svg` (sunset field) with a slow push-in (1.0→1.06 over the scene) and the sun glow pulsing softly on beats; dark gradient at the bottom for legibility.
- f1620–1650: LogoMark (static, small spring) + Wordmark «AgroVerse» (cream) top-centre.
- f1640–1690: **«Ваш урожай — ваша цена.»** (cream) / **«Свежие продукты — прямо с поля.»** (sun) — RiseText, Unbounded.
- f1690–1720: contacts row, big and calm (Golos 600 / icons): Telegram **@agroverseai** · Instagram **@agroverse_uz** · ☎ **+998 50 900 25 41** (icons: FA brands telegram/instagram, phone). Phone number largest.
- **f1740** final musical hit: a single soft glint passes over the logo (`shimmer`). Hold everything still (only the slow push + glow) until 1800. Last 8 frames: no fade to black (music tail ends it).
