use nih_plug::prelude::*;
use nih_plug_egui::EguiState;
use pod_rattle_engine::{AutoShake, Material, Params as EngineParams};
use std::sync::Arc;

pub const EDITOR_SIZE: (u32, u32) = (960, 600);

#[derive(Params)]
pub struct RattleParams {
    #[persist = "editor-state"]
    pub editor_state: Arc<EguiState>,

    #[id = "material"]
    pub material: FloatParam,
    #[id = "decay"]
    pub decay: FloatParam,
    #[id = "pitch"]
    pub pitch: FloatParam,
    #[id = "rest"]
    pub rest: FloatParam,
    #[id = "bright"]
    pub bright: FloatParam,
    #[id = "spread"]
    pub spread: FloatParam,
    #[id = "hiDecay"]
    pub hi_decay: FloatParam,
    #[id = "hard"]
    pub hard: FloatParam,
    #[id = "count"]
    pub count: IntParam,
    #[id = "len"]
    pub len: FloatParam,
    #[id = "auto"]
    pub auto: BoolParam,
    #[id = "rate"]
    pub rate: FloatParam,
    #[id = "amp"]
    pub amp: FloatParam,
    #[id = "gain"]
    pub gain: FloatParam,
}

fn linear(name: &str, default: f64, min: f32, max: f32) -> FloatParam {
    FloatParam::new(name, default as f32, FloatRange::Linear { min, max })
        .with_step_size((max - min) / 1000.0)
}

fn two_decimals() -> Arc<dyn Fn(f32) -> String + Send + Sync> {
    Arc::new(|v| format!("{v:.2}"))
}

impl Default for RattleParams {
    fn default() -> Self {
        let p = EngineParams::default();
        let auto = AutoShake::default();
        Self {
            editor_state: EguiState::from_size(EDITOR_SIZE.0, EDITOR_SIZE.1),
            material: linear("Hardness", p.material, 0.0, 1.0).with_value_to_string(two_decimals()),
            decay: linear("Ring", p.decay, 0.3, 3.0).with_value_to_string(two_decimals()),
            pitch: linear("Pitch", p.pitch, 0.5, 2.0).with_value_to_string(two_decimals()),
            rest: linear("Bounce", p.rest, 0.1, 0.9).with_value_to_string(two_decimals()),
            bright: linear("Brightness", p.bright, -0.5, 1.2).with_value_to_string(two_decimals()),
            spread: linear("Spread", p.spread, 0.6, 1.8).with_value_to_string(two_decimals()),
            hi_decay: linear("High ring", p.hi_decay, 0.4, 3.0)
                .with_value_to_string(two_decimals()),
            hard: linear("Contact", p.hard, 0.2, 8.0).with_value_to_string(two_decimals()),
            count: IntParam::new("Pods", p.count as i32, IntRange::Linear { min: 4, max: 48 }),
            len: linear("String", p.len, 0.5, 1.6).with_value_to_string(two_decimals()),
            auto: BoolParam::new("Auto shake", false),
            rate: linear("Shake rate", auto.rate, 0.5, 7.0)
                .with_unit(" Hz")
                .with_value_to_string(Arc::new(|v| format!("{v:.1}"))),
            amp: linear("Shake width", auto.amp, 0.05, 1.0)
                .with_value_to_string(Arc::new(|v| format!("±{:.0} cm", v * 10.0))),
            gain: linear("Volume", p.gain, 0.0, 2.0)
                .with_unit(" %")
                .with_value_to_string(Arc::new(|v| format!("{:.0}", v * 100.0))),
        }
    }
}

impl RattleParams {
    pub fn engine_params(&self) -> EngineParams {
        EngineParams {
            count: self.count.value() as usize,
            material: f64::from(self.material.value()),
            pitch: f64::from(self.pitch.value()),
            decay: f64::from(self.decay.value()),
            rest: f64::from(self.rest.value()),
            len: f64::from(self.len.value()),
            gain: f64::from(self.gain.value()),
            bright: f64::from(self.bright.value()),
            spread: f64::from(self.spread.value()),
            hi_decay: f64::from(self.hi_decay.value()),
            hard: f64::from(self.hard.value()),
        }
    }

    pub fn auto_shake(&self) -> AutoShake {
        AutoShake {
            on: self.auto.value(),
            rate: f64::from(self.rate.value()),
            amp: f64::from(self.amp.value()),
        }
    }

    pub fn material_fields(&self, material: Material) -> [(&FloatParam, f32); 8] {
        let p = material.params();
        [
            (&self.material, p.material as f32),
            (&self.decay, p.decay as f32),
            (&self.pitch, p.pitch as f32),
            (&self.rest, p.rest as f32),
            (&self.bright, p.bright as f32),
            (&self.spread, p.spread as f32),
            (&self.hi_decay, p.hi_decay as f32),
            (&self.hard, p.hard as f32),
        ]
    }
}
