pub mod editor;
mod params;

use atomic_float::AtomicF32;
use nice_plug::prelude::*;
use pod_rattle_engine::{Engine, Snapshot};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use triple_buffer::TripleBuffer;

pub use params::RattleParams;

const SNAPSHOT_RATE: f32 = 60.0;

pub struct Telemetry {
    pub snapshot: Mutex<triple_buffer::Output<Snapshot>>,
    pub grabbing: AtomicBool,
    pub target_x: AtomicF32,
    pub target_y: AtomicF32,
}

impl Telemetry {
    #[must_use]
    pub fn new() -> (Self, triple_buffer::Input<Snapshot>) {
        let (input, output) = TripleBuffer::new(&Snapshot::default()).split();
        let telemetry = Self {
            snapshot: Mutex::new(output),
            grabbing: AtomicBool::new(false),
            target_x: AtomicF32::new(0.0),
            target_y: AtomicF32::new(0.0),
        };
        (telemetry, input)
    }
}

pub struct PodRattle {
    params: Arc<RattleParams>,
    telemetry: Arc<Telemetry>,
    snapshot: triple_buffer::Input<Snapshot>,
    engine: Option<Engine>,
    sample_rate: f32,
    since_snapshot: usize,
}

impl Default for PodRattle {
    fn default() -> Self {
        let (telemetry, snapshot) = Telemetry::new();
        Self {
            params: Arc::new(RattleParams::default()),
            telemetry: Arc::new(telemetry),
            snapshot,
            engine: None,
            sample_rate: 48_000.0,
            since_snapshot: 0,
        }
    }
}

impl Plugin for PodRattle {
    const NAME: &'static str = "Pod Rattle";
    const VENDOR: &'static str = "masseater";
    const URL: &'static str = "https://masseater.dev/pod-rattle/";
    const EMAIL: &'static str = "";
    const VERSION: &'static str = env!("CARGO_PKG_VERSION");

    const AUDIO_IO_LAYOUTS: &'static [AudioIOLayout] = &[AudioIOLayout {
        main_input_channels: None,
        main_output_channels: NonZeroU32::new(2),
        ..AudioIOLayout::const_default()
    }];

    const MIDI_INPUT: MidiConfig = MidiConfig::Basic;
    const SAMPLE_ACCURATE_AUTOMATION: bool = false;

    type Editor = editor::RattleEditor;
    type SysExMessage = ();
    type BackgroundTask = ();

    fn params(&self) -> Arc<dyn Params> {
        self.params.clone()
    }

    fn editor(&mut self, _async_executor: AsyncExecutor<Self>) -> Option<Self::Editor> {
        editor::create(self.params.clone(), self.telemetry.clone())
    }

    fn activate(
        &mut self,
        _audio_io_layout: &AudioIOLayout,
        buffer_config: &BufferConfig,
        _context: &mut impl ActivateContext<Self>,
    ) -> bool {
        self.sample_rate = buffer_config.sample_rate;
        self.engine = Some(Engine::new(
            f64::from(buffer_config.sample_rate),
            self.params.engine_params(),
            self.params.auto_shake(),
        ));
        true
    }

    fn reset(&mut self) {
        if let Some(engine) = self.engine.as_mut() {
            engine.reset(self.params.engine_params(), self.params.auto_shake());
        }
    }

    fn process(
        &mut self,
        buffer: &mut Buffer,
        _aux: &mut AuxiliaryBuffers,
        context: &mut impl ProcessContext<Self>,
    ) -> ProcessStatus {
        let Some(engine) = self.engine.as_mut() else {
            return ProcessStatus::Normal;
        };
        engine.set_params(self.params.engine_params());
        let auto = self.params.auto_shake();
        engine.set_auto(auto);
        let telemetry = &self.telemetry;
        if telemetry.grabbing.load(Ordering::Relaxed) {
            engine.set_target(
                f64::from(telemetry.target_x.load(Ordering::Relaxed)),
                f64::from(telemetry.target_y.load(Ordering::Relaxed)),
            );
        }

        let samples = buffer.samples();
        let [left, right] = buffer.as_slice() else {
            return ProcessStatus::Normal;
        };
        let mut pos = 0;
        while let Some(event) = context.next_event() {
            let at = (event.timing() as usize).min(samples);
            engine.render(&mut left[pos..at], &mut right[pos..at]);
            pos = at;
            if let NoteEvent::NoteOn { velocity, .. } = event
                && !auto.on
            {
                engine.stroke(f64::from(velocity));
            }
        }
        engine.render(&mut left[pos..], &mut right[pos..]);

        self.since_snapshot += samples;
        if self.since_snapshot as f32 >= self.sample_rate / SNAPSHOT_RATE {
            self.since_snapshot = 0;
            engine.snapshot(self.snapshot.input_buffer_mut());
            self.snapshot.publish();
        }

        ProcessStatus::KeepAlive
    }
}

impl ClapPlugin for PodRattle {
    const CLAP_ID: &'static str = "dev.masseater.pod-rattle";
    const CLAP_DESCRIPTION: Option<&'static str> =
        Some("Physical-modeling seed-pod rattle: 3D collisions driving modal resonators");
    const CLAP_MANUAL_URL: Option<&'static str> = Some(Self::URL);
    const CLAP_SUPPORT_URL: Option<&'static str> = None;
    const CLAP_FEATURES: &'static [ClapFeature] = &[
        ClapFeature::Instrument,
        ClapFeature::Synthesizer,
        ClapFeature::Drum,
        ClapFeature::Stereo,
    ];
}

impl Vst3Plugin for PodRattle {
    const VST3_CLASS_ID: [u8; 16] = *b"MasseaterPodRatl";
    const VST3_SUBCATEGORIES: &'static [Vst3SubCategory] = &[
        Vst3SubCategory::Instrument,
        Vst3SubCategory::Synth,
        Vst3SubCategory::Drum,
        Vst3SubCategory::Stereo,
    ];
}

nice_export_clap!(PodRattle);
nice_export_vst3!(PodRattle);
