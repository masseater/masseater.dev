export const engineModule = function () {
  "use strict";
  const SR = 44100;
  const CR = 16;
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 1831565813) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const st2r = (st) => Math.pow(2, st / 12);
  const db = (d) => Math.pow(10, d / 20);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  function curve(pts) {
    return function (t) {
      if (t <= pts[0][0]) return pts[0][1];
      for (let i = 1; i < pts.length; i++) {
        if (t < pts[i][0]) {
          const a = pts[i - 1],
            b = pts[i];
          return a[1] + ((b[1] - a[1]) * (t - a[0])) / (b[0] - a[0] || 1e-9);
        }
      }
      return pts[pts.length - 1][1];
    };
  }
  function rd(x, p) {
    const n = x.length;
    const i = Math.floor(p);
    const f = p - i;
    if (i < 1 || i >= n - 2) {
      if (i < 0 || i >= n - 1) return i === n - 1 ? x[n - 1] * (1 - f) : 0;
      return x[i] + (x[i + 1] - x[i]) * f;
    }
    const xm = x[i - 1],
      x0 = x[i],
      x1 = x[i + 1],
      x2 = x[i + 2];
    const c = (x1 - xm) * 0.5,
      v = x0 - x1,
      w = c + v,
      a = w + v + (x2 - x0) * 0.5,
      b = w + a;
    return ((a * f - b) * f + c) * f + x0;
  }
  function svf(x, type, fc, q, i0, i1) {
    i0 = i0 || 0;
    i1 = i1 === void 0 ? x.length : i1;
    let ic1 = 0,
      ic2 = 0;
    const k = 1 / (q || 0.707);
    const isFn = typeof fc === "function";
    let g = Math.tan((Math.PI * clamp(isFn ? fc(i0) : fc, 10, SR * 0.45)) / SR),
      a1 = 1 / (1 + g * (g + k)),
      a2 = g * a1,
      a3 = g * a2;
    for (let i = i0; i < i1; i++) {
      if (isFn && (i - i0) % CR === 0) {
        g = Math.tan((Math.PI * clamp(fc(i), 10, SR * 0.45)) / SR);
        a1 = 1 / (1 + g * (g + k));
        a2 = g * a1;
        a3 = g * a2;
      }
      const v0 = x[i],
        v3 = v0 - ic2,
        v1 = a1 * ic1 + a2 * v3,
        v2 = ic2 + a2 * ic1 + a3 * v3;
      ic1 = 2 * v1 - ic1;
      ic2 = 2 * v2 - ic2;
      x[i] = type === 0 ? v2 : type === 1 ? v0 - k * v1 - v2 : v1;
    }
    return x;
  }
  function biquad(x, kind, f, gdb, q, i0, i1) {
    i0 = i0 || 0;
    i1 = i1 === void 0 ? x.length : i1;
    const A = Math.pow(10, gdb / 40),
      w = (2 * Math.PI * f) / SR,
      cs = Math.cos(w),
      sn = Math.sin(w);
    let b0, b1, b2, a0, a1, a2;
    if (kind === "peak") {
      const al = sn / (2 * (q || 1));
      b0 = 1 + al * A;
      b1 = -2 * cs;
      b2 = 1 - al * A;
      a0 = 1 + al / A;
      a1 = -2 * cs;
      a2 = 1 - al / A;
    } else {
      const al = (sn / 2) * Math.sqrt((A + 1 / A) * (1 / (q || 0.707) - 1) + 2),
        s = 2 * Math.sqrt(A) * al;
      if (kind === "low") {
        b0 = A * (A + 1 - (A - 1) * cs + s);
        b1 = 2 * A * (A - 1 - (A + 1) * cs);
        b2 = A * (A + 1 - (A - 1) * cs - s);
        a0 = A + 1 + (A - 1) * cs + s;
        a1 = -2 * (A - 1 + (A + 1) * cs);
        a2 = A + 1 + (A - 1) * cs - s;
      } else {
        b0 = A * (A + 1 + (A - 1) * cs + s);
        b1 = -2 * A * (A - 1 + (A + 1) * cs);
        b2 = A * (A + 1 + (A - 1) * cs - s);
        a0 = A + 1 - (A - 1) * cs + s;
        a1 = 2 * (A - 1 - (A + 1) * cs);
        a2 = A + 1 - (A - 1) * cs - s;
      }
    }
    b0 /= a0;
    b1 /= a0;
    b2 /= a0;
    a1 /= a0;
    a2 /= a0;
    let x1 = 0,
      x2 = 0,
      y1 = 0,
      y2 = 0;
    for (let i = i0; i < i1; i++) {
      const v = x[i];
      const y = b0 * v + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
      x2 = x1;
      x1 = v;
      y2 = y1;
      y1 = y;
      x[i] = y;
    }
    return x;
  }
  function th(v) {
    if (v > 3) return 1;
    if (v < -3) return -1;
    const v2 = v * v;
    return (v * (27 + v2)) / (27 + 9 * v2);
  }
  function drive(x, pre, post, i0, i1, bias) {
    i0 = i0 || 0;
    i1 = i1 === void 0 ? x.length : i1;
    bias = bias || 0;
    const off = th(bias);
    for (let i = i0; i < i1; i++) x[i] = (th(x[i] * pre + bias) - off) * post;
    return x;
  }
  function resample(x, rate, off, len) {
    off = off || 0;
    len = len === void 0 ? x.length - off : len;
    const n = Math.max(1, Math.floor(len / rate));
    const y = new Float32Array(n);
    for (let i = 0; i < n; i++) y[i] = rd(x, off + i * rate);
    return y;
  }
  function slice(x, a, b) {
    return x.subarray(
      Math.max(0, Math.round(a * SR)),
      Math.min(x.length, Math.round(b * SR)),
    );
  }
  function fade(x, fi, fo) {
    const a = Math.round(fi * SR),
      b = Math.round(fo * SR);
    for (let i = 0; i < a && i < x.length; i++) x[i] *= i / a;
    for (let i = 0; i < b && i < x.length; i++) x[x.length - 1 - i] *= i / b;
    return x;
  }
  function stretch(x, ratio, grainSec, mode) {
    const G = Math.round((grainSec || 0.04) * SR);
    const outN = Math.floor(x.length * ratio);
    const y = new Float32Array(outN + G);
    if (mode === "akai") {
      const X = Math.max(8, Math.round(G * 0.22));
      for (let k = 0, o = 0; o < outN; k++, o += G) {
        const s = Math.floor(o / ratio);
        for (let i = -X; i < G; i++) {
          const oi = o + i;
          if (oi < 0 || oi >= y.length) continue;
          const si = s + i;
          if (si < 0 || si >= x.length) continue;
          let w = 1;
          if (i < 0) w = (i + X) / X;
          else if (i >= G - X) w = (G - i) / X;
          y[oi] += x[si] * w;
        }
      }
      return y.subarray(0, outN);
    }
    const H = G >> 1,
      tol = Math.round(8e-3 * SR);
    const win = new Float32Array(G);
    for (let i = 0; i < G; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / G);
    let prev = 0;
    for (let o = 0; o < outN; o += H) {
      let s = Math.floor(o / ratio);
      if (o > 0) {
        const tgt = prev + H;
        let best = 0,
          bestV = -Infinity;
        for (let d = -tol; d <= tol; d += 2) {
          const c = s + d;
          if (c < 0 || c + H >= x.length || tgt + H >= x.length) continue;
          let v = 0;
          for (let i = 0; i < H; i += 3) v += x[c + i] * x[tgt + i];
          if (v > bestV) {
            bestV = v;
            best = d;
          }
        }
        s += best;
      }
      for (let i = 0; i < G; i++) {
        const si = s + i;
        if (si >= 0 && si < x.length && o + i < y.length) y[o + i] += x[si] * win[i];
      }
      prev = s;
    }
    return y.subarray(0, outN);
  }
  function fft(re, im, inv) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        let t = re[i];
        re[i] = re[j];
        re[j] = t;
        t = im[i];
        im[i] = im[j];
        im[j] = t;
      }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = ((2 * Math.PI) / len) * (inv ? 1 : -1),
        wr = Math.cos(ang),
        wi = Math.sin(ang),
        h = len >> 1;
      for (let i = 0; i < n; i += len) {
        let cr = 1,
          ci = 0;
        for (let j = 0; j < h; j++) {
          const a = i + j,
            b = a + h;
          const xr = re[b] * cr - im[b] * ci,
            xi = re[b] * ci + im[b] * cr;
          re[b] = re[a] - xr;
          im[b] = im[a] - xi;
          re[a] += xr;
          im[a] += xi;
          const t = cr * wr - ci * wi;
          ci = cr * wi + ci * wr;
          cr = t;
        }
      }
    }
    if (inv)
      for (let i = 0; i < n; i++) {
        re[i] /= n;
        im[i] /= n;
      }
  }
  function convolve(x, ir, out, gain) {
    const M = ir.length;
    let Nf = 1;
    while (Nf < M * 4) Nf <<= 1;
    Nf = Math.min(Nf, 1 << 19);
    while (Nf < M * 2) Nf <<= 1;
    const hop = Nf - M + 1;
    const hr = new Float64Array(Nf),
      hi = new Float64Array(Nf);
    for (let i = 0; i < M; i++) hr[i] = ir[i];
    fft(hr, hi, false);
    const xr = new Float64Array(Nf),
      xi = new Float64Array(Nf);
    for (let p = 0; p < x.length; p += hop) {
      let any = false;
      xr.fill(0);
      xi.fill(0);
      for (let i = 0; i < hop && p + i < x.length; i++) {
        const v = x[p + i];
        xr[i] = v;
        if (v !== 0) any = true;
      }
      if (!any) continue;
      fft(xr, xi, false);
      for (let i = 0; i < Nf; i++) {
        const a = xr[i],
          b = xi[i];
        xr[i] = a * hr[i] - b * hi[i];
        xi[i] = a * hi[i] + b * hr[i];
      }
      fft(xr, xi, true);
      for (let i = 0; i < Nf && p + i < out.length; i++) out[p + i] += xr[i] * gain;
    }
  }
  function make(S, META, totalSec, BPM, SWING, log) {
    const N = Math.ceil(totalSec * SR);
    const nameOf = new Map();
    if (log) {
      for (const k of Object.keys(META)) if (S[k]) nameOf.set(S[k], k);
    }
    const T16 = 60 / BPM / 4,
      BAR = T16 * 16;
    function tt(bar, step) {
      step = step || 0;
      const b = Math.floor(step / 16);
      step -= b * 16;
      bar += b;
      const i = Math.floor(step),
        f = step - i;
      const g = (k) => (k >> 1) * 2 * T16 + (k & 1 ? 2 * T16 * SWING : 0);
      const t0 = g(i),
        t1 = i === 15 ? BAR : g(i + 1);
      return bar * BAR + t0 + (t1 - t0) * f;
    }
    function bus(mono, name) {
      const L = new Float32Array(N);
      return mono ? { L, R: L, mono: true, name } : { L, R: new Float32Array(N), name };
    }
    function active(b, padSec) {
      const B = 2048,
        out = [];
      const pad = Math.round((padSec === void 0 ? 0.3 : padSec) * SR);
      let cur = null;
      for (let p = 0; p < N; p += B) {
        let on = false;
        const e = Math.min(N, p + B);
        for (let i = p; i < e; i += 3)
          if (b.L[i] !== 0 || b.R[i] !== 0) {
            on = true;
            break;
          }
        if (on) {
          if (cur && p <= cur[1] + pad) cur[1] = e;
          else {
            cur = [Math.max(0, p - 64), e];
            out.push(cur);
          }
        }
      }
      for (const r of out) r[1] = Math.min(N, r[1] + pad);
      return out;
    }
    function each(b, fn, padSec) {
      for (const r of active(b, padSec)) {
        fn(b.L, r[0], r[1]);
        if (!b.mono) fn(b.R, r[0], r[1]);
      }
    }
    function paste(b, x, t, o) {
      o = o || {};
      if (typeof x === "string") {
        if (!S[x]) throw new Error("no sample " + x);
        x = S[x];
      }
      const logAt = log && b.name ? log.length : -1;
      if (logAt >= 0) log.push(null);
      const g = o.g === void 0 ? 1 : o.g,
        pan = o.pan || 0;
      const gl = g * Math.cos(((pan + 1) * Math.PI) / 4) * 1.4142,
        gr = g * Math.sin(((pan + 1) * Math.PI) / 4) * 1.4142;
      const base = o.rate || (o.semi ? st2r(o.semi) : 1);
      const off = (o.off || 0) * SR;
      const srcN = x.length;
      let maxOut =
        o.dur !== void 0 ? Math.round(o.dur * SR) : Math.ceil((srcN - off) / base) + 2;
      const i0 = Math.round(t * SR);
      if (i0 >= N) return;
      if (i0 + maxOut > N) maxOut = N - i0;
      if (maxOut <= 0) return;
      const A = Math.max(1, Math.round((o.a === void 0 ? 8e-4 : o.a) * SR)),
        R = Math.max(1, Math.round((o.r === void 0 ? 4e-3 : o.r) * SR));
      const decK = o.dec ? Math.exp(-1 / (o.dec * SR)) : 1;
      let decG = 1;
      const pc = o.pitch ? curve(o.pitch) : null;
      let rate = base;
      const useF = o.lp || o.hp;
      let tmp = null;
      if (useF || o.drive) tmp = new Float32Array(maxOut);
      let pos = o.rev ? (o.revFrom !== void 0 ? o.revFrom * SR : srcN - 1) : off;
      let n = 0;
      for (; n < maxOut; n++) {
        if (pc && n % CR === 0) rate = base * st2r(pc(n / SR));
        if (pos < 0 || pos > srcN - 1) break;
        let v = rd(x, pos);
        pos += o.rev ? -rate : rate;
        let e = 1;
        if (n < A) e = n / A;
        const rem = maxOut - n;
        if (rem < R) e *= rem / R;
        if (o.dec) {
          e *= decG;
          decG *= decK;
        }
        v *= e;
        if (tmp) tmp[n] = v;
        else if (b.mono) b.L[i0 + n] += v * g;
        else {
          b.L[i0 + n] += v * gl;
          b.R[i0 + n] += v * gr;
        }
      }
      if (logAt >= 0) {
        const nm = nameOf.get(x) || x._name || "?";
        const mt = META[nm];
        let m0 =
          o.m0 !== void 0
            ? o.m0
            : x._midi !== void 0
              ? x._midi
              : mt
                ? mt.key !== void 0
                  ? mt.key
                  : mt.midi
                : void 0;
        log[logAt] = {
          tr: b.name,
          s: nm,
          t: i0 / SR,
          d: n / SR,
          m: m0 === void 0 ? null : m0 + 12 * Math.log2(base),
          g,
          pan,
          off: o.off || 0,
          pc: o.pitch || null,
          rev: o.rev ? 1 : 0,
        };
      }
      if (tmp) {
        const m = n;
        if (o.hp) svf(tmp, 1, o.hp, 0.707, 0, m);
        if (o.lp) {
          if (o.lpEnd) {
            const f0 = o.lp,
              f1 = o.lpEnd;
            svf(tmp, 0, (i) => f0 * Math.pow(f1 / f0, i / m), o.q || 0.707, 0, m);
          } else svf(tmp, 0, o.lp, o.q || 0.707, 0, m);
        }
        if (o.drive) drive(tmp, o.drive, 1 / Math.tanh(o.drive), 0, m);
        const tail = Math.min(m, 64);
        for (let i = 0; i < tail; i++) tmp[m - 1 - i] *= i / tail;
        if (b.mono) for (let i = 0; i < m; i++) b.L[i0 + i] += tmp[i] * g;
        else
          for (let i = 0; i < m; i++) {
            b.L[i0 + i] += tmp[i] * gl;
            b.R[i0 + i] += tmp[i] * gr;
          }
      }
    }
    const groups = {};
    for (const k in META) {
      const m = META[k];
      if (m.group) {
        (groups[m.group] = groups[m.group] || []).push({
          name: k,
          key: m.key !== void 0 ? m.key : m.midi,
          midi: m.midi,
        });
      }
    }
    function note(b, group, key, t, o) {
      const g = groups[group];
      let best = g[0];
      for (const s of g) if (Math.abs(s.key - key) < Math.abs(best.key - key)) best = s;
      const o2 = Object.assign({}, o);
      o2.semi = (o.semi || 0) + (key - best.key);
      paste(b, S[best.name], t, o2);
    }
    function mix(dst, src, g) {
      g = g === void 0 ? 1 : g;
      for (const r of active(src, 0))
        for (let i = r[0]; i < r[1]; i++) {
          dst.L[i] += src.L[i] * g;
          dst.R[i] += src.R[i] * g;
        }
    }
    function gainFn(b, fn) {
      let g = 1;
      for (let i = 0; i < N; i++) {
        if (i % CR === 0) g = fn(i / SR);
        b.L[i] *= g;
        b.R[i] *= g;
      }
    }
    function mulEnv(b, env, depth) {
      for (const r of active(b, 0))
        for (let i = r[0]; i < r[1]; i++) {
          const g = 1 - depth * (1 - env[i]);
          b.L[i] *= g;
          if (!b.mono) b.R[i] *= g;
        }
    }
    function duckEnv(times, hold, rel) {
      const e = new Float32Array(N).fill(1);
      const H = Math.round(hold * SR),
        Rn = Math.round(rel * SR),
        pre = Math.round(4e-3 * SR);
      for (const t of times) {
        const i0 = Math.round(t * SR) - pre;
        for (let i = 0; i < pre + H + Rn; i++) {
          const k = i0 + i;
          if (k < 0 || k >= N) continue;
          let v;
          if (i < pre) v = 1 - i / pre;
          else if (i < pre + H) v = 0;
          else {
            const x = (i - pre - H) / Rn;
            v = x * x * (3 - 2 * x);
          }
          if (v < e[k]) e[k] = v;
        }
      }
      return e;
    }
    function delay(src, dSec, fb, lpHz, hpHz, cross) {
      const out = bus();
      const D = Math.round(dSec * SR);
      const aL = 1 - Math.exp((-2 * Math.PI * lpHz) / SR),
        aH = 1 - Math.exp((-2 * Math.PI * hpHz) / SR);
      let l1 = 0,
        r1 = 0,
        hl = 0,
        hr = 0;
      for (let i = D; i < N; i++) {
        let inL = src.L[i - D] + out.R[i - D] * fb * cross + out.L[i - D] * fb * (1 - cross),
          inR = src.R[i - D] + out.L[i - D] * fb * cross + out.R[i - D] * fb * (1 - cross);
        l1 += aL * (inL - l1);
        r1 += aL * (inR - r1);
        hl += aH * (l1 - hl);
        hr += aH * (r1 - hr);
        out.L[i] = l1 - hl;
        out.R[i] = r1 - hr;
      }
      return out;
    }
    function chorus(b, depthMs, rateHz, mixAmt, baseMs) {
      const D = Math.round(0.03 * SR);
      const base = ((baseMs || 9) * SR) / 1e3,
        dep = (depthMs * SR) / 1e3;
      for (const r of active(b, 0.05)) {
        const a = Math.max(D, r[0]),
          z = r[1];
        const cl = b.L.slice(a - D, z),
          cr = b.R.slice(a - D, z);
        let d1 = base,
          d2 = base,
          s1 = 0,
          s2 = 0;
        for (let i = a; i < z; i++) {
          const k = i - a;
          if (k % CR === 0) {
            const ph = (2 * Math.PI * rateHz * i) / SR,
              ph2 = (2 * Math.PI * rateHz * (i + CR)) / SR;
            const n1 = base + dep * Math.sin(ph2),
              n2 = base + dep * Math.sin(ph2 + 2.1);
            if (k === 0) {
              d1 = base + dep * Math.sin(ph);
              d2 = base + dep * Math.sin(ph + 2.1);
            }
            s1 = (n1 - d1) / CR;
            s2 = (n2 - d2) / CR;
          }
          d1 += s1;
          d2 += s2;
          const p1 = k + D - d1,
            p2 = k + D - d2;
          const x = Math.floor(p1),
            fx = p1 - x,
            y = Math.floor(p2),
            fy = p2 - y;
          b.L[i] = cl[k + D] + mixAmt * (cl[x] + (cl[x + 1] - cl[x]) * fx);
          b.R[i] = cr[k + D] + mixAmt * (cr[y] + (cr[y + 1] - cr[y]) * fy);
        }
      }
    }
    function width(b, w, monoBelowHz) {
      let lpS = 0;
      const a = monoBelowHz ? 1 - Math.exp((-2 * Math.PI * monoBelowHz) / SR) : 0;
      for (let i = 0; i < N; i++) {
        const m = (b.L[i] + b.R[i]) * 0.5;
        let s = (b.L[i] - b.R[i]) * 0.5 * w;
        if (a) {
          lpS += a * (s - lpS);
          s -= lpS;
        }
        b.L[i] = m + s;
        b.R[i] = m - s;
      }
    }
    function comp(b, thrDb, ratio, attMs, relMs, makeupDb, scHp) {
      const thr = db(thrDb),
        aA = Math.exp(-1 / (attMs * 1e-3 * SR)),
        aR = Math.exp(-1 / (relMs * 1e-3 * SR));
      let env = 0,
        hp = 0;
      const mk = db(makeupDb || 0);
      const aH = scHp ? 1 - Math.exp((-2 * Math.PI * scHp) / SR) : 0;
      let grMax = 0;
      for (let i = 0; i < N; i++) {
        let m = (b.L[i] + b.R[i]) * 0.5;
        if (aH) {
          hp += aH * (m - hp);
          m -= hp;
        }
        const d =
          Math.max(Math.abs(m), Math.abs(b.L[i]) * 0.7, Math.abs(b.R[i]) * 0.7) *
          (aH ? 1 : 1);
        env = d > env ? aA * env + (1 - aA) * d : aR * env + (1 - aR) * d;
        let g = 1;
        if (env > thr) {
          g = Math.pow(env / thr, 1 / ratio - 1);
          if (1 - g > grMax) grMax = 1 - g;
        }
        b.L[i] *= g * mk;
        b.R[i] *= g * mk;
      }
      return grMax;
    }
    function limit(b, ceilDb, lookMs, relMs) {
      const c = db(ceilDb),
        La = Math.round(lookMs * 1e-3 * SR),
        rel = 1 - Math.exp(-1 / (relMs * 1e-3 * SR));
      const req = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        const p = Math.max(Math.abs(b.L[i]), Math.abs(b.R[i]));
        req[i] = p > c ? c / p : 1;
      }
      const mn = new Float32Array(N);
      const dq = new Int32Array(N);
      let h = 0,
        tl = 0;
      for (let i = 0, j = 0; i < N; i++) {
        const end = Math.min(N - 1, i + La);
        for (; j <= end; j++) {
          while (tl > h && req[dq[tl - 1]] >= req[j]) tl--;
          dq[tl++] = j;
        }
        while (dq[h] < i) h++;
        mn[i] = req[dq[h]];
      }
      let e = 1;
      for (let i = 0; i < N; i++) {
        const m = mn[i];
        e = m < e ? m : e + (m - e) * rel;
        mn[i] = e;
      }
      let acc = 0;
      let minG = 1;
      for (let i = 0; i < N; i++) {
        acc += mn[i];
        if (i >= La) acc -= mn[i - La];
        const g = i >= La - 1 ? acc / La : mn[i];
        if (g < minG) minG = g;
        b.L[i] *= g;
        b.R[i] *= g;
      }
      return minG;
    }
    function xfadeEdge(b, i, n) {
      for (let k = 0; k < n; k++) {
        const w = k / n;
        if (i - 1 - k >= 0) {
          b.L[i - 1 - k] *= w;
          b.R[i - 1 - k] *= w;
        }
        if (i + k < N) {
          b.L[i + k] *= w;
          b.R[i + k] *= w;
        }
      }
    }
    function repeat(b, t, sliceSec, count, o) {
      o = o || {};
      if (log)
        log.push({
          tr: "EDIT",
          s: "repeat x" + count + (o.pitch ? " pitch+" + o.pitch : ""),
          t,
          d: sliceSec * count,
          m: null,
          g: 1,
          pan: 0,
          off: 0,
          pc: null,
          rev: 0,
          slice: sliceSec,
        });
      const i0 = Math.round(t * SR),
        n = Math.round(sliceSec * SR);
      const sl = b.L.slice(i0, i0 + n),
        sr = b.R.slice(i0, i0 + n);
      const f = Math.min(96, n >> 3);
      for (let k = 0; k < f; k++) {
        const w = k / f;
        sl[k] *= w;
        sr[k] *= w;
        sl[n - 1 - k] *= w;
        sr[n - 1 - k] *= w;
      }
      for (let c = 1; c < count; c++) {
        const g = Math.pow(o.decay || 1, c);
        const r = o.pitch ? st2r(o.pitch * c) : 1;
        const d = i0 + c * n;
        for (let k = 0; k < n && d + k < N; k++) {
          const p = k * r;
          b.L[d + k] = p < n - 1 ? rd(sl, p) * g : 0;
          b.R[d + k] = p < n - 1 ? rd(sr, p) * g : 0;
        }
      }
    }
    function reverseSlice(b, t, sec) {
      if (log)
        log.push({
          tr: "EDIT",
          s: "reverse",
          t,
          d: sec,
          m: null,
          g: 1,
          pan: 0,
          off: 0,
          pc: null,
          rev: 1,
        });
      const i0 = Math.round(t * SR),
        n = Math.round(sec * SR);
      for (const ch of [b.L, b.R]) {
        const s = ch.slice(i0, i0 + n);
        for (let k = 0; k < n; k++) ch[i0 + k] = s[n - 1 - k];
      }
      xfadeEdge(b, i0, 64);
      xfadeEdge(b, i0 + n, 64);
    }
    function tapeStop(b, t, sec, endRate) {
      if (log)
        log.push({
          tr: "EDIT",
          s: "tape stop",
          t,
          d: sec,
          m: null,
          g: 1,
          pan: 0,
          off: 0,
          pc: null,
          rev: 0,
        });
      const i0 = Math.round(t * SR),
        n = Math.round(sec * SR);
      for (const ch of [b.L, b.R]) {
        const s = ch.slice(i0, i0 + n);
        let p = 0;
        for (let k = 0; k < n; k++) {
          const x = k / n;
          const r = 1 + (endRate - 1) * x * x;
          ch[i0 + k] = rd(s, p) * (endRate < 0.2 ? 1 - Math.pow(x, 6) : 1);
          p += r;
        }
      }
    }
    function mute(b, t, sec, f) {
      if (log)
        log.push({
          tr: "EDIT",
          s: "mute",
          t,
          d: sec,
          m: null,
          g: 1,
          pan: 0,
          off: 0,
          pc: null,
          rev: 0,
        });
      const i0 = Math.round(t * SR),
        n = Math.round(sec * SR),
        fn = Math.round((f || 3e-3) * SR);
      for (let k = 0; k < n && i0 + k < N; k++) {
        let w = 0;
        if (k < fn) w = 1 - k / fn;
        else if (k > n - fn) w = (k - (n - fn)) / fn;
        b.L[i0 + k] *= w;
        b.R[i0 + k] *= w;
      }
    }
    return {
      SR,
      N,
      T16,
      BAR,
      tt,
      bus,
      active,
      each,
      paste,
      note,
      mix,
      gainFn,
      mulEnv,
      duckEnv,
      delay,
      chorus,
      width,
      comp,
      limit,
      repeat,
      reverseSlice,
      tapeStop,
      mute,
      S,
      META,
      groups,
    };
  }
  const api = {
    SR,
    make,
    rng,
    st2r,
    db,
    clamp,
    curve,
    rd,
    svf,
    biquad,
    drive,
    resample,
    slice,
    fade,
    stretch,
    fft,
    convolve,
  };
  return api;
};
