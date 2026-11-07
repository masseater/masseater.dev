use std::f64::consts::{PI, TAU};

pub const MODES: usize = 12;
pub const MAX_PODS: usize = 64;
const RING: usize = 128;
const RING_MASK: usize = RING - 1;
const VOICES: usize = MAX_PODS * MODES;
const MAX_CONTACT_SAMPLES: usize = 48;
const STROKE_SECONDS: f64 = 0.06;
const SUBSTEPS: usize = 16;
const SCALE: f64 = 2.2;
const WOOD_RATIOS: [f64; MODES] = [
    1.0, 2.1, 3.3, 4.6, 6.0, 7.4, 8.9, 10.5, 12.2, 14.0, 16.0, 18.1,
];
const METAL_RATIOS: [f64; MODES] = [
    1.0, 1.594, 2.136, 2.653, 3.156, 4.21, 5.43, 6.92, 8.61, 10.73, 12.94, 15.42,
];
pub const HAND_X: (f64, f64) = (-0.3, 0.3);
pub const HAND_Y: (f64, f64) = (-0.2, 0.12);

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Params {
    pub count: usize,
    pub material: f64,
    pub pitch: f64,
    pub decay: f64,
    pub rest: f64,
    pub len: f64,
    pub gain: f64,
    pub bright: f64,
    pub spread: f64,
    pub hi_decay: f64,
    pub hard: f64,
}

impl Default for Params {
    fn default() -> Self {
        Self {
            count: 28,
            gain: 1.0,
            len: 1.0,
            ..Material::Seed.params()
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Material {
    Seed,
    Bamboo,
    Brass,
    Steel,
}

impl Material {
    pub const ALL: [Self; 4] = [Self::Seed, Self::Bamboo, Self::Brass, Self::Steel];

    #[must_use]
    pub const fn params(self) -> Params {
        let (material, decay, pitch, rest, bright, spread, hi_decay, hard) = match self {
            Self::Seed => (0.08, 1.0, 1.0, 0.45, 0.0, 1.0, 1.0, 1.0),
            Self::Bamboo => (0.32, 1.2, 0.8, 0.55, 0.0, 1.0, 1.0, 1.0),
            Self::Brass => (0.78, 1.0, 1.1, 0.6, 0.45, 1.1, 1.3, 2.0),
            Self::Steel => (0.95, 1.4, 1.35, 0.7, 0.55, 1.2, 1.5, 3.0),
        };
        Params {
            count: 28,
            material,
            pitch,
            decay,
            rest,
            len: 1.0,
            gain: 1.0,
            bright,
            spread,
            hi_decay,
            hard,
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct AutoShake {
    pub on: bool,
    pub rate: f64,
    pub amp: f64,
}

impl Default for AutoShake {
    fn default() -> Self {
        Self {
            on: true,
            rate: 2.6,
            amp: 0.5,
        }
    }
}

#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct PodView {
    pub x: f32,
    pub y: f32,
    pub z: f32,
    pub radius: f32,
    pub flash: f32,
    pub knot_x: f32,
    pub knot_z: f32,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Snapshot {
    pub count: usize,
    pub hand: [f32; 3],
    pub hit_rate: f32,
    pub material: f32,
    pub pods: [PodView; MAX_PODS],
}

impl Default for Snapshot {
    fn default() -> Self {
        Self {
            count: 0,
            hand: [0.0; 3],
            hit_rate: 0.0,
            material: 0.0,
            pods: [PodView::default(); MAX_PODS],
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Info {
    pub stiffness: f64,
    pub t60: f64,
    pub f0: f64,
    pub top_frequency: f64,
    pub contact_time: f64,
}

#[derive(Clone, Copy, Default)]
struct Hand {
    x: f64,
    y: f64,
    z: f64,
    vx: f64,
    vy: f64,
    vz: f64,
    tx: f64,
    ty: f64,
}

#[derive(Clone, Copy)]
struct Pod {
    p: [f64; 3],
    v: [f64; 3],
    radius: f64,
    mass: f64,
    string: f64,
    knot: [f64; 2],
    size: f64,
    tune: f64,
    pan: [f64; 2],
    active: i64,
    flash: f32,
}

const POD: Pod = Pod {
    p: [0.0; 3],
    v: [0.0; 3],
    radius: 0.0,
    mass: 0.0,
    string: 0.0,
    knot: [0.0; 2],
    size: 0.0,
    tune: 0.0,
    pan: [0.0; 2],
    active: 0,
    flash: 0.0,
};

#[derive(Clone, Copy, Default)]
struct Mode {
    jitter: f64,
    gain: f64,
}

#[derive(Clone, Copy, Default)]
struct Bank {
    a1: [f64; MODES],
    a2: [f64; MODES],
    y1: [f64; MODES],
    y2: [f64; MODES],
}

struct Lcg(u32);

impl Lcg {
    fn next(&mut self) -> f64 {
        self.0 = self.0.wrapping_mul(1_664_525).wrapping_add(1_013_904_223);
        f64::from(self.0) / 4_294_967_296.0
    }
}

fn lerp(a: f64, b: f64, t: f64) -> f64 {
    a + (b - a) * t
}

fn log_lerp(a: f64, b: f64, t: f64) -> f64 {
    lerp(a.ln(), b.ln(), t).exp()
}

pub struct Engine {
    sample_rate: f64,
    dt: f64,
    params: Params,
    auto: AutoShake,
    phase: f64,
    side: f64,
    recoil: f64,
    hand: Hand,
    pods: [Pod; MAX_PODS],
    modes: Box<[Mode]>,
    banks: Box<[Bank]>,
    ring: Box<[f64]>,
    n: usize,
    substep: usize,
    read: usize,
    hits: u32,
    hit_rate: f64,
    hit_time: f64,
    stiffness: f64,
    t60: f64,
    f0: f64,
    top_frequency: f64,
    material_gain: f64,
    rng: Lcg,
}

impl Engine {
    #[must_use]
    pub fn new(sample_rate: f64, params: Params, auto: AutoShake) -> Self {
        let mut engine = Self {
            sample_rate,
            dt: SUBSTEPS as f64 / sample_rate,
            params,
            auto,
            phase: 0.0,
            side: -1.0,
            recoil: 0.0,
            hand: Hand::default(),
            pods: [POD; MAX_PODS],
            modes: vec![Mode::default(); MAX_PODS * MODES].into_boxed_slice(),
            banks: vec![Bank::default(); MAX_PODS].into_boxed_slice(),
            ring: vec![0.0; RING * VOICES].into_boxed_slice(),
            n: 0,
            substep: 0,
            read: 0,
            hits: 0,
            hit_rate: 0.0,
            hit_time: 0.0,
            stiffness: 3e9,
            t60: 0.02,
            f0: 2400.0,
            top_frequency: 0.0,
            material_gain: 28.0,
            rng: Lcg(1),
        };
        engine.build();
        engine
    }

    #[must_use]
    pub const fn sample_rate(&self) -> f64 {
        self.sample_rate
    }

    #[must_use]
    pub const fn params(&self) -> &Params {
        &self.params
    }

    pub fn set_params(&mut self, params: Params) {
        if params == self.params && self.n > 0 {
            return;
        }
        let rebuild = params.count != self.params.count;
        self.params = params;
        if rebuild {
            self.build();
        } else {
            self.retune();
        }
    }

    pub fn set_auto(&mut self, auto: AutoShake) {
        self.auto = auto;
    }

    pub fn set_target(&mut self, x: f64, y: f64) {
        self.auto.on = false;
        self.recoil = 0.0;
        self.hand.tx = x.clamp(HAND_X.0, HAND_X.1);
        self.hand.ty = y.clamp(HAND_Y.0, HAND_Y.1);
    }

    pub fn stroke(&mut self, strength: f64) {
        self.side = -self.side;
        let reach = self.auto.amp * strength.clamp(0.0, 1.0);
        self.set_target(self.side * 0.1 * reach, 0.028 * reach);
        self.recoil = STROKE_SECONDS;
    }

    #[must_use]
    pub fn hand_target(&self) -> (f64, f64) {
        (self.hand.tx, self.hand.ty)
    }

    #[must_use]
    pub fn info(&self) -> Info {
        let reduced_mass: f64 = 0.002;
        let effective = self.stiffness / 1.8;
        let contact_time =
            2.87 * (reduced_mass * reduced_mass / (0.003 * effective * effective)).powf(0.2);
        Info {
            stiffness: self.stiffness,
            t60: self.t60,
            f0: self.f0,
            top_frequency: self.top_frequency,
            contact_time,
        }
    }

    fn build(&mut self) {
        let old = self.n;
        self.n = self.params.count.clamp(1, MAX_PODS);
        self.rng = Lcg(777);
        for i in 0..self.n {
            let s = 0.75 + 0.5 * self.rng.next();
            let string = 0.045 + 0.085 * self.rng.next();
            let angle = self.rng.next() * TAU;
            let reach = 0.004 + 0.009 * self.rng.next();
            let tune = self.rng.next();
            for k in 0..MODES {
                self.modes[i * MODES + k].jitter = self.rng.next();
            }
            let pod = &mut self.pods[i];
            pod.size = s;
            pod.radius = 0.016 * s;
            pod.mass = 0.004 * s * s;
            pod.string = string;
            pod.knot = [angle.cos() * reach, angle.sin() * reach];
            pod.tune = tune;
            if i >= old {
                pod.p = [
                    self.hand.x + pod.knot[0] * 4.0,
                    self.hand.y - string * self.params.len * 0.95,
                    self.hand.z + pod.knot[1] * 4.0,
                ];
                pod.v = [0.0; 3];
            }
        }
        for pod in &mut self.pods[self.n..old.max(self.n)] {
            pod.active = 0;
        }
        self.retune();
    }

    fn retune(&mut self) {
        let p = self.params;
        let mt = p.material;
        let sr = self.sample_rate;
        self.f0 = p.pitch * log_lerp(2300.0, 1700.0, mt);
        self.t60 = log_lerp(0.022, 2.4, mt) * p.decay;
        self.stiffness = log_lerp(2.5e9, 1.1e11, mt) * p.hard;
        self.material_gain = log_lerp(28.0, 3.0, mt);
        let power = lerp(1.7, 0.45, mt) / p.hi_decay;
        let tilt = (lerp(0.95, 0.3, mt) - p.bright).max(-0.5);
        self.top_frequency = 0.0;
        for i in 0..self.n {
            let pod = &self.pods[i];
            let f0 = (self.f0 / pod.size) * (0.92 + 0.16 * pod.tune);
            for k in 0..MODES {
                let bank = &mut self.banks[i];
                let mode = &mut self.modes[i * MODES + k];
                let ratio = (1.0 + (lerp(WOOD_RATIOS[k], METAL_RATIOS[k], mt) - 1.0) * p.spread)
                    * (1.0 + 0.05 * (mode.jitter - 0.5));
                let f = f0 * ratio;
                if f > 0.45 * sr {
                    bank.a1[k] = 0.0;
                    bank.a2[k] = 0.0;
                    mode.gain = 0.0;
                    continue;
                }
                let w = (2.0 * PI * f) / sr;
                let t = self.t60 / ratio.powf(power);
                let r = 10f64.powf(-3.0 / (t * sr));
                bank.a1[k] = 2.0 * r * w.cos();
                bank.a2[k] = r * r;
                mode.gain = w.sin()
                    * ((k + 1) as f64).powf(-tilt)
                    * if k == 0 { 1.0 } else { lerp(0.55, 1.0, mt) };
                if f > self.top_frequency {
                    self.top_frequency = f;
                }
            }
        }
    }

    fn excite(&mut self, i: usize, force: f64, pulse: &[f64], offset: usize) {
        for k in 0..MODES {
            let id = i * MODES + k;
            let gain = self.modes[id].gain;
            if gain == 0.0 {
                continue;
            }
            let amp = (force * gain * (0.2 + 0.8 * self.rng.next()) * SCALE * self.material_gain)
                / self.sample_rate;
            for (s, shape) in pulse.iter().enumerate() {
                self.ring[((self.read + offset + s) & RING_MASK) * VOICES + id] += amp * shape;
            }
        }
        self.pods[i].active = (self.sample_rate * self.t60 * 1.3).ceil() as i64 + RING as i64;
    }

    fn hit(&mut self, i: usize, j: usize, vn: f64, impulse: f64, frac: f64) {
        self.hits += 1;
        let bump = (impulse * 30.0) as f32;
        self.pods[i].flash = (self.pods[i].flash + bump).min(1.0);
        self.pods[j].flash = (self.pods[j].flash + bump).min(1.0);
        let (mi, mj) = (self.pods[i].mass, self.pods[j].mass);
        let reduced = mi * mj / (mi + mj);
        let effective = self.stiffness / 1.8;
        let mut tau = 2.87 * (reduced * reduced / (0.003 * effective * effective * vn)).powf(0.2);
        let mut samples = tau * self.sample_rate;
        if samples < 1.0 {
            samples = 1.0;
            tau = 1.0 / self.sample_rate;
        }
        if samples > MAX_CONTACT_SAMPLES as f64 {
            samples = MAX_CONTACT_SAMPLES as f64;
            tau = samples / self.sample_rate;
        }
        let force = (impulse * PI) / (2.0 * tau);
        let offset = (SUBSTEPS as f64 * (1.0 - frac))
            .floor()
            .clamp(0.0, (SUBSTEPS - 1) as f64) as usize;
        let mut pulse = [0.0; MAX_CONTACT_SAMPLES];
        let mut len = 0;
        for (s, shape) in pulse.iter_mut().enumerate().take(samples.ceil() as usize) {
            let ph = (s as f64 + 0.5) / samples;
            if ph >= 1.0 {
                break;
            }
            *shape = (PI * ph).sin();
            len = s + 1;
        }
        self.excite(i, force, &pulse[..len], offset);
        self.excite(j, force, &pulse[..len], offset);
    }

    fn collide(&mut self) {
        let n = self.n;
        let dt = self.dt;
        let rest = self.params.rest;
        let mu = 0.25;
        for i in 0..n {
            for j in i + 1..n {
                let (pi, pj) = (self.pods[i], self.pods[j]);
                let dx = pi.p[0] - pj.p[0];
                let dy = pi.p[1] - pj.p[1];
                let dz = pi.p[2] - pj.p[2];
                let reach = pi.radius + pj.radius;
                let d2 = dx * dx + dy * dy + dz * dz;
                if d2 >= reach * reach || d2 < 1e-14 {
                    continue;
                }
                let d = d2.sqrt();
                let normal = [dx / d, dy / d, dz / d];
                let overlap = reach - d;
                let rv = [pi.v[0] - pj.v[0], pi.v[1] - pj.v[1], pi.v[2] - pj.v[2]];
                let vn = rv[0] * normal[0] + rv[1] * normal[1] + rv[2] * normal[2];
                let wi = 1.0 / pi.mass;
                let wj = 1.0 / pj.mass;
                let ws = wi + wj;
                for a in 0..3 {
                    self.pods[i].p[a] += (normal[a] * overlap * 0.7 * wi) / ws;
                }
                for a in 0..3 {
                    self.pods[j].p[a] -= (normal[a] * overlap * 0.7 * wj) / ws;
                }
                if vn >= 0.0 {
                    continue;
                }
                let loud = -vn > 0.05;
                let impulse = (-(1.0 + if loud { rest } else { 0.05 }) * vn) / ws;
                for a in 0..3 {
                    self.pods[i].v[a] += impulse * wi * normal[a];
                }
                for a in 0..3 {
                    self.pods[j].v[a] -= impulse * wj * normal[a];
                }
                let t = [
                    rv[0] - vn * normal[0],
                    rv[1] - vn * normal[1],
                    rv[2] - vn * normal[2],
                ];
                let vt = (t[0] * t[0] + t[1] * t[1] + t[2] * t[2]).sqrt();
                if vt > 1e-6 {
                    let jt = (mu * impulse).min(vt / ws) / vt;
                    for a in 0..3 {
                        self.pods[i].v[a] -= jt * wi * t[a];
                    }
                    for a in 0..3 {
                        self.pods[j].v[a] += jt * wj * t[a];
                    }
                }
                if loud {
                    let frac = (overlap / (-vn * dt)).min(1.0);
                    self.hit(i, j, -vn, impulse, frac);
                }
            }
        }
    }

    fn physics(&mut self) {
        let dt = self.dt;
        if self.auto.on {
            self.phase += 2.0 * PI * self.auto.rate * dt;
            let a = self.auto.amp;
            self.hand.tx = a * 0.1 * self.phase.sin() + a * 0.012 * (self.phase * 2.7 + 1.3).sin();
            self.hand.ty = a * 0.028 * (2.0 * self.phase + 0.6).sin();
        }
        if self.recoil > 0.0 {
            self.recoil -= dt;
            if self.recoil <= 0.0 {
                self.hand.tx = 0.0;
                self.hand.ty = 0.0;
            }
        }
        let follow = 1.0 - (-dt * 70.0).exp();
        let h = &mut self.hand;
        let nx = h.x + (h.tx - h.x) * follow;
        let ny = h.y + (h.ty - h.y) * follow;
        h.vx = (nx - h.x) / dt;
        h.vy = (ny - h.y) / dt;
        h.vz = 0.0;
        h.x = nx;
        h.y = ny;
        let hand = *h;
        let damp = 1.0 - dt * 0.35;
        let len = self.params.len;
        let n = self.n;
        for pod in &mut self.pods[..n] {
            pod.v[1] -= 9.81 * dt;
            for a in 0..3 {
                pod.v[a] *= damp;
            }
            for a in 0..3 {
                pod.p[a] += pod.v[a] * dt;
            }
            let q = [hand.x + pod.knot[0], hand.y, hand.z + pod.knot[1]];
            let l = pod.string * len;
            let mut d = [pod.p[0] - q[0], pod.p[1] - q[1], pod.p[2] - q[2]];
            let dist = (d[0] * d[0] + d[1] * d[1] + d[2] * d[2]).sqrt();
            if dist > l {
                for a in 0..3 {
                    d[a] /= dist;
                    pod.p[a] = q[a] + d[a] * l;
                }
                let vr = (pod.v[0] - hand.vx) * d[0]
                    + (pod.v[1] - hand.vy) * d[1]
                    + (pod.v[2] - hand.vz) * d[2];
                if vr > 0.0 {
                    for a in 0..3 {
                        pod.v[a] -= d[a] * vr * 1.02;
                    }
                }
            }
            if pod.p[1] > q[1] - pod.radius {
                pod.p[1] = q[1] - pod.radius;
                if pod.v[1] > hand.vy {
                    pod.v[1] = hand.vy;
                }
            }
        }
        self.collide();
        for pod in &mut self.pods[..n] {
            let p = (pod.p[0] / 0.12).clamp(-1.0, 1.0);
            let a = ((p + 1.0) * PI) / 4.0;
            pod.pan = [a.cos(), a.sin()];
        }
        self.hit_time += dt;
        if self.hit_time >= 0.1 {
            self.hit_rate = self.hit_rate * 0.6 + (f64::from(self.hits) / self.hit_time) * 0.4;
            self.hits = 0;
            self.hit_time = 0.0;
        }
    }

    #[inline]
    pub fn tick(&mut self) -> (f64, f64) {
        if self.substep == 0 {
            self.physics();
        }
        self.substep += 1;
        if self.substep == SUBSTEPS {
            self.substep = 0;
        }
        let mut l = 0.0;
        let mut r = 0.0;
        for i in 0..self.n {
            if self.pods[i].active <= 0 {
                continue;
            }
            self.pods[i].active -= 1;
            let bank = &mut self.banks[i];
            if self.pods[i].active == 0 {
                bank.y1 = [0.0; MODES];
                bank.y2 = [0.0; MODES];
                continue;
            }
            let row = &mut self.ring[self.read * VOICES + i * MODES..][..MODES];
            let mut next = [0.0; MODES];
            for k in 0..MODES {
                next[k] = bank.a1[k] * bank.y1[k] - bank.a2[k] * bank.y2[k] + row[k];
            }
            row.fill(0.0);
            bank.y2 = bank.y1;
            bank.y1 = next;
            let y = next.iter().fold(0.0, |sum, v| sum + v);
            l += y * self.pods[i].pan[0];
            r += y * self.pods[i].pan[1];
        }
        self.read = (self.read + 1) & RING_MASK;
        let g = self.params.gain;
        ((l * g).tanh(), (r * g).tanh())
    }

    pub fn render(&mut self, left: &mut [f32], right: &mut [f32]) {
        for (l, r) in left.iter_mut().zip(right.iter_mut()) {
            let (a, b) = self.tick();
            *l = a as f32;
            *r = b as f32;
        }
    }

    pub fn snapshot(&mut self, out: &mut Snapshot) {
        out.count = self.n;
        out.hand = [self.hand.x as f32, self.hand.y as f32, self.hand.z as f32];
        out.hit_rate = self.hit_rate as f32;
        out.material = self.params.material as f32;
        for (view, pod) in out.pods.iter_mut().zip(self.pods.iter_mut()).take(self.n) {
            *view = PodView {
                x: pod.p[0] as f32,
                y: pod.p[1] as f32,
                z: pod.p[2] as f32,
                radius: pod.radius as f32,
                flash: pod.flash,
                knot_x: (self.hand.x + pod.knot[0]) as f32,
                knot_z: (self.hand.z + pod.knot[1]) as f32,
            };
            pod.flash *= 0.78;
        }
    }
}
