export const songModule = function () {
  "use strict";
  const BPM = 175,
    SWING = 0.5,
    BARS = 212,
    TAIL = 6.5;
  const SEC = {
    intro: [0, 16],
    day1: [16, 48],
    dusk: [48, 56],
    days: [56, 88],
    museum: [88, 112],
    street: [112, 144],
    again: [144, 184],
    last: [184, 212],
  };
  const MARKS = [
    [0, "\u8D70\u3063\u3066\u5E30\u308B"],
    [16, "2\u6642\u9593"],
    [32, "\u6B21\u306E\u8A66\u5408"],
    [48, "\u307E\u305F\u660E\u65E5"],
    [56, "\u6B21\u306E\u65E5"],
    [72, "\u305D\u306E\u6B21\u306E\u65E5"],
    [80, "\u6BCE\u65E5"],
    [88, "\u7F8E\u8853\u9928"],
    [104, "\u3072\u3068\u308A"],
    [112, "\u5E30\u308A\u9053"],
    [128, "\u540C\u3058\u65E5"],
    [144, "\u3042\u306E\u3053\u308D"],
    [160, "\u305A\u3063\u3068\u7D9A\u304F"],
    [184, "\u307E\u305F\u660E\u65E5"],
    [200, "\u6700\u5F8C\u306E\u65E5"],
  ];
  function open(G, S, META, opt) {
    opt = opt || {};
    const SR = G.SR,
      st2r = G.st2r,
      curve = G.curve,
      svf = G.svf,
      biquad = G.biquad,
      clamp = G.clamp;
    const E = G.make(S, META, (BARS * 240) / BPM + TAIL, BPM, SWING, opt.log);
    const { N, T16, BAR, tt } = E;
    const rnd = G.rng(20081);
    const ix = (t) => Math.round(t * SR);
    const CH = {
      F: {
        n: "F",
        r: 29,
        f: 36,
        o: 41,
        ap: 33,
        lo: [57, 60, 64, 67],
        hi: [60, 64, 67, 69],
        lh: 48,
        st: [48, 64, 69],
        vb: [72, 76, 79, 81],
      },
      G: {
        n: "G",
        r: 31,
        f: 38,
        o: 43,
        ap: 35,
        lo: [59, 62, 64, 67],
        hi: [62, 64, 67, 69],
        lh: 47,
        st: [47, 62, 69],
        vb: [74, 76, 79, 81],
      },
      Em: {
        n: "Em",
        r: 28,
        f: 35,
        o: 40,
        ap: 35,
        lo: [57, 62, 64, 67],
        hi: [59, 62, 64, 67],
        lh: 47,
        st: [47, 62, 71],
        vb: [74, 76, 79, 83],
      },
      Am: {
        n: "Am",
        r: 33,
        f: 40,
        o: 45,
        ap: 31,
        lo: [55, 60, 64, 67],
        hi: [60, 64, 67, 72],
        lh: 52,
        st: [45, 64, 72],
        vb: [72, 76, 79, 84],
      },
      E7: {
        n: "E7/G\u266F",
        r: 32,
        f: 35,
        o: 44,
        ap: 32,
        lo: [59, 62, 64],
        hi: [62, 64, 71],
        lh: 50,
        st: [47, 64, 71],
        vb: [71, 74, 76, 83],
      },
      Emc: {
        n: "Em",
        r: 28,
        f: 35,
        o: 40,
        ap: 35,
        lo: [57, 62, 64, 67],
        hi: [57, 62, 64, 67],
        lh: 50,
        st: [50, 64, 67],
        vb: [74, 76, 79, 81],
      },
      Am2: {
        n: "Am",
        r: 33,
        f: 40,
        o: 45,
        ap: 31,
        lo: [57, 60, 64, 67],
        hi: [60, 64, 67, 69],
        lh: 52,
        st: [48, 64, 69],
        vb: [72, 76, 79, 83],
      },
      Ce: {
        n: "C/E",
        r: 28,
        f: 36,
        o: 40,
        ap: 31,
        lo: [55, 60, 62, 67],
        hi: [62, 64, 67, 72],
        lh: 48,
        st: [48, 62, 67],
        vb: [74, 76, 79, 84],
      },
      Amd: {
        n: "Am",
        r: 33,
        f: 40,
        o: 45,
        ap: 31,
        lo: [55, 60, 64, 67],
        hi: [60, 64, 67, 71],
        lh: 52,
        st: [48, 64, 67],
        vb: [72, 76, 79, 84],
      },
      Fd: {
        n: "F",
        r: 29,
        f: 36,
        o: 41,
        ap: 33,
        lo: [53, 60, 64, 67],
        hi: [60, 64, 67, 69],
        lh: 48,
        st: [48, 64, 69],
        vb: [72, 76, 79, 81],
      },
      Dm: {
        n: "Dm",
        r: 38,
        f: 33,
        o: 38,
        ap: 38,
        lo: [53, 60, 64, 69],
        hi: [57, 60, 64, 71],
        lh: 50,
        st: [45, 64, 69],
        vb: [72, 76, 77, 81],
      },
      Gs: {
        n: "Gsus",
        r: 31,
        f: 38,
        o: 43,
        ap: 31,
        lo: [53, 60, 62, 69],
        hi: [60, 62, 65, 69],
        lh: 50,
        st: [48, 65, 69],
        vb: [72, 74, 77, 81],
      },
      Fc: {
        n: "F",
        r: 29,
        f: 36,
        o: 41,
        ap: 33,
        lo: [57, 60, 62, 67],
        hi: [57, 60, 62, 67],
        lh: 48,
        st: [48, 62, 69],
        vb: [72, 74, 79, 81],
      },
      Gc: {
        n: "G",
        r: 31,
        f: 38,
        o: 43,
        ap: 35,
        lo: [57, 62, 64, 67],
        hi: [62, 64, 67, 69],
        lh: 50,
        st: [50, 62, 69],
        vb: [74, 76, 79, 81],
      },
      Gs2: {
        n: "Gsus",
        r: 31,
        f: 38,
        o: 43,
        ap: 31,
        lo: [60, 62, 65, 69],
        hi: [60, 62, 65, 69],
        lh: 50,
        st: [50, 60, 65],
        vb: [72, 74, 77, 81],
      },
      G2: {
        n: "G",
        r: 31,
        f: 38,
        o: 43,
        ap: 33,
        lo: [55, 59, 62, 67],
        hi: [55, 59, 62, 67],
        lh: 47,
        st: [50, 59, 67],
        vb: [74, 76, 79, 83],
      },
      Ab: { n: "A\u266D", r: 32 },
      A: { n: "A", r: 33 },
    };
    const RR = [
      ["F", "G", "Em", "Am"],
      ["F", "G", "E7", "Am"],
      ["F", "G", "Em", "Am"],
      ["F", "G", "Am2", "Ce"],
    ];
    const D1V = [0, 1, 0, 3, 0, 1, 2, 0],
      D2V = [0, 3, 1],
      AGV = [0, 1, 0, 3, 0, 1, 2, 3, 0, 0];
    const loop = (row, b) => {
      const c = RR[row][b & 3];
      return c === "Em" && (b === 6 || b === 46 || b >= 180) ? "Emc" : c;
    };
    function chordName(b, s) {
      s = s || 0;
      if (b < 16) return loop(0, b);
      if (b < 48) return loop(D1V[(b - 16) >> 2], b);
      if (b < 56) return ["Amd", "Amd", "Fd", "Fd", "Dm", "Dm", "Gs", "Gs"][b - 48];
      if (b < 68) return loop(D2V[(b - 56) >> 2], b);
      if (b < 72) return ["Amd", "Fd", "Dm", "Gs"][b - 68];
      if (b < 76) return loop(0, b);
      if (b < 78) return ["F", "G"][b - 76];
      if (b < 80) return ["Amd", "Gs"][b - 78];
      if (b < 83) return ["F", "G", "Em"][b - 80];
      if (b === 83) return "Amd";
      if (b === 84) return s < 8 ? "F" : "G";
      if (b === 85) return s < 8 ? "Em" : "Am";
      if (b < 88) return ["F", "G", "Em", "Am"][Math.min(3, s >> 2)];
      if (b < 112) return "Ab";
      if (b < 132) return "A";
      if (b < 136) return "Fc";
      if (b < 140) return "Gc";
      if (b < 142) return "Gs2";
      if (b < 144) return "G2";
      if (b < 184) return loop(AGV[(b - 144) >> 2], b);
      return loop(0, b);
    }
    const view = opt.view || {};
    view.tt = tt;
    view.T16 = T16;
    view.BAR = BAR;
    view.auto = {};
    view.roots = Array.from({ length: BARS }, (_, b) => CH[chordName(b)].r);
    view.chords = Array.from({ length: BARS }, (_, b) => CH[chordName(b)].n);
    view.keyShift = Array.from({ length: BARS }, () => 0);
    const EV = new Map();
    const trk = (key) => (key.slice(0, 2) === "m:" ? key.slice(2) : key);
    function Q(key, x, t, o) {
      if (t < 0 && t > -0.01) t = 0;
      if (!(t >= 0)) return;
      let a = EV.get(key);
      if (!a) EV.set(key, (a = []));
      a.push([x, t, o || {}]);
    }
    function near(group, midi) {
      const g = E.groups[group];
      let best = g[0];
      for (const s of g) if (Math.abs(s.key - midi) < Math.abs(best.key - midi)) best = s;
      return best;
    }
    function NQ(key, group, midi, t, o) {
      const s = near(group, midi);
      const o2 = Object.assign({}, o);
      o2.semi = (o2.semi || 0) + midi - s.key;
      Q(key, s.name, t, o2);
    }
    function flushInto(b, key) {
      const a = EV.get(key) || [];
      for (const e of a) E.paste(b, e[0], e[1], e[2]);
      EV.delete(key);
      return b;
    }
    function flush(key, name, mono) {
      return flushInto(E.bus(mono, name), key);
    }
    const kT = [],
      sT = [],
      EDITS = [],
      DEDITS = [];
    let snN = 0,
      ghN = 0,
      hN = 0,
      rN = 0,
      kN = 0;
    function kick(t, v, heavy) {
      kT.push(t);
      Q("KICK", "k1", t, { g: 0.82 * v, semi: 4, dur: 0.2, r: 0.08 });
      Q("KICK", kN++ & 1 ? "kB" : "kA", t, { g: 0.4 * v, hp: 95, dur: 0.1, r: 0.04 });
      Q("KICK", "kM", t, { g: 0.3 * v, hp: 110, lp: 1900, dur: 0.16, r: 0.06 });
      if (heavy) Q("KICK", "kJ", t, { g: 0.42 * v, dur: 0.24, r: 0.08, drive: 1.7 });
    }
    function snare(t, v, o) {
      o = o || {};
      sT.push(t);
      const rr = ["snA", "snB", "snC"][snN++ % 3];
      const tune = (o.heavy ? 0.2 : 2) + (rnd() - 0.5) * 0.24;
      Q("SNARE", rr, t, { g: 0.8 * v, semi: tune, dur: 0.3, r: 0.12 });
      Q("SNARE", "snJ", t, { g: 0.3 * v, hp: 420, dur: 0.24, r: 0.09, pan: 0.1 });
      Q("SNARE", "cl1", t - 3e-3, { g: 0.2 * v, hp: 750, dur: 0.2, r: 0.08, pan: -0.12 });
      Q("SNARE", "rim", t, { g: 0.16 * v, hp: 500, dur: 0.08, r: 0.03 });
      if (o.heavy)
        Q("SNARE", "snR", t, { g: 0.3 * v, hp: 200, dur: 0.25, r: 0.1, pan: -0.05 });
      if (o.clap) {
        Q("SNARE", "clr1", t - 7e-3, {
          g: 0.2 * v * o.clap,
          hp: 500,
          dur: 0.22,
          r: 0.08,
          pan: -0.55,
        });
        Q("SNARE", "clr2", t + 5e-3, {
          g: 0.2 * v * o.clap,
          hp: 500,
          dur: 0.22,
          r: 0.08,
          pan: 0.55,
        });
      }
      Q("@plate:SNARE", rr, t, {
        g: (o.heavy ? 0.16 : 0.1) * v,
        semi: tune,
        hp: 400,
        dur: 0.2,
        r: 0.06,
      });
    }
    function ghost(t, v, o) {
      o = o || {};
      Q("SNARE", ["gh1", "gh2", "gh3", "gh4"][ghN++ & 3], t + (rnd() - 0.4) * 4e-3, {
        g: 0.34 * v * (0.85 + 0.3 * rnd()),
        semi: 2 + (o.semi || 0),
        dur: 0.13,
        r: 0.05,
        pan: 0.08,
      });
    }
    function hat(t, v, o) {
      o = o || {};
      if (o.loose && v > 0.6 && rnd() < o.loose) {
        Q("HATS", hN++ & 1 ? "hlo1" : "hlo2", t, {
          g: 0.2 * v,
          pan: -0.2,
          dur: 0.13,
          r: 0.05,
          hp: 3500,
        });
        return;
      }
      const set = v > 0.72 ? "hl" : v > 0.42 ? "hm" : "hs";
      Q("HATS", set + (1 + (hN++ % 3)), t + (rnd() - 0.5) * 3e-3, {
        g: 0.36 * v * (0.88 + 0.24 * rnd()),
        pan: -0.24 + 0.08 * rnd() + (o.pan || 0),
        dur: 0.1,
        r: 0.035,
        hp: 4200,
        semi: o.semi || 0,
      });
    }
    function ohat(t, v, steps) {
      Q("HATS", "hop", t, { g: 0.24 * v, pan: 0.2, dur: steps * T16, r: 0.035, hp: 3600 });
    }
    function ride(t, v, bell, jazz) {
      if (jazz) {
        Q("HATS", "jr1", t + (rnd() - 0.5) * 4e-3, {
          g: 0.2 * v,
          pan: 0.3,
          dur: 0.7,
          r: 0.3,
          hp: 700,
        });
        return;
      }
      Q("HATS", bell ? "rbell" : rN++ & 1 ? "rd2" : "rd1", t + (rnd() - 0.5) * 3e-3, {
        g: (bell ? 0.17 : 0.2) * v,
        pan: 0.32,
        dur: 0.55,
        r: 0.25,
        hp: 1100,
      });
    }
    function shaker(b, lvl, s0, s1) {
      for (let s = s0; s < s1; s++) {
        const acc = s % 4 === 2 ? 1 : s & 1 ? 0.7 : 0.45;
        Q("PERC", s & 1 ? "shU" : "shD", tt(b, s) + (rnd() - 0.5) * 5e-3, {
          g: 0.2 * lvl * acc * (0.85 + 0.3 * rnd()),
          pan: 0.44,
          dur: 0.1,
          r: 0.03,
          hp: 2400,
        });
      }
    }
    const PERC = {
      h: ["cgH", -0.34, 0.3],
      m: ["cgM", -0.2, 0.3],
      t: ["tum", -0.42, 0.34],
      b: ["bgH", 0.36, 0.26],
      l: ["bgL", 0.28, 0.28],
      T: ["tamb", 0.5, 0.2],
      c: ["cab", -0.5, 0.2],
      i: ["tri", -0.55, 0.14],
      k: ["stk", 0.22, 0.26],
      r: ["rim", 0.12, 0.3],
    };
    function perc(c, t, v, o) {
      const p = PERC[c];
      o = o || {};
      Q("PERC", p[0], t + (rnd() - 0.5) * 4e-3, {
        g: p[2] * v * (0.85 + 0.3 * rnd()),
        pan: p[1],
        semi: o.semi || 0,
        dur: o.dur,
        r: 0.05,
      });
      if (c === "i" || c === "h" || c === "t")
        Q("@plate:PERC", p[0], t, { g: p[2] * v * 0.25, semi: o.semi || 0, dur: 0.3 });
    }
    function crash(t, v, o) {
      o = o || {};
      Q("FX", "cr1", t, {
        g: 0.36 * v,
        pan: o.pan === void 0 ? -0.18 : o.pan,
        hp: 350,
        dur: 2.1,
        r: 0.8,
        semi: o.semi || 0,
        lp: o.lp,
      });
      Q("@plate:FX", "cr1", t, { g: 0.07 * v, hp: 600, dur: 1.2, r: 0.5, semi: o.semi || 0 });
    }
    function swell(t, len, v, o) {
      o = o || {};
      const L = S.cymrev.length / SR;
      len = Math.min(len, L);
      Q("FX", "cymrev", t - len, {
        off: L - len,
        g: 0.3 * v,
        a: len * 0.5,
        r: 0.01,
        dur: len,
        hp: o.hp || 500,
        pan: o.pan || 0.1,
      });
    }
    function snrevInto(t, g) {
      const L = S.snrev.length / SR;
      Q("SNARE", "snrev", t - L + 0.02, { g: 0.3 * (g || 1), hp: 300, pan: 0.2, r: 0.01 });
      Q("@plate:SNARE", "snrev", t - L + 0.02, { g: 0.08 * (g || 1), hp: 500 });
    }
    function pressRoll(t1, len, g) {
      Q("SNARE", "sroll", t1 - len, {
        g: 0.5 * g,
        dur: len,
        a: len * 0.85,
        r: 0.02,
        hp: 160,
      });
      Q("@plate:SNARE", "sroll", t1 - len, {
        g: 0.1 * g,
        dur: len,
        a: len * 0.85,
        r: 0.02,
        hp: 400,
      });
    }
    function roll(b, a, z, o) {
      o = o || {};
      let s = a,
        k = 0;
      while (s < z - 1e-6) {
        const x = (s - a) / (z - a);
        const d = o.acc ? (x < 0.5 ? 1 : x < 0.82 ? 0.5 : 0.25) : o.div || 1;
        const g0 = o.g0 === void 0 ? 0.22 : o.g0,
          g1 = o.g1 === void 0 ? 0.7 : o.g1;
        Q("SNARE", ["snA", "snB", "snC"][k % 3], tt(b, s), {
          g: g0 + (g1 - g0) * x,
          semi: 2 + (o.rise || 0) * x,
          dur: 0.11,
          r: 0.04,
          pan: k & 1 ? 0.16 : -0.16,
          hp: 140 + (o.hpRise || 0) * x,
        });
        s += d;
        k++;
      }
    }
    const PT = {
      k2: "9.........9.....",
      k2a: "9......5..9.....",
      k2b: "9..5......9.....",
      k2c: "9.........9..5..",
      k2d: "9.....6...9.....",
      k2e: "9.........96....",
      k2f: "9.6.......9.....",
      kh: "9...............",
      k4: "9.......7.......",
      s2: "....9.......9...",
      s2a: "....9.......9..5",
      s2b: "....9..4....9...",
      sh: "........9.......",
      g1: ".......3.3.....3",
      g2: "......2..4...2.3",
      g3: ".2.....3.3....2.",
      g4: ".......4.2.3...2",
      g5: "..2....3.2.4..23",
      hA: "6.3.6.3.6.3.6.3.",
      hB: "4.7.4.7.4.7.4.7.",
      hC: "6.36.36.6.36.36.",
      hD: "6336633663366336",
      hE: "7.2.5.2.7.2.5.24",
      hF: "5.2.5.2.5.2.5.2.",
      fA: "....6.......6...",
      oA: "..6.......6.....",
      oB: "......6.......6.",
      oC: "..5...5...5...5.",
      rA: "7...6...7...6...",
      rB: "7.4.6.4.7.4.6.4.",
      rC: "9.4.6.4.7.4.6.5.",
      p1: "...h..m....t..h.",
      p2: "..h....m..t..h.m",
      p3: ".b.l..b....l.b..",
      p4: "..T...T...T...T.",
      p5: "...h..mb...t.lh.",
      p6: "....k.....k..k..",
      p7: ".....i........i.",
      p8: "..c.c...c.c..c.c",
    };
    function groove(b, o) {
      const s0 = o.s0 || 0,
        s1 = o.s1 === void 0 ? 16 : o.s1;
      const each = (id, fn) => {
        if (!id) return;
        const str2 = PT[id] || id;
        for (let s = s0; s < s1; s++) {
          const c = str2[s];
          if (c && c !== ".") fn(s, c);
        }
      };
      each(o.k, (s, c) => kick(tt(b, s), (+c / 9) * (o.kv || 1), o.heavy));
      each(o.sn, (s, c) => snare(tt(b, s), (+c / 9) * (o.sv || 1), o));
      each(o.gh, (s, c) => ghost(tt(b, s), (+c / 9) * 1.6));
      each(o.hat, (s, c) => hat(tt(b, s), (+c / 9) * (o.hv || 1), o));
      each(o.ft, (s, c) =>
        Q("HATS", "hft", tt(b, s), { g: (0.2 * +c) / 9, pan: -0.15, hp: 1500, dur: 0.2 }),
      );
      each(o.oh, (s, c) => ohat(tt(b, s), +c / 9, 1.8));
      each(o.rd, (s, c) => ride(tt(b, s), (+c / 9) * (o.rv || 1), c === "9", o.jazz));
      if (o.shk) shaker(b, o.shk, s0, s1);
      for (const id of o.pc || []) each(id, (s, c) => perc(c, tt(b, s), o.pv || 1));
    }
    const BK = {};
    const BARS_OF = { amen: 4, unfa: 1, tich: 2, tichfill: 1, tama: 2 };
    function bk(id) {
      if (!BK[id]) {
        const len = S[id].length / SR;
        BK[id] = {
          n: id,
          bars: BARS_OF[id],
          step: len / (BARS_OF[id] * 16),
          rate: len / (BARS_OF[id] * BAR),
        };
      }
      return BK[id];
    }
    const HITS = {
      amen: [
        20,
        null,
        19,
        -39,
        -2,
        null,
        1,
        9,
        2,
        -1,
        14,
        11,
        0,
        null,
        1,
        0,
        19,
        null,
        22,
        -36,
        -2,
        null,
        2,
        1,
        1,
        8,
        14,
        21,
        4,
        null,
        1,
        4,
        14,
        10,
        16,
        null,
        -1,
        null,
        1,
        7,
        1,
        7,
        19,
        -32,
        1,
        null,
        -7,
        null,
        1,
        7,
        20,
        21,
        2,
        null,
        1,
        3,
        -2,
        2,
        15,
        null,
        26,
        null,
        2,
        null,
      ],
      tich: [
        2,
        null,
        null,
        5,
        1,
        null,
        null,
        -2,
        2,
        4,
        null,
        null,
        1,
        null,
        null,
        null,
        2,
        null,
        null,
        1,
        1,
        null,
        null,
        null,
        2,
        1,
        null,
        null,
        1,
        null,
        null,
        null,
      ],
      unfa: [1, -23, 18, -24, 28, null, -16, 24, 12, 27, 22, 40, 42, null, -32, -2],
      tama: [
        1,
        null,
        -4,
        null,
        5,
        null,
        30,
        8,
        null,
        -38,
        6,
        8,
        -6,
        null,
        19,
        null,
        7,
        31,
        3,
        null,
        4,
        null,
        31,
        8,
        null,
        13,
        8,
        8,
        -6,
        null,
        19,
        null,
      ],
      tichfill: [1, 0, 4, null, -2, null, -2, 2, -1, null, 4, null, -4, 4, 6, 0],
    };
    function brk(b, id, sb, pat, o) {
      o = o || {};
      const B = bk(id);
      const H = HITS[id];
      const s0 = o.s0 || 0,
        s1 = o.s1 === void 0 ? 16 : o.s1;
      let s = 0;
      const cuts = [];
      while (s < 16) {
        const c = pat[s];
        if (c === void 0 || c === "." || c === "-") {
          s++;
          continue;
        }
        const src = parseInt(c, 16);
        let n = 1;
        while (
          s + n < 16 &&
          (pat[s + n] === "-" || (src + n < 16 && parseInt(pat[s + n], 16) === src + n))
        )
          n++;
        let cur = null;
        for (let j = 0; j < n; j++) {
          const k = ((sb % B.bars) * 16 + src + j) % (B.bars * 16);
          const d = H[k];
          if (j === 0 || (d !== null && Math.abs(d - cur.d) >= 5)) {
            cur = { s: s + j, k, d: d === null ? 0 : d, n: 1 };
            cuts.push(cur);
          } else cur.n++;
        }
        s += n;
      }
      for (const c of cuts) {
        const a = Math.max(c.s, s0),
          z = Math.min(c.s + c.n, s1);
        if (z <= a) continue;
        const lead = a === c.s ? 15e-4 : 0;
        Q(o.key || "BREAK", B.n, tt(b, a) - lead / (B.rate * (o.rate || 1)), {
          off: Math.max(0, (c.k + (a - c.s)) * B.step + (a === c.s ? c.d / 1e3 : 0) - lead),
          rate: B.rate * (o.rate || 1),
          dur: (z - a) * T16 + 7e-3,
          a: 15e-4,
          r: 0.012,
          g: o.g === void 0 ? 1 : o.g,
          pan: o.pan || 0,
          hp: o.hp,
          lp: o.lp,
          drive: o.drive,
        });
      }
    }
    const BP = {
      S0: "0---------------",
      S1: "0-------a9a-c---",
      S2: "0-----------cd67",
      S3: "0---------a2c---",
      S4: "2-0-4-----------",
      S5: "0---49678-------",
      S6: "0-------8-a-c-ef",
      S7: "0-2-4-67a-a-c-e-",
      J1: "0-2-4-674-a-c-ef",
      J2: "0-0-4-6-a-2-c-cd",
      J3: "0-234-6-a-ab4-c-",
      J4: "2-2-4-674-4-c-ef",
      J5: "0-2-c-674-a-c-cc",
      F0: "0-----------cdcd",
      F1: "0-------cdcdcccc",
      F2: "0-------0-2-cdef",
      F3: "0-0-4-4-0044cccc",
      F4: "0-----6767674444",
    };
    function subNote(m, t, dur, g, pitch, key) {
      Q(key || "SUB", "gb_c3", t, {
        semi: m - 36.02,
        g,
        dur,
        a: 6e-3,
        r: 0.03,
        lp: 440 * Math.pow(2, (m - 69) / 12) * 1.35,
        pitch,
      });
    }
    function bassNote(m, t, steps, o) {
      o = o || {};
      const dur = Math.max(0.05, steps * T16 - 0.012);
      const g = o.g === void 0 ? 1 : o.g;
      const grp = o.hard ? "gbff" : "gb";
      subNote(m, t, dur, 0.9 * g, o.pitch);
      NQ("BASS", grp, m, t, {
        g: 0.62 * g,
        dur,
        a: 4e-3,
        r: 0.035,
        hp: 130,
        lp: o.lp || 2600,
        pitch: o.pitch,
        pan: 0,
      });
      if (o.pluck !== 0)
        NQ("BASS", "mb", m + 12, t, {
          g: 0.42 * g * (o.pluck || 1),
          dur: Math.min(dur, 0.32),
          dec: 0.16,
          r: 0.05,
          hp: 160,
          lp: 3200,
          pan: 0.06,
        });
    }
    function bass(b, variant, o) {
      o = o || {};
      const s0 = o.s0 || 0,
        s1 = o.s1 === void 0 ? 16 : o.s1;
      const out = [];
      const add = (s, len, m, x) => {
        const c = CH[chordName(b, s)];
        out.push([
          s,
          len,
          m === "r" ? c.r : m === "5" ? c.f : m === "8" ? c.o : m === "a" ? c.ap : m,
          x,
        ]);
      };
      if (variant === 0) {
        add(0, 6, "r");
        add(6, 2, "8");
        add(8, 2, "r");
        add(10, 4, "5");
        add(14, 2, "a");
      } else if (variant === 1) {
        add(0, 3, "r");
        add(4, 2, "r");
        add(7, 3, "8");
        add(10, 3, "5");
        add(14, 2, "a");
      } else if (variant === 2) {
        add(0, 15.6, "r", { pluck: 0.6 });
      } else if (variant === 3) {
        add(0, 2, "r");
        add(3, 2, "r");
        add(6, 2, "8");
        add(8, 2, "r");
        add(11, 2, "5");
        add(14, 2, "a");
      } else if (variant === 4) {
        add(0, 10, "r");
        add(10, 6, "5", {
          pitch: [
            [0, 0],
            [0.3, 0],
            [0.5, -1],
          ],
        });
      } else if (variant === 5) {
        add(0, 4, "r");
        add(4, 4, "r");
        add(8, 4, "r");
        add(12, 4, "r");
      } else if (variant === 6) {
        add(0, 6, "r");
        add(6, 2, "8");
        add(8, 1, "r");
        add(9, 1, "8");
        add(10, 3, "5");
        add(13, 1, "5");
        add(14, 2, "a");
      }
      for (const [s, len, m, x] of out) {
        if (s < s0 || s >= s1) continue;
        bassNote(m, tt(b, s), Math.min(len, s1 - s), Object.assign({ g: o.g }, x || {}));
      }
    }
    function reese(m, t, steps, o) {
      o = o || {};
      const dur = steps * T16 - 0.01;
      const g = o.g === void 0 ? 1 : o.g;
      for (const [det, pan] of [
        [-0.15, -0.65],
        [0.15, 0.65],
        [0.02, 0],
      ])
        Q("BASS", "b_thick", t, {
          semi: m - 35.93 + det,
          dur,
          a: 5e-3,
          r: 0.03,
          g: 0.34 * g,
          pan,
          hp: 120,
          lp: o.lp || 800,
          lpEnd: o.lpEnd,
          q: 1.3,
          drive: 1.9,
        });
      subNote(m, t, dur, 0.92 * g);
    }
    function rh(key, t, steps, v, o) {
      o = o || {};
      const bark = v > 0.78 && key <= 74;
      NQ(o.key || "RHODES", bark ? "rh4" : "rh2", key, t, {
        g: (bark ? 0.62 : 0.78) * v * (o.g || 1),
        dur: steps * T16,
        r: o.r || 0.1,
        a: 2e-3,
        pan: clamp((key - 62) / 28, -0.42, 0.42) + (o.pan || 0),
        lp: o.lp,
      });
    }
    function chord(keys, t, steps, v, o) {
      keys.forEach((k, i) =>
        rh(
          k,
          t + i * 4e-3 + rnd() * 3e-3,
          steps,
          v * (i === keys.length - 1 ? 1 : (0.84 + 0.1 * rnd()) * (k < 57 ? 0.9 : 1)),
          o,
        ),
      );
    }
    const RP = {
      R1: [
        [0, 5, 0.9, 0],
        [6, 3, 0.6, 0],
        [10, 3, 0.75, 0],
        [14, 2.2, 0.85, 1],
      ],
      R2: [
        [0, 2, 0.8, 0],
        [3, 2, 0.6, 0],
        [6, 6, 0.85, 0],
        [14, 2.2, 0.8, 1],
      ],
      R3: [
        [2, 1.6, 0.7, 0],
        [6, 1.6, 0.8, 0],
        [10, 1.6, 0.7, 0],
        [14, 1.8, 0.88, 1],
      ],
      R4: [[0, 15, 0.8, 0]],
      R5: [
        [0, 3, 0.88, 0],
        [3, 3, 0.7, 0],
        [6, 3, 0.8, 0],
        [9, 3, 0.65, 0],
        [12, 2, 0.75, 0],
        [14, 2.2, 0.85, 1],
      ],
      R6: [
        [0, 1.4, 0.9, 0],
        [3, 1.4, 0.7, 0],
        [6, 1.4, 0.8, 0],
        [8, 1.2, 0.6, 0],
        [11, 1.4, 0.75, 0],
        [14, 1.8, 0.88, 1],
      ],
      R7: [
        [0, 7, 0.82, 0],
        [8, 5, 0.7, 0],
        [14, 2.2, 0.8, 1],
      ],
    };
    function comp(b, pid, o) {
      o = o || {};
      const s0 = o.s0 || 0,
        s1 = o.s1 === void 0 ? 16 : o.s1;
      for (const [s, len, v, nx] of RP[pid]) {
        if (s < s0 || s >= s1) continue;
        const c = CH[nx ? chordName(b + 1, 0) : chordName(b, s)];
        chord(o.voic === "hi" ? c.hi : c.lo, tt(b, s), len, v * (o.g || 1), o);
      }
      if (o.lh) {
        const c = CH[chordName(b, 0)];
        rh(c.lh, tt(b, 0), 6, 0.5 * (o.g || 1), o);
      }
    }
    function vb(m, t, g, o) {
      o = o || {};
      NQ(o.key || "VIBES", "vb", m, t + rnd() * 4e-3, {
        g,
        dur: o.dur || 1.5,
        dec: o.dec || 0.8,
        r: 0.3,
        pan: clamp((m - 76) / 18, -0.5, 0.5) + (o.pan || 0),
      });
    }
    const VP1 = [
      [
        [2, 81],
        [5, 79],
        [8, 76],
        [11, 72],
        [14, 74],
      ],
      [
        [0, 74],
        [3, 76],
        [6, 79],
        [10, 83],
        [12, 81],
      ],
      [
        [2, 79],
        [5, 76],
        [8, 74],
        [11, 71],
        [14, 74],
      ],
      [
        [0, 76],
        [3, 72],
        [6, 76],
        [8, 81],
        [12, 79],
        [14, 76],
      ],
    ];
    const VP3 = [
      [
        [0, 72],
        [6, 76],
        [12, 79],
      ],
      [
        [2, 74],
        [8, 79],
        [14, 83],
      ],
      [
        [0, 79],
        [6, 74],
        [10, 71],
      ],
      [
        [0, 72],
        [4, 76],
        [8, 79],
        [12, 84],
      ],
    ];
    function vibes(b, variant, g) {
      g = g === void 0 ? 1 : g;
      const cn = chordName(b, 0);
      const fix = (m) =>
        cn === "E7" && m % 12 === 7
          ? m - 3
          : (cn === "Emc" || cn === "Am2") && m % 12 === 11
            ? m - 2
            : m;
      if (variant === 1) for (const [s, m] of VP1[b & 3]) vb(fix(m), tt(b, s), 0.5 * g);
      else if (variant === 3)
        for (const [s, m] of VP3[b & 3]) vb(fix(m), tt(b, s), 0.5 * g, { dur: 2, dec: 1.1 });
      else if (variant === 2) {
        const c = CH[cn].vb;
        const seq = [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 3, 2, 1, 2];
        for (let s = 0; s < 16; s++) {
          if ((s * 7 + b * 3) % 11 === 0) continue;
          vb(c[seq[s]], tt(b, s), (s % 3 === 0 ? 0.42 : 0.26) * g, { dur: 0.5, dec: 0.3 });
        }
      }
    }
    function str(key, m, t, dur, g, o) {
      o = o || {};
      const a = near("vc", m),
        z = near("vn", m);
      const s = Math.abs(a.key - m) <= Math.abs(z.key - m) ? a : z;
      Q(key, s.name, t, {
        semi: m - s.key + (o.det || 0),
        g,
        dur,
        a: o.a === void 0 ? 0.16 : o.a,
        r: o.r === void 0 ? 0.4 : o.r,
        pan: o.pan === void 0 ? clamp((m - 60) / 30, -0.5, 0.5) : o.pan,
        lp: o.lp,
      });
    }
    function strBar(b, lvl, top) {
      const c = CH[chordName(b, 0)];
      const L = BAR + 0.35;
      str("STRINGS", c.st[0], tt(b, 0), L, 0.3 * lvl, { pan: -0.2 });
      str("STRINGS", c.st[1], tt(b, 0) + 0.02, L, 0.34 * lvl, { pan: 0.35 });
      str("STRINGS", c.st[2], tt(b, 0) + 0.03, L, 0.38 * lvl, { pan: -0.4 });
      if (top) str("STRINGS", top, tt(b, 0) + 0.04, L, 0.26 * lvl, { pan: 0.5, a: 0.22 });
    }
    function glass(key, m, t, g, o) {
      o = o || {};
      NQ(key, "gl", m, t, {
        g,
        a: o.a === void 0 ? 0.3 : o.a,
        r: 1,
        dur: o.dur || 3.4,
        pan: o.pan || 0,
      });
    }
    function bowed(key, m, t, g, o) {
      o = o || {};
      Q(key, "vbow_G3", t, {
        semi: m - 66.99,
        g,
        a: o.a === void 0 ? 0.4 : o.a,
        r: 1.2,
        dur: o.dur || 4.2,
        pan: o.pan || 0,
      });
    }
    const stCache = new Map();
    function stable(smp, n) {
      const id = smp + n[0];
      if (stCache.has(id)) return stCache.get(id);
      const pt = META[smp].pt;
      let r = n[0] + 0.2;
      if (pt) {
        const med = n[2] * 10;
        for (
          let k = Math.round((n[0] + 0.02) / 0.02);
          k < Math.round((n[1] - 0.3) / 0.02);
          k++
        ) {
          let ok = true;
          for (let j = 0; j < 4; j++)
            if (!pt[k + j] || Math.abs(pt[k + j] - med) > 2.5) ok = false;
          if (ok) {
            r = k * 0.02;
            break;
          }
        }
      }
      stCache.set(id, r);
      return r;
    }
    function pitchOf(smp, a, z, fb) {
      const pt = META[smp].pt;
      if (!pt) return fb;
      const v = [];
      for (let k = Math.round(a / 0.02); k <= Math.round(z / 0.02); k++)
        if (pt[k]) v.push(pt[k]);
      if (v.length < 2) return fb;
      v.sort((p, q) => p - q);
      return v[v.length >> 1] / 10;
    }
    function vx(key, smp, midi, t, steps, o) {
      o = o || {};
      const ns = META[smp].notes;
      let best = null;
      for (let i = 0; i < ns.length; i++) {
        const n2 = ns[i];
        if (n2[1] - n2[0] < 0.3) continue;
        const d = Math.abs(n2[2] - midi) + ((o.alt ? i < 4 : i >= 4) ? 0.7 : 0);
        if (!best || d < best.d) best = { n: n2, d };
      }
      const n = best.n;
      const off = stable(smp, n) + (o.into || 0);
      const ref = pitchOf(smp, off, off + Math.min(steps * T16, 0.4), n[2]);
      const rate = st2r(midi - ref + (o.fine || 0));
      const dur = Math.max(0.03, Math.min(steps * T16, (n[1] - off - 0.03) / rate));
      const p = {
        off,
        rate,
        dur,
        a: o.a || 4e-3,
        r: o.r || Math.min(0.05, dur * 0.3),
        g: o.g === void 0 ? 1 : o.g,
        pan: o.pan || 0,
        hp: 170,
        m0: ref,
      };
      if (o.pitch) p.pitch = o.pitch;
      if (o.rev) {
        p.rev = 1;
        p.revFrom = off + dur * rate;
        p.a = dur * 0.6;
        p.r = 4e-3;
      }
      Q(key, smp, t, p);
      if (o.dl)
        Q("@dly:" + trk(key), smp, t, Object.assign({}, p, { g: p.g * o.dl, pan: 0 }));
      if (o.pl)
        Q("@plate:" + trk(key), smp, t, Object.assign({}, p, { g: p.g * o.pl, pan: 0 }));
    }
    const FV = "VOX F",
      MV = "VOX M";
    function thread(key, t, dur, g, o) {
      o = o || {};
      const smp = o.u ? "v_f8_lu" : "v_f8_la";
      const m0 = o.u ? 72.3 : 72.2;
      const p = {
        off: 0.15,
        rate: st2r(72 - m0),
        dur: Math.min(dur, 3.9),
        a: o.a || 0.25,
        r: o.r || 0.5,
        g,
        pan: o.pan || 0,
        hp: 200,
        m0,
      };
      Q(key, smp, t, p);
      if (o.pl) Q("@plate:" + trk(key), smp, t, Object.assign({}, p, { g: g * o.pl }));
      if (o.dl) Q("@dly:" + trk(key), smp, t, Object.assign({}, p, { g: g * o.dl }));
    }
    const CR = st2r(-1.9),
      MR = st2r(-2.1);
    function sendV(key, smp, t, p, dl, pl) {
      if (dl) Q("@dly:" + trk(key), smp, t, Object.assign({}, p, { g: p.g * dl, pan: 0 }));
      if (pl) Q("@plate:" + trk(key), smp, t, Object.assign({}, p, { g: p.g * pl, pan: 0 }));
    }
    function callSlow(t, g, o) {
      o = o || {};
      const p = {
        off: 0.09,
        rate: CR,
        dur: o.dur || 2.25,
        a: 0.012,
        r: 0.3,
        g,
        hp: 170,
        m0: 73.9,
        pan: o.pan || 0.12,
      };
      Q(o.key || FV, "v_f8_caro", t, p);
      sendV(
        o.key || FV,
        "v_f8_caro",
        t,
        p,
        o.dl === void 0 ? 0.25 : o.dl,
        o.pl === void 0 ? 0.4 : o.pl,
      );
    }
    function ansSlow(t, g, o) {
      o = o || {};
      const p = {
        off: 2.11,
        rate: MR,
        dur: o.dur || 1.9,
        a: 8e-3,
        r: 0.35,
        g,
        hp: 120,
        m0: 59.2,
        pan: -0.25,
      };
      Q(MV, "v_m6_caro", t, p);
      sendV(
        MV,
        "v_m6_caro",
        t,
        p,
        o.dl === void 0 ? 0.2 : o.dl,
        o.pl === void 0 ? 0.4 : o.pl,
      );
    }
    function callChop(b, s, nCa, nRo, g, o) {
      o = o || {};
      const p1 = {
        off: 0.1,
        rate: CR,
        dur: nCa * T16 + 0.03,
        a: 4e-3,
        r: 0.05,
        g,
        hp: 170,
        m0: 73.9,
        pan: 0.12,
      };
      Q(FV, "v_f8_caro", tt(b, s), p1);
      sendV(FV, "v_f8_caro", tt(b, s), p1, 0.15, 0.2);
      if (nRo) {
        const p2 = {
          off: 1.2,
          rate: CR,
          dur: nRo * T16,
          a: 0.02,
          r: Math.min(0.12, nRo * T16 * 0.4),
          g,
          hp: 170,
          m0: 72.9,
          pan: 0.12,
        };
        Q(FV, "v_f8_caro", tt(b, s + nCa) - 0.02, p2);
        sendV(FV, "v_f8_caro", tt(b, s + nCa) - 0.02, p2, o.dl === void 0 ? 0.3 : o.dl, 0.3);
      }
    }
    function ansChop(b, s, n, g, o) {
      o = o || {};
      const p = {
        off: 2.11,
        rate: MR,
        dur: n * T16,
        a: 6e-3,
        r: Math.min(0.2, n * T16 * 0.4),
        g,
        hp: o.hp || 120,
        m0: 59.2,
        pan: -0.25,
      };
      Q(MV, "v_m6_caro", tt(b, s), p);
      sendV(
        MV,
        "v_m6_caro",
        tt(b, s),
        p,
        o.dl === void 0 ? 0.25 : o.dl,
        o.pl === void 0 ? 0.3 : o.pl,
      );
    }
    const HOOK = [
      [0, 0, 67, 2.6],
      [0, 3, 69, 2.6],
      [0, 6, 72, 6.5],
      [0, 14, 71, 2],
      [1, 0, 69, 5.5],
      [1, 6, 67, 2],
      [1, 8, 64, 3.5],
      [1, 12, 67, 3.5],
      [2, 0, 67, 2.6],
      [2, 3, 69, 2.6],
      [2, 6, 71, 8],
      [3, 0, 72, 8],
    ];
    function hook(b0, o) {
      o = o || {};
      const g = o.g || 1,
        bars = o.bars || 4;
      for (const [bb, s, m, len] of HOOK) {
        if (bb >= bars || bb < (o.from || 0)) continue;
        const k = bb * 16 + s;
        if (o.skip && o.skip.includes(k)) continue;
        const smp =
          o.vowel === "e" || (o.vowel === "mix" && (bb + s) % 3 === 1) ? "v_f8_e" : "v_f8_a";
        const b = b0 + bb;
        if (o.stut && o.stut.includes(k)) {
          for (let i = 0; i < 3; i++)
            vx(FV, smp, m, tt(b, s + i), 0.85, {
              g: g * (0.62 + 0.1 * i),
              pan: i & 1 ? 0.3 : -0.3,
              into: 0.05,
            });
          vx(FV, smp, m, tt(b, s + 3), len - 3, { g, dl: 0.3, pl: 0.2 });
        } else if (o.rev && o.rev.includes(k)) {
          vx(FV, smp, m, tt(b, s) - T16 * 2, 2, { g: g * 0.7, rev: 1, pan: -0.3 });
          vx(FV, smp, m, tt(b, s), len, { g, dl: 0.3, pl: 0.2 });
        } else if (o.oct && o.oct.includes(k)) {
          vx(FV, smp, m + 12, tt(b, s) - T16, 0.9, {
            g: g * 0.45,
            pan: 0.4,
            into: 0.06,
            dl: 0.4,
          });
          vx(FV, smp, m, tt(b, s), len, { g, dl: 0.3, pl: 0.2 });
        } else if (o.chop && o.chop.includes(k)) {
          const nn = Math.floor(len / 2);
          for (let i = 0; i < nn; i++)
            vx(FV, smp, m, tt(b, s + i * 2), 1.5, {
              g: g * (i ? 0.8 : 1),
              into: 0.04 + 0.12 * i,
              pan: i ? (i & 1 ? 0.25 : -0.25) : 0,
              dl: i === nn - 1 ? 0.4 : 0,
            });
        } else
          vx(FV, smp, m, tt(b, s), len, {
            g,
            pan: o.pan || 0,
            dl: len >= 5 ? 0.35 : 0.12,
            pl: len >= 5 ? 0.25 : 0.1,
            alt: o.alt && k % 5 === 0,
          });
        if (o.dbl)
          vx(FV, "v_f2_a", m, tt(b, s) + 0.012, Math.min(len, 5), { g: g * 0.5, pan: 0.5 });
      }
      if (o.ans !== false && bars === 4) {
        vx(MV, "v_m6_a", 57, tt(b0 + 3, 10), 2, { g: g * 0.95, pan: -0.3, dl: 0.2 });
        vx(MV, "v_m6_a", 60, tt(b0 + 3, 12), 3.6, {
          g: g * 0.95,
          pan: -0.3,
          dl: 0.35,
          pl: 0.25,
        });
      }
    }
    const HOOKB = [
      ["f", 0, 0, 72, 2],
      ["f", 0, 2, 69, 2],
      ["f", 0, 4, 67, 3],
      ["m", 0, 8, 52, 2],
      ["m", 0, 10, 55, 2],
      ["m", 0, 12, 57, 3.5],
      ["f", 1, 0, 71, 3],
      ["f", 1, 3, 67, 3],
      ["f", 1, 6, 69, 2],
      ["m", 1, 8, 62, 2],
      ["m", 1, 10, 59, 2],
      ["m", 1, 12, 55, 3.5],
      ["f", 2, 0, 67, 2],
      ["f", 2, 2, 71, 2],
      ["f", 2, 4, 67, 2],
      ["f", 2, 6, 64, 2],
      ["m", 2, 8, 52, 2],
      ["m", 2, 10, 55, 2],
      ["m", 2, 12, 59, 3.5],
      ["f", 3, 0, 72, 6],
      ["m", 3, 0, 57, 6],
      ["f", 3, 8, 64, 2],
      ["f", 3, 10, 67, 2],
      ["f", 3, 12, 69, 3.5],
    ];
    function hookB(b0, o) {
      o = o || {};
      const g = o.g || 1,
        bars = o.bars || 4;
      for (const [who, bb, s, m, len] of HOOKB) {
        if (bb >= bars) continue;
        const k = bb * 16 + s;
        if (o.skip && o.skip.includes(k)) continue;
        const b = b0 + bb;
        if (who === "f") {
          const smp = o.vowel === "mix" && k % 3 === 2 ? "v_f8_e" : "v_f8_a";
          if (o.stut && o.stut.includes(k)) {
            vx(FV, smp, m, tt(b, s), 0.9, { g: g * 0.8, pan: 0.3 });
            vx(FV, smp, m, tt(b, s + 1), len - 1, { g, pan: 0.2, dl: 0.25 });
          } else
            vx(FV, smp, m, tt(b, s), len, {
              g,
              pan: 0.2,
              dl: len > 3 ? 0.35 : 0.1,
              pl: 0.12,
            });
          if (o.dbl)
            vx(FV, "v_f2_a", m, tt(b, s) + 0.01, Math.min(len, 4), {
              g: g * 0.45,
              pan: 0.55,
            });
        } else
          vx(MV, "v_m6_a", m === 59 && chordName(b) === "Am2" ? 57 : m, tt(b, s), len, {
            g: g * 0.95,
            pan: -0.3,
            dl: len > 3 ? 0.35 : 0.1,
            pl: 0.12,
          });
      }
    }
    const FILL = {
      win(b, kind, from) {
        if (kind === 0) {
          roll(b, from, 16, { acc: 1, rise: 3, g1: 0.75 });
          brk(b, "amen", 1, "........cdcdcccc", { s0: from, g: 0.9 });
          [72, 76, 79, 84].forEach((m, i) =>
            vb(m, tt(b, 12 + i), 0.34 + 0.05 * i, { dur: 0.6, dec: 0.4 }),
          );
        } else if (kind === 1) {
          brk(b, "tichfill", 0, "........0-2-89cd", { s0: from, g: 0.8 });
          const seq = ["t", "m", "m", "h", "h", "b", "b", "b"];
          for (let i = 0; i < 16 - from; i++)
            perc(seq[Math.min(7, i)], tt(b, from + i), 0.8 + 0.06 * i, { semi: i * 0.5 });
          [60, 62, 64, 67, 69, 72, 74, 76].forEach((m, i) =>
            rh(m, tt(b, 8 + i), 1.3, 0.5 + 0.05 * i),
          );
          for (const s of [8, 11, 14]) if (s >= from) kick(tt(b, s), 0.85);
          ghost(tt(b, 15), 0.6);
          ghost(tt(b, 15.5), 0.8);
        } else if (kind === 2) {
          const B = bk("amen");
          let s = from,
            k = 0;
          while (s < 16 - 1e-6) {
            const d = s < 13 ? 1 : 0.5;
            Q("BREAK", "amen", tt(b, s), {
              off: 28 * B.step + HITS.amen[28] / 1e3,
              rate: B.rate * st2r(k * 0.45),
              dur: d * T16,
              a: 1e-3,
              r: 8e-3,
              g: 0.6 + 0.03 * k,
              pan: k & 1 ? 0.12 : -0.12,
            });
            s += d;
            k++;
          }
          [64, 67, 71, 72].forEach((m, i) =>
            vx(FV, "v_f8_e", m, tt(b, 12 + i), 0.9, {
              g: 0.7,
              pan: i & 1 ? 0.3 : -0.3,
              dl: i === 3 ? 0.4 : 0,
            }),
          );
          kick(tt(b, 8), 0.9);
        } else {
          [60, 64, 67, 72].forEach((m, i) => {
            vx(FV, "v_f8_a", m, tt(b, 8 + i * 2), 1.7, { g: 0.85, pan: 0.25, dl: 0.15 });
            vx(MV, "v_m6_a", m - 12, tt(b, 9 + i * 2), 0.9, { g: 0.8, pan: -0.3 });
          });
          for (const s of [8, 11, 14]) {
            kick(tt(b, s), 0.9);
            snare(tt(b, s), 0.75);
          }
          ghost(tt(b, 15), 0.7);
        }
      },
      lose(b, kind, from) {
        if (kind === 0) {
          kick(tt(b, from), 0.9);
          kick(tt(b, 11), 0.7);
          snare(tt(b, 12), 0.9);
          EDITS.push(["tapeStop", tt(b, 12), tt(b + 1, 0) - tt(b, 12) - 4e-3, 0.22]);
        } else if (kind === 1) {
          const r = CH[chordName(b, 8)].o;
          subNote(r, tt(b, 8), T16 * 7.6, 0.9, [
            [0, 0],
            [0.1, 0],
            [0.6, -12],
          ]);
          NQ("BASS", "gb", r, tt(b, 8), {
            g: 0.6,
            dur: T16 * 7.6,
            hp: 130,
            lp: 2400,
            r: 0.04,
            pitch: [
              [0, 0],
              [0.1, 0],
              [0.6, -12],
            ],
          });
          vx(FV, "v_f8_a", 67, tt(b, 8), 6, {
            g: 0.9,
            pitch: [
              [0, 0],
              [0.12, 0],
              [0.5, -7],
            ],
            dl: 0.3,
            pl: 0.2,
          });
          for (const s of [8, 9.5, 11.5, 14])
            ghost(tt(b, s), 0.9 - (s - 8) * 0.08, { semi: -(s - 8) * 0.4 });
          kick(tt(b, 15), 0.6);
        } else if (kind === 2) {
          kick(tt(b, from), 0.9);
          snare(tt(b, 12), 0.9);
          brk(b, "amen", 2, "........89abcdef", { s0: from, g: 0.9 });
          EDITS.push(["reverse", tt(b, 12), T16 * 3.5]);
          EDITS.push(["mute", tt(b, 15.5), T16 * 0.5 - 2e-3]);
        } else {
          const B = bk("amen");
          Q("BREAK", "amen", tt(b, 8), {
            off: 8 * B.step,
            rate: B.rate * 0.5,
            dur: 8 * T16 - 5e-3,
            a: 1e-3,
            r: 0.01,
            g: 1,
          });
          const c = CH[chordName(b, 8)].lo;
          for (let i = 0; i < 4; i++)
            chord([c[1] - i, c[c.length - 1] - i], tt(b, 8 + i * 2), 1.8, 0.7 - 0.06 * i);
          kick(tt(b, 8), 0.9);
        }
      },
    };
    function match(b0, c) {
      const n = c.n || 4;
      for (let i = 0; i < n; i++) {
        const b = b0 + i;
        const last = i === n - 1 && c.fill;
        const s1 = last ? c.fillFrom || 8 : 16;
        const pick = (a) => (Array.isArray(a) ? a[i % a.length] : a);
        const s0 = c.dropIn && i === 0 ? c.dropIn : 0;
        groove(b, {
          k: pick(c.k) || "k2",
          sn: pick(c.sn) || "s2",
          gh: pick(c.gh) || "g1",
          hat: pick(c.hat) || "hA",
          oh: pick(c.oh),
          rd: pick(c.rd),
          shk: c.shk,
          pc: pick(c.pc),
          s0,
          s1,
          heavy: c.heavy,
          hv: c.hv,
          rv: c.rv,
          pv: c.pv,
          clap: c.clap,
          loose: c.loose,
        });
        if (c.rs && (i === 1 || (i === 3 && !c.fill))) snrevInto(tt(b, 12), c.rs);
        if (c.bz && i === 2)
          Q("SNARE", "bz", tt(b, 15), { g: 0.2, hp: 200, dur: 0.12, r: 0.04, pan: 0.1 });
        if (c.brk)
          brk(
            b,
            c.brk.id || "amen",
            c.brk.sb ? c.brk.sb[i % c.brk.sb.length] : i,
            BP[c.brk.p[i % c.brk.p.length]],
            { g: c.brk.g, drive: c.brk.drive, s1, lp: s0 ? 900 : void 0 },
          );
        if (c.top)
          brk(b, c.top.id, i, c.top.p || "0---------------", {
            key: "TOP",
            g: c.top.g,
            s0,
            s1,
            pan: 0.15,
          });
        if (c.bass !== void 0 && c.bass !== null)
          bass(b, pick(c.bass), {
            s0,
            s1: last && c.fill[0] === "lose" && (c.fill[1] === 1 || c.fill[1] === 3) ? 8 : 16,
          });
        if (c.comp) comp(b, pick(c.comp), { voic: c.voic, g: c.cg, lh: c.lh });
        if (c.vib) vibes(b, pick(c.vib), c.vg);
        if (c.str) strBar(b, c.str, c.top5 ? c.top5[i % c.top5.length] : 0);
      }
      if (c.hook) (c.hook.B ? hookB : hook)(b0, c.hook);
      if (c.fill) FILL[c.fill[0]](b0 + n - 1, c.fill[1], c.fillFrom || 8);
      if (c.crash !== 0) crash(tt(b0, 0), c.crash || 0.8);
    }
    for (let b = 0; b < 16; b++) {
      brk(
        b,
        "amen",
        b & 3,
        BP[b === 7 ? "F0" : b === 11 ? "S2" : b === 15 ? "F1" : (b & 3) === 1 ? "S5" : "S0"],
        { g: b < 8 ? 1.05 : 0.95 },
      );
      groove(b, {
        hat: b < 8 ? "hE" : "hA",
        oh: b >= 4 ? "oA" : null,
        k: b >= 8 ? (b & 1 ? "k2a" : "k2") : b >= 4 ? "kh" : null,
        kv: b < 8 ? 0.7 : 0.92,
        sn: b >= 8 ? "s2" : null,
        sv: 0.9,
        gh: b >= 8 ? "g1" : null,
        shk: b >= 12 ? 0.7 : 0,
        pc: b >= 12 ? ["p1"] : b >= 4 ? ["p6"] : null,
        s1: b === 15 ? 8 : 16,
      });
      comp(b, b < 8 ? "R3" : "R6", { voic: "hi", g: b < 8 ? 0.8 : 0.95 });
      if (b >= 8) bass(b, b < 12 ? 2 : 4, { g: 0.9 });
      if (b >= 12) vibes(b, 3, 0.8);
    }
    vx(FV, "v_f8_a", 67, tt(3, 12), 1.6, { g: 0.6, pan: -0.3, dl: 0.5 });
    vx(FV, "v_f8_a", 69, tt(3, 14), 1.8, { g: 0.7, pan: 0.3, dl: 0.5 });
    thread(FV, tt(4, 0), 3.6, 0.42, { pl: 0.6, dl: 0.2, a: 0.5 });
    [
      [6, 6, 72, 2],
      [6, 14, 71, 2],
      [7, 0, 69, 3],
      [7, 6, 67, 2],
      [7, 12, 67, 1],
      [7, 13, 69, 1],
      [7, 14, 72, 2],
    ].forEach(([b, s, m, l], i) =>
      vx(FV, i & 1 ? "v_f8_e" : "v_f8_a", m, tt(b, s), l, {
        g: 0.75,
        pan: i & 1 ? 0.25 : -0.25,
        dl: 0.35,
        pl: 0.15,
      }),
    );
    hook(8, { bars: 2, g: 0.9 });
    hook(12, { ans: false, g: 0.95, stut: [6] });
    roll(15, 8, 16, { acc: 1, rise: 2, g1: 0.7 });
    swell(tt(16, 0), 1.3, 0.8);
    swell(tt(8, 0), 0.7, 0.5);
    crash(tt(8, 0), 0.5);
    EDITS.push(["mute", tt(15, 15.5), T16 * 0.5 - 2e-3]);
    const AM = (p, g, x) => Object.assign({ p, g: g || 1 }, x || {});
    match(16, {
      k: ["k2", "k2", "k2a", "k2"],
      hat: "hA",
      oh: "oA",
      gh: "g1",
      shk: 0.6,
      brk: AM(["S0", "S0", "S0", "S0"], 0.85),
      bass: 0,
      comp: "R1",
      hook: {},
      fill: ["win", 0],
      crash: 1,
    });
    match(20, {
      rs: 0.8,
      k: ["k2", "k2b", "k2", "k2c"],
      hat: "hA",
      oh: "oA",
      gh: "g2",
      shk: 0.7,
      pc: [["p1"], ["p2"]],
      brk: AM(["S0", "S5", "S0", "S2"], 0.9),
      bass: 0,
      comp: "R1",
      hook: { stut: [6], vowel: "mix" },
      vib: 3,
      vg: 0.7,
      fill: ["lose", 0],
    });
    match(24, {
      rs: 0.8,
      bz: 1,
      k: ["k2a", "k2", "k2d", "k2"],
      hat: "hB",
      oh: "oB",
      gh: "g1",
      shk: 0.75,
      pc: [
        ["p1", "p4"],
        ["p2", "p4"],
      ],
      brk: AM(["S1", "S0", "S3", "S0"], 0.9),
      bass: 1,
      comp: "R2",
      voic: "hi",
      hook: { vowel: "mix", oct: [6, 16], rev: [38] },
      vib: 1,
      fill: ["win", 1],
    });
    match(28, {
      rs: 0.8,
      loose: 0.3,
      k: ["k2", "k2f", "k2", "k2e"],
      hat: "hC",
      oh: "oA",
      gh: "g4",
      shk: 0.75,
      pc: [["p3"], ["p5"]],
      brk: AM(["J1", "S0", "J3", "S6"], 0.95),
      bass: 3,
      comp: "R3",
      voic: "hi",
      lh: 1,
      hook: { chop: [6, 16, 38], stut: [48], skip: [14] },
      vib: 1,
      fill: ["lose", 2],
    });
    match(32, {
      rs: 0.8,
      clap: 0.6,
      k: ["k2", "k2a", "k2", "k2c"],
      hat: "hC",
      oh: "oB",
      rd: "rA",
      gh: "g2",
      shk: 0.8,
      pc: [
        ["p1", "p4"],
        ["p2", "p4"],
      ],
      brk: AM(["S0", "S7", "S0", "J1"], 0.9),
      top: { id: "unfa", g: 0.5 },
      bass: 0,
      comp: "R5",
      voic: "hi",
      hook: { B: 1 },
      str: 0.7,
      fill: ["win", 2],
      crash: 1,
    });
    match(36, {
      rs: 0.8,
      clap: 0.6,
      bz: 1,
      k: ["k2", "k2", "k2d", "k2"],
      dropIn: 8,
      hat: "hA",
      oh: "oA",
      rd: "rA",
      gh: "g3",
      shk: 0.8,
      pc: [["p3", "p7"], ["p5"]],
      brk: AM(["S4", "S0", "J2", "S0"], 0.95),
      top: { id: "unfa", g: 0.5 },
      bass: 6,
      comp: "R6",
      voic: "hi",
      hook: { B: 1, stut: [0, 16, 32], vowel: "mix" },
      vib: 2,
      vg: 0.8,
      fill: ["win", 3],
    });
    match(40, {
      rs: 0.8,
      clap: 0.6,
      loose: 0.3,
      k: ["k2b", "k2", "k2a", "k2"],
      hat: "hD",
      oh: "oC",
      gh: "g5",
      shk: 0.85,
      pc: [
        ["p1", "p8"],
        ["p2", "p8"],
      ],
      brk: AM(["J4", "S0", "J1", "S3"], 1),
      bass: 1,
      comp: "R2",
      lh: 1,
      hook: { stut: [6, 38], dbl: 1, oct: [16] },
      vib: 1,
      str: 0.7,
      fill: ["lose", 1],
    });
    match(44, {
      rs: 0.8,
      clap: 0.6,
      loose: 0.3,
      bz: 1,
      k: ["k2", "k2c", "k2", "k2"],
      hat: "hD",
      oh: "oB",
      rd: "rB",
      gh: "g1",
      shk: 0.9,
      pc: [
        ["p5", "p4"],
        ["p2", "p4"],
      ],
      brk: AM(["S0", "J3", "S0", "S0"], 1),
      top: { id: "unfa", g: 0.55 },
      bass: 0,
      comp: "R5",
      voic: "hi",
      hook: { dbl: 1, vowel: "mix", rev: [6] },
      vib: 2,
      vg: 0.9,
      str: 0.85,
      top5: [76, 74, 74, 76],
      crash: 1,
    });
    DEDITS.push(
      ["repeat", tt(17, 14), T16, 2],
      ["repeat", tt(21, 12), T16 * 0.5, 4, 1],
      ["repeat", tt(25, 6), T16, 2],
      ["repeat", tt(26, 14), T16 * 0.5, 4, 2],
      ["repeat", tt(29, 8), T16 * 2, 2],
      ["repeat", tt(30, 12), T16, 4],
      ["repeat", tt(33, 14), T16 * 0.5, 4, 1],
      ["repeat", tt(37, 12), T16, 4],
      ["repeat", tt(38, 6), T16, 2],
      ["repeat", tt(41, 14), T16 * 0.5, 4, 2],
      ["repeat", tt(42, 8), T16 * 2, 2],
      ["repeat", tt(45, 12), T16, 4],
      ["repeat", tt(46, 14), T16 * 0.5, 4, 1],
    );
    thread(FV, tt(30, 0), 3.2, 0.3, { pl: 0.6, a: 0.6, pan: -0.2 });
    thread(FV, tt(46, 0), 2.6, 0.34, { pl: 0.6, a: 0.6, pan: 0.2, u: 1 });
    for (let b = 48; b < 56; b++) {
      const i = b - 48;
      groove(b, {
        k: i < 6 ? "k2" : "kh",
        kv: 0.72,
        gh: "g3",
        hat: "hF",
        hv: 0.8,
        rd: "rB",
        rv: 0.9,
        jazz: 1,
        ft: "fA",
        pc: [b & 1 ? "p2" : "p1"],
        pv: 0.8,
        s1: b === 55 ? 12 : 16,
      });
      for (const s of [4, 12])
        if (!(b === 55 && s === 12)) {
          Q("SNARE", "snR", tt(b, s), { g: 0.42, hp: 180, dur: 0.3, r: 0.1 });
          Q("SNARE", "stk", tt(b, s), { g: 0.3, pan: 0.15 });
          Q("SNARE", "xst", tt(b, s) + 4e-3, { g: 0.3, pan: -0.2 });
          Q("@plate:SNARE", "snR", tt(b, s), { g: 0.12, hp: 400, dur: 0.2 });
          sT.push(tt(b, s));
        }
      brk(b, "tich", b & 1, "0---------------", { g: 0.5, s1: b === 55 ? 12 : 16 });
      bass(b, b & 1 ? 4 : 2, { g: 0.92 });
      if ((b & 1) === 0) {
        const c = CH[chordName(b)];
        chord(c.lo, tt(b, 0), 14, 0.72);
        chord(c.hi, tt(b, 14), 16, 0.6);
      } else {
        const c = CH[chordName(b)];
        chord([c.lo[1], c.lo[3]], tt(b, 8), 5, 0.5);
      }
      strBar(b, 0.55);
    }
    callSlow(tt(48, 0), 0.95);
    ansSlow(tt(50, 2), 0.95);
    callSlow(tt(52, 0), 0.9);
    ansSlow(tt(54, 2), 0.9);
    [
      [49, 8, 76],
      [49, 12, 79],
      [51, 6, 72],
      [51, 10, 76],
      [51, 14, 74],
      [53, 8, 81],
      [53, 12, 76],
      [55, 4, 74],
      [55, 8, 79],
    ].forEach(([b, s, m]) => vb(m, tt(b, s), 0.42, { dur: 2, dec: 1.2 }));
    [67, 69, 72].forEach((m, i) =>
      vx(FV, "v_f8_a", m, tt(55, 12 + i + (i === 2 ? 0 : 0)), 0.9, {
        g: 0.7,
        pan: i & 1 ? 0.3 : -0.3,
      }),
    );
    pressRoll(tt(56, 0), T16 * 6, 0.9);
    roll(55, 14, 16, { div: 0.5, g0: 0.4, g1: 0.7, rise: 2 });
    swell(tt(56, 0), 1.6, 0.8);
    for (let t = tt(48, 0); t < tt(56, 0) - 2.4; t += 2.3)
      Q("FX", "hiss", t, { g: 0.22, a: 0.3, r: 0.3, pan: (rnd() - 0.5) * 0.5 });
    match(56, {
      rs: 0.8,
      k: ["k2", "k2a", "k2", "k2c"],
      hat: "hC",
      oh: "oA",
      rd: "rA",
      gh: "g2",
      shk: 0.8,
      pc: [
        ["p1", "p4"],
        ["p2", "p4"],
      ],
      brk: AM(["S0", "S5", "J1", "S0"], 0.95),
      top: { id: "tama", g: 0.4 },
      bass: 0,
      comp: "R1",
      voic: "hi",
      hook: { stut: [6], vowel: "mix" },
      vib: 1,
      fill: ["win", 3],
      crash: 1,
    });
    match(60, {
      rs: 0.8,
      clap: 0.6,
      loose: 0.3,
      k: ["k2d", "k2", "k2b", "k2"],
      hat: "hD",
      oh: "oB",
      gh: "g4",
      shk: 0.85,
      pc: [["p3"], ["p5", "p7"]],
      brk: AM(["J2", "S0", "S7", "J5"], 1),
      bass: 6,
      comp: "R6",
      voic: "hi",
      lh: 1,
      hook: { B: 1, stut: [16], vowel: "mix", dbl: 1 },
      vib: 2,
      vg: 0.8,
      str: 0.7,
      fill: ["lose", 3],
    });
    match(64, {
      rs: 0.8,
      clap: 0.6,
      bz: 1,
      k: ["k2", "k2f", "k2a", "k2"],
      hat: "hB",
      oh: "oC",
      rd: "rB",
      gh: "g1",
      shk: 0.9,
      pc: [
        ["p1", "p8"],
        ["p2", "p4"],
      ],
      brk: AM(["S0", "J3", "S1", "S0"], 1),
      top: { id: "unfa", g: 0.5 },
      bass: 3,
      comp: "R5",
      hook: { chop: [6, 38], oct: [16, 48], dbl: 1 },
      vib: 1,
      str: 0.8,
      top5: [76, 74, 76, 79],
      fill: ["win", 0],
    });
    for (let b = 68; b < 72; b++) {
      groove(b, {
        k: "k2",
        kv: 0.75,
        gh: "g3",
        hat: "hF",
        hv: 0.8,
        rd: "rA",
        pc: ["p1"],
        pv: 0.8,
      });
      for (const s of [4, 12]) {
        Q("SNARE", "snR", tt(b, s), { g: 0.42, hp: 180, dur: 0.3, r: 0.1 });
        sT.push(tt(b, s));
      }
      brk(b, "tich", b & 1, "0---------------", { g: 0.5 });
      bass(b, 2, { g: 0.92 });
      const c = CH[chordName(b)];
      chord(c.lo, tt(b, 0), 14, 0.72);
      strBar(b, 0.55);
    }
    callSlow(tt(68, 0), 0.95);
    ansSlow(tt(70, 0), 0.95, { dur: 1.7 });
    vb(76, tt(69, 12), 0.4, { dur: 2 });
    vb(79, tt(71, 8), 0.4, { dur: 2 });
    pressRoll(tt(72, 0), T16 * 4, 0.9);
    roll(71, 14, 16, { div: 0.5, g0: 0.4, g1: 0.7, rise: 2 });
    swell(tt(72, 0), 1.2, 0.7);
    match(72, {
      rs: 0.8,
      loose: 0.3,
      k: ["k2", "k2c", "k2a", "k2"],
      hat: "hD",
      oh: "oA",
      rd: "rA",
      gh: "g5",
      shk: 0.85,
      pc: [["p5", "p4"], ["p2"]],
      brk: AM(["S0", "J4", "S0", "J1"], 1),
      bass: 0,
      comp: "R2",
      voic: "hi",
      hook: { vowel: "mix", stut: [6, 38], rev: [16] },
      vib: 2,
      vg: 0.7,
      fill: ["lose", 2],
      fillFrom: 12,
      crash: 1,
    });
    match(76, {
      rs: 0.8,
      n: 2,
      k: ["k2", "k2b"],
      hat: "hB",
      oh: "oB",
      gh: "g2",
      shk: 0.85,
      pc: [["p3"]],
      brk: AM(["S7", "J2"], 1),
      bass: 1,
      comp: "R6",
      voic: "hi",
      hook: { B: 1, bars: 2, dbl: 1 },
      vib: 1,
      crash: 0,
    });
    for (let b = 78; b < 80; b++) {
      groove(b, {
        k: "k2",
        kv: 0.75,
        gh: "g3",
        hat: "hF",
        rd: "rA",
        pc: ["p1"],
        s1: b === 79 ? 12 : 16,
      });
      for (const s of [4, 12])
        if (!(b === 79 && s === 12)) {
          Q("SNARE", "snR", tt(b, s), { g: 0.42, hp: 180, dur: 0.3, r: 0.1 });
          sT.push(tt(b, s));
        }
      brk(b, "tich", b & 1, "0---------------", { g: 0.5, s1: b === 79 ? 12 : 16 });
      bass(b, 2, { g: 0.92 });
      chord(CH[chordName(b)].lo, tt(b, 0), 14, 0.72);
      strBar(b, 0.5);
    }
    callChop(78, 0, 7, 8, 0.95);
    ansChop(79, 0, 11, 0.95);
    roll(79, 12, 16, { acc: 1, g0: 0.2, g1: 0.6, rise: 2 });
    match(80, {
      rs: 0.8,
      clap: 0.6,
      loose: 0.3,
      n: 3,
      k: ["k2", "k2a", "k2d"],
      hat: "hD",
      oh: "oC",
      rd: "rB",
      gh: "g1",
      shk: 0.9,
      pc: [["p1", "p4"], ["p5"]],
      brk: AM(["S0", "J1", "J3"], 1),
      top: { id: "unfa", g: 0.5 },
      bass: 6,
      comp: "R5",
      voic: "hi",
      hook: { bars: 3, chop: [6], dbl: 1 },
      vib: 2,
      vg: 0.7,
      str: 0.7,
      crash: 1,
    });
    groove(83, { k: "k2", kv: 0.8, gh: "g3", hat: "hF", rd: "rA", sn: "s2", sv: 0.6 });
    brk(83, "tich", 1, "0---------------", { g: 0.5 });
    bass(83, 2);
    chord(CH.Amd.lo, tt(83, 0), 14, 0.72);
    strBar(83, 0.5);
    callChop(83, 0, 4, 4, 0.95);
    ansChop(83, 8, 7, 0.95);
    for (const b of [84, 85]) {
      groove(b, { k: "k2", sn: "s2", gh: "g1", hat: "hD", oh: "oA", shk: 0.9, rd: "rB" });
      brk(b, "amen", b & 1, BP[b === 84 ? "S0" : "J1"], { g: 1 });
      for (const s of [0, 8]) {
        const c = CH[chordName(b, s)];
        chord(c.hi, tt(b, s), 5, 0.85);
        chord(c.hi, tt(b, s + 6), 1.8, 0.6);
        bassNote(c.r, tt(b, s), 5);
        bassNote(c.o, tt(b, s + 6), 2);
      }
    }
    crash(tt(84, 0), 0.8);
    [
      [84, 0, 67, 1.6],
      [84, 2, 69, 1.6],
      [84, 4, 72, 3.6],
      [84, 8, 69, 3],
      [84, 11, 67, 1.6],
      [84, 13, 64, 1],
      [84, 14, 67, 2],
      [85, 0, 67, 1.6],
      [85, 2, 69, 1.6],
      [85, 4, 71, 4],
    ].forEach(([b, s, m, l]) =>
      vx(FV, "v_f8_a", m, tt(b, s), l, { g: 1, dl: l > 3 ? 0.3 : 0.1, pl: 0.1 }),
    );
    callChop(85, 8, 4, 2, 0.95, { dl: 0.1 });
    ansChop(85, 14, 2, 0.95, { dl: 0.1 });
    groove(86, { k: "k2", sn: "s2", gh: "g5", hat: "hD", shk: 0.9, rd: "rB" });
    brk(86, "amen", 0, BP.S0, { g: 1 });
    crash(tt(86, 0), 0.7);
    for (const s of [0, 4, 8, 12]) {
      const c = CH[chordName(86, s)];
      chord(c.hi, tt(86, s), 3, 0.85);
      bassNote(c.r, tt(86, s), 3.6);
    }
    [
      [0, 67, 1],
      [1, 69, 1],
      [2, 72, 2],
      [4, 69, 2],
      [6, 67, 2],
      [8, 67, 1],
      [9, 69, 1],
      [10, 71, 2],
    ].forEach(([s, m, l]) => vx(FV, "v_f8_a", m, tt(86, s), l, { g: 1 }));
    callChop(86, 12, 2, 0, 1);
    ansChop(86, 14, 2, 1, { dl: 0, pl: 0 });
    EDITS.push([
      "loopFrom",
      tt(86, 12),
      [
        [4, 2],
        [2, 2],
        [1, 2],
        [0.5, 4],
      ],
      tt(87, 0),
    ]);
    const MG = "m:GLASS",
      MS = "m:STRINGS",
      MR2 = "m:RHODES",
      MVB = "m:VIBES",
      MVX = "m:VOX F";
    function drone(t0, t1, g) {
      let k = 0;
      for (let t = t0; t < t1; t += 1.9, k++) {
        str(MS, 44, t, 2.6, 0.26 * g, {
          a: 0.6,
          r: 0.7,
          pan: -0.3,
          det: k & 1 ? 0.04 : -0.03,
          lp: 1500,
        });
        str(MS, 51, t + 0.95, 2.6, 0.22 * g, {
          a: 0.6,
          r: 0.7,
          pan: 0.3,
          det: k & 1 ? -0.04 : 0.03,
          lp: 1800,
        });
      }
    }
    drone(tt(87, 8), tt(112, 0), 1);
    for (let t = tt(96, 0), k = 0; t < tt(112, 0); t += 2.05, k++)
      str(MS, 72, t, 2.5, 0.12 + 0.012 * Math.min(k, 8), {
        a: 0.7,
        r: 0.8,
        pan: 0.45,
        det: k & 1 ? 0.05 : -0.04,
      });
    for (let t = tt(102, 0), k = 0; t < tt(112, 0); t += 2.2, k++)
      str(MS, 79, t + 0.5, 2.3, 0.08 + 0.012 * Math.min(k, 6), {
        a: 0.8,
        r: 0.8,
        pan: -0.45,
      });
    [
      [88.5, 75, 0.36],
      [90.25, 79, 0.34],
      [91.75, 84, 0.3],
      [93.5, 82, 0.32],
      [95.25, 74, 0.38],
      [97, 79, 0.3],
      [99.5, 75, 0.32],
      [101.25, 84, 0.28],
      [103, 77, 0.34],
      [105.5, 82, 0.3],
      [107, 79, 0.32],
      [109, 74, 0.34],
      [110.5, 84, 0.3],
    ].forEach(([bb, m, g], i) => glass(MG, m, bb * BAR, g, { pan: i & 1 ? 0.55 : -0.55 }));
    [
      [89.5, 67],
      [92.5, 72],
      [96.5, 70],
      [100.5, 67],
      [104.5, 74],
      [108.5, 72],
    ].forEach(([bb, m], i) => bowed(MVB, m, bb * BAR, 0.34, { pan: i & 1 ? -0.3 : 0.3 }));
    const MOTIF = [70, 72, 74, 77, 79],
      MOTIF_F = [69, 72, 74, 77, 79],
      MOTIF_G = [69, 72, 74, 76, 79],
      MOTIF_B = [71, 74, 76, 79, 81];
    [96, 96.75, 97.5, 98.5, 99.5].forEach((bb, i) => {
      rh(MOTIF[i], bb * BAR, 24, 0.62, { key: MR2, r: 0.6 });
      vb(MOTIF[i], bb * BAR + T16 * 4, 0.2, { key: MVB, dur: 2.4, dec: 1.5 });
    });
    [100.5, 101.25, 102, 103, 104].forEach((bb, i) => {
      rh(MOTIF[4 - i], bb * BAR, 24, 0.58, { key: MR2, r: 0.6 });
      if (i > 1) rh(MOTIF[4 - i] - 12, bb * BAR + T16 * 2, 20, 0.4, { key: MR2, r: 0.6 });
    });
    for (let b = 104; b < 112; b++) {
      rh(44, tt(b, 0), 14, 0.5 + 0.02 * (b - 104), { key: MR2, r: 0.5 });
      rh(51, tt(b, 8), 8, 0.36 + 0.02 * (b - 104), { key: MR2, r: 0.4 });
      Q("m:SUB", "gb_c3", tt(b, 0), {
        semi: 32 - 36.02,
        g: 0.3 + 0.05 * (b - 104),
        dur: BAR - 0.05,
        a: 0.25,
        r: 0.3,
        lp: 130,
      });
      if (b >= 108)
        for (const s of [0, 4, 8, 12])
          Q("m:HATS", s & 4 ? "rd2" : "rd1", tt(b, s), {
            g: 0.07 + 0.012 * (b - 108),
            pan: 0.3,
            dur: 0.6,
            r: 0.3,
            hp: 900,
            lp: 6e3,
          });
    }
    [
      [108, 70],
      [108.5, 72],
      [109, 74],
      [110, 77],
      [111.25, 77],
    ].forEach(([bb, m], i) => {
      rh(m, bb * BAR, 24, 0.66 + 0.03 * i, { key: MR2, r: 0.6 });
      vb(m + (i < 2 ? 12 : 0), bb * BAR + T16 * 2, 0.22, { key: MVB, dur: 2.4, dec: 1.5 });
    });
    thread(MVX, tt(98, 0), 3.8, 0.42, { u: 1, a: 0.7, r: 1.2 });
    thread(MVX, tt(106, 8), 3.8, 0.5, { a: 0.7, r: 1.2, pan: 0.15 });
    thread(MVX, tt(110, 10), 3, 0.62, { a: 0.9, r: 0.01 });
    for (let t = tt(88, 0); t < tt(112, 0) - 2.4; t += 2.3)
      Q("m:FX", "hiss", t, { g: 0.1, a: 0.3, r: 0.3, pan: (rnd() - 0.5) * 0.5 });
    drone(tt(112, 0), tt(128, 0), 1);
    for (let k = 0; k < 11; k++) {
      const bb = 112.4 + k * 1.45;
      glass(MG, [75, 79, 84, 82, 74, 79][k % 6], bb * BAR, 0.36, {
        pan: k & 1 ? 0.55 : -0.55,
        a: 0.2,
      });
    }
    [
      [113.5, 67],
      [116.5, 72],
      [118, 70],
      [121.5, 67],
      [124.5, 74],
      [125.6, 72],
    ].forEach(([bb, m], i) => bowed(MVB, m, bb * BAR, 0.34, { pan: i & 1 ? -0.3 : 0.3 }));
    thread(MVX, tt(118, 4), 3.8, 0.5, { u: 1, a: 0.5, r: 1 });
    thread(MVX, tt(125, 12), 3.9, 0.55, { a: 0.5, r: 1 });
    thread(MVX, tt(114, 8), 3, 0.45, { a: 0.5, r: 1 });
    [
      [115.6, 70],
      [119.3, 72],
      [119.8, 74],
      [126.4, 70],
      [126.8, 72],
      [127.2, 74],
      [127.55, 77],
    ].forEach(([bb, m]) => rh(m, bb * BAR, 24, 0.62, { key: MR2, r: 0.6 }));
    const FLASH = [
      [tt(115, 12), tt(116, 0)],
      [tt(119, 8), tt(120, 0)],
      [tt(123, 6), tt(123, 8)],
      [tt(125, 12), tt(125, 14)],
      [tt(126, 8), tt(127, 12)],
    ];
    for (let k = 0; k < 10; k++) {
      const bb = 128.5 + k * 1.55;
      glass(MG, [84, 79, 74, 77, 79, 84][k % 6], bb * BAR, 0.34, {
        pan: k & 1 ? 0.55 : -0.55,
        a: 0.2,
      });
    }
    [
      [129, 67],
      [132, 72],
      [135, 67],
      [138, 74],
      [141, 72],
    ].forEach(([bb, m], i) => bowed(MVB, m, bb * BAR, 0.34, { pan: i & 1 ? -0.3 : 0.3 }));
    thread(MVX, tt(130, 0), 3.9, 0.5, { a: 0.6, r: 1 });
    thread(MVX, tt(134, 0), 3.9, 0.5, { u: 1, a: 0.6, r: 1 });
    thread(MVX, tt(138, 0), 3.9, 0.5, { a: 0.6, r: 1 });
    for (let t = tt(128, 0), k = 0; t < tt(143, 8); t += 2.05, k++) {
      if (t < tt(140, 0)) str(MS, 72, t, 2.5, 0.2, { a: 0.7, r: 0.8, pan: 0.45 });
      str(MS, 79, t + 1, 2.4, 0.14, { a: 0.7, r: 0.8, pan: -0.45 });
    }
    const STREET = [
      [
        [0, 6, 33],
        [6, 2, 45],
        [8, 2, 33],
        [10, 3, 34],
        [13, 3, 33],
      ],
      [
        [0, 6, 33],
        [8, 2, 31],
        [10, 6, 33],
      ],
      [
        [0, 6, 33],
        [6, 2, 45],
        [8, 2, 33],
        [10, 3, 34],
        [13, 3, 36],
      ],
      [
        [0, 3, 36],
        [3, 3, 34],
        [6, 4, 33],
        [10, 2, 28],
        [12, 4, 31],
      ],
    ];
    for (let b = 112; b < 128; b++) {
      const i = b - 112,
        q = i & 3;
      groove(b, {
        k: ["k2", "k2e", "k2a", "k2c"][q],
        sn: q === 3 ? "s2a" : "s2",
        gh: ["g1", "g4", "g2", "g5"][q],
        hat: i < 4 ? "hD" : "hD",
        hv: 1.05,
        oh: q & 1 ? "oB" : null,
        pc: [i >= 4 ? "p6" : null].filter(Boolean),
        heavy: 1,
      });
      brk(b, "amen", i, BP[["S0", "J1", "S0", "J5", "J2", "S7", "J4", "J3"][i & 7]], {
        g: 1.25,
        drive: 2.2,
      });
      const lp = 500 + 90 * i;
      for (const [s, len, m] of STREET[q]) {
        if (q === 1 && s === 8) {
          Q("BASS", "b_reese", tt(b, s), {
            semi: m - 29.09,
            dur: len * T16 - 0.01,
            g: 0.5,
            hp: 120,
            lp: 1800,
            drive: 1.6,
            r: 0.03,
          });
          subNote(m, tt(b, s), len * T16 - 0.01, 0.92);
        } else reese(m, tt(b, s), len, { lp, lpEnd: lp * (len > 4 ? 2.6 : 1.4) });
      }
      if (i >= 2)
        for (let s = 0; s < 16; s++) {
          const nn = i * 16 + s;
          if (i < 4 && s < 8) continue;
          if ((nn * 5 + (nn >> 3)) % 7 === 0) continue;
          const m = MOTIF[nn % 5];
          rh(m, tt(b, s), 1.1, nn % 5 === 0 ? 0.92 : 0.6, { g: 0.85, r: 0.04 });
          if (i >= 8 && nn % 5 === 4)
            vb(m + 12 > 84 ? m : m + 12, tt(b, s), 0.3, { dur: 0.6, dec: 0.35 });
        }
    }
    rh(79, tt(112, 0), 3, 0.95);
    rh(67, tt(112, 0), 3, 0.95);
    Q("@dly:RHODES", "rh4_71", tt(112, 0), { semi: -4, g: 0.5, dur: 0.4 });
    crash(tt(112, 0), 1, { semi: -5, lp: 6e3 });
    crash(tt(120, 0), 0.7, { semi: -5, lp: 6e3, pan: 0.2 });
    [
      [115, 8],
      [119, 4],
      [123, 4],
      [126, 4],
    ].forEach(([b, s], i) => {
      for (let k = 0; k < 4; k++)
        vx(FV, "v_f8_a", 72, tt(b, s + k), 0.85, {
          g: 0.6,
          pan: k & 1 ? 0.4 : -0.4,
          into: 0.05 + 0.02 * k,
          dl: k === 3 ? 0.5 : 0,
        });
    });
    roll(127, 12, 16, { acc: 1, g0: 0.3, g1: 0.8 });
    kick(tt(127, 12), 0.9, 1);
    kick(tt(127, 14), 0.9, 1);
    DEDITS.push(
      ["repeat", tt(113, 14), T16 * 0.5, 4, 0],
      ["repeat", tt(117, 12), T16, 4, -1],
      ["repeat", tt(118, 14), T16 * 0.5, 4, 0],
      ["repeat", tt(121, 8), T16 * 2, 2],
      ["repeat", tt(122, 12), T16 * 0.5, 8, -1],
      ["repeat", tt(124, 14), T16 * 0.5, 4, 0],
    );
    for (let b = 128; b < 144; b++) {
      const i = b - 128,
        q = i & 3;
      const build = b >= 140;
      groove(b, {
        k: build ? null : ["k2", "k2a", "k2", "k2c"][q],
        sn: "s2",
        sv: build ? 0.7 : 1,
        gh: ["g1", "g2", "g3", "g4"][q],
        hat: i < 8 ? "hD" : "hC",
        oh: "oA",
        rd: i >= 8 ? "rA" : null,
        shk: i >= 4 ? 0.7 : 0,
        pc: [i >= 8 ? (b & 1 ? "p2" : "p1") : "p6"],
        heavy: i < 4,
        s1: b === 143 ? 12 : 16,
      });
      brk(b, "amen", i, BP[["S0", "J1", "S0", "S7"][q]], {
        g: i < 4 ? 1.15 : 1,
        drive: i < 4 ? 1.8 : i < 8 ? 1.3 : void 0,
        s1: b === 143 ? 12 : 16,
      });
      if (i < 4) {
        for (const [s, len, m] of STREET[q === 3 ? 1 : q])
          reese(m, tt(b, s), len, { lp: 1500 - 200 * i, lpEnd: 2400, g: 0.9 - 0.08 * i });
      } else if (!build) bass(b, [0, 1, 0, 6][q]);
      else bass(b, 2, { g: 0.9 });
      if (i >= 4) {
        const c = CH[chordName(b)];
        const gg = 0.55 + 0.03 * (i - 4);
        if (build) chord(c.lo, tt(b, 0), 15, 0.75);
        else comp(b, i < 8 ? "R7" : "R1", { g: gg });
      }
      for (let s = 0; s < 16; s += i < 8 ? 1 : 2) {
        const nn = i * 16 + s;
        if (i < 8 && (nn * 5 + (nn >> 3)) % 7 < 2) continue;
        if (i >= 8 && (nn >> 1) % 6 === 5) continue;
        const m = (i < 4 ? MOTIF : i < 8 ? MOTIF_F : i < 14 ? MOTIF_G : MOTIF_B)[
          (i < 8 ? nn : nn >> 1) % 5
        ];
        if (i < 8) rh(m, tt(b, s), 1.1, 0.55 - 0.03 * i, { g: 0.8, r: 0.04 });
        else vb(m, tt(b, s), 0.34, { dur: 1.2, dec: 0.7 });
      }
      if (i >= 8) strBar(b, 0.5 + 0.04 * (i - 8), build ? [79, 79, 81, 83][b - 140] : 0);
    }
    crash(tt(128, 0), 0.9, { semi: -3 });
    crash(tt(136, 0), 0.7);
    {
      const p = {
        off: 0.09,
        rate: CR,
        dur: 4.75,
        a: 0.012,
        r: 0.2,
        g: 1,
        hp: 170,
        m0: 73.9,
        pan: 0.05,
      };
      Q(FV, "v_f8_caro", tt(140, 0), p);
      sendV("v_f8_caro", tt(140, 0), p, 0.3, 0.5);
    }
    pressRoll(tt(143, 12), T16 * 18, 1);
    roll(143, 6, 12, { acc: 1, g0: 0.3, g1: 0.75, rise: 3 });
    swell(tt(144, 0), 2.4, 1);
    swell(tt(128, 0), 1, 0.6);
    EDITS.push(["mute", tt(143, 14), T16 * 2 - 2e-3]);
    match(144, {
      rs: 1,
      clap: 0.8,
      k: ["k2", "k2a", "k2", "k2c"],
      hat: "hC",
      oh: "oA",
      rd: "rB",
      gh: "g2",
      shk: 0.85,
      pc: [
        ["p1", "p4"],
        ["p2", "p4"],
      ],
      brk: AM(["S0", "S5", "S0", "J1"], 1),
      top: { id: "unfa", g: 0.5 },
      bass: 0,
      comp: "R1",
      voic: "hi",
      lh: 1,
      hook: { dbl: 1 },
      vib: 3,
      str: 0.8,
      top5: [76, 74, 74, 76],
      fill: ["win", 0],
      crash: 1.1,
    });
    match(148, {
      rs: 1,
      clap: 0.8,
      loose: 0.3,
      k: ["k2", "k2b", "k2d", "k2"],
      hat: "hD",
      oh: "oB",
      rd: "rA",
      gh: "g4",
      shk: 0.85,
      pc: [["p3", "p7"], ["p5"]],
      brk: AM(["J1", "S0", "J3", "S6"], 1),
      bass: 6,
      comp: "R6",
      voic: "hi",
      hook: { B: 1, vowel: "mix", dbl: 1 },
      vib: 1,
      str: 0.8,
      fill: ["lose", 0],
    });
    match(152, {
      rs: 1,
      clap: 0.8,
      bz: 1,
      k: ["k2a", "k2", "k2", "k2e"],
      hat: "hB",
      oh: "oC",
      rd: "rB",
      gh: "g1",
      shk: 0.9,
      pc: [
        ["p1", "p8"],
        ["p2", "p4"],
      ],
      brk: AM(["S0", "J2", "S1", "S0"], 1),
      top: { id: "tama", g: 0.42 },
      bass: 1,
      comp: "R5",
      hook: { stut: [6, 38], oct: [16], vowel: "mix", dbl: 1 },
      vib: 2,
      vg: 0.8,
      str: 0.85,
      top5: [79, 79, 79, 81],
      fill: ["win", 1],
    });
    match(156, {
      rs: 1,
      clap: 0.8,
      loose: 0.3,
      k: ["k2", "k2f", "k2a", "k2"],
      hat: "hD",
      oh: "oA",
      rd: "rB",
      gh: "g5",
      shk: 0.9,
      pc: [["p5", "p4"], ["p3"]],
      brk: AM(["J4", "S0", "J5", "S7"], 1.05),
      bass: 3,
      comp: "R3",
      voic: "hi",
      lh: 1,
      hook: { B: 1, stut: [0, 16, 32], dbl: 1 },
      vib: 1,
      str: 0.85,
      fill: ["win", 2],
    });
    match(160, {
      rs: 1,
      clap: 1,
      loose: 0.3,
      bz: 1,
      k: ["k2", "k2a", "k2", "k2c"],
      hat: "hD",
      oh: "oC",
      rd: "rC",
      gh: "g2",
      shk: 1,
      pc: [
        ["p1", "p4", "p7"],
        ["p2", "p4"],
      ],
      brk: AM(["S0", "J1", "S0", "J3"], 1.05),
      top: { id: "unfa", g: 0.55 },
      bass: 0,
      comp: "R5",
      voic: "hi",
      lh: 1,
      hook: { dbl: 1, stut: [6], rev: [38] },
      vib: 2,
      str: 1,
      top5: [81, 83, 83, 84],
      fill: ["win", 3],
      crash: 1.1,
    });
    match(164, {
      rs: 1,
      clap: 1,
      loose: 0.3,
      k: ["k2d", "k2", "k2b", "k2"],
      hat: "hD",
      oh: "oB",
      rd: "rC",
      gh: "g4",
      shk: 1,
      pc: [
        ["p3", "p8"],
        ["p5", "p4"],
      ],
      brk: AM(["J2", "S7", "J1", "S0"], 1.05),
      top: { id: "unfa", g: 0.55 },
      bass: 6,
      comp: "R6",
      voic: "hi",
      hook: { B: 1, vowel: "mix", dbl: 1, stut: [16] },
      vib: 2,
      str: 1,
      top5: [81, 83, 83, 84],
      fill: ["lose", 3],
    });
    match(168, {
      rs: 1,
      clap: 1,
      loose: 0.3,
      bz: 1,
      k: ["k2", "k2c", "k2a", "k2"],
      hat: "hD",
      oh: "oC",
      rd: "rC",
      gh: "g1",
      shk: 1,
      pc: [
        ["p1", "p4"],
        ["p2", "p7"],
      ],
      brk: AM(["S0", "J4", "S0", "J5"], 1.05),
      top: { id: "tama", g: 0.45 },
      bass: 1,
      comp: "R2",
      voic: "hi",
      lh: 1,
      hook: { chop: [6, 16], oct: [38, 48], dbl: 1, vowel: "mix" },
      vib: 2,
      str: 1,
      top5: [79, 81, 83, 84],
      fill: ["win", 0],
    });
    match(172, {
      rs: 1,
      clap: 1,
      loose: 0.3,
      k: ["k2", "k2a", "k2f", "k2"],
      hat: "hD",
      oh: "oA",
      rd: "rC",
      gh: "g5",
      shk: 1,
      pc: [
        ["p5", "p4"],
        ["p3", "p8"],
      ],
      brk: AM(["J1", "S0", "J3", "S0"], 1.05),
      top: { id: "unfa", g: 0.55 },
      bass: 3,
      comp: "R5",
      voic: "hi",
      hook: { B: 1, dbl: 1, stut: [0, 32] },
      vib: 1,
      str: 1,
      top5: [81, 83, 84, 84],
      fill: ["lose", 1],
    });
    match(176, {
      rs: 0.8,
      k: ["k2", "k2", "k2a", "k2"],
      hat: "hC",
      oh: "oA",
      rd: "rB",
      gh: "g2",
      shk: 0.85,
      pc: [["p1", "p4"], ["p2"]],
      brk: AM(["S0", "S5", "S0", "S2"], 0.95),
      bass: 0,
      comp: "R1",
      voic: "hi",
      hook: { dbl: 1 },
      vib: 3,
      str: 0.85,
      top5: [76, 74, 74, 76],
      crash: 1,
    });
    match(180, {
      rs: 0.8,
      k: ["k2", "k2a", "k2", "k2"],
      hat: "hA",
      oh: "oA",
      rd: "rA",
      gh: "g1",
      shk: 0.75,
      pc: [["p1"], ["p2"]],
      brk: AM(["S0", "S0", "S0", "S0"], 0.85),
      bass: 0,
      comp: "R1",
      hook: { bars: 2 },
      vib: 3,
      vg: 0.8,
      str: 0.75,
      crash: 0,
    });
    callChop(182, 0, 7, 8, 0.95);
    ansChop(183, 0, 11, 0.95);
    DEDITS.push(
      ["repeat", tt(145, 14), T16 * 0.5, 4, 1],
      ["repeat", tt(146, 6), T16, 2],
      ["repeat", tt(149, 12), T16, 4],
      ["repeat", tt(150, 14), T16 * 0.5, 4, 2],
      ["repeat", tt(153, 8), T16 * 2, 2],
      ["repeat", tt(154, 14), T16 * 0.5, 4, 1],
      ["repeat", tt(157, 12), T16, 4],
      ["repeat", tt(158, 6), T16, 2],
      ["repeat", tt(161, 14), T16 * 0.5, 4, 2],
      ["repeat", tt(162, 8), T16 * 2, 2],
      ["repeat", tt(165, 12), T16 * 0.5, 8, 1],
      ["repeat", tt(166, 6), T16, 2],
      ["repeat", tt(169, 14), T16 * 0.5, 4, 1],
      ["repeat", tt(170, 12), T16, 4],
      ["repeat", tt(173, 8), T16 * 2, 2],
      ["repeat", tt(174, 14), T16 * 0.5, 4, 2],
      ["repeat", tt(177, 14), T16, 2],
    );
    thread(FV, tt(158, 0), 3.6, 0.32, { pl: 0.6, a: 0.6, pan: -0.2 });
    thread(FV, tt(174, 0), 3.6, 0.36, { pl: 0.6, a: 0.6, pan: 0.2 });
    for (const b of [158, 174]) {
      const p = {
        off: 0.15,
        rate: st2r(60 - 60.1),
        dur: 3.3,
        a: 0.6,
        r: 0.5,
        g: 0.42,
        pan: -0.3,
        hp: 120,
        m0: 60.1,
      };
      Q(MV, "v_m6_la", tt(b, 0), p);
      Q("@plate:" + MV, "v_m6_la", tt(b, 0), Object.assign({}, p, { g: 0.25 }));
    }
    for (let b = 184; b < 212; b++) {
      const i = b - 184,
        cy = i >> 2,
        q = i & 3;
      const hasBrk = cy < 3,
        hasKick = cy < 5,
        hasSn = cy < 5,
        hasHat = cy < 6,
        hasRide = cy >= 1 && cy < 6,
        hasBass = cy < 4,
        hasSub2 = cy === 4,
        hasVib = cy < 2,
        hasStr = cy < 4,
        hasShk = cy < 2,
        hasPc = cy < 3;
      groove(b, {
        k: hasKick ? (cy < 3 ? ["k2", "k2a", "k2", "k2"][q] : "k2") : null,
        kv: cy < 3 ? 0.95 : 0.8,
        sn: hasSn && cy < 4 ? "s2" : null,
        sv: cy < 3 ? 1 : 0.8,
        gh: cy < 6 ? ["g1", "g2", "g3", "g1"][q] : null,
        hat: hasHat ? (cy < 2 ? "hA" : "hF") : null,
        hv: cy < 4 ? 1 : 0.8,
        oh: cy < 2 ? "oA" : null,
        rd: hasRide ? (cy < 3 ? "rA" : "rB") : null,
        rv: cy < 4 ? 1 : 0.8,
        jazz: cy >= 3,
        ft: cy >= 2 && cy < 6 ? "fA" : null,
        shk: hasShk ? 0.7 : 0,
        pc: hasPc ? [b & 1 ? "p2" : "p1"] : null,
        pv: 0.8,
      });
      if (cy === 4)
        for (const s of [4, 12]) {
          Q("SNARE", "snR", tt(b, s), { g: 0.4, hp: 180, dur: 0.3, r: 0.1 });
          sT.push(tt(b, s));
        }
      if (hasBrk)
        brk(b, cy < 2 ? "amen" : "tich", cy < 2 ? q : b & 1, "0---------------", {
          g: cy < 2 ? 0.85 : 0.5,
        });
      if (hasBass) bass(b, cy < 2 ? 0 : 2, { g: cy < 3 ? 1 : 0.9 });
      else if (hasSub2) {
        const r = CH[chordName(b)].r;
        NQ("BASS", "gb", r, tt(b, 0), {
          g: 0.5,
          dur: BAR - 0.03,
          hp: 130,
          lp: 1800,
          a: 0.01,
          r: 0.05,
        });
        NQ("BASS", "mb", r + 12, tt(b, 0), { g: 0.4, dur: 0.4, dec: 0.2, hp: 160 });
      }
      if (cy < 6) comp(b, cy < 2 ? "R1" : cy < 4 ? "R7" : "R4", { g: cy < 4 ? 0.95 : 0.85 });
      else if (q === 0 || q === 2) chord(CH[chordName(b)].lo, tt(b, 0), 30, 0.7, { r: 0.8 });
      if (hasVib) vibes(b, 3, 0.8);
      else if (cy < 5 && q === 1) {
        vb(76, tt(b, 8), 0.36, { dur: 2, dec: 1.2 });
        vb(79, tt(b, 12), 0.36, { dur: 2, dec: 1.2 });
      }
      if (hasStr) strBar(b, cy < 2 ? 0.7 : 0.55);
    }
    crash(tt(184, 0), 0.8);
    hook(184, { bars: 2, g: 0.95 });
    hook(188, { bars: 2, g: 0.95, vowel: "mix" });
    hook(192, { bars: 2, g: 0.9 });
    hook(196, { bars: 1, g: 0.85 });
    hook(200, { bars: 1, g: 0.8, skip: [14] });
    callChop(186, 0, 7, 8, 0.95);
    ansChop(187, 0, 11, 0.95);
    callChop(190, 0, 7, 8, 0.95);
    ansChop(191, 0, 11, 0.95);
    callChop(194, 0, 7, 8, 0.95);
    callChop(198, 0, 7, 8, 0.95);
    ansChop(199, 0, 11, 0.95);
    callChop(202, 0, 7, 8, 0.95);
    ansChop(203, 4, 9, 0.5, { hp: 500, pl: 0.9, dl: 0.5 });
    callChop(206, 0, 7, 8, 0.95);
    callSlow(tt(210, 0), 0.95, { pl: 0.55, dl: 0.3 });
    thread(FV, tt(207, 8), 3.6, 0.3, { pl: 0.7, a: 0.8, r: 1.2, u: 1 });
    for (let t = tt(196, 0); t < tt(212, 0) + 2; t += 2.3)
      Q("FX", "hiss", t, {
        g: 0.12 + 0.012 * Math.min(10, (t - tt(196, 0)) / 2.3),
        a: 0.3,
        r: 0.3,
        pan: (rnd() - 0.5) * 0.5,
      });
    const LV = Object.assign(
      {
        kick: 0.65,
        snare: 0.66,
        hats: 0.9,
        brk: 0.46,
        top: 0.42,
        perc: 0.75,
        sub: 5.6,
        bass: 0.6,
        rhodes: 0.44,
        vibes: 0.14,
        str: 0.5,
        voxF: 0.5,
        voxM: 0.75,
        fx: 0.6,
        dly: 0.5,
        rev: 0.9,
        mus: 0.7,
      },
      opt.lv || {},
    );
    const Mix = opt.mix;
    const info = {};
    const tail = (x, n) => {
      const y = new Float32Array(x.length + n);
      y.set(x);
      return y;
    };
    let pL,
      pR,
      hL,
      hR,
      duckK,
      duckS,
      mainEnv,
      musEnv,
      ready = false;
    const conv = (x, irL, irR, gain, outN) => G.conv2(x, irL, irR, gain, outN);
    function widen(b, ms, amt, hpHz) {
      const D = Math.round((ms * SR) / 1e3);
      const a = 1 - Math.exp((-2 * Math.PI * hpHz) / SR);
      for (const r of E.active(b, 0.05)) {
        const i0 = Math.max(D, r[0]),
          i1 = r[1];
        const m = new Float32Array(i1 - i0 + D);
        let lp = 0;
        for (let i = i0 - D; i < i1; i++) {
          const v = (b.L[i] + b.R[i]) * 0.5;
          lp += a * (v - lp);
          m[i - i0 + D] = v - lp;
        }
        for (let i = i0; i < i1; i++) {
          const sd = m[i - i0] * amt;
          b.L[i] += sd;
          b.R[i] -= sd;
        }
      }
    }
    kT.sort((a, b) => a - b);
    sT.sort((a, b) => a - b);
    const stereo = (b) => (b.mono ? { L: b.L, R: b.L.slice(), name: b.name } : b);
    const scale = (b, g) => {
      for (const r of E.active(b, 0))
        for (let i = r[0]; i < r[1]; i++) {
          b.L[i] *= g;
          b.R[i] *= g;
        }
      return b;
    };
    const sendBus = (key) => flushInto(E.bus(true), key);
    const any = (x) => {
      for (let i = 0; i < x.length; i += 7) if (x[i] !== 0) return true;
      for (let i = 0; i < x.length; i++) if (x[i] !== 0) return true;
      return false;
    };
    const dLp = curve([
      [tt(47, 12), 2e4],
      [tt(48, 0), 9e3],
      [tt(54, 0), 5e3],
      [tt(55, 12), 5e3],
      [tt(56, 0), 2e4],
      [tt(67, 14), 2e4],
      [tt(68, 0), 8e3],
      [tt(71, 12), 6e3],
      [tt(72, 0), 2e4],
      [tt(140, 0), 2e4],
      [tt(143, 12), 2e4],
      [tt(196, 0), 2e4],
      [tt(204, 0), 7e3],
      [tt(212, 0), 2500],
    ]);
    const hpB = curve([
      [tt(140, 0), 30],
      [tt(141, 0), 200],
      [tt(143, 12), 520],
      [tt(144, 0), 30],
    ]);
    const mLp = curve([
      [tt(87, 0), 2e4],
      [tt(87, 8), 6e3],
      [tt(88, 0), 900],
      [tt(88, 8), 300],
      [tt(89, 0), 300],
      [tt(112, 0), 2e4],
      [tt(196, 0), 2e4],
      [tt(204, 0), 9e3],
      [tt(210, 0), 3800],
      [tt(212, 0), 1800],
      [tt(212, 0) + 4, 700],
    ]);
    const mGn = curve([
      [tt(87, 0), 1],
      [tt(87, 12), 0.8],
      [tt(88, 0), 0.45],
      [tt(88, 8), 0],
      [tt(112, 0) - 2e-3, 0],
      [tt(112, 0), 1],
    ]);
    const mG = curve([
      [tt(87, 0), 0],
      [tt(87, 8), 0.3],
      [tt(88, 0), 0.6],
      [tt(89, 0), 0.72],
      [tt(104, 0), 0.75],
      [tt(111, 12), 1.05],
      [tt(112, 0), 1.05],
      [tt(112, 0) + 0.01, 1],
      [tt(128, 0) - 0.01, 1],
      [tt(128, 0), 0.5],
      [tt(136, 0), 0.7],
      [tt(143, 0), 0.85],
      [tt(144, 0), 0.85],
    ]);
    const R0 = ix(tt(87, 0)) - 512,
      R1 = ix(tt(144, 0)) + 512,
      RN = R1 - R0;
    function shared() {
      if (ready) return;
      ready = true;
      pL = tail(S.irL, 2048);
      pR = tail(S.irR, 2048);
      hL = tail(G.resample(S.irL, 0.5), 4096);
      hR = tail(G.resample(S.irR, 0.5), 4096);
      for (const h of [pL, pR]) {
        svf(h, 1, 300, 0.7);
        svf(h, 0, 8500, 0.7);
      }
      for (const h of [hL, hR]) svf(h, 1, 220, 0.7);
      duckK = E.duckEnv(kT, 0.03, 0.12);
      duckS = E.duckEnv(kT.concat(sT), 0.02, 0.14);
      mainEnv = new Float32Array(RN);
      musEnv = new Float32Array(RN);
      const w = E.bus(true);
      w.L.fill(1, R0, R1);
      E.windows(w, FLASH, 3e-3, false);
      for (let i = 0; i < RN; i++) mainEnv[i] = w.L[R0 + i] * mGn((R0 + i) / SR);
      const u = E.bus(true);
      u.L.fill(1, R0, R1);
      E.windows(
        u,
        [[tt(87, 0), tt(112, 0)]].concat(FLASH, [[tt(128, 0), tt(143, 14)]]),
        3e-3,
        true,
      );
      for (let i = 0; i < RN; i++) musEnv[i] = u.L[R0 + i] * mG((R0 + i) / SR) * LV.mus;
    }
    function loopFrom(b, srcT, parts, dstT) {
      let d = ix(dstT);
      const s0 = ix(srcT);
      for (const [steps, count] of parts) {
        const n = Math.round(steps * T16 * SR);
        const sl = b.L.slice(s0, s0 + n),
          sr = b.R.slice(s0, s0 + n);
        const f = Math.min(64, n >> 3);
        for (let k = 0; k < f; k++) {
          const w = k / f;
          sl[k] *= w;
          sr[k] *= w;
          sl[n - 1 - k] *= w;
          sr[n - 1 - k] *= w;
        }
        for (let c = 0; c < count; c++) {
          for (let k = 0; k < n && d + k < N; k++) {
            b.L[d + k] = sl[k];
            b.R[d + k] = sr[k];
          }
          d += n;
        }
      }
    }
    const svfIn = (b, type, fn, q, a, z) => {
      for (const r of E.active(b, 0.25)) {
        const i0 = Math.max(r[0], a),
          i1 = Math.min(r[1], z);
        if (i1 > i0) for (const ch of [b.L, b.R]) svf(ch, type, fn, q, i0, i1);
      }
    };
    function cutUps(b, drum) {
      if (drum) {
        for (const d of DEDITS)
          if (d[0] === "repeat") E.repeat(b, d[1], d[2], d[3], { pitch: d[4] || 0 });
        for (const [a, z] of [
          [tt(47, 12), tt(56, 0)],
          [tt(67, 14), tt(72, 0)],
          [tt(196, 0), tt(212, 0) + 3],
        ])
          svfIn(b, 0, (i) => dLp(i / SR), 0.7, ix(a), Math.min(N, ix(z)));
        svfIn(b, 1, (i) => hpB(i / SR), 0.8, ix(tt(140, 0)), ix(tt(144, 0)));
      }
      for (const e of EDITS) {
        if (e[0] === "tapeStop") E.tapeStop(b, e[1], e[2], e[3]);
        else if (e[0] === "reverse") E.reverseSlice(b, e[1], e[2]);
        else if (e[0] === "mute") E.mute(b, e[1], e[2], 3e-3);
        else if (e[0] === "repeat") E.repeat(b, e[1], e[2], e[3], { pitch: e[4] || 0 });
        else if (e[0] === "loopFrom") loopFrom(b, e[1], e[2], e[3]);
      }
      svfIn(b, 0, (i) => mLp(i / SR), 0.7, ix(tt(87, 0)), ix(tt(88, 8)));
      svfIn(b, 0, (i) => mLp(i / SR), 0.7, ix(tt(196, 0)), N);
      for (let i = 0; i < RN; i++) {
        b.L[R0 + i] *= mainEnv[i];
        b.R[R0 + i] *= mainEnv[i];
      }
    }
    if (opt.edits !== false) {
      const dm = E.bus(false);
      for (const d of DEDITS)
        if (d[0] === "repeat") E.repeat(dm, d[1], d[2], d[3], { pitch: d[4] || 0 });
      for (const e of EDITS) {
        if (e[0] === "tapeStop") E.tapeStop(dm, e[1], e[2], e[3]);
        else if (e[0] === "reverse") E.reverseSlice(dm, e[1], e[2]);
        else if (e[0] === "mute") E.mute(dm, e[1], e[2], 3e-3);
        else if (e[0] === "repeat") E.repeat(dm, e[1], e[2], e[3], { pitch: e[4] || 0 });
        else if (e[0] === "loopFrom" && opt.log)
          opt.log.push({
            tr: "EDIT",
            s: "loop, halving",
            t: e[3],
            d: BAR,
            m: null,
            g: 1,
            pan: 0,
            off: 0,
            pc: null,
            rev: 0,
          });
      }
    }
    E.setQuiet(true);
    {
      const n = BARS * 16 + 1,
        a = new Float32Array(n),
        d = new Float32Array(n),
        u = new Float32Array(n);
      const inWin = (t) =>
        (t >= tt(87, 8) && t < tt(112, 0)) ||
        (t >= tt(128, 0) && t < tt(143, 14)) ||
        FLASH.some((w) => t >= w[0] && t < w[1]);
      for (let k = 0; k < n; k++) {
        const t = (k * BAR) / 16;
        a[k] = t > tt(89, 0) && t < tt(112, 0) ? 2e4 : mLp(t);
        d[k] = dLp(t);
        u[k] = inWin(t) ? mG(t) : 0;
      }
      view.auto["MASTER LP"] = { v: a, lo: 300, hi: 2e4, log: 1, unit: "Hz" };
      view.auto["DRUM LP"] = { v: d, lo: 2500, hi: 2e4, log: 1, unit: "Hz" };
      view.auto["MUSEUM"] = { v: u, lo: 0, hi: 1, unit: "" };
    }
    const phS = tt(112, 0),
      phE = tt(136, 0);
    const voice = (key, name, lv) => () => {
      const b = flush(key, name, false);
      E.each(b, (ch, a, z) => {
        svf(ch, 1, name === "VOX F" ? 190 : 110, 0.7, a, z);
        biquad(ch, "peak", 3100, -3.5, 1.4, a, z);
        biquad(ch, "peak", 1900, 2, 1, a, z);
        biquad(ch, "high", 9500, 2.5, 0.7, a, z);
        biquad(ch, "peak", 450, -2, 1, a, z);
      });
      E.comp(b, -18, 3, 4, 110, 4);
      E.each(b, (ch, a, z) => G.drive(ch, 1.15, 0.9, a, z));
      const pl = sendBus("@plate:" + name),
        dl = sendBus("@dly:" + name);
      E.send(pl, b, 0.1);
      E.send(dl, b, 0.04);
      E.mulEnv(b, duckS, 0.12);
      let mb = null;
      if (name === "VOX F") {
        mb = flush(MVX, name, false);
        E.each(mb, (ch, a, z) => {
          svf(ch, 1, 200, 0.7, a, z);
          biquad(ch, "high", 9e3, 2, 0.7, a, z);
        });
        scale(mb, 0.8);
      }
      return { b: scale(b, lv), pl, dl, mb };
    };
    const TRACKS = [
      [
        "RHODES",
        () => {
          const b = flush("RHODES", "RHODES", false);
          E.each(b, (ch, a, z) => {
            svf(ch, 1, 150, 0.7, a, z);
            G.drive(ch, 2.4, 0.5, a, z);
            biquad(ch, "high", 2600, 4, 0.7, a, z);
            biquad(ch, "peak", 1800, 3, 0.8, a, z);
            biquad(ch, "peak", 2300, 2, 0.9, a, z);
            biquad(ch, "peak", 420, -2, 1, a, z);
            biquad(ch, "high", 8e3, 2, 0.7, a, z);
          });
          E.tremolo(b, 5.6, 0.34);
          E.chorus(b, 1.4, 0.45, 0.32);
          E.phaser(b, 0.21, 400, 2400, 0.3, 0.35, phS, phE);
          E.comp(b, -18, 2.5, 10, 120, 3);
          E.width(b, 1.35, 200);
          const pl = E.bus(true),
            dl = sendBus("@dly:RHODES");
          E.send(pl, b, 0.2, (t) => (t >= phS && t < phE ? 1.6 : 1));
          E.send(dl, b, 0.1, (t) => (t >= phS && t < phE ? 3.5 : 1));
          E.mulEnv(b, duckS, 0.22);
          const mb = flush(MR2, "RHODES", false);
          E.tremolo(mb, 3.1, 0.3);
          E.each(mb, (ch, a, z) => {
            svf(ch, 1, 120, 0.7, a, z);
            biquad(ch, "high", 6e3, -2, 0.7, a, z);
          });
          return { b: scale(b, LV.rhodes), pl, dl, mb: scale(mb, 0.75) };
        },
      ],
      [
        "STRINGS",
        () => {
          const b = flush("STRINGS", "STRINGS", false);
          E.each(b, (ch, a, z) => {
            svf(ch, 1, 160, 0.7, a, z);
            biquad(ch, "peak", 2800, -1.5, 0.8, a, z);
            biquad(ch, "high", 9e3, 2, 0.7, a, z);
          });
          E.width(b, 1.4, 200);
          const pl = E.bus(true);
          E.send(pl, b, 0.5);
          E.mulEnv(b, duckS, 0.3);
          return { b: scale(b, LV.str), pl, mb: scale(flush(MS, "STRINGS", false), 0.9) };
        },
      ],
      ["VOX F", voice(FV, "VOX F", LV.voxF)],
      [
        "VIBES",
        () => {
          const b = flush("VIBES", "VIBES", false);
          E.each(b, (ch, a, z) => {
            svf(ch, 1, 280, 0.7, a, z);
            biquad(ch, "high", 7e3, 1.5, 0.7, a, z);
          });
          const pl = E.bus(true),
            dl = E.bus(true);
          E.send(pl, b, 0.3);
          E.send(dl, b, 0.22);
          E.mulEnv(b, duckS, 0.15);
          return {
            b: scale(b, LV.vibes),
            pl,
            dl,
            mb: scale(flush(MVB, "VIBES", false), 0.8),
          };
        },
      ],
      [
        "BREAK",
        () => {
          const b = flush("BREAK", "BREAK", false);
          const hpF = curve([
            [0, 700],
            [tt(4, 0), 520],
            [tt(8, 0), 260],
            [tt(8, 0) + 0.01, 185],
            [tt(112, 0) - 0.01, 185],
            [tt(112, 0), 120],
            [tt(132, 0), 120],
            [tt(136, 0), 185],
          ]);
          E.each(b, (ch, a, z) => {
            svf(ch, 1, (i) => hpF(i / SR), 0.8, a, z);
            svf(ch, 1, 60, 0.7, a, z);
            biquad(ch, "peak", 3200, 2, 0.8, a, z);
            biquad(ch, "peak", 2300, 2, 0.9, a, z);
            biquad(ch, "high", 9e3, 2.5, 0.7, a, z);
            biquad(ch, "peak", 420, -2.5, 1, a, z);
          });
          E.comp(b, -16, 3, 3, 70, 3);
          widen(b, 14, 0.45, 1200);
          const pl = E.bus(true);
          E.send(pl, b, 0.05);
          scale(b, LV.brk);
          const t = flush("TOP", "BREAK", false);
          E.each(t, (ch, a, z) => {
            svf(ch, 1, 1100, 0.7, a, z);
            svf(ch, 1, 1100, 0.7, a, z);
            biquad(ch, "high", 9e3, 2, 0.7, a, z);
          });
          widen(t, 8, 0.5, 2e3);
          E.mix(b, t, LV.top);
          return { b, pl };
        },
      ],
      ["VOX M", voice(MV, "VOX M", LV.voxM)],
      [
        "HATS",
        () => {
          const b = flush("HATS", "HATS", false);
          E.each(b, (ch, a, z) => {
            svf(ch, 1, 900, 0.7, a, z);
            biquad(ch, "high", 11e3, 1.5, 0.7, a, z);
          });
          widen(b, 11, 0.4, 2500);
          const pl = E.bus(true);
          E.send(pl, b, 0.035);
          return { b: scale(b, LV.hats), pl, mb: flush("m:HATS", "HATS", false) };
        },
      ],
      [
        "PERC",
        () => {
          const b = flush("PERC", "PERC", false);
          E.each(b, (ch, a, z) => {
            svf(ch, 1, 180, 0.7, a, z);
            biquad(ch, "high", 8e3, 1.5, 0.7, a, z);
          });
          const pl = sendBus("@plate:PERC");
          E.send(pl, b, 0.08);
          return { b: scale(b, LV.perc), pl };
        },
      ],
      [
        "SNARE",
        () => {
          const b = flush("SNARE", "SNARE", false);
          E.each(b, (ch, a, z) => {
            svf(ch, 1, 110, 0.7, a, z);
            biquad(ch, "peak", 215, 2.5, 1.2, a, z);
            biquad(ch, "peak", 900, -2, 1.2, a, z);
            biquad(ch, "high", 7e3, 2.5, 0.7, a, z);
            biquad(ch, "peak", 2800, 4, 0.8, a, z);
            G.drive(ch, 1.25, 0.86, a, z);
          });
          return { b: scale(b, LV.snare), pl: sendBus("@plate:SNARE") };
        },
      ],
      [
        "FX",
        () => {
          const b = flush("FX", "FX", false);
          const pl = sendBus("@plate:FX");
          E.send(pl, b, 0.1);
          return { b: scale(b, LV.fx), pl, mb: flush("m:FX", "FX", false) };
        },
      ],
      [
        "GLASS",
        () => ({ b: E.bus(false, "GLASS"), mb: scale(flush(MG, "GLASS", false), 0.8) }),
      ],
      [
        "BASS",
        () => {
          const b = flush("BASS", "BASS", false);
          E.each(b, (ch, a, z) => {
            svf(ch, 1, 150, 0.7, a, z);
            biquad(ch, "peak", 800, 2, 0.9, a, z);
            G.drive(ch, 1.8, 0.7, a, z);
            biquad(ch, "high", 5e3, -3, 0.7, a, z);
          });
          E.comp(b, -18, 3, 6, 100, 3);
          E.width(b, 1, 220);
          E.mulEnv(b, duckK, 0.45);
          return { b: scale(b, LV.bass) };
        },
      ],
      [
        "SUB",
        () => {
          const b = flush("SUB", "SUB", true);
          E.each(b, (ch, a, z) => {
            svf(ch, 0, 160, 0.7, a, z);
            svf(ch, 0, 230, 0.6, a, z);
            G.drive(ch, 1.25, 0.9, a, z);
            svf(ch, 1, 28, 0.7, a, z);
          });
          E.mulEnv(b, duckK, 0.82);
          const md = flush("m:SUB", "SUB", true);
          E.each(md, (ch, a, z) => {
            svf(ch, 0, 150, 0.7, a, z);
            svf(ch, 1, 28, 0.7, a, z);
          });
          return { b: scale(stereo(b), LV.sub), md: scale(stereo(md), 0.8) };
        },
      ],
      [
        "KICK",
        () => {
          const b = flush("KICK", "KICK", true);
          E.each(b, (ch, a, z) => {
            G.drive(ch, 1.3, 0.84, a, z);
            biquad(ch, "peak", 62, 2, 1.1, a, z);
            biquad(ch, "peak", 300, -3, 1.2, a, z);
            biquad(ch, "peak", 3500, 2, 0.9, a, z);
          });
          return { b: scale(stereo(b), LV.kick) };
        },
      ],
    ];
    const ORDER = [
        "KICK",
        "SNARE",
        "HATS",
        "BREAK",
        "PERC",
        "SUB",
        "BASS",
        "RHODES",
        "VIBES",
        "STRINGS",
        "GLASS",
        "VOX F",
        "VOX M",
        "FX",
      ],
      DRUMS = { KICK: 1, SNARE: 1, HATS: 1, BREAK: 1, PERC: 1 };
    const COST = TRACKS.map((t) => t[0]);
    const preD = ix(0.02),
      preH = ix(0.045);
    const a87 = ix(tt(87, 0)),
      z87 = ix(tt(88, 8));
    function track(name) {
      shared();
      const d = TRACKS.find((t) => t[0] === name)[1]();
      const b = d.b,
        drum = !!DRUMS[name],
        M1 = pL.length;
      if (d.dl && any(d.dl.L)) {
        const D = Math.round(T16 * 3 * SR),
          fb = 0.5,
          out = E.bus(false);
        const aL = 1 - Math.exp((-2 * Math.PI * 3800) / SR),
          aH = 1 - Math.exp((-2 * Math.PI * 380) / SR);
        let l1 = 0,
          r1 = 0,
          hl = 0,
          hr = 0;
        const x = d.dl.L;
        for (let i = D; i < N; i++) {
          const inL = x[i - D] + out.R[i - D] * fb,
            inR = out.L[i - D] * 0.85;
          l1 += aL * (inL - l1);
          r1 += aL * (inR - r1);
          hl += aH * (l1 - hl);
          hr += aH * (r1 - hr);
          out.L[i] = Math.abs(l1 - hl) < 1e-9 ? 0 : l1 - hl;
          out.R[i] = Math.abs(r1 - hr) < 1e-9 ? 0 : r1 - hr;
        }
        if (!d.pl) d.pl = E.bus(true);
        E.send(d.pl, out, 0.3);
        E.mulEnv(out, duckS, 0.3);
        E.mix(b, out, LV.dly);
      }
      d.dl = null;
      if (d.pl && any(d.pl.L)) {
        const p = d.pl;
        let a = 0,
          z = N;
        while (a < N && p.L[a] === 0) a++;
        while (z > a && p.L[z - 1] === 0) z--;
        const x = p.L.slice(a, z);
        d.pl = null;
        const s0 = a + preD,
          outN = Math.min(x.length + M1 - 1, N - s0);
        const w = conv(x, pL, pR, 0.01, outN);
        const bl = b.L.subarray(s0),
          br = b.R.subarray(s0),
          wl = w.L,
          wr = w.R,
          dk = duckS.subarray(s0),
          k0 = 0.6 * LV.rev,
          k1 = 0.4 * LV.rev;
        for (let i = 0; i < outN; i++) {
          const g = k0 + k1 * dk[i];
          bl[i] += wl[i] * g;
          br[i] += wr[i] * g;
        }
      }
      d.pl = null;
      cutUps(b, drum);
      const hs = new Float32Array(RN);
      let hasH = false;
      for (let i = a87; i < z87; i++) {
        const v = (b.L[i] + b.R[i]) * 0.5 * 0.55 * Math.min(1, ((i - a87) / (z87 - a87)) * 3);
        if (v !== 0) {
          hs[i + preH - R0] += v;
          hasH = true;
        }
      }
      if (d.mb) {
        const mb = d.mb;
        for (const r of E.active(mb, 0))
          for (let i = Math.max(r[0], R0); i < Math.min(r[1], R1 - preH); i++) {
            const v = (mb.L[i] + mb.R[i]) * 0.5;
            if (v !== 0) {
              hs[i + preH - R0] += v;
              hasH = true;
            }
          }
        for (const ch of [mb.L, mb.R])
          for (const r of E.active(mb, 0.2)) svf(ch, 1, 75, 0.7, r[0], r[1]);
        for (let i = 0; i < RN; i++) {
          const g = musEnv[i] * 0.5;
          b.L[R0 + i] += mb.L[R0 + i] * g;
          b.R[R0 + i] += mb.R[R0 + i] * g;
        }
        d.mb = null;
      }
      if (d.md) {
        for (let i = 0; i < RN; i++) {
          b.L[R0 + i] += d.md.L[R0 + i] * musEnv[i];
          b.R[R0 + i] += d.md.R[R0 + i] * musEnv[i];
        }
        d.md = null;
      }
      if (hasH) {
        const w = conv(hs, hL, hR, 56e-4, RN);
        const bl = b.L.subarray(R0),
          br = b.R.subarray(R0),
          wl = w.L,
          wr = w.R;
        for (let i = 0; i < RN; i++) {
          const g = musEnv[i];
          if (g !== 0) {
            bl[i] += wl[i] * g;
            br[i] += wr[i] * g;
          }
        }
      }
      const st = G.pack(b.L, b.R, name);
      st.drum = drum;
      return st;
    }
    async function master(stems, tape, progress) {
      const tick = (p, label) =>
        new Promise((res) => {
          if (progress) progress(p, label);
          setTimeout(res, 0);
        });
      if (!stems.length || Array.from(stems).some((x) => !x)) throw new Error("stems");
      await tick(0.84, "master");
      const held = new Map();
      const cache = { frames: tape.frames, block: (b) => held.get(b) || null };
      const core = new Mix.Core({
        N,
        SR,
        stems,
        tape: cache,
        par: Object.assign({}, opt.par || {}),
      });
      const out = { L: new Float32Array(N), R: new Float32Array(N) };
      const CK = 1 << 18;
      for (let p = 0; p < N; p += CK) {
        const b0 = Math.floor(p / tape.frames),
          b1 = Math.floor((Math.min(N, p + CK) - 1) / tape.frames);
        for (const k of [...held.keys()]) if (k < b0) held.delete(k);
        const wanted = [];
        for (let b = b0; b <= b1; b++) if (!held.has(b)) wanted.push(b);
        const blocks = await Promise.all(wanted.map((b) => tape.block(b)));
        wanted.forEach((b, k) => held.set(b, blocks[k]));
        core.process(out.L.subarray(p), out.R.subarray(p), Math.min(CK, N - p), null, true);
        if ((p / CK) % 8 === 7) await tick(0.84 + (0.12 * p) / N, "master");
      }
      await tick(0.96, "limiter");
      {
        const lp = core.par.lim;
        const g = E.limit(out, lp.ceil, lp.look, lp.rel, true);
        let mn = 1;
        for (let i = 0; i < N; i++) if (g[i] < mn) mn = g[i];
        info.limMin = +mn.toFixed(3);
        {
          let c1 = 0,
            c2 = 0,
            c3 = 0;
          for (let i = 0; i < N; i++) {
            const v = g[i];
            if (v < 0.891) c1++;
            if (v < 0.794) c2++;
            if (v < 0.708) c3++;
          }
          info.limPct = [c1, c2, c3].map((c) => +((100 * c) / N).toFixed(2));
        }
        core.setLimiter(g);
        core.finish(out.L, out.R, 0, N);
      }
      {
        const a = core.auto;
        const mins = (x) => {
          let m = Infinity;
          for (let i = 0; i < x.length; i++) if (x[i] < m) m = x[i];
          return +(20 * Math.log10(m)).toFixed(1);
        };
        info.gr = { drum: mins(a.drum), lo: mins(a.b0), mid: mins(a.b1), hi: mins(a.b2) };
        info.clipPct = +((100 * core.stat.clip) / core.stat.n).toFixed(2);
        info.dclipPct = +((100 * core.stat.dclip) / core.stat.n).toFixed(2);
        info.clipResidDb = +(10 * Math.log10(core.stat.cE / core.stat.xE + 1e-12)).toFixed(1);
        info.bclipPct = core.stat.b.map((c) => +((100 * c) / core.stat.n).toFixed(2));
        if (core.rec) {
          const pc = (x, a2, z) => {
            const v = Array.from(x.subarray(a2, z))
              .filter((y) => y > 1e-5)
              .sort((p, q) => p - q);
            return [0.1, 0.5, 0.8, 0.95, 0.995, 1].map(
              (f) => +(20 * Math.log10(v[Math.floor(f * (v.length - 1))])).toFixed(1),
            );
          };
          const a0 = Math.round((tt(144, 0) * SR) / Mix.DEC),
            z0 = Math.round((tt(176, 0) * SR) / Mix.DEC);
          info.pk = {
            master: pc(core.rec.pk, a0, z0),
            lowBand: pc(core.rec.pl, a0, z0),
            drumBus: pc(core.rec.pd, a0, z0),
          };
          info.env = {
            drum: pc(core.rec.drum, a0, z0),
            lo: pc(core.rec.b0, a0, z0),
            mid: pc(core.rec.b1, a0, z0),
            hi: pc(core.rec.b2, a0, z0),
          };
        }
      }
      await tick(1, "done");
      return { L: out.L, R: out.R, stems, auto: core.auto, par: core.par, info };
    }
    return { N, SR, tracks: ORDER, cost: COST, track, master, left: () => [...EV.keys()] };
  }
  const api = {
    open,
    title: "\u6697\u304F\u306A\u308A\u304B\u3051",
    BPM,
    SWING,
    BARS,
    TAIL,
    SEC,
    MARKS,
  };
  return api;
};
