pub const MODES: usize = 12;
pub const MAX_PODS: usize = 64;

pub const HAND_X: (f64, f64) = (-0.3, 0.3);
pub const HAND_Y: (f64, f64) = (-0.2, 0.12);
pub const HAND_Z: (f64, f64) = (-0.3, 0.3);

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
