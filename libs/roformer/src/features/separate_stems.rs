use std::path::Path;

use candle_core::{DType, Device, Result, Tensor};
use candle_nn::VarBuilder;

use crate::entities::bs_roformer::{BsRoformer, ModelFile};
use crate::shared::stft::{Spectrum, Stft};

pub type Stereo = [Vec<f32>; 2];

pub struct Separator {
    model: BsRoformer,
    file: ModelFile,
    stft: Stft,
    device: Device,
}

impl Separator {
    pub fn load(checkpoint: &Path, config: &str, device: Device) -> Result<Self> {
        let file = ModelFile::parse(config).map_err(candle_core::Error::wrap)?;
        let unsupported = [
            (file.model.skip_connection, "skip_connection"),
            (
                file.model.linear_transformer_depth > 0,
                "linear_transformer_depth",
            ),
            (file.model.use_pope, "use_pope"),
        ];
        if let Some((_, name)) = unsupported.iter().find(|(enabled, _)| *enabled) {
            candle_core::bail!("{name} is not supported yet");
        }
        let tensors = candle_core::pickle::read_all_with_key(checkpoint, None)?
            .into_iter()
            .collect();
        let vb = VarBuilder::from_tensors(tensors, DType::F32, &device);
        let model = BsRoformer::new(&file.model, &vb)?;
        let stft = Stft::new(file.model.stft_n_fft, file.model.stft_hop_length);
        Ok(Self {
            model,
            file,
            stft,
            device,
        })
    }

    #[must_use]
    pub fn stems(&self) -> Vec<String> {
        self.file.stems()
    }

    pub const fn set_chunk(&mut self, chunk_size: usize, overlap: usize) {
        self.file.inference.chunk_size = Some(chunk_size);
        self.file.inference.num_overlap = Some(overlap);
    }

    #[must_use]
    pub fn sample_rate(&self) -> u32 {
        self.file.audio.sample_rate
    }

    fn run_chunk(&self, chunk: &Stereo) -> Result<Vec<Stereo>> {
        let spectra: Vec<Spectrum> = chunk
            .iter()
            .map(|channel| self.stft.forward(channel))
            .collect();
        let (freqs, frames) = (spectra[0].freqs, spectra[0].frames);
        let stack = |pick: fn(&Spectrum) -> &Vec<f32>| -> Result<Tensor> {
            let data: Vec<f32> = spectra
                .iter()
                .flat_map(|spectrum| pick(spectrum).iter().copied())
                .collect();
            Tensor::from_vec(data, (1, 2, freqs, frames), &self.device)
        };
        let (real, imag) = self
            .model
            .forward_spectrum(&stack(|s| &s.real)?, &stack(|s| &s.imag)?)?;
        let real = real.to_device(&Device::Cpu)?.squeeze(0)?;
        let imag = imag.to_device(&Device::Cpu)?.squeeze(0)?;
        let length = chunk[0].len();
        (0..real.dim(0)?)
            .map(|stem| {
                let channel = |index: usize| -> Result<Vec<f32>> {
                    let spectrum = Spectrum {
                        freqs,
                        frames,
                        real: real.get(stem)?.get(index)?.flatten_all()?.to_vec1()?,
                        imag: imag.get(stem)?.get(index)?.flatten_all()?.to_vec1()?,
                    };
                    Ok(self.stft.inverse(&spectrum, length))
                };
                Ok([channel(0)?, channel(1)?])
            })
            .collect()
    }

    pub fn separate(
        &self,
        mix: &Stereo,
        mut progress: impl FnMut(usize, usize),
    ) -> Result<Vec<Stereo>> {
        let chunk_size = self.file.chunk_size();
        let step = chunk_size / self.file.overlap();
        let fade = chunk_size / 10;
        let border = chunk_size - step;
        let original = mix[0].len();
        let padded = original > 2 * border && border > 0;
        let source: Stereo = if padded {
            [reflect_pad(&mix[0], border), reflect_pad(&mix[1], border)]
        } else {
            mix.clone()
        };
        let total = source[0].len();
        let stems = self.stems().len();
        let mut result = vec![[vec![0.0f32; total], vec![0.0f32; total]]; stems];
        let mut counter = vec![0.0f32; total];
        let window = fade_window(chunk_size, fade);
        let starts: Vec<usize> = (0..total).step_by(step).collect();
        for (position, &start) in starts.iter().enumerate() {
            let length = chunk_size.min(total - start);
            let chunk: Stereo = [0, 1].map(|channel| {
                let part = &source[channel][start..start + length];
                if length > chunk_size / 2 {
                    reflect_extend(part, chunk_size)
                } else {
                    zero_extend(part, chunk_size)
                }
            });
            let outputs = self.run_chunk(&chunk)?;
            let first = start == 0;
            let last = start + step >= total;
            for offset in 0..length {
                let weight = if (first && offset < fade) || (last && offset >= chunk_size - fade) {
                    1.0
                } else {
                    window[offset]
                };
                counter[start + offset] += weight;
                for (stem, output) in outputs.iter().enumerate() {
                    for channel in 0..2 {
                        result[stem][channel][start + offset] += output[channel][offset] * weight;
                    }
                }
            }
            progress(position + 1, starts.len());
        }
        let range = if padded {
            border..total - border
        } else {
            0..total
        };
        Ok(result
            .into_iter()
            .map(|stem| {
                stem.map(|channel| {
                    range
                        .clone()
                        .map(|index| {
                            let value = channel[index] / counter[index];
                            if value.is_nan() { 0.0 } else { value }
                        })
                        .collect()
                })
            })
            .collect())
    }
}

fn fade_window(size: usize, fade: usize) -> Vec<f32> {
    let mut window = vec![1.0f32; size];
    if fade > 1 {
        let denominator = (fade - 1) as f32;
        for index in 0..fade {
            let rise = index as f32 / denominator;
            window[index] = rise;
            window[size - fade + index] = 1.0 - rise;
        }
    }
    window
}

fn reflect_index(index: isize, length: usize) -> usize {
    let last = length as isize - 1;
    let mut position = index;
    while position < 0 || position > last {
        position = if position < 0 {
            -position
        } else {
            2 * last - position
        };
    }
    position.unsigned_abs()
}

fn reflect_pad(signal: &[f32], border: usize) -> Vec<f32> {
    let border = border as isize;
    (-border..signal.len() as isize + border)
        .map(|index| signal[reflect_index(index, signal.len())])
        .collect()
}

fn reflect_extend(signal: &[f32], size: usize) -> Vec<f32> {
    (0..size as isize)
        .map(|index| signal[reflect_index(index, signal.len())])
        .collect()
}

fn zero_extend(signal: &[f32], size: usize) -> Vec<f32> {
    let mut out = signal.to_vec();
    out.resize(size, 0.0);
    out
}

#[cfg(test)]
mod tests {
    use candle_core::Device;
    use ndarray::ArrayD;
    use ndarray_npy::NpzReader;

    use super::{Separator, fade_window, reflect_pad};
    use crate::shared::fixtures::{REFERENCE, SW_CHECKPOINT, SW_CONFIG, fetch};

    #[test]
    fn fade_window_matches_linspace() {
        assert_eq!(
            fade_window(10, 3),
            vec![0.0, 0.5, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.5, 0.0]
        );
    }

    #[test]
    fn reflect_pad_mirrors_without_repeating_the_edge() {
        assert_eq!(
            reflect_pad(&[1.0, 2.0, 3.0, 4.0], 2),
            vec![3.0, 2.0, 1.0, 2.0, 3.0, 4.0, 3.0, 2.0]
        );
    }

    fn correlation(left: &[f32], right: &[f32]) -> f64 {
        let dot: f64 = left
            .iter()
            .zip(right)
            .map(|(a, b)| f64::from(*a) * f64::from(*b))
            .sum();
        let norm = |values: &[f32]| {
            values
                .iter()
                .map(|value| f64::from(*value).powi(2))
                .sum::<f64>()
                .sqrt()
        };
        dot / (norm(left) * norm(right))
    }

    #[test]
    fn single_chunk_separation_matches_pytorch() {
        let mut npz = NpzReader::new(std::fs::File::open(fetch(&REFERENCE)).unwrap()).unwrap();
        let audio: ArrayD<f32> = npz.by_name("input_audio").unwrap();
        let expected: ArrayD<f32> = npz.by_name("ref_audio").unwrap();
        let samples = audio.shape()[2];
        let flat = audio.as_slice().unwrap();
        let mix = [flat[..samples].to_vec(), flat[samples..].to_vec()];
        let config = std::fs::read_to_string(fetch(&SW_CONFIG)).unwrap();
        let mut separator = Separator::load(&fetch(&SW_CHECKPOINT), &config, Device::Cpu).unwrap();
        separator.set_chunk(samples, 1);
        let stems = separator.separate(&mix, |_, _| {}).unwrap();
        let reference = expected.as_slice().unwrap();
        for (stem, output) in stems.iter().enumerate() {
            for (channel, values) in output.iter().enumerate() {
                let start = (stem * 2 + channel) * samples;
                let score = correlation(values, &reference[start..start + samples]);
                assert!(
                    score > 0.999_999,
                    "stem {stem} channel {channel} correlation {score}"
                );
            }
        }
    }
}
