export const mixerModule = function () {
  "use strict";
  function th(v) {
    if (v > 3) return 1;
    if (v < -3) return -1;
    const v2 = v * v;
    return (v * (27 + v2)) / (27 + 9 * v2);
  }
  const db = (d) => Math.pow(10, d / 20);
  function coef(kind, f, q, gdb, SR) {
    const A = Math.pow(10, (gdb || 0) / 40),
      w = (2 * Math.PI * f) / SR,
      cs = Math.cos(w),
      sn = Math.sin(w);
    q = q || 0.7071;
    const al = sn / (2 * q);
    let b0, b1, b2, a0, a1, a2;
    if (kind === "lp") {
      b0 = (1 - cs) / 2;
      b1 = 1 - cs;
      b2 = b0;
      a0 = 1 + al;
      a1 = -2 * cs;
      a2 = 1 - al;
    } else if (kind === "hp") {
      b0 = (1 + cs) / 2;
      b1 = -(1 + cs);
      b2 = b0;
      a0 = 1 + al;
      a1 = -2 * cs;
      a2 = 1 - al;
    } else if (kind === "ap") {
      b0 = 1 - al;
      b1 = -2 * cs;
      b2 = 1 + al;
      a0 = 1 + al;
      a1 = -2 * cs;
      a2 = 1 - al;
    } else if (kind === "peak") {
      b0 = 1 + al * A;
      b1 = -2 * cs;
      b2 = 1 - al * A;
      a0 = 1 + al / A;
      a1 = -2 * cs;
      a2 = 1 - al / A;
    } else {
      const s = 2 * Math.sqrt(A) * ((sn / 2) * Math.sqrt((A + 1 / A) * (1 / q - 1) + 2));
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
    return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
  }
  function run(c, st, k, x, n) {
    const b0 = c[0],
      b1 = c[1],
      b2 = c[2],
      a1 = c[3],
      a2 = c[4];
    let z1 = st[k],
      z2 = st[k + 1];
    for (let i = 0; i < n; i++) {
      const v = x[i],
        y = b0 * v + z1;
      z1 = b1 * v - a1 * y + z2;
      z2 = b2 * v - a2 * y;
      x[i] = y;
    }
    st[k] = Math.abs(z1) < 1e-25 ? 0 : z1;
    st[k + 1] = Math.abs(z2) < 1e-25 ? 0 : z2;
  }
  function runTo(c, st, k, x, y, n) {
    const b0 = c[0],
      b1 = c[1],
      b2 = c[2],
      a1 = c[3],
      a2 = c[4];
    let z1 = st[k],
      z2 = st[k + 1];
    for (let i = 0; i < n; i++) {
      const v = x[i],
        o = b0 * v + z1;
      z1 = b1 * v - a1 * o + z2;
      z2 = b2 * v - a2 * o;
      y[i] = o;
    }
    st[k] = Math.abs(z1) < 1e-25 ? 0 : z1;
    st[k + 1] = Math.abs(z2) < 1e-25 ? 0 : z2;
  }
  const PAR = {
    drum: {
      thr: -11,
      ratio: 2.5,
      att: 8,
      rel: 90,
      makeup: 1.5,
      scHp: 150,
      pre: 1.15,
      post: 0.9,
      clipT: 0.5,
      clipK: 0.12,
      out: 1,
    },
    hp: 25,
    eq: [
      ["peak", 280, 0.9, -1.2],
      ["peak", 2200, 0.8, 2.5],
      ["high", 11e3, 0.7, 1],
    ],
    monoHz: 130,
    width: 1.25,
    sideEq: [],
    xo: [120, 2500],
    bands: [
      {
        thr: -17,
        ratio: 2.5,
        att: 30,
        rel: 150,
        knee: 6,
        makeup: 1.5,
        clipT: 0.38,
        clipK: 0.1,
      },
      { thr: -12, ratio: 2, att: 10, rel: 120, knee: 6, makeup: 1 },
      { thr: -15, ratio: 1.5, att: 3, rel: 80, knee: 6, makeup: 0.5 },
    ],
    gain: 1.18,
    clip: { t: 0.62, k: 0.26 },
    lim: { ceil: -1.2, look: 3, rel: 60 },
  };
  const DEC = 32,
    LDEC = 4,
    B = 4096;
  function Core(P) {
    const N = (this.N = P.N),
      SR = (this.SR = P.SR || 44100);
    this.stems = P.stems;
    this.tape = P.tape;
    const par = (this.par = Object.assign({}, PAR, P.par || {}));
    const nd = Math.ceil(N / DEC) + 2;
    const mk = (n, v) => {
      const a = new Float32Array(n);
      a.fill(v);
      return a;
    };
    this.auto = P.auto || {
      drum: mk(nd, 1),
      b0: mk(nd, 1),
      b1: mk(nd, 1),
      b2: mk(nd, 1),
      lim: mk(Math.ceil(N / LDEC) + 2, 1),
    };
    this.gl = mk(P.stems.length, 1);
    this.gr = mk(P.stems.length, 1);
    this.cur = new Int32Array(P.stems.length);
    this.pos = 0;
    this.slew = 1 / (6e-3 * SR);
    const f = () => new Float32Array(B);
    this.dL = f();
    this.dR = f();
    this.mL = f();
    this.mR = f();
    this.rbL = f();
    this.rbR = f();
    this.tM = f();
    this.tS = f();
    this.band = [
      [f(), f(), f()],
      [f(), f(), f()],
    ];
    this.tmp = f();
    this.cHp = coef("hp", par.hp, 0.7071, 0, SR);
    this.cEq = par.eq.map((e) => coef(e[0], e[1], e[2], e[3], SR));
    this.cSide = par.sideEq.map((e) => coef(e[0], e[1], e[2], e[3], SR));
    this.aMono = par.monoHz ? 1 - Math.exp((-2 * Math.PI * par.monoHz) / SR) : 0;
    this.cL1 = coef("lp", par.xo[0], 0.7071, 0, SR);
    this.cH1 = coef("hp", par.xo[0], 0.7071, 0, SR);
    this.cL2 = coef("lp", par.xo[1], 0.7071, 0, SR);
    this.cH2 = coef("hp", par.xo[1], 0.7071, 0, SR);
    this.cA2 = coef("ap", par.xo[1], 0.7071, 0, SR);
    const d = par.drum;
    this.dAA = Math.exp(-1 / (d.att * 1e-3 * SR));
    this.dAR = Math.exp(-1 / (d.rel * 1e-3 * SR));
    this.dAH = 1 - Math.exp((-2 * Math.PI * d.scHp) / SR);
    this.dThr = db(d.thr);
    this.dMk = db(d.makeup);
    this.bAA = par.bands.map((b) => Math.exp(-1 / (b.att * 1e-3 * SR)));
    this.bAR = par.bands.map((b) => Math.exp(-1 / (b.rel * 1e-3 * SR)));
    this.stat = { clip: 0, dclip: 0, n: 0, b: [0, 0, 0], cE: 0, xE: 0 };
    this.rec = par.rec
      ? {
          drum: mk(nd, 0),
          b0: mk(nd, 0),
          b1: mk(nd, 0),
          b2: mk(nd, 0),
          pk: mk(nd, 0),
          pl: mk(nd, 0),
          pd: mk(nd, 0),
        }
      : null;
    this.reset();
  }
  Core.prototype.reset = function () {
    this.st = new Float64Array(256);
    this.env = new Float64Array(8);
    this.lpS = 0;
    this.cur.fill(0);
  };
  Core.prototype.seek = function (pos) {
    this.pos = Math.max(0, Math.min(this.N, Math.round(pos)));
    this.reset();
  };
  function compGain(env, b) {
    if (b.ratio === 1) return db(b.makeup);
    const over = 20 * Math.log10(env + 1e-9) - b.thr,
      k = b.knee || 0;
    let gr = 0;
    const s = 1 / b.ratio - 1;
    if (over > k / 2) gr = s * over;
    else if (over > -k / 2) gr = (s * (over + k / 2) * (over + k / 2)) / (2 * k);
    return db(gr + b.makeup);
  }
  Core.prototype.process = function (oL, oR, n, tgt, detect, o0) {
    let done = o0 || 0;
    const end = done + n,
      mL = this.mL,
      mR = this.mR;
    while (done < end) {
      const m = Math.min(B, end - done);
      this.chunk(m, tgt, detect);
      for (let i = 0; i < m; i++) {
        oL[done + i] = mL[i];
        oR[done + i] = mR[i];
      }
      done += m;
      this.pos += m;
    }
  };
  function slide(ramp, g0, g1, m, step) {
    let g = g0;
    for (let i = 0; i < m; i++) {
      if (g < g1) g = Math.min(g1, g + step);
      else if (g > g1) g = Math.max(g1, g - step);
      ramp[i] = g;
    }
    return g;
  }
  Core.prototype.chunk = function (m, tgt, detect) {
    const pos = this.pos,
      dL = this.dL,
      dR = this.dR,
      mL = this.mL,
      mR = this.mR,
      par = this.par,
      au = this.auto,
      st = this.st,
      env = this.env;
    dL.fill(0, 0, m);
    dR.fill(0, 0, m);
    mL.fill(0, 0, m);
    mR.fill(0, 0, m);
    if (pos >= this.N) return;
    for (let s = 0; s < this.stems.length; s++) {
      const S = this.stems[s],
        l0 = this.gl[s],
        r0 = this.gr[s],
        l1 = tgt ? tgt.l[s] : 1,
        r1 = tgt ? tgt.r[s] : 1;
      if (l0 === 0 && r0 === 0 && l1 === 0 && r1 === 0) continue;
      const rl = this.rbL,
        rr = this.rbR;
      this.gl[s] = slide(rl, l0, l1, m, this.slew);
      this.gr[s] = slide(rr, r0, r1, m, this.slew);
      const l = S.drum ? dL : mL,
        r = S.drum ? dR : mR,
        tape = this.tape,
        F = tape.frames,
        end = Math.min(m, this.N - pos);
      for (let i0 = 0; i0 < end;) {
        const gi = pos + i0,
          b = Math.floor(gi / F),
          o0 = gi - b * F,
          i1 = Math.min(end, i0 + F - o0),
          blk = tape.block(b),
          T = blk && blk[s];
        if (T && T.channels) {
          const d = T.data,
            sc = T.scale;
          if (T.channels === 2) {
            let o = o0 * 2;
            for (let i = i0; i < i1; i++) {
              l[i] += d[o++] * sc * rl[i];
              r[i] += d[o++] * sc * rr[i];
            }
          } else {
            let o = o0;
            for (let i = i0; i < i1; i++) {
              const v = d[o++] * sc;
              l[i] += v * rl[i];
              r[i] += v * rr[i];
            }
          }
        }
        i0 = i1;
      }
    }
    {
      const D = au.drum,
        P = par.drum,
        aA = this.dAA,
        aR = this.dAR,
        aH = this.dAH,
        thr = this.dThr,
        mk = this.dMk,
        pre = P.pre,
        post = P.post,
        cT = P.clipT,
        cK = P.clipK,
        dOut = P.out,
        rec = this.rec;
      let e = env[0],
        hp = env[1],
        nc = 0;
      for (let i = 0; i < m; i++) {
        const gi = pos + i,
          w = (gi / DEC) | 0,
          f = gi - w * DEC;
        if (detect) {
          if (f === 0) {
            D[w + 1] = (e > thr ? Math.pow(e / thr, 1 / P.ratio - 1) : 1) * mk;
            if (rec) rec.drum[w + 1] = e;
          }
          let mid = (dL[i] + dR[i]) * 0.5;
          hp += aH * (mid - hp);
          mid -= hp;
          const dd = Math.max(Math.abs(mid), Math.abs(dL[i]) * 0.7, Math.abs(dR[i]) * 0.7);
          e = dd > e ? aA * e + (1 - aA) * dd : aR * e + (1 - aR) * dd;
        }
        const g = (D[w] + (D[w + 1] - D[w]) * (f / DEC)) * pre;
        let l = th(dL[i] * g) * post,
          r = th(dR[i] * g) * post,
          a = l < 0 ? -l : l;
        if (rec && a > rec.pd[w]) rec.pd[w] = a;
        if (a > cT) {
          l = (l < 0 ? -1 : 1) * (cT + cK * Math.tanh((a - cT) / cK));
          nc++;
        }
        a = r < 0 ? -r : r;
        if (a > cT) r = (r < 0 ? -1 : 1) * (cT + cK * Math.tanh((a - cT) / cK));
        mL[i] += l * dOut;
        mR[i] += r * dOut;
      }
      env[0] = e;
      env[1] = hp;
      this.stat.dclip += nc;
      this.stat.n += m;
    }
    let k = 0;
    run(this.cHp, st, k, mL, m);
    run(this.cHp, st, k + 2, mR, m);
    k += 4;
    for (const c of this.cEq) {
      run(c, st, k, mL, m);
      run(c, st, k + 2, mR, m);
      k += 4;
    }
    {
      const tM = this.tM,
        tS = this.tS,
        a = this.aMono,
        w = par.width;
      let lp = this.lpS;
      for (let i = 0; i < m; i++) {
        tM[i] = (mL[i] + mR[i]) * 0.5;
        let s = (mL[i] - mR[i]) * 0.5;
        if (a) {
          lp += a * (s - lp);
          s -= lp;
        }
        tS[i] = s;
      }
      this.lpS = Math.abs(lp) < 1e-25 ? 0 : lp;
      for (const c of this.cSide) {
        run(c, st, k, tS, m);
        k += 2;
      }
      for (let i = 0; i < m; i++) {
        const s = tS[i] * w;
        mL[i] = tM[i] + s;
        mR[i] = tM[i] - s;
      }
    }
    {
      const bd = this.band,
        t = this.tmp;
      for (let ch = 0; ch < 2; ch++) {
        const x = ch ? mR : mL,
          lo = bd[ch][0],
          md = bd[ch][1],
          hi = bd[ch][2];
        runTo(this.cL1, st, k, x, lo, m);
        run(this.cL1, st, k + 2, lo, m);
        run(this.cA2, st, k + 4, lo, m);
        runTo(this.cH1, st, k + 6, x, t, m);
        run(this.cH1, st, k + 8, t, m);
        runTo(this.cL2, st, k + 10, t, md, m);
        run(this.cL2, st, k + 12, md, m);
        runTo(this.cH2, st, k + 14, t, hi, m);
        run(this.cH2, st, k + 16, hi, m);
        k += 18;
      }
      const A0 = au.b0,
        A1 = au.b1,
        A2 = au.b2,
        B0 = par.bands[0],
        B1 = par.bands[1],
        B2 = par.bands[2];
      let e0 = env[2],
        e1 = env[3],
        e2 = env[4];
      const a0 = this.bAA[0],
        r0 = this.bAR[0],
        a1 = this.bAA[1],
        r1 = this.bAR[1],
        a2 = this.bAA[2],
        r2 = this.bAR[2];
      const gn = par.gain,
        T = par.clip.t,
        K = par.clip.k,
        T0 = B0.clipT || 9,
        K0 = B0.clipK || 0.1,
        T1 = B1.clipT || 9,
        K1 = B1.clipK || 0.1,
        T2 = B2.clipT || 9,
        K2 = B2.clipK || 0.1,
        bs = this.stat.b;
      const l0 = bd[0][0],
        l1 = bd[0][1],
        l2 = bd[0][2],
        q0 = bd[1][0],
        q1 = bd[1][1],
        q2 = bd[1][2];
      let nk = 0,
        xe = 0,
        ce = 0;
      for (let i = 0; i < m; i++) {
        const gi = pos + i,
          w = (gi / DEC) | 0,
          f = gi - w * DEC,
          fr = f / DEC;
        if (detect) {
          if (f === 0) {
            A0[w + 1] = compGain(e0, B0);
            A1[w + 1] = compGain(e1, B1);
            A2[w + 1] = compGain(e2, B2);
            if (this.rec) {
              this.rec.b0[w + 1] = e0;
              this.rec.b1[w + 1] = e1;
              this.rec.b2[w + 1] = e2;
            }
          }
          let d = Math.max(Math.abs(l0[i]), Math.abs(q0[i]));
          e0 = d > e0 ? a0 * e0 + (1 - a0) * d : r0 * e0 + (1 - r0) * d;
          d = Math.max(Math.abs(l1[i]), Math.abs(q1[i]));
          e1 = d > e1 ? a1 * e1 + (1 - a1) * d : r1 * e1 + (1 - r1) * d;
          d = Math.max(Math.abs(l2[i]), Math.abs(q2[i]));
          e2 = d > e2 ? a2 * e2 + (1 - a2) * d : r2 * e2 + (1 - r2) * d;
        }
        const g0 = A0[w] + (A0[w + 1] - A0[w]) * fr,
          g1 = A1[w] + (A1[w + 1] - A1[w]) * fr,
          g2 = A2[w] + (A2[w + 1] - A2[w]) * fr;
        let v0 = l0[i] * g0,
          v1 = l1[i] * g1,
          v2 = l2[i] * g2,
          a = v0 < 0 ? -v0 : v0;
        if (a > T0) {
          v0 = (v0 < 0 ? -1 : 1) * (T0 + K0 * Math.tanh((a - T0) / K0));
          bs[0]++;
        }
        a = v1 < 0 ? -v1 : v1;
        if (a > T1) {
          v1 = (v1 < 0 ? -1 : 1) * (T1 + K1 * Math.tanh((a - T1) / K1));
          bs[1]++;
        }
        a = v2 < 0 ? -v2 : v2;
        if (a > T2) {
          v2 = (v2 < 0 ? -1 : 1) * (T2 + K2 * Math.tanh((a - T2) / K2));
          bs[2]++;
        }
        if (this.rec) {
          const aa = v0 < 0 ? -v0 : v0;
          if (aa > this.rec.pl[w]) this.rec.pl[w] = aa;
        }
        let x = (v0 + v1 + v2) * gn;
        a = x < 0 ? -x : x;
        if (this.rec && a > this.rec.pk[w]) this.rec.pk[w] = a;
        if (a >= T) nk++;
        mL[i] = a < T ? x : (x < 0 ? -1 : 1) * (T + K * Math.tanh((a - T) / K));
        if (detect) {
          xe += x * x;
          const dd = x - mL[i];
          ce += dd * dd;
        }
        v0 = q0[i] * g0;
        v1 = q1[i] * g1;
        v2 = q2[i] * g2;
        a = v0 < 0 ? -v0 : v0;
        if (a > T0) v0 = (v0 < 0 ? -1 : 1) * (T0 + K0 * Math.tanh((a - T0) / K0));
        a = v1 < 0 ? -v1 : v1;
        if (a > T1) v1 = (v1 < 0 ? -1 : 1) * (T1 + K1 * Math.tanh((a - T1) / K1));
        a = v2 < 0 ? -v2 : v2;
        if (a > T2) v2 = (v2 < 0 ? -1 : 1) * (T2 + K2 * Math.tanh((a - T2) / K2));
        x = (v0 + v1 + v2) * gn;
        a = x < 0 ? -x : x;
        mR[i] = a < T ? x : (x < 0 ? -1 : 1) * (T + K * Math.tanh((a - T) / K));
      }
      env[2] = e0;
      env[3] = e1;
      env[4] = e2;
      this.stat.clip += nk;
      this.stat.cE += ce;
      this.stat.xE += xe;
    }
    if (!detect) this.finish(mL, mR, pos, m);
  };
  Core.prototype.finish = function (L, R, pos, n) {
    const lim = this.auto.lim,
      N = this.N,
      f0 = N - Math.round(0.4 * this.SR),
      fn = Math.round(0.38 * this.SR);
    for (let i = 0; i < n; i++) {
      const gi = pos + i,
        w = (gi / LDEC) | 0,
        fr = (gi - w * LDEC) / LDEC;
      let g = lim[w] + (lim[w + 1] - lim[w]) * fr;
      if (gi > f0) {
        const x = 1 - (gi - f0) / fn;
        g *= x > 0 ? x : 0;
      }
      let l = L[i] * g,
        r = R[i] * g;
      if (l > 0.999) l = 0.999;
      else if (l < -0.999) l = -0.999;
      if (r > 0.999) r = 0.999;
      else if (r < -0.999) r = -0.999;
      L[i] = l;
      R[i] = r;
    }
  };
  Core.prototype.setLimiter = function (g) {
    const lim = this.auto.lim,
      n = g.length;
    for (let k = 0; k < lim.length; k++) {
      let m = 1;
      const a = Math.max(0, k * LDEC - LDEC),
        z = Math.min(n, k * LDEC + LDEC + 1);
      for (let i = a; i < z; i++) if (g[i] < m) m = g[i];
      lim[k] = m;
    }
  };
  function Player(P, rate, tape) {
    this.core = new Core(Object.assign({}, P, { tape }));
    this.tgt = {
      l: new Float32Array(P.stems.length).fill(1),
      r: new Float32Array(P.stems.length).fill(1),
    };
    this.on = false;
    this.next = null;
    this.fin = false;
    this.ratio = this.core.SR / (rate || this.core.SR);
    this.ph = 1;
    this.sL = new Float32Array(256);
    this.sR = new Float32Array(256);
    this.sn = 0;
    this.si = 0;
    this.a0 = 0;
    this.a1 = 0;
    this.b0 = 0;
    this.b1 = 0;
  }
  Player.prototype.msg = function (m) {
    if (m.mixers)
      m.mixers.forEach((x, s) => {
        const g = x.muted ? 0 : Math.pow(10, x.volumeDecibels / 20);
        this.tgt.l[s] = g * Math.min(1, 1 - x.pan);
        this.tgt.r[s] = g * Math.min(1, 1 + x.pan);
      });
    if (m.play !== void 0) this.next = m.play;
    if (m.stop) this.next = -1;
  };
  Player.prototype.pull = function (L, R, n) {
    if (this.ratio === 1) {
      this.core.process(L, R, n, this.tgt, false, 0);
      return;
    }
    const r = this.ratio,
      sL = this.sL,
      sR = this.sR;
    let ph = this.ph,
      a0 = this.a0,
      a1 = this.a1,
      b0 = this.b0,
      b1 = this.b1;
    for (let i = 0; i < n; i++) {
      while (ph >= 1) {
        if (this.si >= this.sn) {
          this.core.process(sL, sR, 256, this.tgt, false, 0);
          this.sn = 256;
          this.si = 0;
        }
        a0 = b0;
        a1 = b1;
        b0 = sL[this.si];
        b1 = sR[this.si++];
        ph -= 1;
      }
      L[i] = a0 + (b0 - a0) * ph;
      R[i] = a1 + (b1 - a1) * ph;
      ph += r;
    }
    this.ph = ph;
    this.a0 = a0;
    this.a1 = a1;
    this.b0 = b0;
    this.b1 = b1;
  };
  Player.prototype.render = function (L, R, n) {
    let ev = 0;
    if (this.next !== null && this.on) {
      this.pull(L, R, n);
      for (let i = 0; i < n; i++) {
        const g = 1 - (i + 1) / n;
        L[i] *= g;
        R[i] *= g;
      }
      this.on = false;
      return 0;
    }
    if (this.next !== null) {
      const p = this.next;
      this.next = null;
      if (p >= 0) {
        this.core.seek(p);
        this.ph = 1;
        this.sn = this.si = 0;
        this.a0 = this.a1 = this.b0 = this.b1 = 0;
        this.on = true;
        this.fin = true;
        ev = 1;
      }
    }
    if (!this.on) {
      for (let i = 0; i < n; i++) {
        L[i] = 0;
        R[i] = 0;
      }
      return 0;
    }
    this.pull(L, R, n);
    if (this.fin) {
      const k = Math.min(n, 96);
      for (let i = 0; i < k; i++) {
        const g = i / k;
        L[i] *= g;
        R[i] *= g;
      }
      this.fin = false;
    }
    if (this.core.pos >= this.core.N + 512) {
      this.on = false;
      ev = 2;
    }
    return ev;
  };
  const api = { Core, Player, PAR, DEC, LDEC, coef };
  return api;
};
