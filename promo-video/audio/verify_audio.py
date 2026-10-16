#!/usr/bin/env python3
"""Objective checks for the rendered soundtrack (run automatically by build_audio.py, or standalone):
    python3 audio/verify_audio.py [master.wav]
Prints LUFS / true peak / clipping / DC / NaN, per-section levels, accent transient detection (+-10 ms),
stereo correlation, low-end mono check, and writes audio/master_overview.png (waveform + loudness + spectrogram)."""
import os, sys, json, subprocess, re
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import numpy as np
import sfxlib as S

FPS = 30


def db(x):
    return 10 * np.log10(np.maximum(x, 1e-12))


def env_db(x, win=96, hop=48):
    """short RMS envelope in dB (2 ms hop, 4 ms window)"""
    m = x if x.ndim == 1 else x.mean(1)
    c = np.cumsum(np.concatenate([[0], m * m]))
    idx = np.arange(0, len(m) - win, hop)
    e = (c[idx + win] - c[idx]) / win
    return db(e), (idx + win / 2) / S.SR


def detect_accent(x, f, hp_hz=None):
    """Transient test at frame f.  pre = mean level in [-35,-5] ms, post = max 4 ms level in [0,+15] ms.
    jump = post - pre (dB).  onset = first 2 ms-step in [-40,+30] ms whose level exceeds pre + 6 dB
    (searched from the window start, so a swell that peaks AT the frame is reported as an early onset).
    returns (onset_offset_ms, jump_dB)"""
    y = S.hp(x, hp_hz) if hp_hz else x
    t0 = f / FPS
    a = int((t0 - 0.12) * S.SR)
    seg = y[max(a, 0):int((t0 + 0.12) * S.SR)]
    e, tt = env_db(seg, 192, 48)             # 4 ms window, 1 ms hop
    tt = tt + max(a, 0) / S.SR
    lin = 10 ** (e / 10)
    mpre = (tt >= t0 - 0.035) & (tt <= t0 - 0.005)
    pre = db(lin[mpre].mean())
    mpost = (tt >= t0) & (tt <= t0 + 0.015)
    post = e[mpost].max()
    cand = np.nonzero((tt >= t0 - 0.040) & (tt <= t0 + 0.030) & (e > pre + 6.0))[0]
    onset = tt[cand[0]] - 0.002 if len(cand) else t0 + 0.03
    return (onset - t0) * 1000.0, float(post - pre)


def ffmpeg_ebur128(path):
    try:
        r = subprocess.run(['ffmpeg', '-nostats', '-i', path, '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                           capture_output=True, text=True, timeout=120)
        t = r.stderr
        sm = t[t.rindex('Summary:'):]
        I = float(re.search(r'I:\s+(-?[\d.]+) LUFS', sm).group(1))
        LRA = float(re.search(r'LRA:\s+([\d.]+) LU', sm).group(1))
        pk = float(re.search(r'Peak:\s+(-?[\d.]+) dBFS', sm).group(1))
        return I, LRA, pk
    except Exception as e:
        return None


def colormap(v):
    """0..1 -> RGB (dark navy -> purple -> orange -> pale yellow)"""
    stops = [0.0, 0.25, 0.5, 0.75, 1.0]
    cols = np.array([[8, 10, 24], [60, 20, 110], [190, 60, 90], [250, 160, 40], [255, 250, 200]], float)
    out = np.stack([np.interp(v, stops, cols[:, i]) for i in range(3)], -1)
    return out.astype(np.uint8)


def overview_png(x, doc, path, music=None, sfx=None):
    from PIL import Image, ImageDraw
    W = 1800
    n = len(x)
    mono = x.mean(1)
    spp = n // W
    # waveform
    Hw, Hl, Hs = 190, 110, 300
    img = Image.new('RGB', (W, Hw + Hl + Hs + 60), (14, 16, 20))
    dr = ImageDraw.Draw(img)
    mid = Hw // 2 + 18
    seg = mono[:spp * W].reshape(W, spp)
    mx, mn = seg.max(1), seg.min(1)
    for i in range(W):
        dr.line([(i, mid - int(mx[i] * (Hw / 2 - 4))), (i, mid - int(mn[i] * (Hw / 2 - 4)))], fill=(120, 200, 150))
    rms = np.sqrt((seg ** 2).mean(1))
    for i in range(W):
        h = int(rms[i] * (Hw / 2 - 4) * 1.0)
        dr.line([(i, mid - h), (i, mid + h)], fill=(240, 190, 60))
    # short-term loudness (1 s window) curve
    y0 = Hw + 30
    win = int(S.SR * 1.0)
    c = np.cumsum(np.concatenate([[0], mono ** 2]))
    lv = []
    for i in range(W):
        cc = i * spp + spp // 2
        a, b = max(0, cc - win // 2), min(n, cc + win // 2)
        lv.append(10 * np.log10((c[b] - c[a]) / (b - a) + 1e-12))
    lv = np.array(lv)
    dr.rectangle([0, y0, W, y0 + Hl], outline=(60, 64, 70))
    for g in (-60, -40, -30, -20, -10):
        yy = y0 + Hl - int((g + 70) / 70 * Hl)
        dr.line([(0, yy), (W, yy)], fill=(40, 44, 50))
        dr.text((3, yy - 10), f'{g} dB', fill=(110, 115, 120))
    pts = [(i, y0 + Hl - int(np.clip((v + 70) / 70, 0, 1) * Hl)) for i, v in enumerate(lv)]
    dr.line(pts, fill=(240, 120, 90), width=2)
    # spectrogram: 1 px per frame
    ys = y0 + Hl + 20
    nfft, hop = 2048, n // W
    w = np.hanning(nfft)
    f = np.fft.rfftfreq(nfft, 1 / S.SR)
    nb = Hs
    fl = np.geomspace(40, 16000, nb)
    cols = np.zeros((nb, W))
    for i in range(W):
        cc = i * hop + hop // 2
        a = max(0, cc - nfft // 2)
        fr = mono[a:a + nfft]
        if len(fr) < nfft:
            fr = np.pad(fr, (0, nfft - len(fr)))
        sp = np.abs(np.fft.rfft(fr * w)) / nfft
        cols[:, i] = np.interp(fl, f, sp)
    sdb = 20 * np.log10(cols + 1e-9)
    v = np.clip((sdb + 100) / 55, 0, 1)
    rgb = colormap(v[::-1])
    img.paste(Image.fromarray(rgb), (0, ys))
    for hz in (100, 500, 1000, 5000, 10000):
        yy = ys + nb - 1 - int(np.log(hz / 40) / np.log(16000 / 40) * (nb - 1))
        dr.line([(0, yy), (14, yy)], fill=(255, 255, 255))
        dr.text((18, yy - 5), f'{hz}', fill=(255, 255, 255))
    # sections + accents
    secs = doc['music']['sections']
    for s in secs:
        xx = int(s['from'] / 1800 * W)
        dr.line([(xx, 0), (xx, ys + nb)], fill=(90, 160, 255), width=1)
        dr.text((xx + 3, 2), f"{s['name']} {s['energy']}", fill=(150, 200, 255))
    for a in doc['music']['accents']:
        xx = int(a / 1800 * W)
        dr.polygon([(xx - 4, ys - 2), (xx + 4, ys - 2), (xx, ys - 12)], fill=(0, 255, 255))
    for k in range(0, 61, 5):
        xx = int(k / 60 * W)
        dr.text((xx + 2, ys + nb + 6), f'{k}s', fill=(200, 200, 200))
    img.save(path)


def run(master_path, stems_dir, doc, png_path):
    x, sr = S.read_wav(master_path)
    x = S.st(x)
    n = len(x)
    ok = True
    print('\n================ VERIFY ================')
    print(f'file: {master_path}  sr={sr}  frames={n}  dur={n/sr:.3f}s')
    L = S.lufs(x)
    tp = S.true_peak_db(x)
    ff = ffmpeg_ebur128(master_path)
    print(f'integrated LUFS (numpy BS.1770): {L:.2f}   true peak: {tp:.2f} dBTP   sample peak: {S.a2db(np.abs(x).max()):.2f} dBFS')
    if ff:
        print(f'ffmpeg ebur128 cross-check:      I={ff[0]:.1f} LUFS  LRA={ff[1]:.1f} LU  true peak={ff[2]:.1f} dBTP')
        ok &= abs(ff[0] + 14) < 0.35 and ff[2] <= -0.95
    ok &= abs(L + 14) < 0.2 and tp <= -1.0
    print(f'NaN: {bool(np.isnan(x).any())}   clipped samples (>=0.999): {int((np.abs(x) >= 0.999).sum())}   DC L/R: {x[:,0].mean():.2e} / {x[:,1].mean():.2e}')
    ok &= (not np.isnan(x).any()) and (np.abs(x) < 0.999).all() and abs(x.mean()) < 1e-3
    print(f'duration: {n/sr:.3f}s (expected 60.000)  last 0.1 s peak: {S.a2db(np.abs(x[-int(0.1*sr):]).max()):.1f} dBFS')

    # ---------------- per-section levels
    mus = sfx = None
    try:
        mus, _ = S.read_wav(os.path.join(stems_dir, 'music.wav'))
        sfx, _ = S.read_wav(os.path.join(stems_dir, 'sfx.wav'))
    except Exception:
        pass
    print('\nsection            frames       energy  RMS dBFS  rel.main  LUFS(st)  music dB  sfx dB   crest')
    rows = []
    main = [s for s in doc['music']['sections'] if s['name'] == 'main-groove'][0]
    def sec_rms(arr, s):
        a, b = int(s['from'] / FPS * sr), int(s['to'] / FPS * sr)
        return db(np.mean(S.st(arr[a:b]) ** 2)) if arr is not None else float('nan')
    ref = sec_rms(x, main)
    for s in doc['music']['sections']:
        a, b = int(s['from'] / FPS * sr), int(s['to'] / FPS * sr)
        seg = x[a:b]
        r = db(np.mean(seg ** 2))
        st_l = S.lufs(seg) if (b - a) > int(0.5 * sr) else float('nan')
        crest = S.a2db(np.abs(seg).max()) - r / 2 * 1.0 if False else (S.a2db(np.abs(seg).max()) - 0.5 * r)
        print(f"{s['name']:<18} {s['from']:>4}-{s['to']:<5}   {s['energy']:<5}  {r:7.1f}  {r-ref:+7.1f}  {st_l:8.1f}  {sec_rms(mus, s):7.1f}  {sec_rms(sfx, s):7.1f}  {crest:5.1f}")
        rows.append((s, r))
    # energy ordering sanity
    byname = {s['name']: r for s, r in rows}
    hush, main_r = byname.get('hush', -99), byname.get('main-groove', 0)
    chk = {
        'hush >= 20 dB below main': hush <= main_r - 20,
        'hush quietest section': hush == min(byname.values()),
        'main-groove loudest-or-near (within 3 dB of max)': main_r >= max(byname.values()) - 3,
        'intro < build': byname['intro-tension'] < byname['problem-build'],
        'collapse < main - 2': byname['collapse'] < main_r - 2,
        'tail < finale - 3': byname['tail'] < byname['finale'] - 3,
    }
    for k, v in chk.items():
        print(f'   [{"ok" if v else "FAIL"}] {k}')
        ok &= v

    # ---------------- accents
    print('\naccent frame    time   MUSIC stem: onset  jump(bb)  jump(HP2k) | MASTER: onset  jump(bb)  jump(HP2k) | verdict')
    src = S.st(mus if mus is not None else x).mean(1)
    xm = x.mean(1)
    all_pass = True
    for A in doc['music']['accents']:
        o1, j1 = detect_accent(src, A)
        _, h1 = detect_accent(src, A, 2000)
        o2, j2 = detect_accent(xm, A)
        _, h2 = detect_accent(xm, A, 2000)
        good = abs(o1) <= 10 and j1 >= 8 and h1 >= 6
        gm = abs(o2) <= 10 and j2 >= 6
        all_pass &= good
        print(f'{A:>8}  {A/FPS:7.3f}s        {o1:+6.1f} ms {j1:6.1f} dB {h1:6.1f} dB   |       {o2:+6.1f} ms {j2:6.1f} dB {h2:6.1f} dB | {"PASS" if good else "FAIL"}{"" if gm else "  (master: masked by SFX swell)"}')
    ok &= all_pass

    # ---------------- stereo / low end
    print('\nstereo & spectrum')
    cor = np.corrcoef(x[:, 0], x[:, 1])[0, 1]
    print(f'L/R correlation (whole): {cor:.3f}  (mono-compat target > 0.3)')
    ok &= cor > 0.3
    M, Sd = (x[:, 0] + x[:, 1]) / 2, (x[:, 0] - x[:, 1]) / 2
    lowS = S.lp(Sd, 120)
    print(f'side energy <120 Hz vs mid <120 Hz: {db(np.mean(lowS**2)) - db(np.mean(S.lp(M,120)**2)):.1f} dB (should be << 0)')
    ok &= db(np.mean(lowS ** 2)) - db(np.mean(S.lp(M, 120) ** 2)) < -20
    X = np.abs(np.fft.rfft(M * np.hanning(len(M)))) ** 2
    fr = np.fft.rfftfreq(len(M), 1 / sr)
    tot = X.sum()
    for lo, hi in [(20, 120), (120, 500), (500, 2000), (2000, 6000), (6000, 12000), (12000, 24000)]:
        print(f'  {lo:>5}-{hi:<5} Hz: {10*np.log10(X[(fr>=lo)&(fr<hi)].sum()/tot+1e-12):6.1f} dB of total')
    print('\ncorr per section:', ', '.join(f"{s['name']}={np.corrcoef(x[int(s['from']/FPS*sr):int(s['to']/FPS*sr),0], x[int(s['from']/FPS*sr):int(s['to']/FPS*sr),1])[0,1]:.2f}" for s in doc['music']['sections'] if s['name'] != 'hush'))
    overview_png(x, doc, png_path)
    print(f'\nwrote {png_path}')
    print('OVERALL:', 'ALL CHECKS PASS' if ok else 'SOME CHECKS FAILED')
    return ok


if __name__ == '__main__':
    mp = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(HERE), 'public', 'audio', 'master.wav')
    d = json.load(open(os.path.join(HERE, 'provisional_cues.json')))
    try:
        c = json.load(open(os.path.join(HERE, 'cues.json')))
        if c.get('music'):
            d['music'] = c['music']
    except Exception:
        pass
    run(mp, os.path.join(HERE, 'stems'), d, os.path.join(HERE, 'master_overview.png'))
