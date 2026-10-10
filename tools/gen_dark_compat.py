#!/usr/bin/env python3
"""Собирает css/theme-dark-compat.css — тёмные версии старых стилей.

В style.css, farmer.css и в стилях, которые вставляют admin.js и delivery.js,
много цветов записано прямо (#fff, #111827 ...), а не токенами. Скрипт находит
светлые фоны и тёмный текст и пишет для них правила под html[data-theme="dark"]:
  * светлый нейтральный фон  -> var(--card)
  * светлый цветной фон      -> тот же оттенок, но тёмный
  * тёмный нейтральный текст -> var(--ink) / var(--ink-2) / var(--ink-3)
  * тёмный цветной текст     -> тот же оттенок, но светлый
  * светлые рамки            -> var(--rule)
Плюс правила для частых inline-стилей (style="background:#fff" и т. п.) в js/pages.

Запуск из корня репозитория:  python3 tools/gen_dark_compat.py
Перезапускать после правок старых стилей.
"""
import colorsys
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent / 'agroverse front'
OUT = ROOT / 'css' / 'theme-dark-compat.css'
DARK = 'html[data-theme="dark"]'

NAMED = {'white': (255, 255, 255), 'black': (0, 0, 0)}


def parse_color(tok):
    tok = tok.strip().lower()
    if tok in NAMED:
        return NAMED[tok] + (1.0,)
    m = re.fullmatch(r'#([0-9a-f]{3}|[0-9a-f]{6})', tok)
    if m:
        h = m.group(1)
        if len(h) == 3:
            h = ''.join(c * 2 for c in h)
        return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (1.0,)
    m = re.fullmatch(r'rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)', tok)
    if m:
        a = float(m.group(4)) if m.group(4) is not None else 1.0
        return int(m.group(1)), int(m.group(2)), int(m.group(3)), a
    return None


def hls(c):
    return colorsys.rgb_to_hls(c[0] / 255, c[1] / 255, c[2] / 255)


def to_hex(h, l, s):
    r, g, b = colorsys.hls_to_rgb(h, l, s)
    return '#%02X%02X%02X' % (round(r * 255), round(g * 255), round(b * 255))


def dark_bg(c):
    """Светлый фон -> тёмный. None, если фон не светлый (его не трогаем)."""
    r, g, b, a = c
    if a < 0.5:
        return None
    h, l, s = hls(c)
    if l < 0.82:
        return None
    if s < 0.18 or l > 0.985:
        return 'var(--card)'
    if 0.22 <= h <= 0.48:  # светло-зелёные плашки — наш тёмно-зелёный «выбранный» фон
        return 'var(--sprout)'
    return to_hex(h, 0.15, min(s, 0.4))


def light_fg(c):
    """Тёмный текст -> светлый. None, если текст и так светлый."""
    h, l, s = hls(c)
    if l > 0.55:
        return None
    if s < 0.2:
        if l < 0.2:
            return 'var(--ink)'
        if l < 0.35:
            return 'var(--ink-2)'
        return 'var(--ink-3)'
    return to_hex(h, 0.72, min(s, 0.7))


def light_border(c):
    h, l, s = hls(c)
    return 'var(--rule)' if l > 0.75 and c[3] > 0.3 else None


COLOR_RE = re.compile(r'#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|rgba?\([^)]*\)|\bwhite\b')


def convert_decl(prop, val):
    prop = prop.strip().lower()
    imp = '!important' in val
    v = val.replace('!important', '').strip()
    out = None
    if prop in ('background', 'background-color', 'background-image'):
        cols = COLOR_RE.findall(v)
        if not cols:
            return None
        parsed = [parse_color(x) for x in cols]
        if any(p is None for p in parsed):
            return None
        conv = [dark_bg(p) for p in parsed]
        if all(x is not None for x in conv):
            # весь фон светлый: градиент из светлых цветов -> плоский тёмный фон
            if 'gradient' in v:
                out = conv[0]
            else:
                out = COLOR_RE.sub(lambda m: dark_bg(parse_color(m.group(0))), v)
            prop = 'background'
    elif prop == 'color':
        c = parse_color(v)
        if c and c[3] > 0.5:
            out = light_fg(c)
    elif prop in ('border', 'border-top', 'border-bottom', 'border-left', 'border-right', 'border-color'):
        cols = COLOR_RE.findall(v)
        if len(cols) == 1:
            c = parse_color(cols[0])
            if c:
                nb = light_border(c)
                if nb:
                    out = v.replace(cols[0], nb)
    if out is None:
        return None
    return f'{prop}: {out}{" !important" if imp else ""}'


def iter_rules(css, prelude_stack=()):
    """Простой разбор CSS: (обёртки @media, селектор, тело)."""
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    i, n = 0, len(css)
    while i < n:
        j = css.find('{', i)
        if j < 0:
            return
        head = css[i:j].strip()
        depth, k = 1, j + 1
        while k < n and depth:
            if css[k] == '{':
                depth += 1
            elif css[k] == '}':
                depth -= 1
            k += 1
        body = css[j + 1:k - 1]
        if head.startswith('@media') or head.startswith('@supports'):
            yield from iter_rules(body, prelude_stack + (head,))
        elif head.startswith('@'):
            pass  # @keyframes, @font-face — пропускаем
        elif head:
            yield prelude_stack, head, body
        i = k


def prefix(selector):
    parts = []
    for sel in selector.split(','):
        sel = sel.strip()
        if not sel:
            continue
        if sel.startswith(':root') or sel.startswith('html'):
            continue
        if sel.startswith('body'):
            parts.append(f'{DARK} {sel}')
        else:
            parts.append(f'{DARK} {sel}')
    return ', '.join(parts)


def convert_css(css, source):
    blocks = []
    for wrappers, sel, body in iter_rules(css):
        if 'data-theme' in sel:
            continue
        decls = []
        # если в правиле насыщенный/тёмный фон — текст не трогаем (белый на зелёном и т. п.)
        bg_dark_or_colored = False
        for d in body.split(';'):
            if ':' not in d:
                continue
            p, v = d.split(':', 1)
            if p.strip().lower() in ('background', 'background-color'):
                if re.search(r'var\(--(sun|fill|field|danger)', v):
                    bg_dark_or_colored = True  # текст на жёлтой/зелёной плашке оставляем как есть
                cols = [parse_color(x) for x in COLOR_RE.findall(v)]
                if any(c and dark_bg(c) is None and c[3] > 0.5 for c in cols):
                    bg_dark_or_colored = True
        for d in body.split(';'):
            if ':' not in d:
                continue
            p, v = d.split(':', 1)
            if p.strip().lower() == 'color' and bg_dark_or_colored:
                continue
            c = convert_decl(p, v)
            if c:
                decls.append(c)
        if not decls:
            continue
        psel = prefix(sel)
        if not psel:
            continue
        rule = f'{psel} {{ {"; ".join(decls)}; }}'
        for w in reversed(wrappers):
            rule = f'{w} {{ {rule} }}'
        blocks.append(rule)
    return f'/* --- из {source} --- */\n' + '\n'.join(blocks) + '\n'


def injected_styles(js):
    out = []
    for m in re.finditer(r'textContent\s*=\s*`(.*?)`', js, flags=re.S):
        out.append(m.group(1))
    return '\n'.join(out)


INLINE_RE = re.compile(r'(background(?:-color)?|color|border(?:-(?:top|bottom|left|right))?)\s*:\s*([^;"\']+)')


def inline_rules():
    seen = {}
    for f in sorted((ROOT / 'js' / 'pages').glob('*.js')):
        src = f.read_text(encoding='utf-8')
        for attr in re.findall(r'style="([^"]*)"', src) + re.findall(r"style\.cssText\s*=\s*'([^']*)'", src):
            for m in INLINE_RE.finditer(attr):
                raw = m.group(0).strip()
                if '${' in raw:
                    continue
                conv = convert_decl(m.group(1), m.group(2))
                if conv:
                    seen[raw] = conv
    rules = []
    for raw, conv in sorted(seen.items()):
        q = raw.replace('"', '\\"')
        prop, val = conv.split(':', 1)
        val = val.replace('!important', '').strip()
        rules.append(f'{DARK} [style*="{q}"] {{ {prop}: {val} !important; }}')
    return '/* --- inline style="..." в js/pages --- */\n' + '\n'.join(rules) + '\n'


def main():
    parts = ['/* СГЕНЕРИРОВАНО tools/gen_dark_compat.py — не править руками.\n'
             '   Тёмные версии старых стилей с зашитыми цветами. */\n']
    for name in ('style.css', 'farmer.css'):
        parts.append(convert_css((ROOT / 'css' / name).read_text(encoding='utf-8'), f'css/{name}'))
    for name in ('admin.js', 'delivery.js'):
        js = (ROOT / 'js' / 'pages' / name).read_text(encoding='utf-8')
        css = injected_styles(js)
        if css.strip():
            parts.append(convert_css(css, f'js/pages/{name}'))
    parts.append(inline_rules())
    OUT.write_text('\n'.join(parts), encoding='utf-8')
    print(f'{OUT.relative_to(ROOT.parent)}: {OUT.stat().st_size // 1024} KB')


if __name__ == '__main__':
    main()
