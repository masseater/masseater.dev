export const songModule = function () {
  "use strict";
  const BPM = 160,
    SWING = 0.62,
    BARS = 80,
    TAIL = 1.6;
  const SEC = {
    intro: [0, 8],
    drop1: [8, 24],
    break1: [24, 32],
    drop2: [32, 48],
    break2: [48, 52],
    drop3: [52, 68],
    outro: [68, 80],
  };
  const MARKS = [
    [0, "壁の向こう"],
    [8, "ひとり"],
    [16, "返事"],
    [24, "遠い場所"],
    [32, "みんな"],
    [40, "崩す"],
    [44, "みんな"],
    [48, "声だけ"],
    [52, "一段上"],
    [60, "減っていく"],
    [68, "いま"],
    [72, "壁の向こう"],
  ];
  async function render(G, S, META, progress, opt) {
    opt = opt || {};
    progress = progress || function () {};
    const SR = G.SR,
      st2r = G.st2r,
      db = G.db,
      curve = G.curve,
      svf = G.svf;
    const E = G.make(S, META, (BARS * 240) / BPM + TAIL, BPM, SWING, opt.log);
    const Q = G.make(S, META, (BARS * 240) / BPM + TAIL, BPM, SWING, null);
    const COMP_DEC = 16,
      LIM_DEC = 4,
      CLIP = [0.66, 0.4];
    const held = (g, dec) => new Float32Array(Math.ceil(N / dec) + 2).fill(g);
    const compCurve = (b, thrDb, ratio, attMs, relMs, makeupDb, scHp) => {
      const thr = db(thrDb),
        aA = Math.exp(-1 / (attMs * 1e-3 * SR)),
        aR = Math.exp(-1 / (relMs * 1e-3 * SR)),
        mk = db(makeupDb || 0),
        aH = scHp ? 1 - Math.exp((-2 * Math.PI * scHp) / SR) : 0;
      const curve = held(mk, COMP_DEC);
      let env = 0,
        hp = 0,
        most = 0,
        g = 1;
      for (let i = 0; i < N; i++) {
        let m = (b.L[i] + b.R[i]) * 0.5;
        if (aH) {
          hp += aH * (m - hp);
          m -= hp;
        }
        const d = Math.max(Math.abs(m), Math.abs(b.L[i]) * 0.7, Math.abs(b.R[i]) * 0.7);
        env = d > env ? aA * env + (1 - aA) * d : aR * env + (1 - aR) * d;
        g = 1;
        if (env > thr) {
          g = Math.pow(env / thr, 1 / ratio - 1);
          if (1 - g > most) most = 1 - g;
        }
        if (i % COMP_DEC === 0) curve[i / COMP_DEC] = g * mk;
      }
      curve.fill(g * mk, Math.floor((N - 1) / COMP_DEC) + 1);
      return { curve, most };
    };
    const applyCurve = (b, curve, dec) => {
      for (let i = 0; i < N; i++) {
        const w = (i / dec) | 0,
          g = curve[w] + (curve[w + 1] - curve[w]) * ((i - w * dec) / dec);
        b.L[i] *= g;
        b.R[i] *= g;
      }
    };
    const softClip = (ch, T, K) => {
      for (let i = 0; i < N; i++) {
        const x = ch[i],
          a = Math.abs(x);
        ch[i] = a < T ? x : Math.sign(x) * (T + K * Math.tanh((a - T) / K));
      }
    };
    const limitCurve = (b, ceilDb, lookMs, relMs) => {
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
      for (let i = 0; i < N; i++) {
        acc += mn[i];
        if (i >= La) acc -= mn[i - La];
        req[i] = i >= La - 1 ? acc / La : mn[i];
      }
      const curve = held(1, LIM_DEC);
      let least = 1;
      for (let k = 0; k < curve.length; k++) {
        let m = 1;
        const a = Math.max(0, k * LIM_DEC - LIM_DEC),
          z = Math.min(N, k * LIM_DEC + LIM_DEC + 1);
        for (let i = a; i < z; i++) if (req[i] < m) m = req[i];
        curve[k] = m;
        if (m < least) least = m;
      }
      return { curve, least };
    };
    const { N, T16, BAR, tt, paste: P } = E;
    const rnd = G.rng(1997);
    const tick = (p, label) =>
      new Promise((res) => {
        progress(p, label);
        setTimeout(res, 0);
      });
    const ix = (t) => Math.round(t * SR);
    const inSec = (b, n) => b >= SEC[n][0] && b < SEC[n][1];
    const TRof = (b) => (b >= 48 && b < 72 ? 2 : 0);
    const CH1 = [
      [36, [70, 74, 75, 79]],
      [32, [68, 72, 75, 79]],
      [39, [70, 74, 77, 79]],
      [34, [70, 72, 74, 77]],
    ];
    const CH2 = [
      [32, [68, 72, 75, 79]],
      [34, [70, 72, 74, 79]],
      [31, [70, 74, 77, 79]],
      [36, [70, 74, 75, 79]],
    ];
    const chordOf = (b) => {
      const c = (b < 24 || b >= 72 ? CH1 : CH2)[b & 3];
      const tr = TRof(b);
      return [c[0] + tr, c[1].map((k) => k + tr)];
    };
    const view = opt.view || {};
    view.tt = tt;
    view.T16 = T16;
    view.BAR = BAR;
    view.roots = Array.from({ length: BARS }, (_, b) => chordOf(b)[0]);
    view.keyShift = Array.from({ length: BARS }, (_, b) => TRof(b));
    view.auto = {};
    const wallFc = curve([
      [0, 260],
      [tt(3, 0), 300],
      [tt(6, 0), 700],
      [tt(7, 8), 2600],
      [tt(7, 15.5), 5e3],
      [tt(8, 0), 2e4],
      [tt(71, 12), 2e4],
      [tt(72, 0), 2400],
      [tt(74, 0), 700],
      [tt(76, 0), 330],
      [tt(80, 0), 210],
      [tt(82, 0), 150],
    ]);
    const wallG = curve([
      [0, 0.3],
      [tt(4, 0), 0.36],
      [tt(7, 0), 0.5],
      [tt(7, 15), 0.7],
      [tt(8, 0), 1],
      [tt(72, 0), 1],
      [tt(72, 0) + 0.01, 0.6],
      [tt(76, 0), 0.42],
      [tt(79, 0), 0.3],
      [tt(80, 0), 0.2],
      [tt(81, 0), 0],
    ]);
    const hpF = curve([
      [tt(67, 8), 20],
      [tt(68, 0), 260],
      [tt(71, 0), 420],
      [tt(71, 12), 500],
      [tt(72, 0), 20],
    ]);
    const wall = (b) => {
      for (const rg of [
        [0, ix(tt(8, 0))],
        [ix(tt(71, 12)), N],
      ])
        for (const ch of [b.L, b.R]) {
          const f = (i) => wallFc(i / SR);
          svf(ch, 0, f, 0.75, rg[0], rg[1]);
          svf(ch, 0, f, 0.6, rg[0], rg[1]);
        }
      E.gainFn(b, wallG);
      const a = ix(tt(67, 8)),
        z = ix(tt(72, 0));
      for (const ch of [b.L, b.R]) svf(ch, 1, (i) => hpF(i / SR), 0.8, a, z);
    };
    const cutUps = (X, b) => {
      X.mute(b, tt(7, 15.6), tt(8, 0) - tt(7, 15.6), 4e-3);
      X.repeat(b, tt(15, 12), T16 * 1, 4, { pitch: 0 });
      X.tapeStop(b, tt(23, 12), tt(24, 0) - tt(23, 12), 0.05);
      X.repeat(b, tt(21, 8), T16 * 2, 2, {});
      X.repeat(b, tt(31, 14), T16 * 0.5, 4, { pitch: 1 });
      X.repeat(b, tt(35, 12), T16 * 2, 2, {});
      X.repeat(b, tt(37, 14), T16, 2, {});
      X.repeat(b, tt(39, 14), T16 * 0.5, 4, { pitch: 2 });
      X.reverseSlice(b, tt(43, 12), T16 * 2);
      X.repeat(b, tt(45, 8), T16 * 2, 2, {});
      X.mute(b, tt(51, 15), tt(52, 0) - tt(51, 15), 4e-3);
      X.repeat(b, tt(55, 12), T16, 4, {});
      X.repeat(b, tt(57, 8), T16 * 2, 2, {});
      X.repeat(b, tt(59, 14), T16 * 0.5, 4, { pitch: 2 });
      X.repeat(b, tt(61, 14), T16, 2, {});
      X.repeat(b, tt(63, 12), T16 * 2, 2, {});
      X.reverseSlice(b, tt(65, 12), T16 * 4);
      X.tapeStop(b, tt(71, 12), tt(72, 0) - tt(71, 12), 0.08);
      X.mute(b, tt(80, 0) + 0.02, 0.6, 0.6);
    };
    const mg = opt.gain ? +opt.gain : 1.06;
    const tone = (b) => {
      for (const ch of [b.L, b.R]) {
        svf(ch, 1, 27, 0.7);
        G.biquad(ch, "low", 90, 1, 0.7);
        G.biquad(ch, "peak", 260, -1.5, 0.9);
      }
      E.width(b, 1, 140);
      for (let i = 0; i < N; i++) {
        b.L[i] *= mg;
        b.R[i] *= mg;
      }
    };
    const tape = opt.tape || null;
    const stemOf = (name, c, walled) => {
      if (walled) wall(c);
      cutUps(Q, c);
      tone(c);
      tape.write(name, c.L, c.R);
    };
    const keep = (name, b, level, walled) => {
      if (!tape) return;
      const c = E.bus(false);
      E.mix(c, b, level);
      stemOf(name, c, walled);
    };
    const main = E.bus(false),
      fx = E.bus(false, "FX"),
      revSend = E.bus(false, "PLATE SEND"),
      dlySend = E.bus(false, "DELAY SEND"),
      fore = E.bus(false, "FRONT VOICE");
    let kick = E.bus(true, "KICK"),
      drums = E.bus(false, "DRUMS"),
      bassSub = null,
      bassMid = null,
      organ = null,
      keys = null,
      pad = null,
      vox = null;
    const LV = {
      kick: 0.96,
      drums: 0.8,
      bass: 1,
      organ: 0.74,
      keys: 0.76,
      pad: 0.85,
      vox: 0.8,
      rev: 0.85,
      dly: 0.5,
    };
    const kickTimes = [];
    const hit = (b, name, bar, step, o) => P(b, name, tt(bar, step) + ((o && o.dt) || 0), o);
    const both = (b, send, sg, x, t, o) => {
      P(b, x, t, o);
      if (sg) {
        const o2 = Object.assign({}, o);
        o2.g = (o.g === void 0 ? 1 : o.g) * sg;
        P(send, x, t, o2);
      }
    };
    const vel = (c) =>
      c === "x" ? 0.9 : c === "X" ? 1 : c === "." || c === " " ? 0 : +c / 9;
    function pat(bar, str, fn) {
      for (let s = 0; s < 16; s++) {
        const v = vel(str[s] || ".");
        if (v > 0) fn(s, v);
      }
    }
    function kickAt(bar, step, v, o) {
      const t = tt(bar, step);
      kickTimes.push(t);
      P(kick, "k1", t, Object.assign({ g: 0.95 * v, dur: 0.33, r: 0.05 }, o || {}));
      P(kick, "k3", t, { g: 0.35 * v, dur: 0.2, r: 0.04, lp: 2200 });
    }
    function clapAt(bar, step, v, o) {
      const t = tt(bar, step);
      o = o || {};
      P(drums, "cl1", t - 4e-3, { g: 0.5 * v, pan: -0.08, dur: 0.3, r: 0.08, hp: 280 });
      P(drums, ["clr1", "clr2", "clr3"][(bar + step) % 3], t - 9e-3, {
        g: 0.34 * v,
        pan: 0.22,
        dur: 0.22,
        r: 0.06,
        hp: 350,
      });
      P(drums, "sn1", t, { g: 0.3 * v, semi: 2, dur: 0.16, r: 0.05, hp: 170 });
      P(revSend, "cl1", t, { g: 0.11 * v, dur: 0.25, hp: 500 });
    }
    function ghost(bar, step, v) {
      P(drums, step & 1 ? "sn2" : "sn1", tt(bar, step), {
        g: 0.26 * v,
        semi: 3 + (step % 3),
        dur: 0.09,
        r: 0.04,
        hp: 260,
        pan: 0.12,
      });
    }
    function hatAt(bar, step, v, o) {
      const r = rnd();
      P(
        drums,
        v > 0.6 ? "ch2" : "ch1",
        tt(bar, step) + (r - 0.5) * 4e-3,
        Object.assign(
          {
            g: 0.3 * v * (0.9 + 0.2 * rnd()),
            pan: -0.18 + 0.1 * rnd(),
            semi: 1,
            dur: 0.07,
            r: 0.03,
            hp: 5200,
          },
          o || {},
        ),
      );
    }
    function ohAt(bar, step, v, len) {
      P(drums, "oh1", tt(bar, step), {
        g: 0.27 * v,
        pan: 0.16,
        dur: (len || 1.7) * T16,
        r: 0.035,
        hp: 4200,
        semi: -1,
      });
    }
    function shaker(bar, lvl, fill) {
      for (let s = 0; s < 16; s++) {
        const acc = s % 4 === 2 ? 1 : s & 1 ? 0.75 : 0.5;
        P(drums, s & 1 ? "shku" : "shkd", tt(bar, s) + (rnd() - 0.5) * 6e-3, {
          g: 0.2 * lvl * acc * (0.85 + 0.3 * rnd()),
          pan: 0.42,
          dur: 0.11,
          r: 0.03,
          hp: 3e3,
        });
      }
    }
    function percAt(name, bar, step, v, o) {
      hit(drums, name, bar, step, Object.assign({ g: 0.3 * v }, o || {}));
    }
    const AMEN_SL = S.amen.length / SR / 8;
    function amen(bar, step, sl, lenSteps, o) {
      o = o || {};
      P(
        drums,
        "amen",
        tt(bar, step),
        Object.assign(
          {
            off: sl * AMEN_SL,
            semi: 2.7 + (o.st || 0),
            dur: Math.min(lenSteps * T16, AMEN_SL / st2r(2.7 + (o.st || 0))),
            g: 0.4,
            r: 0.012,
            hp: 150,
            pan: -0.1,
          },
          o,
        ),
      );
    }
    function roll(bar, s0, s1, name, g0, g1, o) {
      o = o || {};
      let s = s0,
        k = 0;
      while (s < s1 - 1e-6) {
        const x = (s - s0) / (s1 - s0);
        const d = o.accel ? (x < 0.5 ? 1 : x < 0.8 ? 0.5 : 0.25) : o.div || 1;
        P(drums, name, tt(bar, s), {
          g: g0 + (g1 - g0) * x,
          semi: (o.semi || 0) + (o.rise || 0) * x,
          dur: 0.1,
          r: 0.03,
          hp: o.hp || 200,
          pan: k & 1 ? 0.2 : -0.2,
        });
        s += d;
        k++;
      }
    }
    const GROOVE = {
      hats: "5.36.3.65.36.3.6",
      hats2: "6336433663364356",
      oh: "..7...7...7...7.",
    };
    function drumBar(bar, v) {
      if (v.k) pat(bar, v.k, (s, vv) => kickAt(bar, s, vv));
      if (v.c)
        pat(bar, v.c === true ? "....x.......x..." : v.c, (s, vv) => clapAt(bar, s, vv));
      if (v.g) pat(bar, v.g, (s, vv) => ghost(bar, s, vv));
      if (v.h)
        pat(bar, v.h2 ? GROOVE.hats2 : GROOVE.hats, (s, vv) => hatAt(bar, s, vv * v.h));
      if (v.o) pat(bar, GROOVE.oh, (s, vv) => ohAt(bar, s, vv * v.o));
      if (v.s) shaker(bar, v.s);
      if (v.p >= 1) {
        percAt("rim1", bar, 3, 0.7, { semi: 5, pan: -0.35, dur: 0.05 });
        percAt("rim1", bar, 11, 0.6, { semi: 3, pan: -0.35, dur: 0.05 });
        percAt("rim1", bar, 14, 0.5, { semi: 5, pan: -0.3, dur: 0.05 });
      }
      if (v.p >= 2) {
        percAt("cgh", bar, 6, 0.55, { pan: 0.38, semi: 2 });
        percAt("cgm", bar, 9, 0.4, { pan: 0.3, semi: 2 });
        percAt("cgl", bar, 13, 0.5, { pan: 0.34, semi: 2, dur: 0.2 });
        percAt("cgh", bar, 15, 0.4, { pan: 0.38, semi: 2 });
      }
      if (v.p >= 3) {
        percAt("tamb", bar, 4, 0.5, { pan: -0.3, dur: 0.2, hp: 2500 });
        percAt("tamb", bar, 12, 0.5, { pan: -0.3, dur: 0.2, hp: 2500 });
        percAt("cab", bar, 7, 0.4, { pan: -0.4 });
        percAt("cab", bar, 10, 0.3, { pan: -0.4 });
      }
      if (v.ride)
        for (let s = 0; s < 16; s += 2)
          P(drums, "cym1", tt(bar, s), {
            g: 0.085 * v.ride * (s % 4 ? 1 : 0.7),
            semi: 5,
            dur: 0.16,
            r: 0.08,
            hp: 6e3,
            pan: 0.3,
          });
    }
    function crash(bar, step, g) {
      hit(drums, "cym808", bar, step || 0, {
        g: 0.26 * (g || 1),
        hp: 500,
        r: 0.6,
        pan: -0.15,
      });
      P(revSend, "cym808", tt(bar, step || 0), { g: 0.08 * (g || 1), hp: 800 });
      hit(drums, "cym1", bar, step || 0, { g: 0.3 * (g || 1), hp: 400, pan: 0.2 });
    }
    function riser(barEnd, lenSec, g) {
      const x = S.cymrev;
      const t = tt(barEnd, 0) - lenSec;
      P(fx, x, t, { rate: x.length / SR / lenSec, g: 0.34 * (g || 1), hp: 900, pan: 0.1 });
      P(revSend, x, t, { rate: x.length / SR / lenSec, g: 0.12 * (g || 1), hp: 900 });
    }
    const fcArr = new Float32Array(Math.ceil(N / 16) + 2).fill(160);
    function bassNote(bar, step, len, midi, o) {
      o = o || {};
      const t = tt(bar, step),
        dur = tt(bar, step + len) - t - 6e-3;
      const acc = o.acc === void 0 ? 1 : o.acc;
      const pc = [];
      pc.push([0, o.from || 0]);
      pc.push([o.gl || 0.045, 0]);
      if (o.to) {
        pc.push([dur * (o.toT === void 0 ? 0.55 : o.toT), 0]);
        pc.push([dur, o.to]);
      } else pc.push([dur, 0]);
      P(bassSub, "b_sub", t, {
        off: 0.4,
        semi: midi - META.b_sub.midi,
        dur,
        a: 5e-3,
        r: 0.025,
        pitch: pc,
        g: 0.62 * (o.sub === void 0 ? 1 : o.sub),
      });
      const src = o.src || "b_101";
      const mm = META[src].midi;
      let m = midi;
      while (m - mm > 7) m -= 12;
      while (m - mm < -7) m += 12;
      P(bassMid, src, t, {
        off: o.off === void 0 ? 0.02 : o.off,
        semi: (o.oct || 0) * 12 + midi - mm,
        dur,
        a: 3e-3,
        r: 0.02,
        pitch: pc,
        g: 0.5 * acc * (o.mid === void 0 ? 1 : o.mid),
      });
      if (!o.src && !o.w && !o.from)
        E.note(bassMid, "org", midi + 12, t, {
          dur: Math.min(dur, 0.15),
          g: 0.2 * acc,
          a: 1e-3,
          r: 0.03,
        });
      if (o.thick)
        P(bassMid, "b_thick", t, {
          off: 0.3 + 0.6 * rnd(),
          semi: midi - META.b_thick.midi,
          dur,
          a: 3e-3,
          r: 0.02,
          pitch: pc,
          g: 0.16 * o.thick,
        });
      const c0 = ix(t) >> 4,
        c1 = ix(t + dur) >> 4,
        w = o.w || 0;
      const A = (o.amt === void 0 ? 1 : o.amt) * acc;
      for (let c = c0; c <= c1 + 2 && c < fcArr.length; c++) {
        const x = ((c - c0) * 16) / SR;
        let f;
        if (w === 0) f = 170 + 1500 * A * Math.exp(-x / 0.065);
        else if (w === 1)
          f = 150 + 1700 * A * Math.pow(Math.sin(Math.PI * Math.min(1, x / dur)), 1.4);
        else if (w === 2)
          f =
            190 + 1500 * A * (0.5 - 0.5 * Math.cos((2 * Math.PI * x) / (T16 * (o.per || 2))));
        else if (w === 3) f = 240 + 2600 * A * (x / dur) * (x / dur);
        else f = 150 + 1900 * A * Math.pow(1 - Math.min(1, x / dur), 2);
        fcArr[c] = f;
      }
    }
    const BP = {
      a: [
        [2, 1.7, 0, { w: 0 }],
        [6, 1.7, 0, { w: 0, acc: 0.8 }],
        [10, 1, 0, { w: 0 }],
        [11, 2.4, 12, { w: 1, from: -12, gl: 0.07 }],
        [14, 1.8, 0, { w: 4, from: 7, gl: 0.09 }],
      ],
      b: [
        [2, 1.7, 0, { w: 0 }],
        [3.9, 1.9, 0, { w: 1, to: 12, toT: 0.4 }],
        [6, 1.6, 0, { w: 0 }],
        [9, 0.9, 7, { w: 0, acc: 0.8 }],
        [10, 1.8, 0, { w: 1 }],
        [13, 0.9, 0, { w: 0 }],
        [14, 1.9, 0, { w: 4, from: 12, gl: 0.11 }],
      ],
      c: [
        [1, 0.9, 0, { w: 0, acc: 0.7 }],
        [2, 1.7, 0, { w: 1 }],
        [6, 1.7, 12, { w: 0, from: -12, gl: 0.05 }],
        [8.9, 1, 0, { w: 0 }],
        [10, 1.8, 0, { w: 1, to: -5, toT: 0.5 }],
        [13, 2.8, 0, { w: 2, per: 1.5, from: 5, gl: 0.06 }],
      ],
      d: [
        [2, 1.6, 0, { w: 0 }],
        [5, 0.9, 0, { w: 0, acc: 0.7 }],
        [6, 1.8, 0, { w: 1, to: 7, toT: 0.5 }],
        [10, 0.9, 12, { w: 0 }],
        [11, 0.9, 10, { w: 0 }],
        [12.9, 1, 7, { w: 0 }],
        [14, 1.9, 0, { w: 4, from: 12, gl: 0.1 }],
      ],
      long: [
        [1.9, 5.9, 0, { w: 2, per: 3, amt: 0.9 }],
        [9.9, 3.9, 0, { w: 2, per: 2, amt: 1.1, to: 12, toT: 0.7 }],
        [14, 1.9, 0, { w: 4, from: 12, gl: 0.12 }],
      ],
      grow: [
        [0, 5.8, 0, { w: 2, per: 1.5, amt: 1.3, src: "b_hard", oct: 1, thick: 1 }],
        [6, 3.8, -2, { w: 2, per: 3, amt: 1.2, src: "b_hard", oct: 1, from: 2, gl: 0.2 }],
        [10, 2, 0, { w: 1, amt: 1.3, src: "b_reese" }],
        [12, 3.9, 3, { w: 3, amt: 1.1, src: "b_hard", oct: 1, to: -3, toT: 0.3, thick: 1 }],
      ],
      sparse: [
        [2, 1.7, 0, { w: 0 }],
        [10, 1.8, 0, { w: 1 }],
        [14, 1.8, 0, { w: 4, from: 7, gl: 0.09 }],
      ],
    };
    function bassBar(bar, name, o) {
      const root = chordOf(bar)[0];
      for (const n of BP[name])
        bassNote(bar, n[0], n[1], root + n[2], Object.assign({}, n[3], o || {}));
    }
    function organHit(bar, step, len, keysArr, o) {
      o = o || {};
      const t = tt(bar, step),
        dur = tt(bar, step + len) - t;
      const g = (o.g === void 0 ? 1 : o.g) * 0.2;
      keysArr.forEach((k, i) => {
        E.note(organ, "org", k + (o.tr || 0), t + i * 15e-4, {
          g: g * (i === keysArr.length - 1 ? 1.15 : 0.9),
          pan: -0.25 + (0.5 * i) / (keysArr.length - 1 || 1),
          dur,
          a: 1e-3,
          r: o.r || 0.035,
        });
      });
    }
    const OR = {
      a: [
        [0, 1.2],
        [3, 1.2],
        [6, 2.4],
        [10, 1.2],
        [13, 1.4],
      ],
      b: [
        [0, 1.2],
        [3, 1.2],
        [6, 1.2],
        [8, 0.9],
        [10, 2.2],
        [14, 1.3],
      ],
      c: [
        [1, 0.9],
        [3, 1.2],
        [6, 2.4],
        [9, 0.9],
        [11, 1.2],
        [14, 1.4],
      ],
      s: [
        [0, 1.3],
        [6, 2.4],
      ],
      off: [
        [2, 1.4],
        [6, 1.4],
        [10, 1.4],
        [14, 1.4],
      ],
    };
    function organBar(bar, name, o) {
      o = o || {};
      const v = chordOf(bar)[1];
      OR[name].forEach((h, i) => {
        let ks = v;
        if (o.top && i % 3 === 2) ks = v.slice(0, 3).concat([v[3] + o.top]);
        if (o.inv && i & 1) ks = [v[1], v[2], v[3], v[0] + 12];
        organHit(bar, h[0], h[1], ks, { g: (o.g || 1) * (i === 0 ? 1 : 0.88) });
      });
    }
    function fmChord(bar, step, len, keysArr, o) {
      o = o || {};
      const t = tt(bar, step),
        dur = tt(bar, step + len) - t;
      keysArr.forEach((k, i) => {
        E.note(keys, "fm", k - 12 + (o.tr || 0), t + i * (o.strum || 4e-3), {
          g: 0.2 * (o.g || 1),
          pan: -0.3 + (0.6 * i) / 3,
          dur,
          r: o.r || 0.08,
          a: 2e-3,
        });
      });
    }
    function padChord(bar, lenBars, keysArr, o) {
      o = o || {};
      const t = tt(bar, 0),
        dur = lenBars * BAR;
      const names = ["pad_302589", "pad_302592", "pad_302600"];
      keysArr.forEach((k, i) => {
        const kk = k - 12;
        let best = names[0];
        for (const n of names)
          if (Math.abs(META[n].midi - kk) < Math.abs(META[best].midi - kk)) best = n;
        P(pad, best, t, {
          semi: kk - META[best].midi,
          dur,
          a: o.a || 0.25,
          r: o.r || 0.5,
          g: 0.16 * (o.g || 1),
          pan: [-0.6, 0.6, -0.25, 0.25][i % 4],
          lp: o.lp || 5e3,
        });
      });
    }
    const voiceNotes = (v) => META[v].notes.filter((n) => n[1] - n[0] >= 0.2);
    function pick(v, target, pref) {
      let best = null,
        bd = 1e9;
      for (const n of voiceNotes(v)) {
        const d = Math.abs(target - n[2] - pref);
        if (d < bd) {
          bd = d;
          best = n;
        }
      }
      return best;
    }
    function chop(b, v, target, t, dur, o) {
      o = o || {};
      const n = pick(v, target, o.pref === void 0 ? 3 : o.pref);
      const rate = st2r(target - n[2]);
      const off = n[0] + (o.skip === void 0 ? 0 : o.skip);
      const avail = (n[1] - off) / rate;
      const d = Math.min(dur, Math.max(0.03, avail - 0.01));
      const oo = {
        m0: n[2],
        off,
        rate,
        dur: d,
        a: o.a === void 0 ? 4e-3 : o.a,
        r: o.r === void 0 ? 0.022 : o.r,
        g: (o.g === void 0 ? 1 : o.g) * 0.34,
        pan: o.pan || 0,
        hp: o.hp || 180,
        lp: o.lp,
      };
      P(b, v, t, oo);
      if (o.send) P(revSend, v, t, Object.assign({}, oo, { g: oo.g * o.send }));
      if (o.dly) P(dlySend, v, t, Object.assign({}, oo, { g: oo.g * o.dly }));
    }
    const W = {
      life: [11.1, 11.67, 67.1],
      is: [11.7, 11.99, 64.8],
      but: [12.04, 12.63, 64.2],
      a: [12.65, 12.95, 62],
      dream: [12.96, 14.5, 60.5],
      mer1: [7.35, 8.42, 72.2],
      mer2: [8.42, 9.3, 67.3],
      mer3: [9.3, 10.14, 64.2],
      mer4: [10.17, 11.05, 60.4],
      lifeV: [11.25, 11.38, 67.1],
      dreamV: [13.3, 13.46, 60.5],
      streamV: [5.95, 6.09, 67.3],
      merV: [7.62, 7.74, 72.2],
      gent: [3.77, 4.26, 64.3],
      ly: [4.28, 4.72, 62.2],
      down: [4.72, 5.3, 64.5],
      the: [5.29, 5.52, 65.2],
      stream: [5.53, 6.9, 67.3],
      row: [0.05, 0.75, 60],
    };
    const wcache = {};
    function word(name, target, lenSec, mode, grain, src, label) {
      const key = [name, target, lenSec.toFixed(3), mode, grain, src].join("|");
      if (wcache[key]) return wcache[key];
      const w = Array.isArray(name) ? name : W[name];
      const x = S[src || "v_f2_row"];
      const rate = st2r(target - w[2]);
      let y = G.resample(x, rate, w[0] * SR, (w[1] - w[0]) * SR);
      const ratio = (lenSec * SR) / y.length;
      if (Math.abs(ratio - 1) > 0.04)
        y = new Float32Array(
          G.stretch(y, ratio, grain || (mode === "akai" ? 0.05 : 0.035), mode || "wsola"),
        );
      G.fade(y, 3e-3, 0.012);
      y._midi = target;
      y._name = label || (Array.isArray(name) ? src : name);
      return (wcache[key] = y);
    }
    function say(b, name, target, t, lenSec, o) {
      o = o || {};
      const y = word(name, target, lenSec, o.mode, o.grain, o.src, o.label);
      const oo = {
        g: (o.g === void 0 ? 1 : o.g) * 0.36,
        pan: o.pan || 0,
        hp: o.hp || 170,
        lp: o.lp,
        dur: o.dur,
        r: o.r || 0.02,
        off: o.off,
        rate: o.rate,
        pitch: o.pitch,
      };
      P(b, y, t, oo);
      if (o.send) P(revSend, y, t, Object.assign({}, oo, { g: oo.g * o.send }));
      if (o.dly) P(dlySend, y, t, Object.assign({}, oo, { g: oo.g * o.dly }));
    }
    const PH = (tr) => [
      ["life", 70 + tr],
      ["is", 68 + tr],
      ["but", 67 + tr],
      ["a", 65 + tr],
      ["dream", 63 + tr],
    ];
    const OTH = {
      f8: [
        "v_f8_life",
        [
          [0.1, 0.86, 66.9],
          [0.86, 1.2, 64.9],
          [1.2, 2.02, 63.9],
          [2.03, 2.33, 61.8],
          [2.3, 4.2, 60],
        ],
        0,
      ],
      f5: [
        "v_f5_life",
        [
          [0.06, 0.68, 67.3],
          [0.7, 1.02, 65],
          [1.06, 1.72, 64],
          [1.73, 2.05, 61.7],
          [2.03, 3.3, 60],
        ],
        0,
      ],
      m5: [
        "v_m5_life",
        [
          [0.05, 0.5, 54.5],
          [0.54, 0.8, 52.1],
          [0.8, 1.29, 51.9],
          [1.29, 1.5, 50.1],
          [1.62, 2.45, 47.8],
        ],
        -12,
      ],
      m2: [
        "v_m2_life",
        [
          [0.08, 0.6, 54.2],
          [0.94, 1.26, 52.7],
          [1.32, 1.82, 52.1],
          [2.12, 2.42, 49.6],
          [2.9, 3.7, 48],
        ],
        -12,
      ],
    };
    function sayOther(b, who, wi, target, t, lenSec, o) {
      const d = OTH[who];
      say(
        b,
        d[1][wi],
        target + d[2],
        t,
        lenSec,
        Object.assign(
          { src: d[0], label: who + " " + ["life", "is", "but", "a", "dream"][wi] },
          o || {},
        ),
      );
    }
    const H1 = {
      call: [
        [0, 2, 67],
        [3, 2, 70],
        [6, 3, 72],
        [10, 2, 75],
        [12, 1, 74],
        [13, 3, 70],
      ],
      tailA: [
        [0, 3, 72],
        [3, 3, 70],
        [6, 5, 67],
      ],
      tailB: [
        [0, 3, 74],
        [3, 3, 72],
        [6, 5, 70],
      ],
      ansA: [
        [10, 2, 63],
        [12, 1, 65],
        [13, 3, 67],
      ],
      ansB: [
        [10, 2, 65],
        [12, 1, 67],
        [13, 3, 70],
      ],
    };
    const H2 = [
      [
        [0, 3, 75],
        [3, 3, 77],
        [6, 2, 75],
        [8, 3, 72],
        [11, 2, 70],
        [13, 3, 72],
      ],
      [
        [0, 3, 74],
        [3, 3, 77],
        [6, 2, 74],
        [8, 3, 70],
        [11, 2, 72],
        [13, 3, 74],
      ],
      [
        [0, 3, 74],
        [3, 3, 70],
        [6, 2, 67],
        [8, 3, 70],
        [11, 2, 74],
        [13, 3, 77],
      ],
      [
        [0, 3, 75],
        [3, 3, 74],
        [6, 5, 72],
      ],
    ];
    function leadLine(bar, notes, o) {
      o = o || {};
      const tr = TRof(bar) + (o.tr || 0);
      const b = o.bus || vox;
      notes.forEach((n, i) => {
        const t = tt(bar, n[0]);
        const full = tt(bar, n[0] + n[1]) - t;
        const cut = o.cut === void 0 ? 0.5 : o.cut;
        const r = rnd();
        if (n[1] >= 3 && r < cut) {
          const d1 = tt(bar, n[0] + 1) - t;
          chop(b, o.v || "v_f2_belt", n[2] + tr, t, d1 * 0.86, {
            g: (o.g || 1) * 0.95,
            pan: o.pan,
            send: o.send,
            pref: o.pref,
          });
          chop(b, o.v || "v_f2_belt", n[2] + tr, t + d1, (full - d1) * 0.94, {
            g: o.g || 1,
            pan: o.pan,
            send: o.send,
            dly: o.dly,
            skip: 0.02,
            pref: o.pref,
          });
        } else if (n[1] === 2 && r < cut * 0.5) {
          const d1 = full / 2;
          chop(b, o.v || "v_f2_belt", n[2] + tr, t, d1 * 0.8, {
            g: o.g || 1,
            pan: o.pan,
            send: o.send,
            pref: o.pref,
          });
          chop(b, o.v || "v_f2_belt", n[2] + tr, t + d1, d1 * 0.9, {
            g: (o.g || 1) * 0.8,
            pan: o.pan,
            skip: 0.06,
            pref: o.pref,
          });
        } else
          chop(b, o.v || "v_f2_belt", n[2] + tr, t, full * 0.93, {
            g: o.g || 1,
            pan: o.pan,
            send: o.send,
            dly: i === notes.length - 1 ? o.dly : 0,
            pref: o.pref,
          });
      });
    }
    await tick(0.02, "drums");
    const D_FULL = {
      k: "x...x...x...x...",
      c: true,
      g: ".......3..2....4",
      h: 1,
      o: 1,
      s: 1,
      p: 1,
    };
    for (let b = 0; b < BARS; b++) {
      const k4 = "x...x...x...x...";
      if (inSec(b, "intro")) {
        drumBar(b, {
          k: b === 7 ? "x...x..........." : k4,
          c: b === 7 ? "....x..........." : true,
          g: ".......3.......4",
          h: 1,
          o: b >= 2 ? 1 : 0,
          s: b >= 4 ? 0.8 : 0,
        });
      } else if (inSec(b, "drop1")) {
        const q = b - 8;
        const v = Object.assign({}, D_FULL, {
          s: q >= 4 ? 1 : 0,
          o: q >= 2 ? 1 : 0.6,
          p: q >= 8 ? 2 : q >= 4 ? 1 : 0,
        });
        if ((q & 3) === 3) v.k = "x...x...x...x..6";
        if ((q & 3) === 1) v.g = ".......3.2...3.4";
        if (b === 15) {
          v.k = "x...x...........";
          v.c = "....x...........";
          v.h = 0;
          v.o = 0;
          v.s = 0;
          v.p = 0;
          v.g = 0;
        }
        if (b === 23) {
          v.k = "x...x...x.......";
          v.c = "....x...........";
          v.g = 0;
          v.o = 0.6;
        }
        drumBar(b, v);
        if (b === 15) {
          hatAt(b, 0, 0.6);
          hatAt(b, 2, 0.5);
          hatAt(b, 3, 0.6);
          amen(b, 8, 0, 2);
          amen(b, 10, 3, 1);
          amen(b, 11, 3, 1);
          amen(b, 12, 2, 2);
          amen(b, 14, 2, 1, { st: 3 });
          amen(b, 15, 2, 1, { st: 6 });
        }
        if (b === 19) {
          amen(b, 12, 6, 2, { g: 0.3 });
          amen(b, 14, 7, 2, { g: 0.3 });
        }
        if (b === 23) roll(b, 8, 16, "sn1", 0.16, 0.42, { accel: true, rise: 5 });
      } else if (inSec(b, "break1")) {
        const q = b - 24;
        if (q >= 4) {
          shaker(b, 0.5 + 0.12 * (q - 4));
          percAt("tamb", b, 4, 0.35, { pan: -0.3, dur: 0.2, hp: 2500 });
          percAt("tamb", b, 12, 0.35, { pan: -0.3, dur: 0.2, hp: 2500 });
        }
        if (q >= 6) {
          const lp = q === 6 ? [300, 900] : [900, 5e3];
          for (let s = 0; s < 16; s += 4) {
            const t = tt(b, s);
            const f = lp[0] * Math.pow(lp[1] / lp[0], s / 16);
            P(kick, "k1", t, { g: 0.55 + 0.02 * s * (q - 6), dur: 0.3, r: 0.05, lp: f });
          }
        }
        if (q === 7) {
          roll(b, 0, 12, "sn1", 0.08, 0.36, { accel: true, rise: 7 });
          roll(b, 12, 14, "clr1", 0.3, 0.42, { div: 0.5, hp: 400 });
        }
      } else if (inSec(b, "drop2")) {
        const q = b - 32;
        const v = Object.assign({}, D_FULL, {
          p: 3,
          h2: q >= 4,
          g: q & 1 ? ".......3.2...3.4" : ".......3..2....4",
        });
        if (q >= 8 && q < 12) {
          drumBar(b, {
            k: q & 1 ? "x.........x..5.." : "x......5..x.....",
            c: true,
            g: ".2.....3.2.....4",
            h: 1,
            o: 0.7,
            s: 1,
            p: 2,
          });
          amen(b, 2, 1, 2, { g: 0.26 });
          amen(b, 6, 3, 2, { g: 0.26 });
          amen(b, 13, 6, 1, { g: 0.3 });
          amen(b, 14, 7, 2, { g: 0.3 });
          if (q === 11) {
            roll(b, 8, 16, "sn1", 0.14, 0.4, { accel: true, rise: 6 });
          }
          continue;
        }
        if ((q & 3) === 3) v.k = "x...x...x...x.5.";
        if (b === 39) {
          v.k = "x...x...........";
          v.c = "....x...........";
          v.o = 0;
          v.p = 1;
        }
        if (b === 47) {
          v.k = "x...x...x...x...";
          v.c = "....x...........";
          v.o = 0.5;
          v.s = 0.5;
          v.p = 0;
          v.g = 0;
          v.h = 0.6;
        }
        if (b === 46) {
          v.p = 1;
        }
        drumBar(b, v);
        if (b === 39) {
          amen(b, 8, 0, 1);
          amen(b, 9, 0, 1);
          amen(b, 10, 2, 2);
          amen(b, 12, 0, 1, { st: 2 });
          amen(b, 13, 0, 1, { st: 4 });
          amen(b, 14, 2, 1, { st: 6 });
          amen(b, 15, 2, 1, { st: 9 });
        }
        if (b === 35 || b === 43) {
          amen(b, 12, 6, 2, { g: 0.3 });
          amen(b, 14, 7, 2, { g: 0.3 });
        }
      } else if (inSec(b, "break2")) {
        const q = b - 48;
        if (q >= 2) {
          for (let s = 0; s < 16; s += q === 3 && s >= 8 ? 1 : 2) {
            const x = ((q - 2) * 16 + s) / 32;
            P(kick, "k1", tt(b, s), {
              g: 0.4 + 0.45 * x,
              dur: 0.25,
              r: 0.04,
              lp: 400 * Math.pow(20, x),
              hp: 30 + 200 * x,
            });
          }
        }
        if (q === 3) {
          roll(b, 0, 14, "sn1", 0.08, 0.4, { accel: true, rise: 8 });
        }
        if (q < 2) {
          percAt("snap", b, 4, 0.9, { pan: 0.2 });
          percAt("snap", b, 12, 0.9, { pan: -0.2 });
          P(revSend, "snap", tt(b, 4), { g: 0.15 });
          P(revSend, "snap", tt(b, 12), { g: 0.15 });
        }
      } else if (inSec(b, "drop3")) {
        const q = b - 52;
        const v = Object.assign({}, D_FULL, {
          p: 3,
          h2: true,
          ride: q >= 4 ? 1 : 0.6,
          g: q & 1 ? ".2.....3.2...3.4" : ".......3..2....4",
        });
        if ((q & 3) === 3) v.k = "x...x...x...x.5.";
        if (q === 7) {
          v.k = "x...x...x.......";
          v.c = "....x...........";
        }
        if (q === 15) {
          v.k = "x...x...x...x...";
          v.p = 1;
          v.ride = 0;
        }
        if (q >= 12) {
          v.p = q >= 14 ? 1 : 2;
          v.ride = q >= 14 ? 0 : 0.6;
        }
        drumBar(b, v);
        if (q === 7) {
          amen(b, 10, 0, 1);
          amen(b, 11, 0, 1);
          amen(b, 12, 2, 1);
          amen(b, 13, 3, 1);
          amen(b, 14, 2, 1, { st: 4 });
          amen(b, 15, 2, 1, { st: 8 });
        }
        if (q === 3 || q === 11) {
          amen(b, 12, 6, 2, { g: 0.32 });
          amen(b, 14, 7, 2, { g: 0.32 });
        }
        if ((q & 3) === 1 && q < 12) {
          amen(b, 6, 1, 1, { g: 0.24 });
          amen(b, 7, 1, 1, { g: 0.24, st: 3 });
        }
      } else {
        const q = b - 68;
        if (q < 4)
          drumBar(b, {
            k: k4,
            c: q < 3 ? true : "....x...........",
            g: 0,
            h: 1,
            o: q < 2 ? 0.8 : 0,
            s: 0.6,
            p: 0,
          });
        else
          drumBar(b, {
            k: q < 11 ? k4 : "x...............",
            c: q < 11,
            g: ".......3.......4",
            h: 1,
            o: 1,
            s: 0.8,
            p: 1,
          });
      }
    }
    crash(8);
    crash(16, 0, 0.7);
    crash(32, 0, 1.1);
    crash(40, 0, 0.6);
    crash(44, 0, 0.8);
    crash(52, 0, 1.15);
    crash(60, 0, 0.7);
    crash(68, 0, 0.6);
    riser(8, 1.4, 0.8);
    riser(32, 2.9, 1.1);
    riser(52, 2.9, 1.2);
    riser(44, 1.4, 0.7);
    riser(16, 0.7, 0.5);
    riser(60, 1.4, 0.6);
    hit(fx, "clrev", 31, 13, { g: 0.3, pan: -0.2 });
    hit(fx, "snrev", 23, 4, { g: 0.2 });
    await tick(0.07, "drum bus");
    const duck = E.duckEnv(kickTimes, 0.028, 0.15);
    E.each(kick, (ch, a, z) => {
      G.biquad(ch, "low", 75, 2.5, 0.8, a, z);
      G.biquad(ch, "peak", 320, -3, 1.2, a, z);
      G.biquad(ch, "peak", 3500, 2, 0.9, a, z);
      G.drive(ch, 1.25, 0.86, a, z);
    });
    E.each(drums, (ch, a, z) => {
      svf(ch, 1, 110, 0.7, a, z);
      G.biquad(ch, "high", 8500, 1.5, 0.7, a, z);
    });
    E.comp(drums, -16, 2.5, 6, 90, 2.5);
    E.each(drums, (ch, a, z) => G.drive(ch, 1.15, 0.9, a, z));
    keep("KICK", kick, LV.kick, true);
    keep("DRUMS", drums, LV.drums, true);
    E.mix(main, kick, LV.kick);
    E.mix(main, drums, LV.drums);
    kick = drums = null;
    await tick(0.12, "bass");
    bassSub = E.bus(true, "BASS SUB");
    bassMid = E.bus(true, "BASS MID");
    for (let b = 0; b < BARS; b++) {
      if (inSec(b, "intro")) {
        if (b !== 7) bassBar(b, (b & 3) === 3 ? "b" : "a");
        else {
          bassNote(b, 2, 1.7, 36, { w: 0 });
          bassNote(b, 6, 1.8, 36, { w: 4, from: 12, gl: 0.1 });
        }
      } else if (inSec(b, "drop1")) {
        const q = b - 8;
        if (b === 15) {
          bassNote(b, 2, 1.7, 34, { w: 0 });
          bassNote(b, 6, 1.9, 34, { w: 1, to: 12, toT: 0.3 });
          continue;
        }
        if (b === 23) {
          bassNote(b, 2, 1.7, 34, { w: 0 });
          bassNote(b, 6, 1.7, 34, { w: 0 });
          bassNote(b, 8, 4, 34, { w: 3, to: 12, toT: 0.2, amt: 1.2 });
          continue;
        }
        bassBar(
          b,
          q < 4
            ? q & 1
              ? "b"
              : "a"
            : q < 8
              ? ["a", "b", "a", "c"][q & 3]
              : ["d", "b", "c", "d"][q & 3],
          { thick: q >= 8 ? 1 : 0 },
        );
      } else if (inSec(b, "drop2")) {
        const q = b - 32;
        if (q >= 8 && q < 12) {
          bassBar(b, q & 1 ? "long" : "grow");
          continue;
        }
        if (b === 39) {
          bassNote(b, 2, 1.7, 36, { w: 0 });
          bassNote(b, 6, 1.9, 36, { w: 1, to: 12, toT: 0.3 });
          continue;
        }
        if (b === 47) {
          bassNote(b, 2, 1.7, 36, { w: 0 });
          bassNote(b, 6, 2, 36, { w: 1 });
          bassNote(b, 10, 5.5, 36, { w: 3, to: -12, toT: 0.1, amt: 0.8 });
          continue;
        }
        bassBar(b, ["c", "d", "b", "d"][q & 3], { thick: 1 });
      } else if (inSec(b, "drop3")) {
        const q = b - 52;
        if (q === 7) {
          bassNote(b, 2, 1.7, 38, { w: 0 });
          bassNote(b, 6, 1.9, 38, { w: 1, to: 12, toT: 0.3 });
          bassNote(b, 8.9, 1, 38, { w: 0 });
          continue;
        }
        bassBar(
          b,
          q < 8
            ? ["d", "c", "b", "d"][q & 3]
            : q < 12
              ? ["c", "long", "b", "d"][q & 3]
              : ["a", "b", "a", "sparse"][q & 3],
          { thick: 1 },
        );
      } else if (inSec(b, "outro")) {
        const q = b - 68;
        if (q >= 4 && q < 11) bassBar(b, q & 1 ? "b" : "a");
      }
    }
    await tick(0.16, "bass filter");
    svf(bassMid.L, 0, (i) => fcArr[i >> 4], 2.6);
    G.drive(bassMid.L, 2.8, 0.42, 0, N, 0.12);
    svf(bassMid.L, 1, 95, 0.7);
    svf(bassMid.L, 0, 5200, 0.7);
    svf(bassSub.L, 0, 125, 0.8);
    G.drive(bassSub.L, 1.6, 0.62);
    if (tape)
      for (const [name, src, k] of [
        ["BASS SUB", bassSub, 1],
        ["BASS MID", bassMid, 0.9],
      ]) {
        const c = E.bus(false);
        for (let i = 0; i < N; i++) {
          const v = src.L[i] * k * (0.1 + 0.9 * duck[i]) * LV.bass;
          c.L[i] = v;
          c.R[i] = v;
        }
        stemOf(name, c, true);
      }
    for (let i = 0; i < N; i++)
      bassSub.L[i] = (bassSub.L[i] + bassMid.L[i] * 0.9) * (0.1 + 0.9 * duck[i]);
    E.mix(main, bassSub, LV.bass);
    bassSub = bassMid = null;
    await tick(0.22, "organ");
    organ = E.bus(false, "ORGAN");
    keys = E.bus(false, "FM PIANO");
    pad = E.bus(false, "PAD");
    for (let b = 0; b < BARS; b++) {
      const ch = chordOf(b)[1];
      if (inSec(b, "intro")) {
        if (b < 7) organBar(b, b < 4 ? "s" : "a");
        else {
          organHit(b, 0, 1.2, ch);
          organHit(b, 3, 1.2, ch);
          organHit(b, 6, 1.6, ch);
        }
      } else if (inSec(b, "drop1")) {
        const q = b - 8;
        if (b === 15) {
          organHit(b, 0, 1.2, ch);
          organHit(b, 3, 1.2, ch);
          organHit(b, 6, 2, ch);
          continue;
        }
        if (b === 23) {
          organHit(b, 0, 1.2, ch);
          organHit(b, 3, 1.2, ch);
          organHit(b, 6, 2.4, ch);
          continue;
        }
        organBar(b, q < 4 ? "s" : q < 8 ? "a" : q & 1 ? "b" : "a", {
          top: q >= 8 ? 2 : 0,
          inv: q >= 12,
        });
      } else if (inSec(b, "break1")) {
        const q = b - 24;
        fmChord(b, 0, 14, ch, { g: 0.9, strum: 0.03, r: 0.3 });
        if (q >= 4) {
          fmChord(b, 6, 2, ch, { g: 0.6 });
          fmChord(
            b,
            11,
            2,
            ch.map((k) => k + 12),
            { g: 0.4 },
          );
        }
        if (q >= 6) organBar(b, "off", { g: 0.55 + 0.25 * (q - 6) });
      } else if (inSec(b, "drop2")) {
        const q = b - 32;
        if (q >= 8 && q < 12) {
          fmChord(b, 2, 1.5, ch, { g: 1.1 });
          fmChord(b, 6, 1.5, ch, { g: 0.9 });
          fmChord(b, 10, 1.5, ch, { g: 1.1 });
          fmChord(
            b,
            13,
            2.5,
            ch.map((k) => k + 12),
            { g: 0.6 },
          );
          continue;
        }
        if (b === 39) {
          organHit(b, 0, 1.2, ch);
          organHit(b, 3, 1.2, ch);
          organHit(b, 6, 2, ch);
          continue;
        }
        if (b === 47) {
          organHit(b, 0, 1.2, ch);
          organHit(b, 3, 1.2, ch);
          organHit(b, 6, 2.4, ch);
          continue;
        }
        organBar(b, ["a", "b", "c", "b"][q & 3], { top: q & 4 ? 3 : 0, inv: q >= 12 });
        fmChord(b, 0, 1.5, ch, { g: 0.8 });
        fmChord(b, 6, 2.5, ch, { g: 0.7 });
      } else if (inSec(b, "break2")) {
        const q = b - 48;
        fmChord(b, 0, 15, ch, { g: 1, strum: 0.025, r: 0.3 });
        if (q >= 2) organBar(b, "off", { g: 0.5 + 0.3 * (q - 2) });
      } else if (inSec(b, "drop3")) {
        const q = b - 52;
        if (q === 7) {
          organHit(b, 0, 1.2, ch);
          organHit(b, 3, 1.2, ch);
          organHit(b, 6, 2, ch);
          continue;
        }
        organBar(b, ["b", "a", "c", "b"][q & 3], {
          top: q & 4 ? 3 : 0,
          inv: q >= 8 && q < 12,
          g: q >= 14 ? 0.8 : 1,
        });
        if (q < 12) {
          fmChord(b, 0, 1.5, ch, { g: 0.85 });
          fmChord(b, 6, 2.5, ch, { g: 0.75 });
          fmChord(
            b,
            13,
            2,
            ch.map((k) => k + 12),
            { g: 0.4 },
          );
        }
      } else {
        const q = b - 68;
        if (q < 4) {
          if (q < 2) {
            organHit(b, 0, 1.3, ch, { g: 0.7 });
            organHit(b, 6, 2.4, ch, { g: 0.6 });
          }
        } else if (q < 11) organBar(b, "a");
        else {
          organHit(b, 0, 6, ch, { g: 1, r: 0.6 });
        }
      }
    }
    for (let b = 24; b < 32; b += 1)
      padChord(b, 1.02, chordOf(b)[1], {
        g: 0.9 + 0.05 * (b - 24),
        lp: 1800 + 500 * (b - 24),
      });
    for (let b = 48; b < 52; b++) padChord(b, 1.02, chordOf(b)[1], { g: 1.1, lp: 4500 });
    for (let b = 32; b < 48; b++)
      if (!(b >= 40 && b < 44)) padChord(b, 1.02, chordOf(b)[1], { g: 0.55, lp: 3500 });
    for (let b = 52; b < 68; b++)
      padChord(b, 1.02, chordOf(b)[1], { g: b < 64 ? 0.75 : 0.5, lp: 5e3 });
    await tick(0.3, "keys bus");
    E.each(organ, (ch, a, z) => {
      svf(ch, 1, 190, 0.7, a, z);
      G.drive(ch, 1.7, 0.66, a, z);
      svf(ch, 0, 6500, 0.7, a, z);
      G.biquad(ch, "peak", 1700, -2, 1, a, z);
    });
    E.chorus(organ, 2.2, 0.6, 0.55);
    E.mulEnv(organ, duck, 0.35);
    E.each(keys, (ch, a, z) => {
      svf(ch, 1, 210, 0.7, a, z);
      G.biquad(ch, "peak", 2500, 2, 0.8, a, z);
    });
    E.chorus(keys, 3, 0.35, 0.5, 12);
    E.mulEnv(keys, duck, 0.4);
    E.each(pad, (ch, a, z) => svf(ch, 1, 230, 0.7, a, z));
    E.chorus(pad, 4, 0.22, 0.7, 14);
    E.width(pad, 1.15, 250);
    E.mulEnv(pad, duck, 0.72);
    E.mix(revSend, organ, 0.2);
    E.mix(revSend, keys, 0.2);
    E.mix(revSend, pad, 0.16);
    E.mix(dlySend, organ, 0.1);
    E.mix(dlySend, keys, 0.16);
    keep("ORGAN", organ, LV.organ, true);
    keep("FM PIANO", keys, LV.keys, true);
    keep("PAD", pad, LV.pad, true);
    E.mix(main, organ, LV.organ);
    E.mix(main, keys, LV.keys);
    E.mix(main, pad, LV.pad);
    organ = keys = pad = null;
    await tick(0.4, "voices");
    vox = E.bus(false, "VOICES");
    const LEADV = "v_f2_belt";
    chop(fore, LEADV, 67, tt(1, 6), 0.5, { g: 0.55, send: 0.25, a: 0.03, r: 0.2 });
    chop(fore, LEADV, 70, tt(2, 3), 0.25, { g: 0.6, send: 0.2 });
    chop(fore, LEADV, 72, tt(2, 6), 0.55, { g: 0.6, send: 0.3, r: 0.2 });
    chop(fore, LEADV, 67, tt(3, 0), 0.2, { g: 0.55 });
    chop(fore, LEADV, 70, tt(3, 3), 0.2, { g: 0.6 });
    chop(fore, LEADV, 72, tt(3, 6), 0.3, { g: 0.65, send: 0.2 });
    chop(fore, LEADV, 75, tt(3, 10), 0.62, { g: 0.7, send: 0.4, dly: 0.5, r: 0.25 });
    leadLine(4, H1.call, { bus: fore, g: 0.75, cut: 0.3, send: 0.15 });
    leadLine(5, H1.tailA, { bus: fore, g: 0.75, cut: 0, send: 0.2, dly: 0.5 });
    PH(0)
      .slice(0, 4)
      .forEach((w, i) =>
        say(fore, w[0], w[1], tt(6, i * 3), T16 * 2.7, { g: 0.85, send: 0.12 }),
      );
    say(fore, "life", 70, tt(6, 12), T16 * 1.8, { g: 0.8 });
    say(fore, "life", 70, tt(6, 14), T16 * 1.8, { g: 0.8, pan: 0.2 });
    PH(0)
      .slice(0, 4)
      .forEach((w, i) =>
        say(fore, w[0], w[1], tt(7, i * 2), T16 * 1.8, { g: 0.9, send: 0.1 }),
      );
    {
      const d = word("dream", 63, 0.9, "wsola");
      for (let k = 0; k < 8; k++) {
        const s = 8 + (k < 4 ? k : 4 + (k - 4) * 0.5) * (k < 4 ? 1 : 1);
      }
      const steps = [8, 9, 10, 11, 12, 12.5, 13, 13.5, 14, 14.5, 15, 15.5];
      steps.forEach((s, k) =>
        P(fore, d, tt(7, s), {
          dur: (k < 4 ? T16 : T16 / 2) * 0.85,
          g: 0.5 + 0.02 * k,
          semi: k < 4 ? 0 : (k - 3) * 0.75,
          pan: k & 1 ? 0.25 : -0.25,
          hp: 200 + 60 * k,
        }),
      );
    }
    for (let b = 8; b < 24; b += 2) {
      const q = b - 8;
      const second = (b & 3) === 2;
      if (b === 8) {
        say(vox, "dream", 63, tt(8, 0), BAR * 1, {
          mode: "akai",
          grain: 0.055,
          g: 1.05,
          send: 0.3,
          dly: 0.25,
        });
        leadLine(8, H1.call.slice(3), { cut: 0.4, send: 0.1 });
      } else if (b !== 14 && b !== 22) leadLine(b, H1.call, { cut: 0.55, send: 0.12 });
      if (b === 14) {
        leadLine(b, H1.call.slice(0, 3), { cut: 0.6, send: 0.12 });
        PH(0)
          .slice(0, 2)
          .forEach((w, i) =>
            say(vox, w[0], w[1], tt(14, 10 + i * 3), T16 * 2.6, { g: 0.9, send: 0.15 }),
          );
      }
      if (b === 22) {
        leadLine(b, H1.call, { cut: 0.8, send: 0.12 });
      }
      const tb = b + 1;
      if (tb === 15) {
        say(vox, "but", 67, tt(15, 0), T16 * 2.6, { g: 0.9 });
        say(vox, "a", 65, tt(15, 3), T16 * 2.6, { g: 0.9 });
        const d = word("dream", 65, 0.8, "wsola");
        [6, 7, 8, 9, 10, 11, 12, 13, 14, 15].forEach((s, k) =>
          P(vox, d, tt(15, s), {
            dur: T16 * 0.82,
            g: 0.32,
            off: k >= 6 ? 0.1 : 0,
            semi: k >= 6 ? (k - 5) * 1 : 0,
            pan: k & 1 ? 0.3 : -0.3,
            hp: 200,
          }),
        );
        continue;
      }
      if (tb === 23) {
        leadLine(tb, second ? H1.tailB : H1.tailA, { cut: 0.3, send: 0.2 });
        say(vox, "dream", 65, tt(23, 8), BAR * 0.5, {
          mode: "akai",
          grain: 0.045,
          g: 1,
          send: 0.35,
          dly: 0.4,
          pitch: [
            [0, 0],
            [0.45, 0],
            [0.75, -7],
          ],
        });
        continue;
      }
      leadLine(tb, second ? H1.tailB : H1.tailA, {
        cut: 0.3,
        send: 0.2,
        dly: q < 8 ? 0.55 : 0.2,
      });
      if (q < 8) {
        const fz = [
          [
            "lifeV",
            72,
            0.03,
            [
              [0, 0],
              [0.3, 0],
              [0.44, -2],
            ],
          ],
          [
            "dreamV",
            70,
            0.036,
            [
              [0, 0],
              [0.22, 0],
              [0.45, -12],
            ],
          ],
          [
            "lifeV",
            75,
            0.022,
            [
              [0, 0],
              [0.45, 0],
            ],
          ],
          [
            "dreamV",
            67,
            0.03,
            [
              [0, 0],
              [0.3, 0],
              [0.45, 5],
            ],
          ],
        ][(q >> 1) & 3];
        say(vox, fz[0], fz[1], tt(tb, 11), T16 * 4.7, {
          mode: "akai",
          grain: fz[2],
          g: 0.62,
          pan: q & 2 ? 0.25 : -0.25,
          send: 0.3,
          dly: 0.3,
          pitch: fz[3],
        });
      }
      if (q >= 8) {
        const ans = second ? H1.ansB : H1.ansA;
        leadLine(tb, ans, {
          v: "v_m5_belt",
          tr: -12,
          pan: -0.55,
          g: 0.95,
          cut: 0.2,
          send: 0.2,
          pref: 2,
        });
        if (q >= 10)
          leadLine(tb, ans, { v: "v_f8_belt", pan: 0.55, g: 0.8, cut: 0.2, send: 0.2 });
        if (q >= 12)
          leadLine(
            tb,
            ans.map((n, i) => [n[0], n[1], (second ? [68, 70, 74] : [67, 68, 70])[i]]),
            { v: "v_f8_belt", pan: 0.3, g: 0.5, cut: 0, send: 0.25, pref: 5 },
          );
      }
    }
    PH(0)
      .slice(0, 4)
      .forEach((w, i) =>
        say(vox, w[0], w[1], tt(24 + (i >> 1), (i & 1) * 8), T16 * 6.5, {
          mode: "akai",
          grain: 0.06,
          g: 1.05,
          send: 0.4,
          dly: 0.2,
        }),
      );
    say(vox, "dream", 63, tt(26, 0), BAR * 1.9, {
      mode: "akai",
      grain: 0.07,
      g: 1.1,
      send: 0.45,
      dly: 0.3,
    });
    [0, 1, 2, 3].forEach((i) => {
      const t = tt(28, i * 3);
      sayOther(vox, "f8", i, PH(0)[i][1], t, T16 * 2.7, { pan: 0.45, g: 0.8, send: 0.3 });
      sayOther(vox, "m5", i, PH(0)[i][1], t, T16 * 2.7, { pan: -0.45, g: 0.85, send: 0.3 });
      say(vox, PH(0)[i][0], PH(0)[i][1], t, T16 * 2.7, { g: 0.7, send: 0.2 });
    });
    say(vox, "life", 70, tt(28, 12), T16 * 3.6, { g: 0.8, send: 0.3, dly: 0.4 });
    function dreamChord(bar, step, len, tr, g, o) {
      o = o || {};
      const t = tt(bar, step);
      const m = o.mode || "akai";
      const nn = o.notes || [63, 67, 58];
      say(vox, "dream", nn[0] + tr, t, len, {
        mode: m,
        grain: 0.06,
        g: 0.95 * g,
        send: 0.4,
        dly: 0.2,
      });
      sayOther(vox, "f8", 4, nn[0] + tr, t, len, {
        mode: m,
        grain: 0.052,
        pan: 0.5,
        g: 0.75 * g,
        send: 0.4,
      });
      sayOther(vox, "f5", 4, nn[1] + tr, t, len, {
        mode: m,
        grain: 0.047,
        pan: -0.35,
        g: 0.5 * g,
        send: 0.5,
      });
      sayOther(vox, "m5", 4, nn[0] + tr, t, len, {
        mode: m,
        grain: 0.065,
        pan: -0.55,
        g: 0.85 * g,
        send: 0.4,
      });
      sayOther(vox, "m2", 4, nn[2] + tr, t, len, {
        mode: m,
        grain: 0.07,
        pan: 0.3,
        g: 0.7 * g,
        send: 0.4,
      });
    }
    dreamChord(29, 0, BAR * 0.95, 0, 1, { notes: [65, 69, 58] });
    const MER = [
      ["mer1", 75],
      ["mer2", 70],
      ["mer3", 67],
      ["mer4", 63],
    ];
    const merAt = (top) => MER.map((w) => [w[0], w[1] - 75 + top]);
    merAt(70).forEach((w, i) =>
      say(vox, w[0], w[1], tt(30, i * 4), T16 * 3.7, {
        g: 0.95,
        send: 0.2,
        pan: i & 1 ? 0.2 : -0.2,
      }),
    );
    MER.forEach((w, i) =>
      say(vox, w[0], w[1], tt(31, i * 2), T16 * 1.85, {
        g: 0.95,
        send: 0.15,
        pan: i & 1 ? 0.3 : -0.3,
      }),
    );
    {
      const m = word("mer1", 75, T16 * 3.7, "wsola");
      for (let k = 0; k < 8; k++)
        P(vox, m, tt(31, 8 + k * 0.5), {
          dur: T16 * 0.42,
          g: 0.34,
          semi: k * 0.5,
          pan: k & 1 ? 0.35 : -0.35,
          hp: 200 + 100 * k,
        });
    }
    const MOS = [
      [2, 5, 7, 10, 12, 15],
      [1, 4, 7, 9, 12, 14, 15],
      [2, 4, 5, 10, 12, 14],
      [1, 2, 5, 7, 9, 10],
    ];
    const MV = [
      ["v_f8_belt", 0, 3],
      ["v_m5_belt", -12, 2],
      ["v_f8_fast", 0, 4],
      ["v_m2_belt", -12, 2],
      ["v_f2_belt", 0, 5],
    ];
    function mosaic(bar, lvl, dens) {
      const ch = chordOf(bar)[1];
      MOS[bar & 3].forEach((st, k) => {
        if (rnd() > dens) return;
        const mv = MV[(k + bar) % MV.length];
        let key = ch[(k * 3 + bar) % 4];
        if (mv[1]) {
          key -= 12;
          if (key > 62) key -= 12;
        } else if (key > 77) key -= 12;
        chop(vox, mv[0], key, tt(bar, st), T16 * (k % 3 === 2 ? 0.95 : 0.62), {
          g: 0.46 * lvl,
          pan: k & 1 ? 0.62 : -0.62,
          pref: mv[2],
          skip: 0.03 * (k % 3),
          hp: 320,
          send: 0.22,
          a: 2e-3,
          r: 0.012,
        });
      });
    }
    function dropTogether(b0, tr, lvl) {
      for (let b = b0; b < b0 + 16; b++) {
        const q = b - b0;
        const c = b & 3;
        const third = b0 === 52;
        if (q >= 8 && q < 12 && !third) {
          const GD = [
            ["gent", 67],
            ["ly", 65],
            ["down", 67],
            ["the", 68],
            ["stream", 70],
          ];
          if (!(q & 1)) {
            GD.slice(0, 4).forEach((w, i) =>
              say(
                vox,
                w[0],
                w[1] + tr,
                tt(b, [0, 2, 4, 7][i]),
                T16 * [1.8, 1.8, 2.7, 0.9][i],
                { g: 0.95, send: 0.2 },
              ),
            );
            say(vox, "stream", 70 + tr, tt(b, 8), T16 * 7.5, {
              mode: "akai",
              grain: 0.05,
              g: 1,
              send: 0.35,
              dly: 0.3,
            });
          } else {
            const s = word("stream", 70 + tr, T16 * 4, "wsola");
            [0, 1.5, 3, 4, 5, 6, 6.5, 7].forEach((st, k) =>
              P(vox, s, tt(b, st), {
                dur: T16 * (k < 3 ? 1.3 : 0.8),
                g: 0.34,
                off: (k % 3) * 0.05,
                pan: k & 1 ? 0.3 : -0.3,
                hp: 220,
              }),
            );
            const an = (b & 3) === 1 ? H1.ansB : H1.ansA;
            leadLine(
              b,
              an.map((n) => [n[0] - 2, n[1], n[2]]),
              { v: "v_m5_belt", tr: -12, pan: -0.5, g: 0.9, cut: 0.3, send: 0.25, pref: 2 },
            );
            leadLine(
              b,
              an.map((n) => [n[0] - 2, n[1], n[2] + 12]),
              { v: "v_f8_belt", pan: 0.5, g: 0.6, cut: 0.3, send: 0.25, pref: 4 },
            );
          }
          continue;
        }
        if ((third && q === 7) || (!third && q === 7)) {
          leadLine(b, H2[3], { cut: 0.9, send: 0.15 });
          const d = word("dream", 63 + tr, 0.8, "wsola");
          [8, 9, 10, 11, 12, 13, 14, 14.5, 15, 15.5].forEach((s, k) =>
            P(vox, d, tt(b, s), {
              dur: T16 * (k < 7 ? 0.82 : 0.42),
              g: 0.32,
              semi: k >= 4 ? (k - 3) * 1 : 0,
              pan: k & 1 ? 0.3 : -0.3,
              hp: 200,
            }),
          );
          continue;
        }
        const fading = third ? Math.max(0, q - 7) : 0;
        leadLine(b, H2[c], { cut: 0.6, send: 0.14, g: lvl, dly: c === 3 ? 0.5 : 0 });
        if (q >= 2 && fading < 6)
          mosaic(b, fading < 3 ? 1 : 0.6, fading < 2 ? (q >= 4 ? 1 : 0.7) : 0.5);
        if (third && (q & 3) === 1 && q < 8)
          say(vox, "streamV", q & 4 ? 74 : 71, tt(b, 13), T16 * 2.9, {
            mode: "akai",
            grain: 0.024,
            g: 0.5,
            pan: 0.3,
            send: 0.3,
            pitch: [
              [0, -5],
              [0.2, 0],
            ],
          });
        if (c !== 3) {
          const HM = [
            {
              f8: [
                [3, 3, 72],
                [8, 3, 68],
                [13, 3, 68],
              ],
              m5: [
                [0, 3, 63],
                [8, 3, 60],
              ],
              m2: [
                [6, 2, 56],
                [11, 2, 55],
              ],
            },
            {
              f8: [
                [3, 3, 74],
                [8, 3, 67],
                [13, 3, 70],
              ],
              m5: [
                [0, 3, 62],
                [8, 3, 58],
              ],
              m2: [
                [6, 2, 58],
                [11, 2, 55],
              ],
            },
            {
              f8: [
                [3, 3, 67],
                [8, 3, 67],
                [13, 3, 74],
              ],
              m5: [
                [0, 3, 62],
                [8, 3, 58],
              ],
              m2: [
                [6, 2, 55],
                [11, 2, 53],
              ],
            },
          ][c];
          if (fading < 6)
            leadLine(b, HM.f8, {
              v: "v_f8_belt",
              pan: 0.5,
              g: 0.62 * lvl,
              cut: 0.3,
              send: 0.22,
            });
          if (fading < 4)
            leadLine(b, HM.m5, {
              v: "v_m5_belt",
              pan: -0.5,
              g: 0.8 * lvl,
              cut: 0.2,
              send: 0.22,
              pref: 2,
            });
          if (fading < 2 && q >= 4)
            leadLine(b, HM.m2, {
              v: "v_m2_belt",
              pan: -0.25,
              g: 0.6 * lvl,
              cut: 0.2,
              send: 0.25,
              pref: 2,
            });
        } else {
          if (fading < 7) {
            if (fading < 3)
              dreamChord(b, 11, T16 * 4.6, tr, fading < 1 ? 0.9 : 0.65, { mode: "wsola" });
            else if (fading < 5) {
              sayOther(vox, "f8", 4, 63 + tr, tt(b, 11), T16 * 4.6, {
                pan: 0.5,
                g: 0.6,
                send: 0.4,
              });
            }
          }
        }
        if ((q & 3) === 1 && q < 8) {
          merAt(third ? 72 : 77).forEach((w, i) =>
            say(vox, w[0], w[1], tt(b, 8 + i * 2), T16 * 1.85, {
              g: 0.55 * lvl,
              send: 0.25,
              pan: i & 1 ? 0.6 : -0.6,
              hp: 400,
            }),
          );
        }
        if (third && q < 8 && (q & 3) === 2) {
          const f = S.v_f2_fast;
          P(vox, f, tt(b, 12), {
            off: 0.03,
            semi: 5,
            dur: T16 * 3.8,
            g: 0.3,
            pan: 0.4,
            hp: 300,
          });
          P(revSend, f, tt(b, 12), { off: 0.03, semi: 5, dur: T16 * 3.8, g: 0.12, hp: 300 });
        }
      }
    }
    dropTogether(32, 0, 1);
    say(vox, "dream", 63, tt(32, 0), BAR * 0.6, {
      mode: "akai",
      grain: 0.05,
      g: 0.6,
      send: 0.5,
      pan: 0.2,
      hp: 500,
    });
    {
      const tr = 2;
      [0, 1, 2, 3].forEach((i) => {
        const t = tt(48, i * 3);
        const p = PH(tr)[i];
        say(vox, p[0], p[1], t, T16 * 2.7, { g: 0.95, send: 0.25 });
        sayOther(vox, "f8", i, p[1], t, T16 * 2.7, { pan: 0.5, g: 0.8, send: 0.3 });
        sayOther(vox, "m5", i, p[1], t, T16 * 2.7, { pan: -0.5, g: 0.85, send: 0.3 });
        sayOther(vox, "f5", i, p[1] + (i === 2 ? 3 : 4), t, T16 * 2.7, {
          pan: -0.2,
          g: 0.45,
          send: 0.4,
        });
        sayOther(vox, "m2", i, p[1], t, T16 * 2.7, { pan: 0.25, g: 0.6, send: 0.3 });
      });
      dreamChord(48, 12, T16 * 3.9, 0, 1, { notes: [65, 69, 58], mode: "wsola" });
      dreamChord(49, 0, T16 * 11, 0, 1, { notes: [64, 67, 60] });
      [0, 1, 2, 3].forEach((i) => {
        const p = PH(tr)[i];
        say(vox, p[0], p[1], tt(50, i * 3), T16 * 2.7, { g: 0.9, send: 0.2 });
        sayOther(vox, "f8", i, p[1], tt(50, i * 3), T16 * 2.7, {
          pan: 0.5,
          g: 0.7,
          send: 0.3,
        });
        sayOther(vox, "m5", i, p[1], tt(50, i * 3), T16 * 2.7, {
          pan: -0.5,
          g: 0.75,
          send: 0.3,
        });
      });
      [0, 1, 2, 3].forEach((i) => {
        const p = PH(tr)[i];
        say(vox, p[0], p[1], tt(50, 12 + i * 2), T16 * 1.8, { g: 0.9, send: 0.2 });
        sayOther(vox, "m5", i, p[1], tt(50, 12 + i * 2), T16 * 1.8, { pan: -0.5, g: 0.7 });
      });
      const d = word("dream", 63 + tr, 0.9, "wsola");
      for (let k = 0; k < 20; k++) {
        const s = k < 8 ? 4 + k : 12 + (k - 8) * 0.25;
        if (s >= 15) break;
        P(vox, d, tt(51, s), {
          dur: T16 * (k < 8 ? 0.85 : 0.22),
          g: 0.3 + 6e-3 * k,
          semi: k < 4 ? 0 : (k - 3) * 0.6,
          pan: k & 1 ? 0.3 : -0.3,
          hp: 200 + 50 * k,
        });
      }
      [0, 1].forEach((i) => {
        const p = PH(tr)[i];
        say(vox, p[0], p[1], tt(51, i * 2), T16 * 1.8, { g: 0.9, send: 0.2 });
      });
    }
    dropTogether(52, 2, 1.04);
    dreamChord(52, 0, BAR * 0.9, 2, 0.8);
    {
      const sy = S.v_f2_say;
      const y = new Float32Array(G.stretch(G.resample(sy, st2r(-1)), 1.25, 0.05, "akai"));
      G.fade(y, 0.01, 0.05);
      y._name = "spoken";
      P(fore, y, tt(68, 2), { g: 0.5, hp: 150 });
      P(revSend, y, tt(68, 2), { g: 0.04 });
      leadLine(
        70,
        H1.call.slice(0, 3).map((n) => [n[0], n[1], n[2]]),
        { bus: fore, g: 0.7, cut: 0, dly: 0.6, tr: 0 },
      );
      PH(0)
        .slice(0, 4)
        .forEach((w, i) =>
          say(fore, w[0], w[1], tt(73 + (i >> 1), (i & 1) * 8 + 2), T16 * 5.5, {
            mode: "akai",
            grain: 0.06,
            g: 0.7,
            send: 0.1,
          }),
        );
      PH(0)
        .slice(0, 4)
        .forEach((w, i) =>
          say(fore, w[0], w[1], tt(76, i * 3), T16 * 2.7, { g: 0.62, send: 0.06 }),
        );
      say(fore, "life", 70, tt(77, 4), T16 * 4, { mode: "akai", grain: 0.06, g: 0.5 });
      say(fore, "is", 68, tt(77, 10), T16 * 3, { g: 0.45 });
      say(fore, "but", 67, tt(78, 2), T16 * 4, { mode: "akai", grain: 0.06, g: 0.42 });
      say(fore, "a", 65, tt(78, 10), T16 * 5, {
        mode: "akai",
        grain: 0.06,
        g: 0.4,
        pitch: [
          [0, 0],
          [0.25, 0],
          [0.47, -5],
        ],
      });
    }
    for (let t = 0; t < tt(8, 0) - 0.2; t += 2.3)
      P(fore, "hiss", t, { g: 0.5, a: 0.1, r: 0.1, pan: (rnd() - 0.5) * 0.4 });
    for (let t = tt(72, 0); t < tt(80, 0) - 0.5; t += 2.3)
      P(fore, "hiss", t, {
        g: 0.5,
        a: 0.1,
        r: 0.1,
        pan: (rnd() - 0.5) * 0.4,
        dur: Math.min(2.5, tt(80, 0) - t),
      });
    P(fx, "rewind", tt(47, 6), { g: 0.5, dur: tt(48, 0) - tt(47, 6), r: 0.02, hp: 200 });
    P(fx, "backspin", tt(23, 12), { g: 0.4, hp: 200, dur: T16 * 4 });
    P(fx, "scratch", tt(15, 6), { g: 0.3, hp: 300 });
    P(fx, "scratch", tt(39, 6), { g: 0.3, hp: 300, semi: 3 });
    P(fx, "backspin", tt(71, 10), { g: 0.4, hp: 200, dur: T16 * 6, semi: -3 });
    await tick(0.5, "voices bus");
    for (const b of [vox, fore])
      E.each(b, (ch, a, z) => {
        svf(ch, 1, 160, 0.7, a, z);
        G.biquad(ch, "peak", 3400, 1.5, 0.8, a, z);
        G.biquad(ch, "high", 9e3, 2, 0.7, a, z);
        G.biquad(ch, "peak", 420, -2, 1, a, z);
        G.biquad(ch, "peak", 1900, -1.5, 1.2, a, z);
      });
    E.comp(vox, -17, 3, 4, 110, 3.5);
    E.each(vox, (ch, a, z) => G.drive(ch, 1.2, 0.88, a, z));
    E.mulEnv(vox, duck, 0.18);
    keep("VOICES", vox, LV.vox, true);
    keep("FRONT VOICE", fore, 1.3, false);
    E.mix(main, vox, LV.vox);
    vox = null;
    await tick(0.58, "delay");
    E.each(dlySend, (ch, a, z) => svf(ch, 1, 300, 0.7, a, z));
    let dly = E.delay(dlySend, T16 * 3, 0.46, 3600, 350, 1);
    E.mix(revSend, dly, 0.3);
    E.mulEnv(dly, duck, 0.3);
    keep("DELAY SEND", dly, LV.dly, true);
    E.mix(main, dly, LV.dly);
    dly = null;
    await tick(0.66, "plate reverb");
    {
      const pre = ix(0.018);
      E.each(revSend, (ch, a, z) => {
        svf(ch, 1, 280, 0.7, a, z);
        svf(ch, 0, 8e3, 0.7, a, z);
      });
      let rev = E.bus();
      const tmp = new Float32Array(N);
      tmp.set(revSend.L.subarray(0, N - pre), pre);
      G.convolve(tmp, S.irL, rev.L, 0.055);
      await tick(0.76, "plate reverb");
      tmp.fill(0);
      tmp.set(revSend.R.subarray(0, N - pre), pre);
      G.convolve(tmp, S.irR, rev.R, 0.055);
      E.mulEnv(rev, duck, 0.45);
      keep("PLATE SEND", rev, LV.rev, true);
      E.mix(main, rev, LV.rev);
      rev = null;
    }
    await tick(0.84, "mixdown");
    keep("FX", fx, 1, true);
    E.mix(main, fx, 1);
    wall(main);
    {
      const n = BARS * 16 + 1,
        a = new Float32Array(n),
        g = new Float32Array(n);
      for (let k = 0; k < n; k++) {
        const t = (k * BAR) / 16;
        a[k] = wallFc(t);
        g[k] = wallG(t);
      }
      view.auto["WALL LP"] = { v: a, lo: 150, hi: 2e4, log: 1, unit: "Hz" };
      view.auto["WALL GAIN"] = { v: g, lo: 0, hi: 1, unit: "" };
      const bf = new Float32Array(n);
      const per = (BAR * SR) / 16 / 16;
      for (let k = 0; k < n - 1; k++) {
        let m = 0;
        for (let c = Math.floor(k * per); c < (k + 1) * per && c < fcArr.length; c++)
          if (fcArr[c] > m) m = fcArr[c];
        bf[k] = m;
      }
      view.auto["BASS FILTER"] = { v: bf, lo: 150, hi: 3e3, log: 1, unit: "Hz" };
    }
    E.mix(main, fore, 1.3);
    await tick(0.88, "cut-ups");
    cutUps(E, main);
    await tick(0.92, "master");
    tone(main);
    const comp = compCurve(main, -9, 2, 12, 140, 1.2, 120);
    applyCurve(main, comp.curve, COMP_DEC);
    for (const ch of [main.L, main.R]) softClip(ch, CLIP[0], CLIP[1]);
    const lim = limitCurve(main, -1.4, 3, 70);
    applyCurve(main, lim.curve, LIM_DEC);
    await tick(1, "done");
    return {
      L: main.L,
      R: main.R,
      comp: comp.curve,
      lim: lim.curve,
      clip: CLIP,
      dec: [COMP_DEC, LIM_DEC],
      info: { compGR: +comp.most.toFixed(3), limMin: +lim.least.toFixed(3) },
    };
  }
  const api = { render, title: "life is but a", BPM, SWING, BARS, TAIL, SEC, MARKS };
  return api;
};
