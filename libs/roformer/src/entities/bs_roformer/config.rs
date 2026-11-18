use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct ModelFile {
    pub audio: AudioSection,
    pub model: BsRoformerConfig,
    #[serde(default)]
    pub inference: InferenceSection,
    pub training: TrainingSection,
}

#[derive(Debug, Deserialize)]
pub struct AudioSection {
    pub chunk_size: usize,
    pub sample_rate: u32,
}

#[derive(Debug, Default, Deserialize)]
pub struct InferenceSection {
    pub chunk_size: Option<usize>,
    pub num_overlap: Option<usize>,
}

#[derive(Debug, Deserialize)]
pub struct TrainingSection {
    pub instruments: Vec<String>,
    pub target_instrument: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct BsRoformerConfig {
    pub dim: usize,
    pub depth: usize,
    #[serde(default = "one")]
    pub num_stems: usize,
    #[serde(default = "eight")]
    pub heads: usize,
    #[serde(default = "sixty_four")]
    pub dim_head: usize,
    #[serde(default = "two")]
    pub time_transformer_depth: usize,
    #[serde(default = "two")]
    pub freq_transformer_depth: usize,
    #[serde(default)]
    pub linear_transformer_depth: usize,
    #[serde(default = "two")]
    pub mask_estimator_depth: usize,
    #[serde(default = "four")]
    pub mlp_expansion_factor: usize,
    pub freqs_per_bands: Vec<usize>,
    #[serde(default = "n_fft")]
    pub stft_n_fft: usize,
    #[serde(default = "hop")]
    pub stft_hop_length: usize,
    #[serde(default)]
    pub skip_connection: bool,
    #[serde(default)]
    pub use_pope: bool,
}

const fn one() -> usize {
    1
}
const fn two() -> usize {
    2
}
const fn four() -> usize {
    4
}
const fn eight() -> usize {
    8
}
const fn sixty_four() -> usize {
    64
}
const fn n_fft() -> usize {
    2048
}
const fn hop() -> usize {
    512
}

impl ModelFile {
    pub fn parse(text: &str) -> Result<Self, serde_saphyr::Error> {
        serde_saphyr::from_str(&text.replace("!!python/tuple", ""))
    }

    #[must_use]
    pub fn chunk_size(&self) -> usize {
        self.inference.chunk_size.unwrap_or(self.audio.chunk_size)
    }

    #[must_use]
    pub fn overlap(&self) -> usize {
        self.inference.num_overlap.unwrap_or(2)
    }

    #[must_use]
    pub fn stems(&self) -> Vec<String> {
        match &self.training.target_instrument {
            Some(target) => vec![target.clone()],
            None => self.training.instruments.clone(),
        }
    }
}
