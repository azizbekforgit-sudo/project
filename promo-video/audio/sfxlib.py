"""sfxlib.py - procedural SFX + music toolkit for the AgroVerse ad.  numpy only (no scipy).

Conventions: SR = 48000, float64 internally, mono arrays shape (n,), stereo shape (n, 2).
Every generator returns audio peaking around 0 dBFS (-1 dB) unless noted; set levels in the mix.
Tested with numpy 2.5 / Python 3.13 (see __main__ for a demo render).
"""
import numpy as np
import wave

SR = 48000
_rng = np.random.default_rng(7)


def seed(s):
    global _rng
    _rng = np.random.default_rng(s)


def rng():
    return _rng


def ns(d):
    return int(round(d * SR))


def tvec(d):
    return np.arange(ns(d)) / SR


def db2a(d):
    return 10.0 ** (np.asarray(d) / 20.0)


def a2db(a):
    return 20 * np.log10(np.maximum(np.abs(a), 1e-12))


def mtof(m):
    return 440.0 * 2 ** ((np.asarray(m, float) - 69) / 12)


# ----------------------------------------------------------------------------- I/O + utils
def st(x):
    x = np.asarray(x, float)
    return x if x.ndim == 2 else np.stack([x, x], 1)


def mono(x):
    return x if x.ndim == 1 else x.mean(1)


def peak_norm(x, peak_db=-1.0):
    p = np.max(np.abs(x))
    return x * (db2a(peak_db) / p) if p > 0 else x


def fade(x, fin=0.002, fout=0.005):
    x = np.array(x, float)
    a, b = ns(fin), ns(fout)
    sh = (slice(None),) + ((None,) if x.ndim == 2 else ())
    if a:
        x[:a] *= (np.linspace(0, 1, a) ** 2)[sh]
    if b:
        x[-b:] *= (np.linspace(1, 0, b) ** 2)[sh]
    return x


def write_wav(path, x, bits=24, sr=SR):
    x = np.clip(st(x), -1, 1)
    if bits == 16:
        data = (x * 32767).round().astype('<i2').tobytes()
    else:
        v = (x * 8388607).round().astype('<i4')
        data = v.view(np.uint8).reshape(-1, 4)[:, :3].tobytes()
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(bits // 8)
        w.setframerate(sr)
        w.writeframes(data)


def read_wav(path):
    with wave.open(path) as w:
        sr, ch, sw, n = w.getframerate(), w.getnchannels(), w.getsampwidth(), w.getnframes()
        raw = w.readframes(n)
    if sw == 2:
        x = np.frombuffer(raw, '<i2').astype(float) / 32768
    elif sw == 3:
        b = np.frombuffer(raw, np.uint8).reshape(-1, 3)
        v = (b[:, 0].astype(np.int32) | (b[:, 1].astype(np.int32) << 8) | (b[:, 2].astype(np.int32) << 16))
        v = np.where(v >= 1 << 23, v - (1 << 24), v)
        x = v.astype(float) / 8388608
    else:
        raise ValueError('16/24-bit only')
    x = x.reshape(-1, ch)
    return (x[:, 0] if ch == 1 else x), sr


class Bus:
    """Timeline buffer. bus.add(sound, t_seconds, gain_db, pan)"""

    def __init__(self, dur):
        self.buf = np.zeros((ns(dur), 2))

    def add(self, x, t, gain_db=0.0, pan_pos=None):
        x = st(x) if pan_pos is None else pan(x, pan_pos)
        i = ns(t)
        if i < 0:
            x, i = x[-i:], 0
        j = min(len(self.buf), i + len(x))
        if j > i:
            self.buf[i:j] += x[:j - i] * db2a(gain_db)
        return self


# ----------------------------------------------------------------------------- noise + oscillators
def white(n, ch=1):
    return _rng.standard_normal((n, ch) if ch > 1 else n)


def colored(n, slope_db_oct=-3.0, ch=1):
    """pink = -3 dB/oct, brown = -6 dB/oct, blue = +3. FFT spectral shaping; unit RMS."""
    x = white(n, ch)
    X = np.fft.rfft(x, axis=0)
    f = np.fft.rfftfreq(n, 1 / SR)
    g = np.ones_like(f)
    g[1:] = (f[1:] / 1000.0) ** (slope_db_oct / 6.0206)
    g[0] = 0
    if ch > 1:
        g = g[:, None]
    y = np.fft.irfft(X * g, n, axis=0)
    return y / (np.sqrt(np.mean(y ** 2)) + 1e-12)


def pink(n, ch=1):
    return colored(n, -3.0, ch)


def phase(freq, n=None):
    """freq: scalar or per-sample array (Hz). returns phase in cycles (cumulative)."""
    if np.ndim(freq) == 0:
        return np.arange(n) * freq / SR
    return np.cumsum(freq) / SR


def sine(freq, d=None, ph0=0.0):
    n = ns(d) if d is not None else len(freq)
    return np.sin(2 * np.pi * (phase(freq, n) + ph0))


def _blep(p, dt):
    out = np.zeros_like(p)
    m = p < dt
    x = p[m] / dt[m]
    out[m] = x + x - x * x - 1
    m = p > 1 - dt
    x = (p[m] - 1) / dt[m]
    out[m] = x * x + x + x + 1
    return out


def saw(freq, d=None, ph0=None):
    """band-limited (polyBLEP) sawtooth, freq scalar or array"""
    n = ns(d) if d is not None else len(freq)
    f = np.broadcast_to(np.asarray(freq, float), (n,)).copy()
    p = (phase(f) + (_rng.random() if ph0 is None else ph0)) % 1.0
    dt = np.abs(f) / SR
    return 2 * p - 1 - _blep(p, dt)


def square(freq, d=None, pw=0.5, ph0=0.0):
    n = ns(d) if d is not None else len(freq)
    f = np.broadcast_to(np.asarray(freq, float), (n,)).copy()
    p = (phase(f) + ph0) % 1.0
    dt = f / SR
    y = np.where(p < pw, 1.0, -1.0)
    y += _blep(p, dt)
    y -= _blep((p - pw) % 1.0, dt)
    return y


def supersaw(freq, d, voices=7, detune_cents=14, spread=0.8):
    """stereo detuned saw stack (pads / risers)"""
    n = ns(d)
    out = np.zeros((n, 2))
    for i in range(voices):
        k = (i - (voices - 1) / 2) / max(1, (voices - 1) / 2)  # -1..1
        f = np.asarray(freq) * 2 ** (k * detune_cents / 1200)
        out += pan(saw(f, d), k * spread)
    return out / np.sqrt(voices)


def fm(fc, ratio, index, d, index_env=None):
    """2-op FM (Chowning). index_env: per-sample multiplier of index."""
    t = tvec(d)
    I = index * (index_env if index_env is not None else 1.0)
    return np.sin(2 * np.pi * fc * t + I * np.sin(2 * np.pi * fc * ratio * t))


# ----------------------------------------------------------------------------- envelopes
def env_exp(d, attack=0.002, t60=0.5, curve=1.0):
    """linear attack then exponential decay reaching -60 dB after t60 seconds"""
    t = tvec(d)
    a = np.clip(t / max(attack, 1e-6), 0, 1) ** curve
    dec = np.exp(-6.9078 * np.maximum(t - attack, 0) / t60)
    return a * dec


def env_pts(d, pts, db=False):
    """piecewise-linear envelope through (time, value) points; db=True interpolates in dB"""
    t = tvec(d)
    tt, vv = zip(*pts)
    if db:
        return db2a(np.interp(t, tt, vv))
    return np.interp(t, tt, vv)


def adsr(d, a=0.01, dcy=0.1, s=0.7, r=0.2):
    n = ns(d)
    t = tvec(d)
    rel_start = max(d - r, a + dcy)
    e = np.interp(t, [0, a, a + dcy, rel_start, d], [0, 1, s, s, 0])
    return e[:n]


def swell(d, tpeak, rise_pow=2.5, fall_tau=None):
    """whoosh-shaped envelope: power-law rise to tpeak, exponential fall"""
    t = tvec(d)
    fall_tau = fall_tau or max((d - tpeak) / 4.5, 1e-3)
    return np.where(t < tpeak, (np.minimum(t, tpeak) / tpeak) ** rise_pow,
                    np.exp(-np.maximum(t - tpeak, 0) / fall_tau))


# ----------------------------------------------------------------------------- RBJ biquads
def rbj(kind, f0, Q=0.7071, gain_db=0.0, sr=SR):
    """Robert Bristow-Johnson Audio-EQ-Cookbook. returns (b, a) normalised so a0 = 1"""
    A = 10 ** (gain_db / 40.0)
    w0 = 2 * np.pi * f0 / sr
    c, s = np.cos(w0), np.sin(w0)
    al = s / (2 * Q)
    if kind == 'lp':
        b = [(1 - c) / 2, 1 - c, (1 - c) / 2]; a = [1 + al, -2 * c, 1 - al]
    elif kind == 'hp':
        b = [(1 + c) / 2, -(1 + c), (1 + c) / 2]; a = [1 + al, -2 * c, 1 - al]
    elif kind == 'bp':  # constant 0 dB peak gain
        b = [al, 0.0, -al]; a = [1 + al, -2 * c, 1 - al]
    elif kind == 'notch':
        b = [1, -2 * c, 1]; a = [1 + al, -2 * c, 1 - al]
    elif kind == 'ap':
        b = [1 - al, -2 * c, 1 + al]; a = [1 + al, -2 * c, 1 - al]
    elif kind == 'peak':
        b = [1 + al * A, -2 * c, 1 - al * A]; a = [1 + al / A, -2 * c, 1 - al / A]
    elif kind in ('ls', 'hs'):
        sq = 2 * np.sqrt(A) * al
        if kind == 'ls':
            b = [A * ((A + 1) - (A - 1) * c + sq), 2 * A * ((A - 1) - (A + 1) * c), A * ((A + 1) - (A - 1) * c - sq)]
            a = [(A + 1) + (A - 1) * c + sq, -2 * ((A - 1) + (A + 1) * c), (A + 1) + (A - 1) * c - sq]
        else:
            b = [A * ((A + 1) + (A - 1) * c + sq), -2 * A * ((A - 1) + (A + 1) * c), A * ((A + 1) + (A - 1) * c - sq)]
            a = [(A + 1) - (A - 1) * c + sq, 2 * ((A - 1) - (A + 1) * c), (A + 1) - (A - 1) * c - sq]
    else:
        raise ValueError(kind)
    b, a = np.array(b, float), np.array(a, float)
    return b / a[0], a / a[0]


def filt(x, *sections, pad=0.5):
    """Apply cascaded biquads (b, a) exactly (incl. phase) in the frequency domain:
    Y(k) = X(k) * prod H(e^{jw_k}).  pad seconds of zero padding absorb the IIR ring-out
    (otherwise it would wrap around). Vectorised -> ~100x faster than a Python sample loop."""
    x = np.asarray(x, float)
    n = len(x)
    N = 1 << int(np.ceil(np.log2(n + ns(pad) + 1)))
    X = np.fft.rfft(x, N, axis=0)
    z = np.exp(-2j * np.pi * np.arange(N // 2 + 1) / N)
    H = np.ones_like(z)
    for b, a in sections:
        H *= (b[0] + b[1] * z + b[2] * z * z) / (a[0] + a[1] * z + a[2] * z * z)
    if x.ndim == 2:
        H = H[:, None]
    return np.fft.irfft(X * H, N, axis=0)[:n]


def lp(x, f, Q=0.7071):
    return filt(x, rbj('lp', f, Q))


def hp(x, f, Q=0.7071):
    return filt(x, rbj('hp', f, Q))


def bp(x, f, Q=1.0):
    return filt(x, rbj('bp', f, Q))


def eq(x, f, gain_db, Q=1.0):
    return filt(x, rbj('peak', f, Q, gain_db))


def biquad_loop(x, b, a):
    """reference Direct-Form-II-Transposed (sample loop). Use for short/time-varying cases."""
    y = np.zeros(len(x))
    z1 = z2 = 0.0
    b0, b1, b2 = b
    _, a1, a2 = a
    for i, xi in enumerate(x.tolist()):
        yi = b0 * xi + z1
        z1 = b1 * xi - a1 * yi + z2
        z2 = b2 * xi - a2 * yi
        y[i] = yi
    return y


def svf(x, fc, Q=0.7071, mode='bp'):
    """Time-varying TPT state-variable filter (Zavalishin). fc scalar or per-sample array.
    Python loop: ~0.6 s per 1e6 samples. modes: lp bp hp notch."""
    x = np.asarray(x, float)
    fc = np.broadcast_to(np.clip(np.asarray(fc, float), 10, SR * 0.49), x.shape)
    g = np.tan(np.pi * fc / SR)
    k = 1.0 / Q
    a1 = 1 / (1 + g * (g + k))
    a2 = g * a1
    a3 = g * a2
    out = np.zeros_like(x)
    ic1 = ic2 = 0.0
    sel = {'lp': 0, 'bp': 1, 'hp': 2, 'notch': 3}[mode]
    for i, (xi, A1, A2, A3) in enumerate(zip(x.tolist(), a1.tolist(), a2.tolist(), a3.tolist())):
        v3 = xi - ic2
        v1 = A1 * ic1 + A2 * v3
        v2 = ic2 + A2 * ic1 + A3 * v3
        ic1 = 2 * v1 - ic1
        ic2 = 2 * v2 - ic2
        if sel == 0:
            out[i] = v2
        elif sel == 1:
            out[i] = v1
        elif sel == 2:
            out[i] = xi - k * v1 - v2
        else:
            out[i] = xi - k * v1
    return out


def stft_shape(x, gain_fn, nfft=2048, hop=256):
    """Vectorised TIME-VARYING filter: gain_fn(t_frames[:,None], f_bins[None,:]) -> gain matrix.
    sqrt-Hann analysis+synthesis, overlap-add. Ideal for moving band-pass on noise (whoosh, riser)."""
    x = np.asarray(x, float)
    two = x.ndim == 2
    xs = x if two else x[:, None]
    n = len(xs)
    w = np.sqrt(np.hanning(nfft + 1)[:nfft])
    padded = np.vstack([np.zeros((nfft, xs.shape[1])), xs, np.zeros((nfft, xs.shape[1]))])
    starts = np.arange(0, len(padded) - nfft, hop)
    idx = starts[:, None] + np.arange(nfft)[None, :]
    t = (starts + nfft / 2 - nfft) / SR
    f = np.fft.rfftfreq(nfft, 1 / SR)
    G = gain_fn(np.maximum(t, 0)[:, None], f[None, :])
    out = np.zeros_like(padded)
    norm = np.zeros(len(padded))
    for c in range(xs.shape[1]):
        F = np.fft.rfft(padded[idx, c] * w, axis=1) * G
        fr = np.fft.irfft(F, nfft, axis=1) * w
        np.add.at(out[:, c], idx.ravel(), fr.ravel())
    np.add.at(norm, idx.ravel(), np.tile(w * w, len(starts)))
    out /= np.maximum(norm, 1e-9)[:, None]
    y = out[nfft:nfft + n]
    return y if two else y[:, 0]


def band_gain(fc_of_t, bw_oct=1.0, floor_db=-60):
    """gain_fn factory: Gaussian band in log2-frequency centred on fc_of_t(t)"""
    def g(t, f):
        fc = fc_of_t(t)
        d = np.log2(np.maximum(f, 1.0) / fc)
        return np.maximum(np.exp(-0.5 * (d / (bw_oct / 2.355)) ** 2), db2a(floor_db))
    return g


def lowpass_gain(fc_of_t, slope_db_oct=24):
    def g(t, f):
        fc = fc_of_t(t)
        r = np.maximum(f, 1) / fc
        return 1 / np.sqrt(1 + r ** (2 * slope_db_oct / 6.02))
    return g


# ----------------------------------------------------------------------------- dynamics / colour / space
def sat(x, drive_db=6.0):
    """tanh saturation, level-compensated (adds harmonics -> sub audible on phones)"""
    g = db2a(drive_db)
    return np.tanh(x * g) / np.tanh(g)


def bitcrush(x, bits=6, hold=4):
    y = np.repeat(x[::hold], hold, axis=0)[:len(x)]
    q = 2 ** (bits - 1)
    return np.round(y * q) / q


def pan(x, p):
    """constant-power pan, p in [-1, 1] (scalar or per-sample array). mono or stereo in."""
    p = np.asarray(p, float)
    th = (np.clip(p, -1, 1) + 1) * np.pi / 4
    gl, gr = np.cos(th) * np.sqrt(2), np.sin(th) * np.sqrt(2)
    if np.asarray(x).ndim == 1:
        return np.stack([x * gl, x * gr], 1)
    return np.stack([x[:, 0] * gl, x[:, 1] * gr], 1)


def width(x, w=1.3):
    """mid/side width. w=0 mono, 1 unchanged, >1 wider"""
    x = st(x)
    m, s = (x[:, 0] + x[:, 1]) / 2, (x[:, 0] - x[:, 1]) / 2 * w
    return np.stack([m + s, m - s], 1)


def mono_low(x, fc=150):
    """keep everything below fc mono (sub/kick/impact safety)"""
    x = st(x)
    low = lp(x.mean(1), fc)
    high = hp(x, fc)
    return high + low[:, None]


def conv(x, ir):
    """FFT convolution; x mono/stereo, ir mono/stereo -> stereo, length len(x)+len(ir)-1"""
    x, ir = st(x), st(ir)
    n = len(x) + len(ir) - 1
    N = 1 << int(np.ceil(np.log2(n)))
    return np.fft.irfft(np.fft.rfft(x, N, axis=0) * np.fft.rfft(ir, N, axis=0), N, axis=0)[:n]


FV_COMBS = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617]  # @44.1k (Jezar, tuning.h)
FV_APS = [556, 441, 341, 225]


def freeverb_ir(dur=3.0, room=0.84, damp=0.25, wid=1.0, spread=23):
    """Freeverb's impulse response computed EXACTLY in the frequency domain (each lowpass-feedback
    comb and Freeverb allpass is a rational H(z)), so no per-sample loop. Returns stereo wet IR."""
    fb = room * 0.28 + 0.7  # scaleroom, offsetroom
    d = damp * 0.4          # scaledamp
    N = 1 << int(np.ceil(np.log2(ns(dur) * 3)))
    z = np.exp(-2j * np.pi * np.arange(N // 2 + 1) / N)
    k = SR / 44100.0
    outs = []
    for off in (0, spread):
        H = np.zeros_like(z)
        for D in FV_COMBS:
            D = int(round((D + off) * k))
            zD = z ** D
            H += zD * (1 - d * z) / (1 - d * z - fb * (1 - d) * zD)
        for D in FV_APS:
            D = int(round((D + off) * k))
            zD = z ** D
            H *= (-1 + 1.5 * zD) / (1 - 0.5 * zD)
        outs.append(np.fft.irfft(H, N)[:ns(dur)] * 0.015)  # fixedgain
    L, R = outs
    w1, w2 = (wid / 2 + 0.5), (1 - wid) / 2
    ir = np.stack([L * w1 + R * w2, R * w1 + L * w2], 1)
    return ir * env_pts(dur, [(0, 1), (dur * 0.8, 1), (dur, 0)])[:, None]


def synth_ir(t60=2.2, hf_t60=0.7, predelay=0.015, dur=None, early=True):
    """Algorithmic 'plate/hall' IR: decorrelated stereo noise whose decay time falls with
    frequency (t60 at 200 Hz -> hf_t60 at 12 kHz), plus sparse early reflections."""
    dur = dur or t60 * 1.2
    n = ns(dur)
    nz = white(n, 2)

    def g(t, f):
        lf = np.clip(np.log2(np.maximum(f, 200) / 200) / np.log2(60), 0, 1)
        T = t60 * (hf_t60 / t60) ** lf
        return np.exp(-6.9078 * t / T)
    ir = stft_shape(nz, g, nfft=1024, hop=256)
    ir *= np.clip(tvec(dur) / 0.01, 0, 1)[:, None]  # 10 ms build
    if early:
        for _ in range(10):
            tt = _rng.uniform(0.005, 0.06)
            ir[ns(tt), _rng.integers(0, 2)] += _rng.uniform(0.2, 0.6) * np.exp(-tt / 0.04) * 8
    ir = np.vstack([np.zeros((ns(predelay), 2)), ir])
    return ir / np.sqrt(np.sum(ir ** 2) / 2)


def reverb(x, ir, wet_db=-10.0, dry=True):
    y = conv(x, ir) * db2a(wet_db)
    if dry:
        y[:len(x)] += st(x)
    return y


def delay(x, t=0.25, fb=0.35, taps=6, lp_hz=4000, pingpong=True):
    """feedback echo, vectorised as a finite tap sum (each repeat darker)"""
    x = st(x)
    D = ns(t)
    y = np.vstack([x, np.zeros((D * taps, 2))])
    rep = x.copy()
    for k in range(1, taps + 1):
        rep = lp(rep, lp_hz) * fb
        if pingpong:
            rep = rep[:, ::-1]
        y[D * k:D * k + len(x)] += rep
    return y


def duck_curve(n_total, hit_times, depth_db=-4.0, attack=0.012, hold=0.05, release=0.35, lookahead=0.01):
    """Cue-driven ducking gain (better than reactive compression: we KNOW where hits are)."""
    t = np.arange(n_total) / SR
    g_db = np.zeros(n_total)
    for h in hit_times:
        t0 = h - lookahead
        a = np.clip((t - (t0 - attack)) / attack, 0, 1)
        r = np.where(t > t0 + hold, np.exp(-(t - t0 - hold) / (release / 3)), 1.0)
        g_db = np.minimum(g_db, depth_db * a * r)
    return db2a(g_db)


# ----------------------------------------------------------------------------- loudness (BS.1770 / R128)
_K1 = (np.array([1.53512485958697, -2.69169618940638, 1.19839281085285]),
       np.array([1.0, -1.69065929318241, 0.73248077421585]))
_K2 = (np.array([1.0, -2.0, 1.0]), np.array([1.0, -1.99004745483398, 0.99007225036621]))


def lufs(x):
    """Integrated loudness (ITU-R BS.1770-4, 48 kHz K-weighting, 400 ms gated blocks)"""
    x = st(x)
    y = filt(x, _K1, _K2)
    blk, hop = ns(0.4), ns(0.1)
    if len(y) < blk:
        return -70.0
    idx = np.arange(0, len(y) - blk + 1, hop)
    cs = np.vstack([np.zeros((1, 2)), np.cumsum(y ** 2, axis=0)])
    ms = (cs[idx + blk] - cs[idx]) / blk
    zl = ms.sum(1)
    L = -0.691 + 10 * np.log10(np.maximum(zl, 1e-15))
    g = zl[L > -70]
    if not len(g):
        return -70.0
    rel = -0.691 + 10 * np.log10(g.mean()) - 10
    g2 = zl[(L > -70) & (L > rel)]
    return -0.691 + 10 * np.log10(g2.mean())


def true_peak_db(x, os=4):
    x = st(x)
    n = len(x)
    X = np.fft.rfft(x, axis=0)
    Y = np.zeros((n * os // 2 + 1, 2), complex)
    Y[:len(X)] = X
    return a2db(np.max(np.abs(np.fft.irfft(Y, n * os, axis=0) * os)))


def soft_limit(x, ceiling_db=-1.5, knee_db=4.0):
    """smooth tanh-knee peak limiter (static); use on master before the loudnorm pass"""
    c = db2a(ceiling_db)
    k = db2a(-knee_db) * c
    ax = np.abs(x)
    over = ax > k
    y = x.copy()
    y[over] = np.sign(x[over]) * (k + (c - k) * np.tanh((ax[over] - k) / (c - k)))
    return y


def limiter(x, ceiling_db=-1.3, lookahead=0.004, release=0.12, blk=16):
    """Look-ahead brickwall limiter, vectorised: block peak -> +-lookahead hold -> release
    (one-pole, only on the way up) -> boxcar smoothing. gain <= ceiling/peak guaranteed."""
    x = st(x)
    n = len(x)
    c = db2a(ceiling_db)
    a = np.max(np.abs(x), 1)
    nb = -(-n // blk)
    a = np.pad(a, (0, nb * blk - n)).reshape(nb, blk).max(1)
    W = max(1, int(np.ceil(ns(lookahead) / blk)))
    ap = np.pad(a, (W, W))
    h = np.max(np.stack([ap[k:k + nb] for k in range(2 * W + 1)]), 0)
    g = np.minimum(1.0, c / np.maximum(h, 1e-12))
    r = np.exp(-blk / (release * SR))
    gs = np.empty_like(g)
    cur = 1.0
    for i, v in enumerate(g.tolist()):
        cur = v if v < cur else v + (cur - v) * r
        gs[i] = cur
    gs = np.minimum(gs, np.convolve(np.pad(gs, (W, W), mode='edge'), np.ones(W) / W, 'same')[W:W + nb])
    gain = np.interp(np.arange(n), np.arange(nb) * blk + blk / 2, gs)
    return x * gain[:, None]


def master(x, lufs_target=-14.0, tp_target=-1.0, iters=6):
    """drive into limiter until integrated loudness == target and true peak <= tp_target.
    Output then passes ffmpeg loudnorm in LINEAR mode (transients preserved)."""
    x = mono_low(filt(st(x), rbj('hp', 28, 0.7)), 120)
    drive = lufs_target - lufs(x)
    ceil = tp_target - 0.4
    for _ in range(iters):
        z = limiter(x * db2a(drive), ceil)
        L, tp = lufs(z), true_peak_db(z)
        if abs(L - lufs_target) < 0.1 and tp <= tp_target - 0.1:
            break
        drive += lufs_target - L
        if tp > tp_target - 0.1:
            ceil -= tp - (tp_target - 0.2)
    return z


# ============================================================================= SFX RECIPES
def whoosh(d=0.9, f_lo=250, f_hi=2600, tpeak=0.6, bw_oct=1.1, pan_from=-0.7, pan_to=0.7,
           tone=True, air=True):
    """band-passed pink noise; centre freq rises f_lo->f_hi until tpeak (approach) then falls
    (Doppler pass-by); swell envelope peaks at tpeak = put tpeak ON the visual cut/arrival."""
    n = ns(d)
    tp = tpeak * d

    def fc(t):
        up = f_lo * (f_hi / f_lo) ** np.clip(t / tp, 0, 1) ** 1.5
        down = f_hi * (f_lo * 1.4 / f_hi) ** np.clip((t - tp) / (d - tp), 0, 1)
        return np.where(t < tp, up, down)
    x = stft_shape(pink(n), band_gain(fc, bw_oct))
    if air:
        x += 0.25 * stft_shape(white(n), band_gain(lambda t: fc(t) * 3.5, 1.6))
    if tone:  # faint pitched 'vvvv' body that follows the band one octave below
        tt = tvec(d)
        x += 0.15 * sine(fc(tt) / 4) * np.sqrt(np.mean(x ** 2)) * 4
    e = swell(d, tp, 2.2)
    y = pan(x * e, np.linspace(pan_from, pan_to, n) if pan_from != pan_to else pan_from)
    y += 0.12 * pan(x[::-1] * e, -np.linspace(pan_from, pan_to, n))  # slight decorrelation
    return peak_norm(fade(y, 0.003, 0.02))


def swish(d=0.28, **kw):
    kw = {**dict(f_lo=1200, f_hi=6000, tpeak=0.45, bw_oct=1.3, tone=False, air=False), **kw}
    return whoosh(d, **kw)


def riser(d=4.0, f0=180, f1=9000, semis=12, root_hz=110.0, tremolo=True):
    """noise with exponentially rising low-pass + supersaw gliding up `semis` + accelerating
    tremolo; amplitude grows in dB; ends ABRUPTLY at d (cut it exactly on the drop frame)."""
    n = ns(d)
    t = tvec(d)
    u = t / d

    def fc(tt):
        return f0 * (f1 / f0) ** (np.clip(tt / d, 0, 1) ** 1.3)
    nz = stft_shape(pink(n, 2), lowpass_gain(fc, 18))
    nz += 0.6 * stft_shape(white(n, 2), band_gain(lambda tt: fc(tt) * 0.9, 0.7))
    glide = root_hz * 2 ** (semis * u ** 1.6 / 12)
    tonal = supersaw(glide, d, 7, 18, 0.9) + 0.5 * supersaw(glide * 2, d, 5, 22, 1.0)
    tonal = stft_shape(tonal, lowpass_gain(lambda tt: fc(tt) * 0.6, 12))
    x = nz / np.max(np.abs(nz)) + 0.55 * tonal / np.max(np.abs(tonal))
    amp = db2a(-30 + 30 * u ** 1.4)
    if tremolo:
        rate = 3 + 17 * u ** 2
        amp = amp * (1 - 0.35 * u * (0.5 + 0.5 * np.sin(2 * np.pi * np.cumsum(rate) / SR)))
    return peak_norm(fade(x * amp[:, None], 0.05, 0.004))


def metal_hash(d, mult=1.0, hp_hz=6500):
    """TR-808 style metallic noise: 6 detuned square oscillators -> band/high-pass"""
    freqs = np.array([205.3, 304.4, 369.6, 522.7, 540.0, 800.0]) * mult
    x = sum(square(f, d, ph0=_rng.random()) for f in freqs) / 6
    return filt(x, rbj('bp', 9000 * mult ** 0.3, 0.9), rbj('hp', hp_hz), rbj('hp', hp_hz))


def cymbal(d=2.5, t60=2.2):
    x = metal_hash(d, 1.35, 4000) + 0.25 * filt(white(ns(d)), rbj('hp', 3500), rbj('lp', 11000))
    x = x * env_exp(d, 0.001, t60)
    return reverb(x, synth_ir(1.6, 0.8), -12)[:ns(d)]


def reverse_cymbal(d=1.8, t60=2.6):
    """reversed cymbal + reversed reverb tail: swells into the hit; peak lands at the END"""
    c = cymbal(d + 0.3, t60)
    y = c[::-1][-ns(d):] if c.ndim == 2 else c[::-1][-ns(d):]
    y = st(y) * swell(d, d, 1.0)[:, None] ** 0.3
    return peak_norm(width(fade(y, 0.2, 0.003), 1.4))


def sub_drop(d=2.2, f_start=95, f_end=30, glide=0.7):
    """exponential sine glide + decay; tanh adds 2nd/3rd harmonics so phones 'hear' it"""
    t = tvec(d)
    f = f_end + (f_start - f_end) * np.exp(-t / (glide * d / 4))
    x = sine(f) * env_exp(d, 0.004, d * 0.95)
    return peak_norm(fade(sat(x * 1.5, 4), 0.002, 0.05))


def impact(d=2.8, f_hi=140, f_lo=42, tail=True, crack_db=-6, mid_db=-7):
    """trailer hit: (1) pitched sine body 140->42 Hz in ~150 ms, (2) 15 ms hp noise crack,
    (3) low-passed noise thump, (4) long dark reverb tail; then tanh saturation."""
    n = ns(d)
    t = tvec(d)
    f = f_lo + (f_hi - f_lo) * np.exp(-t / 0.045)
    body = sine(f) * env_exp(d, 0.001, 1.6)
    crack = hp(white(n), 1800) * np.exp(-t / 0.004) * db2a(crack_db) * 2.5
    thump = lp(pink(n), 900) * np.exp(-t / 0.08) * db2a(mid_db)
    x = body + crack + thump
    x = sat(x, 5)
    y = st(x)
    if tail:
        tl = bp(pink(n), 250, 0.7) * np.exp(-t / 0.25) * 0.4
        y = y + reverb(tl, synth_ir(3.0, 0.9, 0.02), 0, dry=False)[:n]
    return peak_norm(mono_low(fade(y, 0.0005, 0.08), 120))


def glitch(d=0.45, density=0.7):
    """buffer-stutter glitch: digital source cut into 8-35 ms grains; each grain is
    repeated / bit-crushed / pitch-jumped / reversed / muted, hard-gated, random pan"""
    n = ns(d)
    src = (square(_rng.choice([220, 330, 660, 1320, 2640]), d, 0.3) * 0.5 + 0.5 * hp(white(n), 800))
    src = src * (0.6 + 0.4 * square(37, d))
    y = np.zeros((n, 2))
    i = 0
    while i < n:
        g = ns(_rng.uniform(0.008, 0.035))
        seg = src[i:i + g]
        r = _rng.random()
        if r < 0.25:
            seg = np.tile(seg[:max(8, len(seg) // _rng.integers(2, 5))], 6)[:len(seg)]
        elif r < 0.45:
            seg = bitcrush(seg, int(_rng.integers(3, 6)), int(_rng.integers(3, 12)))
        elif r < 0.6:
            k = _rng.choice([0.5, 2.0])
            seg = np.interp(np.arange(len(seg)) * k % len(seg), np.arange(len(seg)), seg)
        elif r < 0.7:
            seg = seg[::-1]
        elif r > density + 0.25:
            seg = seg * 0
        y[i:i + len(seg)] += pan(seg, _rng.uniform(-0.8, 0.8))
        i += g
    return peak_norm(fade(lp(y, 7000), 0.001, 0.01))


def tick(pitch=1.0, bright=1.0, body=True):
    """2-6 ms click for text shuffle/scramble: decaying 4.2 kHz sine + hp noise + tiny body.
    Randomise pitch +-8% and level +-2 dB per tick to avoid 'machine-gun' repetition."""
    d = 0.03
    t = tvec(d)
    p = pitch * _rng.uniform(0.92, 1.08)
    x = sine(4200 * p, d) * np.exp(-t / 0.0007)
    x += 0.5 * bright * hp(white(len(t)), 2500) * np.exp(-t / 0.0005)
    if body:
        x += 0.35 * sine(950 * p, d) * np.exp(-t / 0.002)
    return peak_norm(x) * db2a(_rng.uniform(-2, 0))


def tick_train(times, pitch=1.0, lock_times=()):
    """ticks at given times (s, relative); 'lock' = lower, louder settle click when a char resolves"""
    end = max(list(times) + list(lock_times) + [0]) + 0.1
    b = Bus(end)
    for tm in times:
        b.add(tick(pitch), tm, -6, _rng.uniform(-0.15, 0.15))
    for tm in lock_times:
        b.add(tick(pitch * 0.55, 0.6), tm, -2)
        b.add(pop(0.6), tm, -8)
    return b.buf


def typewriter_key(heavy=1.0):
    d = 0.12
    t = tvec(d)
    n = len(t)
    click = bp(white(n), _rng.uniform(2200, 3200), 1.4) * np.exp(-t / 0.0012) * 3
    thock = sine(220 * np.exp(-t / 0.02) + 150, d) * np.exp(-t / 0.012) * 0.8 * heavy
    clack = np.zeros(n)
    j = ns(_rng.uniform(0.025, 0.04))
    clack[j:] = bp(white(n - j), 4000, 2) * np.exp(-t[:n - j] / 0.0009) * 1.2
    return peak_norm(click + thock + clack) * db2a(_rng.uniform(-3, 0))


def typewriter_bell():
    return bell(2093.0, 1.4, ratio=2.76, index=1.2)


def pop(pitch=1.0, d=0.09):
    """bubble/UI pop: sine whose pitch jumps up exponentially (300->1100 Hz in 40 ms)"""
    t = tvec(d)
    f = pitch * (300 + 800 * (1 - np.exp(-t / 0.012)))
    x = sine(f) * env_exp(d, 0.001, 0.06)
    x += 0.3 * hp(white(len(t)), 3000) * np.exp(-t / 0.0006)
    return peak_norm(fade(x, 0.0005, 0.01))


def ui_tap(freq=1800, d=0.08, soft=False):
    t = tvec(d)
    f = freq * (0.5 if soft else 1)
    x = sine(f * (1 + 0.04 * np.exp(-t / 0.004)), d) * np.exp(-t / 0.018)
    x += 0.25 * sine(2 * f, d) * np.exp(-t / 0.008)
    x += 0.4 * hp(white(len(t)), 5000) * np.exp(-t / 0.0004)
    return peak_norm(lp(x, 9000))


def bell(f, d=1.6, ratio=1.4, index=3.0, t60=None):
    """Chowning FM bell: carrier f, modulator f*ratio (inharmonic 1.4 / 3.5 / 2.76), index decays"""
    t60 = t60 or d
    e = env_exp(d, 0.001, t60)
    x = fm(f, ratio, index, d, index_env=env_exp(d, 0.001, t60 * 0.5))
    x += 0.25 * sine(f * 2.0, d) * env_exp(d, 0.001, t60 * 0.4)
    return x * e


def chime(notes=(88, 95), gap=0.09, d=1.6, verb=True):
    """notification chime: 2 FM-bell notes (MIDI; default E6 -> B6) + short plate"""
    b = Bus(gap * len(notes) + d)
    for i, m in enumerate(notes):
        b.add(bell(mtof(m), d, 1.4, 2.0), i * gap, -i * 1.5, (i - 0.5) * 0.3)
    y = b.buf
    if verb:
        y = reverb(y, synth_ir(1.4, 0.5), -14)
    return peak_norm(fade(y, 0.001, 0.2))


def success(root=69, scale=(0, 4, 7, 12, 16), gap=0.07):
    """success sting: rising major arpeggio (Picardy-major resolution) + sparkle + soft sub"""
    d = gap * len(scale) + 1.6
    b = Bus(d)
    for i, s in enumerate(scale):
        b.add(bell(mtof(root + 12 + s), 1.2, 3.5, 1.2), i * gap, -1 * i * 0.5, -0.4 + 0.8 * i / len(scale))
        b.add(pluck(mtof(root + s), 1.0, bright=0.8), i * gap, -6)
    sp = Bus(d)
    for _ in range(25):
        tm = _rng.uniform(gap * 2, gap * len(scale) + 0.4)
        sp.add(sine(_rng.uniform(5500, 10000), 0.25) * env_exp(0.25, 0.001, 0.15), tm, -18, _rng.uniform(-1, 1))
    b.buf += sp.buf
    b.add(sub_drop(0.6, 70, 45) * 0.5, gap * (len(scale) - 1), -10)
    return peak_norm(reverb(b.buf, synth_ir(2.0, 0.6), -12))


def card_flick(bright=1.0):
    d = 0.06
    t = tvec(d)
    n = len(t)
    fc = _rng.uniform(1800, 5000) * bright
    x = bp(white(n), fc, 0.8) * (1 - np.exp(-t / 0.0008)) * np.exp(-t / _rng.uniform(0.006, 0.014))
    x += 0.12 * sine(_rng.uniform(150, 260), d) * np.exp(-t / 0.008)  # paper 'flap'
    return peak_norm(x)


def card_settle():
    d = 0.15
    t = tvec(d)
    x = lp(white(len(t)), 600) * np.exp(-t / 0.02) * 1.5 + sine(120, d) * np.exp(-t / 0.03)
    return peak_norm(x)


def card_shuffle(n_cards=14, d=0.55, accel=True, settle=True):
    """riffle: n flicks with 18-45 ms jittered spacing (accelerating), random pan, then a 'tap'"""
    gaps = _rng.uniform(0.018, 0.045, n_cards)
    if accel:
        gaps *= np.linspace(1.4, 0.6, n_cards)
    times = np.cumsum(gaps) - gaps[0]
    times *= (d - 0.08) / max(times[-1], 1e-6)
    b = Bus(d + 0.2)
    for i, tm in enumerate(times):
        b.add(card_flick(), tm, _rng.uniform(-4, 0) - 3 * (i % 2), _rng.uniform(-0.35, 0.35))
    if settle:
        b.add(card_settle(), times[-1] + 0.05, -2)
    return peak_norm(b.buf)


def logo_sting(root=57, motif=(0, 7, 12, 16), gap=0.11, pre=1.6):
    """reverse cymbal (pre s) -> HIT at t=pre: impact + sub + bell/pluck motif + shimmer tail.
    Returns (audio, hit_time)."""
    d = pre + 3.2
    b = Bus(d)
    b.add(reverse_cymbal(pre), 0, -5)
    b.add(impact(2.8, tail=True), pre, -2)
    b.add(sub_drop(2.0, 80, 32), pre, -6)
    for i, s in enumerate(motif):
        b.add(bell(mtof(root + 24 + s), 2.0, 3.5, 1.5), pre + 0.05 + i * gap, -8 - i, -0.3 + 0.2 * i)
        b.add(pluck(mtof(root + 12 + s), 1.8, bright=0.7), pre + 0.05 + i * gap, -6)
    y = reverb(b.buf, synth_ir(3.5, 1.2, 0.03), -14)
    return peak_norm(y[:ns(d + 1.0)]), pre


# ============================================================================= MUSIC VOICES
def kick(d=0.45, f_hi=165, f_lo=48, tau=0.035, click_db=-16):
    t = tvec(d)
    f = f_lo + (f_hi - f_lo) * np.exp(-t / tau)
    x = sine(f) * env_exp(d, 0.0015, d * 0.9)
    x += db2a(click_db) * 3 * hp(white(len(t)), 3000) * np.exp(-t / 0.002)
    return peak_norm(fade(sat(x, 3), 0.0005, 0.02))


def snare(d=0.25):
    t = tvec(d)
    tone = (sine(185 * (1 + 0.1 * np.exp(-t / 0.01)), d) + 0.6 * sine(330, d)) * np.exp(-t / 0.05)
    nz = filt(white(len(t)), rbj('hp', 1500), rbj('lp', 7500), rbj('lp', 9000), rbj('peak', 3500, 1.0, 4)) * np.exp(-t / 0.09)
    return peak_norm(0.6 * tone + nz)


def clap(d=0.35):
    t = tvec(d)
    base = bp(white(len(t)), 1300, 1.1)
    e = np.zeros(len(t))
    for k, off in enumerate([0, 0.011, 0.022, 0.031]):
        tt = np.maximum(t - off, 0)
        e += (t >= off) * np.exp(-tt / (0.004 if k < 3 else 0.065))
    return peak_norm(reverb(base * e, synth_ir(0.6, 0.3), -14)[:len(t)])


def hat(open_=False):
    d = 0.4 if open_ else 0.08
    x = metal_hash(d, 1.0, 7000) * env_exp(d, 0.0005, 0.35 if open_ else 0.05)
    return peak_norm(x)


MEMBRANE = [1.0, 1.594, 2.136, 2.296, 2.653, 2.918, 3.156, 3.501]  # circular membrane Bessel modes


def jingles(d=0.25, n=14, bright=1.0, t60=0.18):
    """doira's metal rings: cluster of inharmonic 3.5-9 kHz partials with onset jitter"""
    b = Bus(d)
    for _ in range(n):
        f = _rng.uniform(3500, 9000) * bright
        dd = d - 0.01
        b.add(sine(f, dd) * env_exp(dd, 0.0005, t60 * _rng.uniform(0.5, 1.2)), _rng.uniform(0, 0.012),
              _rng.uniform(-10, 0), _rng.uniform(-0.5, 0.5))
    return hp(b.buf, 3000)


def doira(stroke='D', f=95.0, jingle_db=-14):
    """frame-drum strokes. D=dum (centre, bassy, modes ring), T=tak (rim, dry+bright),
    K=ka (soft rim, other hand), S=shake (jingle only), P=slap (snap + jingles)."""
    d = 0.6 if stroke == 'D' else 0.25
    t = tvec(d)
    n = len(t)
    if stroke == 'D':
        amps = [1, .45, .3, .22, .15, .1, .07, .05]
        x = sum(a * sine(f * r * (1 + 0.03 * np.exp(-t / 0.03)), d) * np.exp(-t / (0.22 / r ** 0.7))
                for r, a in zip(MEMBRANE, amps))
        x += 0.5 * lp(white(n), 300) * np.exp(-t / 0.015)
        y = st(x) + db2a(jingle_db) * jingles(d, 8, 0.9)
    elif stroke in ('T', 'K'):
        f2 = f * 3.4
        amps = [.3, .5, .6, .5, .45, .4, .3, .25]
        x = sum(a * sine(f2 * r, d) * np.exp(-t / (0.06 / r ** 0.5)) for r, a in zip(MEMBRANE, amps))
        x += 1.2 * bp(white(n), 2600, 1.2) * np.exp(-t / 0.006)
        y = st(x) * (1 if stroke == 'T' else 0.45) + db2a(jingle_db + 6) * jingles(d, 12)
    elif stroke == 'S':
        y = jingles(d, 18, 1.0, 0.12) * (np.clip(t / 0.03, 0, 1)[:, None])
    elif stroke == 'P':
        x = 1.5 * hp(white(n), 1500) * np.exp(-t / 0.004) + 0.5 * bp(white(n), 900, 1.5) * np.exp(-t / 0.02)
        y = st(x) + db2a(jingle_db + 10) * jingles(d, 16)
    return peak_norm(fade(y, 0.0005, 0.02))


def doira_roll(d=2.0, start_rate=4.0, end_rate=24.0):
    """accelerating tak roll with crescendo (Lazgi-style speed-up) = an ETHNIC RISER"""
    b = Bus(d + 0.3)
    t = 0.0
    while t < d:
        u = t / d
        rate = start_rate * (end_rate / start_rate) ** u
        b.add(doira('T' if int(t * rate) % 2 == 0 else 'K'), t, -18 + 18 * u ** 1.5, _rng.uniform(-0.2, 0.2))
        t += 1.0 / rate
    return b.buf[:ns(d)]


def pluck(f, d=1.5, rho=0.996, bright=0.6, body=True):
    """Karplus-Strong, BLOCK-VECTORISED: y[n] = rho*(y[n-N]+y[n-N-1])/2. Each block of N samples
    only depends on the previous block, so the loop runs len/N times (not len times).
    f0 = SR/(N+0.5). bright = initial noise low-pass (0..1)."""
    n = ns(d)
    N = max(2, int(round(SR / f - 0.5)))
    y = np.zeros(n + 2 * N + 2)
    exc = white(N)
    if bright < 1:
        exc = lp(np.tile(exc, 3), 300 + 9000 * bright ** 2)[N:2 * N]
    exc -= exc.mean()
    y[1:N + 1] = exc
    s = N + 1
    while s < len(y):
        e = min(s + N, len(y))
        y[s:e] = rho * 0.5 * (y[s - N:e - N] + y[s - N - 1:e - N - 1])
        s = e
    x = y[1:n + 1]
    if body:  # lute body resonances
        x = filt(x, rbj('peak', 260, 1.2, 4), rbj('peak', 1800, 1.5, 3), rbj('hp', 70))
    return fade(x / (np.max(np.abs(x)) + 1e-12), 0.0005, 0.03)


def dutar(f, d=1.6, drone_semis=7, strum=0.012):
    """dutar-ish: two strings (melody + drone a 4th/5th away), slight detune, nylon-dark tone"""
    a = pluck(f * 2 ** (3 / 1200), d, 0.997, 0.45)
    b = pluck(f * 2 ** (drone_semis / 12), d, 0.996, 0.35)
    o = ns(strum)
    y = np.zeros((ns(d) + o, 2))
    y[:ns(d)] += pan(a, -0.15)
    y[o:o + ns(d)] += pan(b, 0.2) * 0.6
    return y[:ns(d)]


def rubab(f, d=1.4):
    """rubab-ish: brighter, metallic attack, sympathetic shimmer via short plate"""
    x = pluck(f, d, 0.995, 0.85)
    x = filt(x, rbj('peak', 2400, 1.2, 4), rbj('hs', 6000, 0.7, 2))
    return reverb(x, synth_ir(0.9, 0.5, 0.005), -14)[:ns(d)]


def bass(f, d, kind='sub'):
    t = tvec(d)
    if kind == 'sub':
        x = sat(sine(f, d) * 1.2, 5) + 0.15 * sine(2 * f, d)
        return x * adsr(d, 0.005, 0.1, 0.85, 0.06)
    x = saw(f, d) + 0.5 * square(f / 2, d)
    cutoff = 180 + 1800 * np.exp(-t / 0.08)
    x = stft_shape(x, lowpass_gain(lambda tt: 180 + 1800 * np.exp(-tt / 0.08), 24), 512, 64)
    return sat(x, 4) * adsr(d, 0.003, 0.15, 0.6, 0.05)


def pad(midi_notes, d, cutoff=1800, attack=0.6, release=1.0):
    y = sum(supersaw(mtof(m), d, 7, 12, 0.9) for m in midi_notes)
    y = filt(y, rbj('lp', cutoff, 0.6), rbj('hp', 120))
    return y * adsr(d, attack, 0.3, 0.8, release)[:, None] / len(midi_notes)


# ----------------------------------------------------------------------------- pattern sequencer
def seq(pattern, bpm, voices, bars=1, steps_per_bar=16, swing=0.0, humanize_ms=4, vel=None):
    """pattern: string of steps, e.g. 'D..T..D.T.K.DTKT'; voices: {char: callable->audio}.
    swing delays every 2nd 16th by swing*step. returns stereo buffer of `bars` bars."""
    step = 60.0 / bpm * 4 / steps_per_bar
    b = Bus(bars * step * steps_per_bar + 1.0)
    for bar in range(bars):
        for i, ch in enumerate(pattern):
            if ch in voices:
                tm = (bar * steps_per_bar + i) * step + (swing * step if i % 2 else 0)
                tm += _rng.normal(0, humanize_ms / 1000)
                g = 0 if (vel is None) else vel[i]
                b.add(voices[ch](), max(tm, 0), g + _rng.uniform(-1.5, 0))
    return b.buf


# ============================================================================= AGROVERSE ADDITIONS
# Voices tuned for the 60 s film: softer / darker than the generic library versions (no harsh highs).
def hit_soft(d=0.4):
    """soft thump: seed lands, card settles (low sine blip + padded noise)"""
    t = tvec(d)
    f = 68 + 95 * np.exp(-t / 0.028)
    x = sine(f) * env_exp(d, 0.002, 0.26)
    x += 0.30 * lp(pink(len(t)), 520) * np.exp(-t / 0.022)
    x = sat(x, 2.5)
    return peak_norm(st(fade(lp(x, 4500), 0.001, 0.06)))


def stamp(d=0.5):
    """rubber stamp on paper: dull thud + short paper slap + tiny room"""
    t = tvec(d)
    n = len(t)
    body = sine(92 + 100 * np.exp(-t / 0.022)) * np.exp(-t / 0.075)
    thud = lp(pink(n), 1300) * np.exp(-t / 0.02) * 1.3
    slap = bp(white(n), 2300, 0.9) * np.exp(-t / 0.0045) * 0.45
    x = sat(body + thud + slap, 3)
    y = reverb(st(x), synth_ir(0.45, 0.22, 0.004, early=False), -17)[:n]
    return peak_norm(fade(lp(y, 8000), 0.0005, 0.06))


def impact_mid(d=1.5):
    """mid impact for word slams: shorter and thinner than boom, short dark tail"""
    n = ns(d)
    t = tvec(d)
    f = 52 + 100 * np.exp(-t / 0.04)
    body = sine(f) * env_exp(d, 0.001, 0.9)
    crack = hp(white(n), 1600) * np.exp(-t / 0.004) * 0.9
    thump = lp(pink(n), 800) * np.exp(-t / 0.07) * 0.5
    x = sat(body + crack + thump, 4.5)
    tl = bp(pink(n), 300, 0.7) * np.exp(-t / 0.18) * 0.3
    y = st(x) + reverb(tl, synth_ir(1.5, 0.6, 0.015, early=False), 0, dry=False)[:n]
    return peak_norm(mono_low(fade(lp(y, 9000), 0.0005, 0.08), 120))


def boom(d=2.8):
    """brand-reveal hit: full impact + sub drop"""
    b = Bus(d)
    b.add(impact(d, tail=True), 0, 0)
    b.add(sub_drop(2.2, 90, 30), 0, -3)
    return peak_norm(b.buf)


def lock_click(pitch=1.0):
    """crisp 'done' click: tiny bright tick + woody body"""
    d = 0.05
    t = tvec(d)
    p = pitch * _rng.uniform(0.96, 1.04)
    x = sine(2600 * p, d) * np.exp(-t / 0.0012)
    x += 0.35 * hp(white(len(t)), 3000) * np.exp(-t / 0.0004)
    x += 0.55 * sine(1250 * p, d) * np.exp(-t / 0.007)
    return peak_norm(lp(x, 8000))


def tick_soft(pitch=1.0):
    """scramble tick: darker/shorter than tick(), never harsh"""
    d = 0.03
    t = tvec(d)
    p = pitch * _rng.uniform(0.9, 1.1)
    x = sine(3200 * p, d) * np.exp(-t / 0.0007)
    x += 0.4 * hp(white(len(t)), 2200) * np.exp(-t / 0.0005)
    x += 0.4 * sine(900 * p, d) * np.exp(-t / 0.002)
    return peak_norm(lp(x, 7000)) * db2a(_rng.uniform(-2, 0))


def key_soft():
    """soft keyboard key for the typing run"""
    d = 0.08
    t = tvec(d)
    n = len(t)
    click = bp(white(n), _rng.uniform(1800, 2600), 1.2) * np.exp(-t / 0.0013) * 2.0
    thock = sine(_rng.uniform(170, 230), d) * np.exp(-t / 0.011) * 0.7
    return peak_norm(lp(click + thock, 6500)) * db2a(_rng.uniform(-3, 0))


def card_place(d=0.16):
    """a card dealt onto the table: paper tap + soft felt thud"""
    t = tvec(d)
    n = len(t)
    x = lp(white(n), 800) * np.exp(-t / 0.014) * 1.2
    x += bp(white(n), 2100, 0.9) * (1 - np.exp(-t / 0.0006)) * np.exp(-t / 0.004) * 0.7
    x += 0.5 * sine(150 * (1 + 0.2 * np.exp(-t / 0.01)), d) * np.exp(-t / 0.025)
    return peak_norm(fade(x, 0.0004, 0.03))


def bubble(pitch=1.0, d=0.2):
    """chat bubble: soft two-stage 'bloop' with a little air"""
    t = tvec(d)
    f = pitch * (430 + 360 * (1 - np.exp(-t / 0.022)))
    x = sine(f) * env_exp(d, 0.0015, 0.13)
    x += 0.25 * sine(2 * f) * env_exp(d, 0.0015, 0.06)
    x += 0.12 * bp(white(len(t)), 2600, 1.2) * np.exp(-t / 0.003)
    return peak_norm(fade(lp(x, 5000), 0.001, 0.03))


def switch_click(up=True):
    """toggle / language switch: two-stage latch 'ka-tik'"""
    d = 0.14
    b = Bus(d)

    def tk(f, lvl):
        dd = 0.03
        t = tvec(dd)
        n = len(t)
        x = bp(white(n), f, 1.8) * np.exp(-t / 0.0016) * 2.0 + 0.7 * sine(f * 0.45, dd) * np.exp(-t / 0.005)
        return peak_norm(lp(x, 7500)) * lvl
    b.add(tk(2100 if up else 2500, 1.0), 0)
    b.add(tk(3100 if up else 2000, 0.6), 0.048)
    return peak_norm(b.buf)


def vibrate(on=(0.12, 0.06, 0.12)):
    """phone haptic buzz: on/off/on pattern, ~175 Hz motor + case rattle"""
    d = sum(on) + 0.08
    n = ns(d)
    t = tvec(d)
    gate = np.zeros(n)
    pos = 0.0
    for i, seg in enumerate(on):
        if i % 2 == 0:
            a, b_ = ns(pos), ns(pos + seg)
            m = b_ - a
            g = np.ones(m)
            ra, rb = ns(0.014), ns(0.016)
            g[:ra] = np.linspace(0, 1, ra)
            g[-rb:] *= np.linspace(1, 0, rb)
            gate[a:b_] = g
        pos += seg
    f = 178 * (1 + 0.05 * (1 - np.exp(-(t % 0.18) / 0.02)))
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) + 0.35 * np.sin(2 * ph + 0.6) + 0.18 * np.sin(3 * ph)
    x += 0.10 * bp(white(n), 320, 1.0)
    x = lp(x, 1400) * gate
    return peak_norm(pan(x, 0.0))


def shimmer(d=1.3, notes=(84, 88, 91, 93, 96, 100)):
    """glint: a few soft descending-to-ascending bell partials, pentatonic, wide, with plate"""
    b = Bus(d)
    k = len(notes)
    for i in range(k + 2):
        m = notes[min(i, k - 1)]
        tm = 0.02 + i * _rng.uniform(0.045, 0.08)
        f = mtof(m)
        dd = 0.7
        x = sine(f, dd) * env_exp(dd, 0.012, 0.45) + 0.3 * sine(f * 2.76, dd) * env_exp(dd, 0.012, 0.18)
        b.add(x, tm, -2.0 * i, _rng.uniform(-0.8, 0.8))
    y = reverb(lp(b.buf, 9500), synth_ir(1.3, 0.6, 0.012), -9)
    return peak_norm(fade(y, 0.003, 0.25))


def chime_pair(notes=(88, 93), gap=0.11, d=1.7):
    """notification: two soft FM bells + plate (pitches chosen by the caller to fit the chord)"""
    b = Bus(gap * len(notes) + d)
    for i, m in enumerate(notes):
        b.add(bell(mtof(m), d, 1.4, 1.6), i * gap, -i * 1.5, (i - 0.5) * 0.3)
    y = reverb(lp(b.buf, 9000), synth_ir(1.5, 0.5), -13)
    return peak_norm(fade(y, 0.001, 0.25))


def success_arp(root=60, scale=(0, 4, 7, 12, 16), gap=0.075):
    """success sting: rising major arpeggio on the current chord root, soft sub bloom, sparkle"""
    d = gap * len(scale) + 1.7
    b = Bus(d)
    for i, s in enumerate(scale):
        b.add(bell(mtof(root + 12 + s), 1.3, 3.5, 1.1), i * gap, -0.6 * i, -0.4 + 0.8 * i / len(scale))
        b.add(pluck(mtof(root + s), 1.0, bright=0.7), i * gap, -6)
    for _ in range(14):
        tm = _rng.uniform(gap * 2, gap * len(scale) + 0.45)
        b.add(sine(_rng.uniform(4500, 8000), 0.25) * env_exp(0.25, 0.004, 0.16), tm, -22, _rng.uniform(-1, 1))
    b.add(st(sine(mtof(root - 12), 0.7) * env_exp(0.7, 0.01, 0.5)) * 0.45, gap * (len(scale) - 1), -11)
    return peak_norm(reverb(lp(b.buf, 9500), synth_ir(1.8, 0.55), -12))


def sting_tonal(root=57, motif=(0, 7, 12, 16), gap=0.11, d=3.4):
    """short tonal logo sting: bell+pluck arpeggio, first note exactly at t=0 (aligned to the cue)"""
    b = Bus(d)
    for i, s in enumerate(motif):
        b.add(bell(mtof(root + 24 + s), 2.0, 3.5, 1.4), i * gap, -3 - 1.2 * i, -0.3 + 0.2 * i)
        b.add(pluck(mtof(root + 12 + s), 1.8, bright=0.7), i * gap, -5)
    y = reverb(lp(b.buf, 9500), synth_ir(3.0, 0.9, 0.02), -11)
    return peak_norm(fade(y[:ns(d)], 0.001, 0.4))


if __name__ == '__main__':
    import os, sys, time
    out = sys.argv[1] if len(sys.argv) > 1 else 'sfx_demo'
    os.makedirs(out, exist_ok=True)
    T = time.time()
    demos = {
        'whoosh': whoosh(), 'swish': swish(), 'riser_4s': riser(4.0), 'reverse_cymbal': reverse_cymbal(),
        'sub_drop': sub_drop(), 'impact': impact(), 'glitch': glitch(), 'tick': tick(),
        'text_shuffle_ticks': tick_train(np.arange(0, 0.9, 0.033), lock_times=[0.95]),
        'typewriter_line': Bus(1.6).add(typewriter_key(), 0).add(typewriter_key(), 0.12).add(typewriter_key(), 0.21)
                                   .add(typewriter_key(), 0.37).add(typewriter_key(), 0.46).add(typewriter_bell(), 0.6, -6).buf,
        'pop': pop(), 'ui_tap': ui_tap(), 'chime': chime(), 'success': success(), 'card_shuffle': card_shuffle(),
        'logo_sting': logo_sting()[0], 'kick': kick(), 'snare': snare(), 'clap': clap(), 'hat_closed': hat(),
        'hat_open': hat(True), 'doira_dum': doira('D'), 'doira_tak': doira('T'), 'doira_slap': doira('P'),
        'doira_roll_riser': doira_roll(2.0), 'dutar_A2': dutar(110.0), 'rubab_A3': rubab(220.0),
        'pluck_E4': pluck(329.63), 'pad_Am': pad([57, 60, 64, 69], 3.0), 'bass_pluck': bass(55, 0.5, 'pluck'),
    }
    for k, v in demos.items():
        write_wav(os.path.join(out, k + '.wav'), peak_norm(st(v), -1.0))
    print('rendered', len(demos), 'sounds in %.1fs' % (time.time() - T))
