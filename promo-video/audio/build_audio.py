#!/usr/bin/env python3
"""AgroVerse 60 s ad - procedural soundtrack builder (numpy only, deterministic, ~1 min).

    python3 audio/build_audio.py [--provisional] [--no-verify] [--cues path.json]

Reads audio/cues.json (npx tsx tools/export-cues.ts); if it has no cues (or --provisional) falls back to
audio/provisional_cues.json.  Writes
    public/audio/master.wav          48 kHz / 24-bit stereo, -14 LUFS integrated, <= -1 dBTP
    audio/stems/music.wav, sfx.wav   stems (same trim as the master, before the limiter)
    audio/master_overview.png        waveform + spectrogram (via verify_audio.py)

Timeline: 30 fps, 120 BPM -> beat = 15 f, bar = 60 f.  Every event time is frame/30 s.
Cue gain (dB) is relative to the nominal level of each SFX (see SFX_TRIM); sound is aligned by its
semantic anchor: whoosh/swish f = PEAK, riser/reverse_cymbal f = END, everything else f = onset.
"""
import os, sys, json, time, zlib, argparse

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import numpy as np
import sfxlib as S

ROOT = os.path.dirname(HERE)
FPS = 30
BPM = 120
BEAT = 60.0 / BPM          # 0.5 s
STEP = BEAT / 4            # 16th = 0.125 s = 3.75 f
TOTAL_F = 1800
TOTAL_S = TOTAL_F / FPS
BUF_S = TOTAL_S + 1.5      # working buffers are a bit longer (tails), cut to 60.000 s at the end
N_OUT = int(round(TOTAL_S * S.SR))
db2a = S.db2a


def tf(f):
    return f / FPS


def log(*a):
    print(*a, flush=True)


# ============================================================================= musical material
# chord name -> bass root (midi), pad voicing, arp tones (ascending)
CH = {
    'Am': dict(bass=45, pad=[57, 60, 64, 69], arp=[57, 60, 64, 69]),
    'Dm': dict(bass=38, pad=[57, 62, 65, 69], arp=[57, 62, 65, 69]),
    'E':  dict(bass=40, pad=[56, 59, 64, 65, 68], arp=[56, 59, 64, 68]),       # E(b9) = Hijaz colour
    'F':  dict(bass=41, pad=[57, 60, 65, 69], arp=[57, 60, 65, 69]),
    'C':  dict(bass=48, pad=[55, 60, 64, 67], arp=[55, 60, 64, 67]),
    'G':  dict(bass=43, pad=[55, 59, 62, 67], arp=[55, 59, 62, 67]),
    'A':  dict(bass=45, pad=[57, 61, 64, 69, 73], arp=[57, 61, 64, 69]),         # A major (Picardy lift)
    'Em': dict(bass=40, pad=[59, 64, 67], arp=[59, 64, 67, 71]),
    'EM': dict(bass=40, pad=[56, 59, 64, 68], arp=[56, 59, 64, 68]),            # E major
    'F#m': dict(bass=42, pad=[57, 61, 66, 69], arp=[57, 61, 66, 69]),
}
MAIN_CYCLE = ['F', 'C', 'G', 'Am']


def build_chord_timeline():
    tl = [(0, 'Am'), (60, 'Dm'), (120, 'E'), (180, 'Am'), (240, 'Dm'), (300, 'E'), (360, 'E'), (420, 'E')]
    f = 480
    k = 0
    while f < 1560:
        tl.append((f, MAIN_CYCLE[k % 4]))
        f += 60
        k += 1
    tl += [(1560, 'Am'), (1575, 'F'), (1590, 'C'), (1605, 'G'),
           (1620, 'A'), (1650, 'EM'), (1680, 'F#m'), (1710, 'EM'), (1740, 'A')]
    return tl


CHORDS = build_chord_timeline()


def chord_at(f):
    name = CHORDS[0][1]
    for ff, n in CHORDS:
        if ff <= f + 1e-6:
            name = n
    return name


def chord_span(i):
    f0, name = CHORDS[i]
    f1 = CHORDS[i + 1][0] if i + 1 < len(CHORDS) else 1800
    return f0, f1, name


# intensity curve of the main groove (step function; frame -> 0..1)
I_BREAKS = [(480, 1.0), (600, 0.72), (720, 0.80), (810, 0.88), (900, 0.90), (990, 1.0), (1110, 0.95),
            (1230, 0.50), (1380, 0.92), (1500, 1.0)]


def I_at(f):
    v = I_BREAKS[0][1]
    for ff, x in I_BREAKS:
        if ff <= f + 1e-6:
            v = x
    return v


# lead (rubab) windows in the main groove: (from, to, db, octave shift)
LEAD_WINDOWS = [(480, 600, -8.0, 0), (840, 960, -12.5, 0), (1020, 1230, -9.5, 0), (1380, 1500, -8.5, 0), (1500, 1560, -8.0, 12)]
MEL_A = {
    'F': [72, None, 69, 72, 74, 72, 69, None],
    'C': [67, None, 72, 76, 79, 76, 74, 72],
    'G': [74, None, 71, 74, 79, 74, 71, None],
    'Am': [72, None, 69, 72, 76, None, 74, 72],
}
MEL_TURN = [76, None, 74, 72, 71, None, 68, 69]   # B-G#-A: Hijaz leading-tone cadence
ARP_PAT = [0, None, 2, 1, 3, None, 2, 1, 0, None, 2, 1, 3, 2, 1, 2]
BASS_PAT = [(0, 0), (2, 0), (3, 12), (6, 0), (8, 0), (10, 0), (11, 12), (14, 7)]   # (16th step, interval)
DOIRA_INTRO = "D.......T.....S."
DOIRA_A = "D.TK.KT.D.K.TKTS"
DOIRA_B = "DKTKD.TKDKT.TKTS"
DOIRA_HALF = "D.....S.....T..."


# ============================================================================= caches / sound pools
_memo = {}


def memo(key, fn):
    if key not in _memo:
        _memo[key] = fn()
    return _memo[key]


class Pools:
    def __init__(self):
        S.seed(99)
        self.kick = [S.kick() for _ in range(3)]
        self.clap = [S.clap() for _ in range(3)]
        self.hat = [S.hat() for _ in range(4)]
        self.ohat = [S.hat(True) for _ in range(2)]
        self.snare = [S.snare() for _ in range(3)]
        self.doira = {c: [S.doira(c) for _ in range(3)] for c in 'DTKSP'}
        # crashes: 808 metal tamed (low-passed) so they do not sizzle
        self.crash = [S.filt(S.cymbal(3.2, 2.4), S.rbj('lp', 9500), S.rbj('hs', 6500, 0.7, -3)) for _ in range(2)]
        self.rcym = {}
        self.n = {}

    def pick(self, lst, i):
        return lst[i % len(lst)]


POOLS = None


def pluck_note(midi, d, bright, rho, variant=0, kind='arp'):
    def mk():
        S.seed(zlib.crc32(f'{kind}{midi}{d}{variant}'.encode()) & 0xffff)
        if kind == 'rubab':
            x = S.pluck(S.mtof(midi), d, rho, bright)
            x = S.filt(x, S.rbj('peak', 2400, 1.2, 3), S.rbj('hs', 6000, 0.7, 1), S.rbj('lp', 9500))
            return S.st(x)
        if kind == 'dutar':
            return S.dutar(S.mtof(midi), d, 12)
        x = S.pluck(S.mtof(midi), d, rho, bright)
        return S.width(S.st(x), 1.0)
    return memo((kind, midi, d, bright, rho, variant), mk)


def bass_note(midi, d, variant=0):
    def mk():
        S.seed(zlib.crc32(f'bass{midi}{d}'.encode()) & 0xffff)
        f = S.mtof(midi)
        a = S.bass(f, d, 'pluck')
        b = S.bass(f, d, 'sub')
        a = S.filt(a, S.rbj('lp', 900, 0.7))
        return S.st(S.peak_norm(a, -3) * 0.55 + S.peak_norm(b, -3) * 0.85)
    return memo(('bass', midi, d), mk)


def pad_chord(name, d, cutoff, attack, release=0.8, extra=0):
    def mk():
        S.seed(zlib.crc32(f'pad{name}{d}{cutoff}'.encode()) & 0xffff)
        notes = list(CH[name]['pad'])
        if extra:
            notes += [CH[name]['bass'] + 12]
        return S.pad(notes, d, cutoff, attack, release)
    return memo(('pad', name, d, cutoff, attack, extra), mk)


def stab_chord(name, d=1.6, oct_up=0):
    def mk():
        S.seed(zlib.crc32(f'stab{name}{d}'.encode()) & 0xffff)
        notes = [n + oct_up for n in CH[name]['pad']]
        y = S.pad(notes + [CH[name]['bass'] + 24 + oct_up], d, 3800, 0.008, 0.5)
        for n in notes:
            y = y + 0.22 * S.st(S.pluck(S.mtof(n), d, 0.994, 0.8)) / len(notes) * 3
        return S.peak_norm(y, -3)
    return memo(('stab', name, d, oct_up), mk)


# ============================================================================= music composer
class Mix:
    """Layered music buses with mute windows (used to carve the 'hole' before accents)."""
    LAYERS = ['drums', 'bass', 'pad', 'pluck', 'lead', 'fx', 'stab', 'col']

    def __init__(self):
        self.b = {k: S.Bus(BUF_S) for k in self.LAYERS}
        self.mute = {k: [] for k in self.LAYERS}
        self.kicks = []       # (time, strength) for sidechain
        self.hit_times = []

    def muted(self, layer, t):
        return any(a <= t < b for a, b in self.mute[layer])

    def add(self, layer, snd, t, db=0.0, pan=None):
        if self.muted(layer, t):
            return
        self.b[layer].add(snd, t, db, pan)


def compose(accents):
    P = POOLS
    M = Mix()
    S.seed(2024)
    rng = np.random.default_rng(31337)
    kick_i = 0
    hat_i = 0

    # ---- mute windows ("holes") right before accents so the hit lands in space
    pre_hole = 0.085
    for A in accents:
        if A in (480, 1575, 1590, 1620) or A < 480:
            continue
        for ly in ('drums', 'bass', 'pluck', 'lead'):
            M.mute[ly].append((tf(A) - pre_hole, tf(A)))
    # stop-time zone: groove silent between the three hits and before the finale (hits live on 'stab'/'fx')
    for ly in ('drums', 'bass', 'pluck', 'lead'):
        M.mute[ly].append((tf(1560) - pre_hole, tf(1620) + 0.0))
    # collapse -> drop gap
    for ly in ('drums', 'bass', 'pluck', 'lead', 'col'):
        M.mute[ly].append((tf(480) - 0.05, tf(480)))
    # hush: everything dry stops at 405 (tails are shaped later)
    for ly in M.LAYERS:
        M.mute[ly].append((tf(405), tf(420)))
    # final: only the tail hit survives after 1740 (groove stops)
    for ly in ('drums', 'bass', 'pluck', 'lead'):
        M.mute[ly].append((tf(1740) - 0.085, tf(1740) + 0.02))

    # ------------------------------------------------------------------ PADS (whole film)
    for i in range(len(CHORDS)):
        f0, f1, name = chord_span(i)
        if f0 >= 1560 and f1 <= 1605:
            continue                                 # stop-time hits carry the harmony
        dur = tf(f1 - f0)
        if f0 < 180:                                  # intro: dark, slow
            snd = pad_chord(name, dur + 0.9, 1100, 0.9, 1.2)
            M.add('pad', snd, tf(f0), -17.5 + 1.2 * (f0 / 60))
        elif f0 < 405:                                # build: opening filter, rising level
            u = (f0 - 180) / 225
            cut = int(round((1300 + 1700 * u) / 100) * 100)
            M.add('pad', pad_chord(name, dur + 0.7, cut, 0.5, 0.9), tf(f0), -16 + 4 * u)
        elif f0 < 420:
            pass
        elif f0 < 480:
            M.add('col', pad_chord('E', 2.6, 2600, 0.15, 0.6, 1), tf(f0), -10)
        elif f0 < 1560:
            I = I_at(f0)
            wide = 1.35
            cut = 2400 if I < 0.6 else 3200
            lvl = -10.5 if I < 0.6 else -12.5
            snd = S.width(pad_chord(name, dur + (0.1 if f1 == 1560 else 0.5), cut, 0.12, 0.7, 1), wide)
            M.add('pad', snd, tf(f0), lvl)
        elif f0 >= 1605 and f0 < 1620:
            M.add('pad', S.width(pad_chord('G', 0.9, 2800, 0.4, 0.2), 1.4), tf(f0), -10)
        elif f0 >= 1620 and f0 < 1740:
            M.add('pad', S.width(pad_chord(name, dur + 0.5, 3600, 0.1, 0.8, 1), 1.55), tf(f0), -11.0)
        elif f0 == 1740:
            M.add('pad', S.width(pad_chord('A', 2.4, 3200, 0.05, 1.2, 1), 1.6), tf(f0), -12.5)

    # ------------------------------------------------------------------ INTRO dutar drone + Hijaz motif
    for bar in range(3):
        f0 = bar * 60
        ch = chord_at(f0)
        r = CH[ch]['bass'] + 0                  # A2 / D2 / E2
        M.add('pluck', S.dutar(S.mtof(r), 2.3, 7), tf(f0) + 0.02, -9.0 + 1.0 * bar)
        M.add('pluck', S.dutar(S.mtof(r + 12), 1.4, 7), tf(f0 + 30) + 0.01, -15)
    # Hijaz motif E-F-G#-A: first a questioning E-F in bar 1, then the whole motif in bar 2
    mot1 = [(60 + 30, 64), (60 + 37.5, 65)]
    mot2 = [(120, 64), (127.5, 65), (135, 68), (142.5, 69)]
    for f, m in mot1:
        M.add('lead', pluck_note(m + 12, 1.2, 0.5, 0.995, 0, 'dutar'), tf(f), -17)
    for f, m in mot2:
        M.add('lead', pluck_note(m + 12, 1.6 if m == 69 else 0.9, 0.5, 0.995, 0, 'dutar'), tf(f), -14 + (1.5 if m == 69 else 0))

    # ------------------------------------------------------------------ step grid (drums, bass, arps, lead)
    i0 = 0
    nsteps = int(TOTAL_F * 4 / 15) + 1
    for i in range(nsteps):
        f = 15 * i / 4.0
        if f >= TOTAL_F:
            break
        t = i * STEP
        pos = i % 16
        bar = i // 16
        sw = 0.075 * STEP if pos % 2 else 0.0
        jit = lambda ms=2.5: rng.normal(0, ms / 1000)

        # ----- 0..180 intro: sparse doira
        if f < 180:
            if bar >= 1 and DOIRA_INTRO[pos] != '.':
                c = DOIRA_INTRO[pos]
                M.add('drums', P.pick(P.doira[c], i), t, -9 if c != 'S' else -17, 0.1 if c == 'T' else -0.05)
            if bar == 0 and pos == 14:
                M.add('drums', P.doira['S'][0], t, -22)
            if bar == 2 and pos in (10, 14):
                M.add('drums', P.pick(P.doira['K'], i), t, -18)       # clock-like tension
            continue

        # ----- 180..405 problem-build: half-time kick, bass pulse, ticking taks
        if f < 405:
            u = (f - 180) / 225
            if pos in (0, 8):
                M.add('drums', P.pick(P.kick, kick_i), t, -9 + 6.5 * u + (1.5 if pos == 0 else 0)); M.kicks.append((t, 0.5 + 0.5 * u)); kick_i += 1
            if pos % 2 == 0:
                ch = chord_at(f)
                M.add('bass', bass_note(CH[ch]['bass'] + (12 if pos in (6, 14) and u > 0.3 else 0), 0.42), t, -16 + 6 * u + (1.5 if pos in (0, 8) else 0))
            if pos % 2 == 0 and f >= 195:
                c = 'T' if (pos // 2) % 2 == 0 else 'K'
                M.add('drums', P.pick(P.doira[c], i), t + jit(), -19 + 8 * u, (-0.3 if c == 'T' else 0.3))
            if f >= 240 and pos % 4 == 2:
                M.add('drums', P.pick(P.hat, hat_i), t + sw, -27 + 8 * u, 0.25 if (hat_i % 2) else -0.25); hat_i += 1
            if f >= 300 and pos % 2 == 1:
                M.add('drums', P.pick(P.doira['K'], i), t + sw, -25 + 7 * u, 0.3)
            if f >= 345 and pos in (4, 12):                          # four-on-floor kick through the riser
                M.add('drums', P.pick(P.kick, kick_i), t, -6 + 2 * u); M.kicks.append((t, 0.8)); kick_i += 1
            if pos % 2 == 0 and f >= 195:                            # dutar tension arps (Hijaz on E)
                ch = chord_at(f)
                idx = ARP_PAT[pos]
                if idx is not None:
                    m = CH[ch]['arp'][idx % len(CH[ch]['arp'])] - 12
                    M.add('pluck', pluck_note(m, 0.6, 0.45, 0.996, i % 2, 'dutar'), t, -19 + 5 * u + (1.5 if pos % 8 == 0 else 0))
            continue

        if f < 420:
            continue                                                   # hush

        # ----- 420..480 collapse: filtered groove (placed on 'col', low-passed later)
        if f < 480:
            u = (f - 420) / 60
            if pos % 4 == 0:
                M.add('col', P.pick(P.kick, kick_i), t, -3 + 1.5 * u); M.kicks.append((t, 0.0)); kick_i += 1
            if pos % 2 == 0:
                M.add('col', bass_note(CH['E']['bass'] + (12 if pos in (6, 14) else 0), 0.4), t, -11 + 2 * u)
            if pos % 2 == 1 or f >= 450:
                c = 'T' if pos % 2 == 0 else 'K'
                M.add('col', P.pick(P.doira[c], i), t + sw, -15 + 5 * u, 0.2 if c == 'T' else -0.2)
            if f >= 465 and pos >= 12:                                  # snare roll into the drop
                M.add('col', P.pick(P.snare, i), t, -17 + 3 * (pos - 12))
            continue

        # ----- 480..1560 main groove
        if f < 1560:
            I = I_at(f)
            ch = chord_at(f)
            R = CH[ch]['bass']
            hi = I >= 0.6
            # kick
            kpos = {0, 6, 8} if hi else {0}
            if hi and bar % 4 == 3:
                kpos = kpos | {14}
            if pos in kpos and abs(f - 480) > 1e-6:                      # 480 handled as accent hit
                M.add('drums', P.pick(P.kick, kick_i), t, -4.5 + (0 if pos == 0 else -1.5)); M.kicks.append((t, 1.0)); kick_i += 1
            # clap
            if hi and pos in (4, 12):
                M.add('drums', P.pick(P.clap, i), t, -9.5, 0.0)
            # hats
            if hi and pos % 2 == 0 and pos not in (0, 8):
                if pos == 14:
                    M.add('drums', P.pick(P.ohat, i), t, -22, -0.25)
                else:
                    M.add('drums', P.pick(P.hat, hat_i), t + sw, -20 + (2 if pos == 6 else 0), 0.25 if (hat_i % 2) else -0.25); hat_i += 1
            if I >= 0.88 and pos % 2 == 1:
                M.add('drums', P.pick(P.hat, hat_i), t + sw, -29 + rng.uniform(-2, 0), -0.3 if (hat_i % 2) else 0.3); hat_i += 1
            # doira
            pat = DOIRA_HALF if I < 0.6 else (DOIRA_B if I >= 0.97 else DOIRA_A)
            c = pat[pos]
            if c != '.':
                base = -6.0 if I >= 0.6 else -8.5
                lvl = {'D': base, 'T': base - 1.5, 'K': base - 3, 'S': base - 8, 'P': base}[c]
                M.add('drums', P.pick(P.doira[c], i), t + (sw if c in 'KS' else 0) + (jit(2) if pos else 0), lvl, {'T': 0.18, 'K': -0.18}.get(c, 0.0))
            # bass
            if hi:
                for st_, iv in BASS_PAT:
                    if st_ == pos and abs(f - 480) > 1e-6:
                        M.add('bass', bass_note(R + iv, STEP * 1.9), t, -5.5 if pos in (0, 8) else -9.0)
            elif pos in (0, 8):
                M.add('bass', bass_note(R, 0.9), t, -6.5)
            # dutar arps
            ai = ARP_PAT[pos]
            if ai is not None and I >= 0.5:
                tones = CH[ch]['arp']
                M.add('pluck', pluck_note(tones[ai % len(tones)] + (0 if I < 0.6 else 12 if ai == 3 else 0), 0.55, 0.55, 0.996, i % 2, 'arp'), t,
                      (-16.5 if pos % 4 == 0 else -19.5) + (2.5 if I < 0.6 else 0), (-0.35 if ai % 2 else 0.35))
            # lead
            for (a, b, db, octv) in LEAD_WINDOWS:
                if a <= f < b and pos % 2 == 0:
                    bi = int(round((f - a) / 60)) // 1
                    cyc_bar = int(round((tf(f) - tf(480)) / 2.0)) % 4
                    slot = pos // 2
                    mel = MEL_A[ch]
                    if ch == 'Am' and ((int(round((f - 480) / 240)) % 2) == 1):
                        mel = MEL_TURN
                    n_ = mel[slot]
                    if n_ is not None:
                        M.add('lead', pluck_note(n_ + octv, 0.9, 0.85, 0.995, i % 2, 'rubab'), t + (0.004 if slot % 2 else 0),
                              db + (1.5 if slot in (0, 4) else 0), 0.1)
            # soft bell counter-line in the breakdown (1230-1380): sparse chord-tone pings on the AI orb section
            if 1230 <= f < 1380 and pos in (6, 14) and (bar % 2 == 1):
                tones = CH[ch]['arp']
                M.add('lead', pluck_note(tones[2] + 12, 1.0, 0.8, 0.996, i % 2, 'rubab'), t, -17.5, 0.2)
            continue

        if f < 1620:
            continue                                                   # stop-time handled below

        # ----- 1620..1740 finale (A major lift)
        if f < 1740:
            ch = chord_at(f)
            R = CH[ch]['bass']
            if pos % 4 == 0 and f >= 1620:                              # four on the floor, warm
                if abs(f - 1620) > 1e-6:
                    M.add('drums', P.pick(P.kick, kick_i), t, -3.5); M.kicks.append((t, 1.0)); kick_i += 1
            if pos in (4, 12):
                M.add('drums', P.pick(P.clap, i), t, -9.5)
            if pos % 2 == 0 and pos % 4 != 0:
                M.add('drums', P.pick(P.hat, hat_i), t + sw, -20, 0.25 if (hat_i % 2) else -0.25); hat_i += 1
            if pos % 2 == 1:
                M.add('drums', P.pick(P.hat, hat_i), t + sw, -29, -0.3 if (hat_i % 2) else 0.3); hat_i += 1
            c = DOIRA_B[pos]
            if c != '.':
                lvl = {'D': -6.0, 'T': -7.5, 'K': -9, 'S': -14, 'P': -6}[c]
                M.add('drums', P.pick(P.doira[c], i), t + (sw if c in 'KS' else 0), lvl, {'T': 0.18, 'K': -0.18}.get(c, 0.0))
            for st_, iv in BASS_PAT:
                if st_ == pos and abs(f - 1620) > 1e-6:
                    M.add('bass', bass_note(R + iv, STEP * 1.9), t, -5.5 if pos in (0, 8) else -9.0)
            ai = ARP_PAT[pos]
            if ai is not None:
                tones = CH[ch]['arp']
                M.add('pluck', pluck_note(tones[ai % len(tones)] + (12 if ai == 3 else 0), 0.55, 0.55, 0.996, i % 2, 'arp'), t,
                      -16.5 if pos % 4 == 0 else -19.5, (-0.35 if ai % 2 else 0.35))
            # lead: resolved Hijaz motif E-F#-G#-A and a rising phrase in A major
            LEAD_FIN = {
                0: [(0, 76), (2, 78), (3, 80), (5, 81), (7, 80), (8, 76), (10, 78), (12, 81), (14, 83)],
            }
            bar_i = int((f - 1620) // 60)
            if pos % 2 == 0:
                phrase = [76, None, 78, 80, 81, None, 80, 76] if bar_i == 0 else [85, None, 83, 81, 80, None, 76, 80]
                slot = pos // 2
                if phrase[slot] is not None:
                    M.add('lead', pluck_note(phrase[slot], 1.0 if slot in (4, 7) else 0.8, 0.85, 0.996, i % 2, 'rubab'), t,
                          -8.0 + (1.5 if slot in (0, 4) else 0), 0.1)
            continue

    # ------------------------------------------------------------------ pre-accent snare/tak fills
    def fill(A, nsteps_, last=False):
        for k in range(nsteps_):
            tt = tf(A) - (nsteps_ - k) * STEP
            db = -17 + 12 * (k + 1) / nsteps_
            M.b['drums'].add(P.pick(P.snare, k), tt, db, 0.0)
            M.b['drums'].add(P.pick(P.doira['T'], k + 1), tt + 0.002, db - 3, -0.2 + 0.4 * k / max(nsteps_, 1))
    for A, n_ in [(600, 4), (810, 2), (990, 4), (1230, 2), (1380, 4)]:
        fill(A, n_)
    # long snare build into the stop-time (1530..1560)
    for k in range(20):
        u = k / 19
        tt = tf(1530) + (k ** 1.15) / (19 ** 1.15) * 1.0 * 0.96
        M.b['drums'].add(P.pick(P.snare, k), tt, -20 + 12 * u, 0.0)
    fill(1740, 4)
    # build bar before the finale
    M.b['fx'].add(reverse_cymbal_music(1.3), tf(1560) - 1.3, -9)

    # ------------------------------------------------------------------ ACCENT HITS
    def accent_hit(f, name, kick_db=-1.0, crash_db=-11.0, stab_db=-9.0, bass_db=-5.0, crash_i=0, stab_len=1.6, doira_db=-4.0, stab_up=0):
        t = tf(f)
        M.b['drums'].add(P.pick(P.kick, 1), t, kick_db)
        M.kicks.append((t, 1.0))
        if crash_db is not None:
            M.b['fx'].add(P.crash[crash_i % 2], t, crash_db)
        if stab_db is not None:
            M.b['stab'].add(stab_chord(name, stab_len, stab_up), t, stab_db)
        if bass_db is not None:
            M.b['bass'].add(bass_note(CH[name]['bass'], 1.3), t, bass_db)
        if doira_db is not None:
            M.b['drums'].add(P.doira['D'][1], t, doira_db)
            M.b['drums'].add(P.doira['P'][0], t, doira_db - 4)
        M.hit_times.append(t)

    for A in accents:
        nm = chord_at(A)
        if A == 480:
            accent_hit(480, 'F', -0.5, -9.5, -6.5, -4.0, 0, 2.2)
        elif A == 600:
            accent_hit(600, nm, -1.5, -12.0, -9.5, -5.5, 1)
        elif A in (810, 990, 1380):
            accent_hit(A, nm, -2.5, -8.5 if A == 810 else -10.5, -9.0, -5.5, A % 2)
        elif A == 1230:
            accent_hit(1230, nm, -3.0, -10.5, -8.5, -8.0, 0, 2.2, -8)       # drop into the breakdown: warm, not big
        elif A == 1560:
            accent_hit(1560, 'Am', -0.5, -9.5, -6.0, -4.0, 0, 1.0, -3.0)
        elif A == 1575:
            accent_hit(1575, 'F', -0.5, -13.0, -5.5, -4.0, 1, 1.0, -3.0)
        elif A == 1590:
            accent_hit(1590, 'C', -0.0, -10.0, -4.5, -3.5, 0, 1.6, -2.0, stab_up=0)
        elif A == 1620:
            accent_hit(1620, 'A', -0.5, -9.5, -6.5, -4.5, 1, 2.0, -4.0)
        elif A == 1740:
            pass                                                   # custom ending below
        else:
            accent_hit(A, nm)

    # ---- stop-time: pad swell + reverse cymbal into 1620 (the seed starts to rise at 1605)
    M.b['fx'].add(reverse_cymbal_music(0.5), tf(1620) - 0.5, -7)
    # ---- 1740 final hit: kick, crash, A-major stab + bell motif (A-E-A-C#), ring-out
    t = tf(1740)
    M.b['drums'].add(P.kick[0], t, -1.5); M.kicks.append((t, 1.0)); M.hit_times.append(t)
    M.b['fx'].add(P.crash[0], t, -9.5)
    M.b['stab'].add(stab_chord('A', 2.0, 0), t, -7.5)
    M.b['bass'].add(bass_note(45, 2.2), t, -5.0)
    M.b['drums'].add(P.doira['D'][2], t, -5)
    for k, s_ in enumerate((0, 7, 12, 16)):
        tb = S.Bus(2.4)
        tb.add(S.bell(S.mtof(57 + 24 + s_), 2.2, 3.5, 1.3), 0, -8)
        tb.add(pluck_note(57 + 12 + s_, 1.8, 0.7, 0.996, 0, 'rubab'), 0, -2)
        M.b['lead'].add(tb.buf, t + 0.05 + k * 0.11, -6 - 1.0 * k, -0.25 + 0.17 * k)
    return M


def reverse_cymbal_music(d):
    return memo(('rcm', d), lambda: S.reverse_cymbal(d, 2.4) * 0.8)


# ============================================================================= music rendering (sends, sidechain, sections)
def sidechain_env(n, kicks, depth_db=-6.5, tau=0.11):
    g = np.ones(n)
    L = S.ns(0.6)
    k = np.arange(L) / S.SR
    for (t, strength) in kicks:
        if strength <= 0:
            continue
        i = S.ns(t)
        if i >= n:
            continue
        dip = 1 - (1 - db2a(depth_db * strength)) * np.exp(-k / tau)
        dip *= np.minimum(1, k / 0.002 + 0.0) * 0 + 1
        j = min(n, i + L)
        g[i:j] = np.minimum(g[i:j], dip[:j - i])
    return g


def render_music(M, secs):
    N = S.ns(BUF_S)
    t0 = time.time()
    B = {k: v.buf[:N] for k, v in M.b.items()}
    # collapse bus: exponentially opening low-pass (from ~200 Hz to 12 kHz over the bar)
    col = B['col']
    a, b = S.ns(tf(420) - 0.3), S.ns(tf(480) + 0.1)
    seg = col[a:b]
    fc = lambda tt: 200.0 * (12000.0 / 200.0) ** np.clip((tt - 0.3) / 2.0, 0, 1) ** 1.2
    col[a:b] = S.stft_shape(seg, S.lowpass_gain(fc, 24), 2048, 256)
    # sidechain: pads + pluck + stabs breathe with the kick
    sc = sidechain_env(N, M.kicks, -6.0, 0.11)
    B['pad'] = B['pad'] * sc[:, None]
    B['pluck'] = B['pluck'] * (0.5 + 0.5 * sc)[:, None]
    # bass: very light pump so the kick owns the low end
    B['bass'] = B['bass'] * (0.75 + 0.25 * sc)[:, None]
    # layer trims + bus processing
    B['drums'] = S.filt(B['drums'], S.rbj('lp', 13000, 0.7), S.rbj('hs', 7500, 0.7, -2.0))
    B['bass'] = S.filt(B['bass'], S.rbj('hp', 32, 0.7), S.rbj('lp', 3200, 0.7)) * db2a(-5.0)
    B['lead'] = S.filt(B['lead'], S.rbj('hp', 200, 0.7))
    B['pluck'] = S.filt(B['pluck'], S.rbj('hp', 140, 0.7))
    # --- reverb sends
    S.seed(555)
    ir_plate = S.synth_ir(1.7, 0.5, 0.012)
    ir_room = S.synth_ir(0.55, 0.25, 0.004)
    ir_hall = S.synth_ir(3.6, 1.0, 0.025)

    def send(x, ir, wet):
        return S.conv(x, ir)[:N] * db2a(wet)
    wet = send(B['pluck'] * 1.0 + B['lead'] * 1.0, ir_plate, -10.5)
    wet += send(B['drums'], ir_room, -15.0)
    wet += send(B['pad'], ir_plate, -17.0)
    wet += send(B['stab'] + B['fx'] * 0.8 + B['col'] * 0.5, ir_hall, -12.0)
    dry = sum(B[k] for k in ('drums', 'bass', 'pad', 'pluck', 'lead', 'fx', 'stab', 'col'))
    # --- hush gate: dry music stops at 405 (15 ms fade), the room tail decays further toward 420
    n_ = np.arange(N) / S.SR
    h0, h1 = tf(405), tf(420)
    gd = np.ones(N)
    gd[(n_ >= h0) & (n_ < h1)] = 0.0
    fin = (n_ >= h0 - 0.012) & (n_ < h0)
    gd[fin] = np.linspace(1, 0, fin.sum())
    gw = np.ones(N)
    m = (n_ >= h0) & (n_ < h1)
    gw[m] = db2a(-14 - 28 * ((n_[m] - h0) / (h1 - h0)))
    pre = (n_ >= h0 - 0.05) & (n_ < h0)
    gw[pre] = np.linspace(1, db2a(-14), pre.sum())
    rise = (n_ >= h1) & (n_ < h1 + 0.2)
    gw[rise] = np.linspace(db2a(-42), 1, rise.sum())
    mus = dry * gd[:, None] + wet * gw[:, None]
    # --- music-wide colour: tame highs, mono-safe low end
    mus = S.filt(mus, S.rbj('hs', 8000, 0.7, -2.5), S.rbj('lp', 15000, 0.7))
    # --- section automation (dB, by frame): shapes the energy curve
    pts = secs_gain_points(secs)
    fr = n_ * FPS
    gdb = np.interp(fr, [p[0] for p in pts], [p[1] for p in pts])
    mus = mus * db2a(gdb)[:, None]
    # --- ending: clean exponential-ish fade to digital silence by 59.6 s
    e0, e1 = tf(1740) + 0.3, tf(1799) + 0.0
    fe = np.where(n_ < e0, 0.0, -75 * np.clip((n_ - e0) / (e1 - e0), 0, 1) ** 0.9)
    mus = mus * db2a(fe)[:, None]
    mus[S.ns(TOTAL_S - 0.15):] = 0
    log(f'  music rendered ({time.time()-t0:.1f}s)')
    return mus


def secs_gain_points(secs):
    """music gain automation in dB vs frame (piecewise linear). Tuned against the measured energy table."""
    return [(0, -6.5), (170, -5.5), (180, -6.0), (400, -3.0), (405, -3.0), (420, -11.0), (440, -8.0), (479, -2.0), (480, 3.0), (1229, 3.0),
            (1230, 3.0), (1380, 3.0), (1559, 3.0), (1560, 0.0), (1619, 0.0), (1620, 2.5), (1740, 2.5), (1800, 2.5)]


# ============================================================================= SFX
SFX_TRIM = {   # dB, so that scene gains around the values in the scene files give a balanced mix
    'whoosh': -3, 'swish': -2, 'riser': -2, 'reverse_cymbal': -2, 'boom': -1, 'impact': -4, 'hit_soft': -1, 'tick': -3,
    'scramble': -2, 'lock': -2, 'pop': -4, 'ui_tap': -8, 'notification': -3, 'vibrate': -4, 'success': -3,
    'card_shuffle': -2, 'card_place': -3, 'stamp': -1, 'bubble': -4, 'typing': -2, 'switch': -3, 'shimmer': -2,
    'logo_sting': -2, 'glitch': -3,
}
SFX_SEND = {   # dB into the shared small-room send (glue)
    'pop': -15, 'bubble': -15, 'hit_soft': -17, 'card_place': -19, 'switch': -17, 'lock': -19, 'ui_tap': -17,
    'stamp': -18, 'tick': -22, 'typing': -22, 'scramble': -22, 'swish': -20,
}
SFX_DUCK = {   # base music duck depth (dB) under big sfx
    'boom': -5.0, 'logo_sting': -3.5, 'impact': -3.5, 'stamp': -1.5, 'success': -2.0, 'notification': -2.0, 'whoosh': -2.0,
    'riser': 0.0, 'reverse_cymbal': 0.0,
}
KNOWN = set(SFX_TRIM)


def chord_root_c(f):
    """root (midi, around C4) for success arps: use the chord root; for Am borrow the relative major (C)"""
    name = chord_at(f)
    return {'F': 53, 'C': 60, 'G': 55, 'Am': 60, 'Dm': 62, 'E': 64, 'A': 57, 'EM': 56, 'F#m': 57}.get(name, 60)


def make_sfx(c, idx):
    """-> (stereo sound, anchor seconds, send dB or None).  anchor = where the cue frame falls inside the sound."""
    name, f = c['sfx'], c['f']
    prm = c.get('params') or {}
    pan = c.get('pan')
    S.seed(zlib.crc32(f'{name}{f}{idx}'.encode()) & 0x7fffffff)
    pn = 0.0 if pan is None else float(pan)

    if name in ('whoosh', 'swish'):
        d = float(prm.get('dur', 0.6 if name == 'whoosh' else 0.28))
        p0, p1 = np.clip(pn - 0.45, -0.95, 0.95), np.clip(pn + 0.45, -0.95, 0.95)
        if prm.get('dir', 1) < 0:
            p0, p1 = p1, p0
        if name == 'whoosh':
            x = S.whoosh(d, 220, 2300, 0.6, 1.1, p0, p1)
            x = S.filt(x, S.rbj('lp', 9000), S.rbj('hp', 90))
            anchor = 0.6 * d
        else:
            x = S.swish(d, f_lo=1000, f_hi=4800, pan_from=p0 * 0.8, pan_to=p1 * 0.8)
            x = S.filt(x, S.rbj('lp', 8500), S.rbj('hp', 400))
            anchor = 0.45 * d
        return x, anchor, SFX_SEND.get(name)
    if name == 'riser':
        d = float(prm.get('dur', 2.0))
        x = S.riser(d, 160, 7500)
        return S.filt(x, S.rbj('lp', 11000)), d, None
    if name == 'reverse_cymbal':
        d = float(prm.get('dur', 1.4))
        x = S.reverse_cymbal(d)
        return S.filt(x, S.rbj('lp', 10000), S.rbj('hs', 6000, 0.7, -2)), d, None
    if name == 'boom':
        return S.boom(2.8), 0.0, None
    if name == 'impact':
        return S.impact_mid(1.5), 0.0, None
    if name == 'hit_soft':
        return S.hit_soft(), 0.0, SFX_SEND[name]
    if name == 'tick':
        return S.st(S.tick_soft()), 0.0, SFX_SEND[name]
    if name == 'scramble':
        nfr = int(prm.get('frames', 12))
        b = S.Bus(nfr / FPS + 0.1)
        for k in range(nfr):
            if S.rng().random() < 0.72:
                b.add(S.tick_soft(), k / FPS + S.rng().uniform(0, 0.008), -6 + S.rng().uniform(-2, 0), pn + S.rng().uniform(-0.15, 0.15))
        return b.buf, 0.0, SFX_SEND[name]
    if name == 'lock':
        b = S.Bus(0.15)
        b.add(S.lock_click(), 0, 0)
        b.add(S.pop(0.7), 0.0, -12)
        return S.peak_norm(b.buf), 0.0, SFX_SEND[name]
    if name == 'pop':
        x = S.filt(S.pop(S.rng().uniform(0.92, 1.08)), S.rbj('lp', 6500))
        return S.st(x), 0.0, SFX_SEND[name]
    if name == 'ui_tap':
        t = S.tvec(0.08)
        x = S.ui_tap(1500, 0.08)
        x = x + 0.35 * S.sine(190 * (1 + 0.3 * np.exp(-t / 0.01)), 0.08) * np.exp(-t / 0.02)
        return S.st(S.peak_norm(S.lp(x, 7000))), 0.0, SFX_SEND[name]
    if name == 'notification':
        return S.chime_pair((88, 93, 100) if f >= 1600 else (88, 93)), 0.0, None
    if name == 'vibrate':
        return S.vibrate(), 0.0, None
    if name == 'success':
        return S.success_arp(chord_root_c(f)), 0.0, None
    if name == 'card_shuffle':
        d = float(prm.get('dur', 0.5))
        n = int(np.clip(round(26 * d), 5, 34))
        x = S.card_shuffle(n, d)
        return S.filt(x, S.rbj('lp', 9500)), 0.0, None
    if name == 'card_place':
        return S.st(S.card_place()), 0.0, SFX_SEND[name]
    if name == 'stamp':
        return S.stamp(), 0.0, SFX_SEND[name]
    if name == 'bubble':
        return S.st(S.bubble(1.0 if pn >= 0 else 0.84)), 0.0, SFX_SEND[name]
    if name == 'typing':
        nfr = int(prm.get('frames', 12))
        b = S.Bus(nfr / FPS + 0.2)
        tt = 0.0
        while tt < nfr / FPS:
            b.add(S.key_soft(), tt, S.rng().uniform(-3, 0), pn + S.rng().uniform(-0.2, 0.2))
            tt += S.rng().uniform(1.6, 3.4) / FPS
        return b.buf, 0.0, SFX_SEND[name]
    if name == 'switch':
        return S.switch_click(True), 0.0, SFX_SEND[name]
    if name == 'shimmer':
        notes = (81, 85, 88, 93, 97, 100) if f >= 1600 else (84, 88, 91, 93, 96, 100)
        return S.shimmer(1.3, notes), 0.0, None
    if name == 'logo_sting':
        root = int(prm.get('root', 53 if f < 1000 else 57))
        return S.sting_tonal(root), 0.0, None
    if name == 'glitch':
        return S.filt(S.glitch(float(prm.get('dur', 0.4))), S.rbj('lp', 6000)), 0.0, None
    raise KeyError(name)


def render_sfx(cues, accents):
    N = S.ns(BUF_S)
    sfx = S.Bus(BUF_S)
    wet_src = S.Bus(BUF_S)
    duck = []
    skipped = []
    for idx, c in enumerate(cues):
        name = c['sfx']
        if name not in KNOWN:
            skipped.append(name)
            continue
        snd, anchor, send_db = make_sfx(c, idx)
        gain = float(c.get('gain', 0.0)) + SFX_TRIM[name]
        t = tf(c['f']) - anchor
        pan = c.get('pan')
        if name in ('whoosh', 'swish', 'scramble', 'typing'):
            sp = None                                     # panning already inside the generator
        else:
            sp = None if pan is None else float(pan)
        sfx.add(snd, t, gain, sp)
        if send_db is not None:
            wet_src.add(snd, t, gain + send_db, sp)
        if name in SFX_DUCK and SFX_DUCK[name] < 0:
            sc = float(np.clip(1 + float(c.get('gain', 0)) / 12.0, 0.0, 1.0))
            if sc > 0.2:
                near_accent = any(abs(c['f'] - A) <= 2 for A in accents)
                duck.append((tf(c['f']), SFX_DUCK[name] * sc, near_accent))
    if skipped:
        log('  WARNING unknown sfx skipped:', sorted(set(skipped)))
    S.seed(777)
    ir = S.synth_ir(0.8, 0.35, 0.006)
    wet = S.conv(wet_src.buf, ir)[:N] * db2a(-3.0)
    return sfx.buf[:N] + wet, duck


def duck_env(n, duck):
    """cue-driven music ducking. Hits that coincide with a musical accent duck AFTER the music transient."""
    g_db = np.zeros(n)
    for (t, depth, near) in duck:
        delay = 0.03 if near else -0.012
        att = 0.02 if near else 0.012
        hold = 0.06
        rel = 0.55 if near else 0.45
        t0 = t + delay
        i0 = max(0, S.ns(t0 - att))
        i1 = min(n, S.ns(t0 + hold + rel * 1.6))
        tt = np.arange(i0, i1) / S.SR
        a = np.clip((tt - (t0 - att)) / att, 0, 1)
        r = np.where(tt > t0 + hold, np.exp(-(tt - t0 - hold) / (rel / 3)), 1.0)
        g_db[i0:i1] = np.minimum(g_db[i0:i1], depth * a * r)
    return db2a(g_db)


# ============================================================================= master
def master_chain(x, target=-14.0, tp=-1.0):
    """HP 28 Hz + LR4 mono-below-120 + look-ahead limiter; gain iterated to -14 LUFS with true peak <= tp.
    Loop uses the fast true-peak estimate with 0.3 dB margin; the exact FFT measure is the final gate."""
    x = S.mono_low(S.filt(S.st(x), S.rbj('hp', 28, 0.7)), 120)
    drive = target - S.lufs(x)
    ceil = tp - 0.45
    z = x
    for _ in range(6):
        z = S.limiter(x * db2a(drive), ceil)
        L = S.lufs(z)
        if abs(L - target) < 0.04:
            break
        drive += target - L
    for _ in range(4):
        tpk = S.true_peak_db(z)
        if tpk <= tp - 0.08:
            break
        ceil -= tpk - (tp - 0.2)
        z = S.limiter(x * db2a(drive), ceil)
        drive += target - S.lufs(z)
        z = S.limiter(x * db2a(drive), ceil)
    return z, drive


def load_cues(path, force_prov):
    prov = os.path.join(HERE, 'provisional_cues.json')
    doc = None
    used = None
    if not force_prov and os.path.exists(path):
        try:
            doc = json.load(open(path))
            used = path
        except Exception as e:
            log('  cues.json unreadable:', e)
    if doc is None or not doc.get('cues'):
        if not os.path.exists(prov):
            sys.path.insert(0, HERE)
            import runpy
            runpy.run_path(os.path.join(HERE, 'make_provisional.py'))
        pdoc = json.load(open(prov))
        if doc is not None and doc.get('music'):
            pdoc['music'] = doc['music']
        doc, used = pdoc, prov + ' (PROVISIONAL)'
    return doc, used


def write_wav24(path, x):
    S.write_wav(path, x, 24)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--provisional', action='store_true')
    ap.add_argument('--cues', default=os.path.join(HERE, 'cues.json'))
    ap.add_argument('--no-verify', action='store_true')
    ap.add_argument('--out', default=os.path.join(ROOT, 'public', 'audio', 'master.wav'))
    a = ap.parse_args()
    T0 = time.time()
    global POOLS
    doc, used = load_cues(a.cues, a.provisional)
    cues = sorted(doc['cues'], key=lambda c: c['f'])
    mus_plan = doc['music']
    accents = list(mus_plan['accents'])
    secs = mus_plan['sections']
    log(f'cues: {used}  ({len(cues)} cues)')

    POOLS = Pools()
    log('composing music ...')
    M = compose(accents)
    log(f'  composed ({time.time()-T0:.1f}s)')
    music = render_music(M, secs)
    log(f'  music done ({time.time()-T0:.1f}s)')
    log('rendering SFX ...')
    sfx, duck = render_sfx(cues, accents)
    log(f'  {len(cues)} cues, {len(duck)} ducking events ({time.time()-T0:.1f}s)')

    n = S.ns(BUF_S)
    # music level: main-groove RMS to a fixed reference so SFX gains (peak-referenced) sit right
    ref = music[S.ns(tf(540)):S.ns(tf(1500))]
    rms_db = 10 * np.log10(np.mean(ref ** 2) + 1e-12)
    music = music * db2a(MUSIC_REF_DB - rms_db)
    music = music * duck_env(n, duck)[:, None]

    mix = (music + sfx)[:N_OUT]
    music, sfx = music[:N_OUT], sfx[:N_OUT]
    log('mastering ...')
    final, drive = master_chain(mix, -14.0, -1.0)
    final = S.fade(final, 0.0, 0.002)
    G = db2a(drive)
    os.makedirs(os.path.dirname(a.out), exist_ok=True)
    os.makedirs(os.path.join(HERE, 'stems'), exist_ok=True)
    write_wav24(a.out, final)
    mm = S.mono_low(S.filt(music, S.rbj('hp', 28, 0.7)), 120) * G
    ss = S.mono_low(S.filt(sfx, S.rbj('hp', 28, 0.7)), 120) * G
    write_wav24(os.path.join(HERE, 'stems', 'music.wav'), np.clip(mm, -1, 1))
    write_wav24(os.path.join(HERE, 'stems', 'sfx.wav'), np.clip(ss, -1, 1))
    log(f'master: LUFS {S.lufs(final):.2f}  TP {S.true_peak_db(final):.2f} dBTP  ({time.time()-T0:.1f}s total)')
    log('wrote', a.out)
    if not a.no_verify:
        import verify_audio
        verify_audio.run(a.out, os.path.join(HERE, 'stems'), doc, os.path.join(HERE, 'master_overview.png'))
    log(f'done in {time.time()-T0:.1f}s')


MUSIC_REF_DB = -19.0

if __name__ == '__main__':
    main()
