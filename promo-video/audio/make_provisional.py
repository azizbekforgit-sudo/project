#!/usr/bin/env python3
"""Writes provisional_cues.json: every SFX event listed in STORYBOARD.md (absolute frames), same schema as
cues.json.  Used by build_audio.py when cues.json holds no cues (or with --provisional).
Gain convention (same as the scene cue files): dB on the nominal level of each SFX (0 = reference level)."""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
FPS = 30
SCENES = [('s01', 0, 180), ('s02', 180, 420), ('s03', 420, 600), ('s04', 600, 810), ('s05', 810, 990),
          ('s06', 990, 1230), ('s07', 1230, 1380), ('s08', 1380, 1560), ('s09', 1560, 1620), ('s10', 1620, 1800)]
MUSIC = {'bpm': 120, 'key': 'A minor', 'sections': [
    {'from': 0, 'to': 180, 'name': 'intro-tension', 'energy': 0.25}, {'from': 180, 'to': 405, 'name': 'problem-build', 'energy': 0.5},
    {'from': 405, 'to': 420, 'name': 'hush', 'energy': 0.0}, {'from': 420, 'to': 480, 'name': 'collapse', 'energy': 0.35},
    {'from': 480, 'to': 1560, 'name': 'main-groove', 'energy': 0.85}, {'from': 1560, 'to': 1620, 'name': 'values-stops', 'energy': 0.7},
    {'from': 1620, 'to': 1740, 'name': 'finale', 'energy': 0.8}, {'from': 1740, 'to': 1800, 'name': 'tail', 'energy': 0.2}],
    'accents': [480, 600, 810, 990, 1230, 1380, 1560, 1575, 1590, 1620, 1740]}

C = []
def c(f, sfx, gain=0, pan=None, **params):
    d = {'f': f, 'sfx': sfx, 'gain': gain}
    if pan is not None: d['pan'] = pan
    if params: d['params'] = params
    C.append(d)

# ---- S01 hook (0-180)
c(14, 'swish', -17, dur=0.3); c(16, 'hit_soft', -2)
c(18, 'scramble', -16, frames=30); c(48, 'lock', -7)
c(28, 'card_shuffle', -13, 0.3, dur=0.45)
for k, f in enumerate([45, 60, 75, 90]):
    c(f, 'card_place', -7, 0.3); c(f, 'tick', -13)
c(105, 'card_place', -5, 0.3); c(105, 'lock', -4)
c(122, 'swish', -14, dur=0.35)
c(124, 'scramble', -16, frames=24); c(148, 'lock', -7)
c(150, 'stamp', -9)
c(180, 'whoosh', -7, dur=0.5)
# ---- S02 chain (180-420), hush from 400
c(181, 'card_shuffle', -9, 0.5, dur=0.45)
for k, (f, p) in enumerate(zip([210, 240, 270, 300, 330], [-0.36, -0.18, 0, 0.18, 0.36])):
    c(f - 8, 'swish', -15, p + 0.2); c(f, 'card_place', -5, p)
c(216, 'hit_soft', -7, -0.36); c(219, 'pop', -10, -0.36)
for f, p in [(255, -0.18), (285, 0), (315, 0.18)]:
    c(f - 2, 'tick', -13, p); c(f, 'stamp', -1, p)
c(333, 'tick', -13, 0.36); c(345, 'pop', -5, 0.36)
c(351, 'hit_soft', -8, -0.2); c(366, 'impact', -4, 0.1)
# ---- S03 turn + brand (420-600)
c(422, 'card_shuffle', -6, 0, dur=0.5); c(437, 'whoosh', -8, 0.1, dur=0.6); c(426, 'swish', -12, 0.2)
c(435, 'switch', -8, -0.6); c(440, 'shimmer', -13, -0.4); c(443, 'swish', -15, -0.1)
c(450, 'hit_soft', -7, -0.3); c(465, 'hit_soft', -7, 0.4)
c(456, 'pop', -9)
c(480, 'reverse_cymbal', -6, dur=1.0); c(480, 'boom', 0); c(480, 'logo_sting', -3)
c(486, 'whoosh', -12, dur=0.5); c(488, 'pop', -6)
c(500, 'scramble', -11, frames=26); c(503, 'shimmer', -8); c(526, 'lock', -5)
c(519, 'hit_soft', -10)
c(596, 'swish', -8, -0.5)
# ---- S04 sell (600-810)
c(600, 'whoosh', -12, 0.5, dur=0.45)
c(604, 'scramble', -17, -0.6, frames=11); c(615, 'lock', -12, -0.6)
c(615, 'pop', -16, 0.2); c(621, 'pop', -17, 0.85); c(627, 'pop', -18, 0.8)
for tap, nxt in [(672, 677), (727, 732)]:
    c(tap, 'ui_tap', -5, 0.45); c(nxt, 'swish', -15, 0.4)
c(775, 'ui_tap', -4, 0.5); c(780, 'success', -3, 0.35)
c(808, 'swish', -7, -0.3)
# ---- S05 buy (810-990)
c(810, 'whoosh', -13, 0.4, dur=0.45)
c(813, 'scramble', -17, -0.6, frames=11); c(824, 'lock', -12, -0.6)
for f in [830, 845, 860, 875]: c(f, 'tick', -14, 0.3)
for f in [834, 838, 842]: c(f, 'card_place', -19, 0.2)
c(844, 'card_shuffle', -7, 0.25, dur=1.3); c(887, 'hit_soft', -9, 0.25)
for k, f in enumerate(range(905, 929, 4)): c(f, 'card_place', -14, [-0.1, 0.2, 0.5, -0.1, 0.2, 0.5][k])
c(948, 'swish', -22, 0.0); c(960, 'ui_tap', -5, -0.1); c(965, 'swish', -20, 0.5); c(970, 'pop', -9, 0.6)
c(988, 'swish', -8, -0.3)
# ---- S06 order (990-1230)
c(994, 'swish', -12); c(991, 'scramble', -14, frames=8); c(999, 'lock', -12)
c(1005, 'notification', -6); c(1005, 'vibrate', -6)
c(1050, 'ui_tap', -6); c(1056, 'swish', -12); c(1078, 'pop', -10); c(1094, 'swish', -9)
c(1110, 'hit_soft', -8); c(1140, 'hit_soft', -8)
c(1170, 'ui_tap', -4); c(1172, 'success', -4); c(1174, 'shimmer', -16)
c(1227, 'whoosh', -8, dur=0.5)
# ---- S07 talk + assistant (1230-1380)
c(1242, 'bubble', -8, 0.25); c(1250, 'typing', -16, -0.2, frames=12)
c(1262, 'bubble', -8, -0.25); c(1282, 'bubble', -8, 0.25)
c(1287, 'pop', -10, 0.3); c(1299, 'swish', -9); c(1304, 'shimmer', -12)
c(1312, 'typing', -12, -0.2, frames=19); c(1334, 'ui_tap', -6, 0.2); c(1336, 'bubble', -8, 0.25)
c(1342, 'typing', -16, -0.2, frames=10)
for f in [1352, 1357, 1362, 1367]: c(f, 'tick', -14)
c(1376, 'lock', -12)
# ---- S08 comfort (1380-1560)
c(1386, 'swish', -12); c(1391, 'ui_tap', -8)
for f0, fr, lk in [(1395, 13, 1408), (1410, 12, 1422), (1425, 13, 1438)]:
    c(f0, 'switch', -6); c(f0, 'card_shuffle', -10, dur=0.25); c(f0, 'scramble', -12, frames=fr); c(lk, 'lock', -8)
c(1440, 'card_shuffle', -9, dur=0.3)
c(1450, 'ui_tap', -8); c(1455, 'switch', -4); c(1465, 'whoosh', -10, dur=0.5)
c(1509, 'ui_tap', -8); c(1515, 'switch', -6); c(1517, 'swish', -10)
c(1558, 'whoosh', -8, dur=0.4)
# ---- S09 values (1560-1620): three slams, then the seed rises
c(1560, 'impact', -3); c(1575, 'impact', -3); c(1590, 'impact', -2)
c(1605, 'shimmer', -14)
# ---- S10 end card (1620-1800)
c(1625, 'pop', -10); c(1638, 'swish', -16); c(1655, 'swish', -18)
for f in [1695, 1705, 1715]: c(f, 'pop', -14, [-0.4, 0, 0.4][[1695, 1705, 1715].index(f)])
c(1740, 'shimmer', -6); c(1740, 'boom', -9)

C.sort(key=lambda d: d['f'])
for d in C:
    d['t'] = round(d['f'] / FPS, 4)
    d['scene'] = next(s for s, a, b in SCENES if a <= d['f'] < b) if d['f'] < 1800 else 's10'
doc = {'fps': FPS, 'beat': 15, 'bar': 60, 'total': 1800,
       'scenes': [{'id': s, 'from': a, 'to': b} for s, a, b in SCENES], 'music': MUSIC, 'cues': C, 'provisional': True}
json.dump(doc, open(os.path.join(HERE, 'provisional_cues.json'), 'w'), indent=1)
print(f'provisional_cues.json: {len(C)} cues')
