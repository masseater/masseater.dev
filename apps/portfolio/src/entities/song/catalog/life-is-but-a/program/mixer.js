export const mixerModule = function () {
  function slide(ramp, g0, g1, m, step) {
    let g = g0;
    for (let i = 0; i < m; i++) {
      if (g < g1) g = Math.min(g1, g + step);
      else if (g > g1) g = Math.max(g1, g - step);
      ramp[i] = g;
    }
    return g;
  }
  function Player(P, rate, tape) {
    this.N = P.N;
    this.SR = P.SR;
    this.comp = P.comp;
    this.lim = P.lim;
    this.cd = P.dec[0];
    this.ld = P.dec[1];
    this.T = P.clip[0];
    this.K = P.clip[1];
    this.tape = tape;
    this.n = P.tracks;
    this.gl = new Float32Array(P.tracks).fill(1);
    this.gr = new Float32Array(P.tracks).fill(1);
    this.tl = new Float32Array(P.tracks).fill(1);
    this.tr = new Float32Array(P.tracks).fill(1);
    this.slew = 1 / (6e-3 * P.SR);
    this.rbL = new Float32Array(256);
    this.rbR = new Float32Array(256);
    this.pos = 0;
    this.on = false;
    this.next = null;
    this.fin = false;
    this.ratio = P.SR / (rate || P.SR);
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
  Player.prototype.chunk = function (L, R, m) {
    const pos = this.pos,
      end = Math.max(0, Math.min(m, this.N - pos)),
      F = this.tape.frames;
    L.fill(0, 0, m);
    R.fill(0, 0, m);
    for (let s = 0; s < this.n; s++) {
      const l0 = this.gl[s],
        r0 = this.gr[s],
        l1 = this.tl[s],
        r1 = this.tr[s];
      if (l0 === 0 && r0 === 0 && l1 === 0 && r1 === 0) continue;
      const rl = this.rbL,
        rr = this.rbR;
      this.gl[s] = slide(rl, l0, l1, m, this.slew);
      this.gr[s] = slide(rr, r0, r1, m, this.slew);
      for (let i0 = 0; i0 < end;) {
        const gi = pos + i0,
          b = Math.floor(gi / F),
          o0 = gi - b * F,
          i1 = Math.min(end, i0 + F - o0),
          blk = this.tape.block(b),
          T = blk && blk[s];
        if (T && T.channels) {
          const d = T.data,
            sc = T.scale;
          let o = o0 * T.channels;
          for (let i = i0; i < i1; i++) {
            const l = d[o++] * sc;
            L[i] += l * rl[i];
            R[i] += (T.channels === 2 ? d[o++] * sc : l) * rr[i];
          }
        }
        i0 = i1;
      }
    }
    const comp = this.comp,
      lim = this.lim,
      cd = this.cd,
      ld = this.ld,
      T = this.T,
      K = this.K;
    for (let i = 0; i < end; i++) {
      const gi = pos + i;
      let w = (gi / cd) | 0;
      const cg = comp[w] + (comp[w + 1] - comp[w]) * ((gi - w * cd) / cd);
      w = (gi / ld) | 0;
      const lg = lim[w] + (lim[w + 1] - lim[w]) * ((gi - w * ld) / ld);
      let x = L[i] * cg,
        a = Math.abs(x);
      if (a >= T) x = Math.sign(x) * (T + K * Math.tanh((a - T) / K));
      L[i] = x * lg;
      x = R[i] * cg;
      a = Math.abs(x);
      if (a >= T) x = Math.sign(x) * (T + K * Math.tanh((a - T) / K));
      R[i] = x * lg;
    }
    this.pos += m;
  };
  Player.prototype.msg = function (m) {
    if (m.mixers)
      m.mixers.forEach((x, s) => {
        const g = x.muted ? 0 : Math.pow(10, x.volumeDecibels / 20);
        this.tl[s] = g * Math.min(1, 1 - x.pan);
        this.tr[s] = g * Math.min(1, 1 + x.pan);
      });
    if (m.play !== undefined) this.next = m.play;
    if (m.stop) this.next = -1;
  };
  Player.prototype.pull = function (L, R, n) {
    if (this.ratio === 1) {
      this.chunk(L, R, n);
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
          this.chunk(sL, sR, 256);
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
        this.pos = Math.max(0, Math.min(this.N, Math.round(p)));
        this.ph = 1;
        this.sn = this.si = 0;
        this.a0 = this.a1 = this.b0 = this.b1 = 0;
        this.on = true;
        this.fin = true;
        ev = 1;
      }
    }
    if (!this.on) {
      L.fill(0, 0, n);
      R.fill(0, 0, n);
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
    if (this.pos >= this.N + 512) {
      this.on = false;
      ev = 2;
    }
    return ev;
  };
  return { Player };
};
