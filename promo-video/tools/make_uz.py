#!/usr/bin/env python3
"""Builds the Uzbek (Latin) variant of the film: ../promo-video-uz

Copy of the project where every on-screen Russian string is replaced by its Uzbek translation
(dictionary below). Timing, audio and layout code are shared, so the film is identical in length.
Screens come from public/screens-uz (re-shot app with the Uzbek UI) when that folder exists.

  python3 tools/make_uz.py          # regenerate ../promo-video-uz
  cd ../promo-video-uz && npx remotion render ...
"""
import os, re, shutil, sys

SRC = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DST = os.path.abspath(os.path.join(SRC, '..', 'promo-video-uz'))

# Uzbek Latin as used by the app itself: ʻ (U+02BB) in oʻ gʻ, ʼ (U+02BC) in eʼlon
# ── substring replacements, applied longest-first (unambiguous, multi-word) ──
PHRASES = {
    # product data (same as seeded in the re-shot screens)
    'Помидоры «Бычье&nbsp;сердце»': 'Pomidor «Buqa&nbsp;yuragi»',
    'Помидоры «Бычье сердце»': 'Pomidor «Buqa yuragi»',
    'Яблоки «Самаркандские»': 'Olma «Samarqand»',
    'Арбуз сладкий': 'Shirin tarvuz',
    'Перец болгарский': 'Bolgar qalampiri',
    'Молоко домашнее': 'Uy suti',
    'Райхон и зелень': 'Rayhon va koʻkatlar',
    'Пшеница твёрдая': 'Qattiq bugʻdoy',
    'Сыр домашний': 'Uy pishlogʻi',
    'Самарканд, Каттакурган': 'Samarqand, Kattaqoʻrgʻon',
    'Самарканд, Пайарык': 'Samarqand, Payariq',
    'Самарканд, Ургут': 'Samarqand, Urgut',
    'Фергана, Кува': 'Fargʻona, Quva',
    'Фергана, Маргилан': 'Fargʻona, Margʻilon',
    'Самарканд': 'Samarqand',
    'Фергана': 'Fargʻona',
    'Алишер Усмонов': 'Alisher Usmonov',
    'Ботир Рахимов': 'Botir Rahimov',
    'Дилноза Каримова': 'Dilnoza Karimova',
    'Дилноза:': 'Dilnoza:',
    '240 000 сум': '240 000 soʻm',
    '20&nbsp;кг': '20&nbsp;kg',
    '20 кг': '20 kg',
    'сум/{p.unit}': 'soʻm/{p.unit}',
    # s01
    'Фермер вырастил': 'Fermer yetishtirdi',
    'Но цену назначает не он.': 'Lekin narxni belgilash unga emas.',
    'Но цену назначает': 'Lekin narxni belgilash',
    # s02 / s03
    'Каждый перекупщик': 'Har bir vositachi',
    'забирает свою долю.': 'oʻz ulushini oladi.',
    'Оптовый базар': 'Ulgurji bozor',
    'Рынок фермеров Узбекистана': 'Oʻzbekiston fermerlar bozori',
    'Продайте урожай.': 'Hosilingizni soting.',
    'Найдите нужный продукт.': 'Kerakli mahsulotni toping.',
    'Найдите нужный': 'Kerakli mahsulotni',
    # s04
    'цена, количество': 'narx, miqdor',
    'пара минут.': 'bir necha daqiqa.',
    'Товар успешно опубликован!': 'Mahsulot muvaffaqiyatli eʼlon qilindi!',
    'Опубликовать товар': 'Mahsulotni eʼlon qilish',
    # s05
    'Прямо у того, кто вырастил.': 'Bevosita yetishtirgan odamdan.',
    'находит свежее': 'toza hosilni topadi',
    # s07
    'Здравствуйте! Помидоры ещё есть?': 'Assalomu alaykum! Pomidor hali bormi?',
    'Да, есть. Соберём утром — будут свежие.': 'Ha, bor. Ertalab terib beramiz — yangi boʻladi.',
    'Отлично, заберу завтра.': 'Zoʻr, ertaga olib ketaman.',
    'Фермер · в сети': 'Fermer · tarmoqda',
    'Напишите сообщение…': 'Xabar yozing…',
    'ИИ-помощник AgroVerse': 'AgroVerse AI-yordamchisi',
    'Что выгодно сажать этой весной?': 'Bu bahorda nima ekish foydali?',
    'Посмотрите, что ищут на': 'Hududingizdagi bozorda nima',
    'рынке в вашем районе,': 'qidirilayotganini koʻring',
    'и выберите культуры,': 'va sizning yeringizda yaxshi',
    'которые хорошо растут у вас.': 'oʻsadigan ekinlarni tanlang.',
    'Пишите': 'Yozing va',
    'и звоните —': 'qoʻngʻiroq qiling —',
    '24/7 — ответит': '24/7 — javob beradi',
    # s08
    'Светлая и': 'Yorugʻ va',
    'тёмная тема': 'qorongʻi rejim',
    'Крупный текст —': 'Katta matn —',
    'удобно всем': 'hamma uchun qulay',
    # s10
    'Ваш урожай —': 'Hosilingiz —',
    'ваша цена.': 'narxi ham sizniki.',
    'Свежие продукты —': 'Toza mahsulotlar —',
    'прямо с поля.': 'toʻgʻri dalaning oʻzidan.',
}

# ── whole-literal replacements: only when the text is the entire string literal / JSX text node ──
UNITS = {'кг': 'kg', 'литр': 'litr', 'пучок': 'bogʻ'}
EXACT = {
    'продукт.': 'toping.',
    'Фермер': 'Fermer', 'Перекупщик': 'Vositachi', 'Магазин': 'Doʻkon', 'Вы': 'Siz',
    '+ наценка': '+ ustama', 'цена': 'narx', 'Сейчас': 'Hozir', 'сейчас': 'hozir',
    'Фермеру —': 'Fermerga —', 'мало.': 'oz.', 'Вам —': 'Sizga —', 'дорого.': 'qimmat.',
    'Напрямую.': 'Bevosita.', 'С AgroVerse': 'AgroVerse bilan',
    'вырастил': 'yetishtirdi', 'помидоры': 'pomidor', 'яблоки': 'olma', 'пшеницу': 'bugʻdoy', 'дыни': 'qovun',
    'урожай.': 'hosil.', 'не он.': 'unga emas.', 'Но цену': 'Lekin narxni', 'назначает': 'belgilash',
    'свою': 'oʻz', 'долю.': 'ulushini', 'Каждый': 'Har bir', 'перекупщик': 'vositachi', 'забирает': 'oladi.',
    'Фото,': 'Rasm,', 'выставляет': 'mahsulotni', 'товар': 'joylaydi',
    'Категория': 'Kategoriya', 'Назад': 'Orqaga', 'В корзину': 'Savatga', 'В корзине': 'Savatchada',
    'Овощи': 'Sabzavotlar', 'Фрукты': 'Mevalar', 'Зелень': 'Koʻkatlar', 'Зерновые': 'Don', 'Молочные': 'Sut mahsulotlari',
    'Мёд': 'Asal', 'Цветы': 'Gullar', 'Саженцы': 'Koʻchatlar', 'Бахчевые': 'Poliz ekin', 'Семена': 'Urugʻlar', 'Земля': 'Yer va mulk',
    'Продукты': 'Mahsulot',
    'Покупатель': 'Xaridor', 'находит': 'topadi', 'свежее': 'toza hosilni',
    'Заказ —': 'Buyurtma —', 'сразу': 'bevosita', 'фермеру': 'fermerga',
    'Созвонились': 'Gaplashdik', 'Договорились': 'Kelishdik', 'Продано': 'Sotildi',
    'Новый заказ': 'Yangi buyurtma', 'Количество': 'Miqdor', 'Сумма': 'Summa',
    'Позвонить': 'Qoʻngʻiroq', 'Написать': 'Yozish', 'Отклонить': 'Rad etish',
    'Чат': 'Chat', 'ИИ-помощник': 'AI-yordamchi', 'Помощник': 'Yordamchi', 'на вопрос': 'savollarga',
    'напрямую': 'bevosita', 'в сети': 'tarmoqda', 'Три языка': 'Uch til',
    'Крупный': 'Katta', 'текст —': 'matn —',
    'Честно': 'Halol', 'Просто': 'Oddiy', 'Рядом': 'Yaqin',
    'А': 'A',
}

# ── layout patches where Uzbek is wider/narrower than Russian (path → [(old, new)]) ──
PATCHES = {
    'src/scenes/s01.tsx': [
        ('const FS = u(100);', 'const FS = u(86);'),
        ('const l1W = 11.76 * FS;', 'const l1W = 14.2 * FS;'),
    ],
    'src/scenes/s03/parts.tsx': [
        ('const wOld = 6 * adv;', 'const wOld = 5 * adv;'),
        ('const wNew = 11 * adv;', 'const wNew = 15 * adv;'),
    ],
    'src/scenes/s02.tsx': [
        ("['Har bir', 'vositachi', 'oladi.', 'свою долю.']", "['Har bir', 'vositachi', 'oʻz ulushini', 'oladi.']"),
    ],
    'src/scenes/s03.tsx': [
        ("['Har bir', 'vositachi', 'oladi.', 'свою долю.']", "['Har bir', 'vositachi', 'oʻz ulushini', 'oladi.']"),
    ],
    'src/scenes/s08.tsx': [
        ("['Katta', 'matn —', 'hamma uchun qulay']", "['Katta matn —', 'hamma uchun', 'qulay']"),
    ],
    'src/scenes/s10.tsx': [
        ('const t1 = vertical ? u(92) : u(120);', 'const t1 = vertical ? u(78) : u(120);'),
    ],
    'src/scenes/s05.tsx': [
        ("['Xaridor', 'topadi', 'toza hosilni']", "['Xaridor', 'toza hosilni', 'topadi']"),
        ("(w === 'toza hosilni' ?", "(w === 'toza' || w === 'hosilni' ?"),
    ],
}


def pat(ru):
    # spaces in the source may be regular or non-breaking
    return re.escape(ru).replace('\\ ', '[ \u00a0]')


def exact_variants(ru):
    q = pat(ru)
    return [
        (re.compile(r"'" + q + r"'"), None, "'"),
        (re.compile(r'"' + q + r'"'), None, '"'),
        (re.compile(r'(>\s*)' + q + r'(\s*<)'), None, None),
        (re.compile(r'(\n\s*)' + q + r'(\s*\n)'), None, None),
    ]


def translate(text):
    for ru in sorted(PHRASES, key=len, reverse=True):
        uz = PHRASES[ru]
        text = re.sub(pat(ru), lambda m: uz, text)
    text = re.sub(r"(\d[\d ]*) (кг|литр|пучок) в наличии", lambda m: f"{m.group(1)} {UNITS[m.group(2)]} mavjud", text)
    text = re.sub(r"unit: '(кг|литр|пучок)'", lambda m: f"unit: '{UNITS[m.group(1)]}'", text)
    for ru in sorted(EXACT, key=len, reverse=True):
        uz = EXACT[ru]
        for rx, _, quote in exact_variants(ru):
            if quote:
                text = rx.sub(quote + uz.replace('\\', '\\\\') + quote, text)
            else:
                text = rx.sub(lambda m: m.group(1) + uz + m.group(2), text)
    return text


def main():
    if os.path.exists(DST):
        shutil.rmtree(DST)
    ignore = shutil.ignore_patterns('node_modules', 'build', 'out', '.git', 'stems', '__pycache__')
    shutil.copytree(SRC, DST, ignore=ignore, symlinks=True)
    os.symlink(os.path.join(SRC, 'node_modules'), os.path.join(DST, 'node_modules'))
    # screens: original set overlaid with the Uzbek re-shoots
    uzs = os.path.join(SRC, 'public', 'screens-uz')
    if os.path.isdir(uzs):
        for f in os.listdir(uzs):
            shutil.copy2(os.path.join(uzs, f), os.path.join(DST, 'public', 'screens', f))
        shutil.rmtree(os.path.join(DST, 'public', 'screens-uz'), ignore_errors=True)
    n = 0
    for root, _, files in os.walk(os.path.join(DST, 'src')):
        for fn in files:
            if not fn.endswith(('.ts', '.tsx')) or fn.startswith(('gf-', 'fa-')) or fn.endswith('.cues.ts'):
                continue
            p = os.path.join(root, fn)
            s = open(p, encoding='utf-8').read()
            t = translate(s)
            if t != s:
                open(p, 'w', encoding='utf-8').write(t)
                n += 1
    for rel, pairs in PATCHES.items():
        p = os.path.join(DST, rel)
        s = open(p, encoding='utf-8').read()
        for old, new in pairs:
            if old not in s:
                print('PATCH MISS', rel, old, file=sys.stderr)
            s = s.replace(old, new)
        open(p, 'w', encoding='utf-8').write(s)
    # leftover Russian in code (not comments) → report
    left = []
    for root, _, files in os.walk(os.path.join(DST, 'src')):
        for fn in files:
            if fn.endswith(('.ts', '.tsx')) and not fn.startswith(('gf-', 'fa-')):
                for i, line in enumerate(open(os.path.join(root, fn), encoding='utf-8'), 1):
                    code = re.sub(r'//.*$|/\*.*?\*/', '', line)
                    if re.search(r'[А-Яа-яЁё]{2,}', code) and 'POOL_RU' not in code and 'A-Za-zА' not in code:
                        left.append(f'{os.path.relpath(os.path.join(root, fn), DST)}:{i}: {line.strip()[:120]}')
    print(f'translated {n} files -> {DST}')
    print('\n'.join(left) if left else 'no Russian left in code')


main()
