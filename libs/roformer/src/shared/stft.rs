use std::f32::consts::PI;
use std::sync::Arc;

use realfft::num_complex::Complex32;
use realfft::{ComplexToReal, RealFftPlanner, RealToComplex};

pub struct Spectrum {
    pub freqs: usize,
    pub frames: usize,
    pub real: Vec<f32>,
    pub imag: Vec<f32>,
}

pub struct Stft {
    n_fft: usize,
    hop: usize,
    window: Vec<f32>,
    forward: Arc<dyn RealToComplex<f32>>,
    inverse: Arc<dyn ComplexToReal<f32>>,
}

impl Stft {
    #[must_use]
    pub fn new(n_fft: usize, hop: usize) -> Self {
        let window = (0..n_fft)
            .map(|index| 0.5 - 0.5 * (2.0 * PI * index as f32 / n_fft as f32).cos())
            .collect();
        let mut planner = RealFftPlanner::<f32>::new();
        Self {
            n_fft,
            hop,
            window,
            forward: planner.plan_fft_forward(n_fft),
            inverse: planner.plan_fft_inverse(n_fft),
        }
    }

    #[must_use]
    pub fn frames(&self, samples: usize) -> usize {
        samples / self.hop + 1
    }

    #[must_use]
    pub fn forward(&self, signal: &[f32]) -> Spectrum {
        let freqs = self.n_fft / 2 + 1;
        let frames = self.frames(signal.len());
        let half = (self.n_fft / 2) as isize;
        let mut real = vec![0.0; freqs * frames];
        let mut imag = vec![0.0; freqs * frames];
        let mut input = self.forward.make_input_vec();
        let mut output = self.forward.make_output_vec();
        for frame in 0..frames {
            let start = (frame * self.hop) as isize - half;
            for (offset, slot) in input.iter_mut().enumerate() {
                *slot = reflect(signal, start + offset as isize) * self.window[offset];
            }
            self.forward
                .process(&mut input, &mut output)
                .expect("buffer sizes come from the same plan");
            for (freq, value) in output.iter().enumerate() {
                real[freq * frames + frame] = value.re;
                imag[freq * frames + frame] = value.im;
            }
        }
        Spectrum {
            freqs,
            frames,
            real,
            imag,
        }
    }

    #[must_use]
    pub fn inverse(&self, spectrum: &Spectrum, length: usize) -> Vec<f32> {
        let half = self.n_fft / 2;
        let padded = self.n_fft + self.hop * (spectrum.frames - 1);
        let mut sum = vec![0.0; padded];
        let mut weight = vec![0.0; padded];
        let mut input = self.inverse.make_input_vec();
        let mut output = self.inverse.make_output_vec();
        let scale = 1.0 / self.n_fft as f32;
        for frame in 0..spectrum.frames {
            for (freq, slot) in input.iter_mut().enumerate() {
                let index = freq * spectrum.frames + frame;
                *slot = Complex32::new(spectrum.real[index], spectrum.imag[index]);
            }
            input[0].im = 0.0;
            input[half].im = 0.0;
            self.inverse
                .process(&mut input, &mut output)
                .expect("buffer sizes come from the same plan");
            let start = frame * self.hop;
            for (offset, value) in output.iter().enumerate() {
                sum[start + offset] += value * scale * self.window[offset];
                weight[start + offset] += self.window[offset] * self.window[offset];
            }
        }
        (0..length)
            .map(|index| {
                let position = index + half;
                if weight[position] > 1e-11 {
                    sum[position] / weight[position]
                } else {
                    0.0
                }
            })
            .collect()
    }
}

fn reflect(signal: &[f32], position: isize) -> f32 {
    let last = signal.len() as isize - 1;
    let mut index = position;
    while index < 0 || index > last {
        index = if index < 0 { -index } else { 2 * last - index };
    }
    signal[index.unsigned_abs()]
}

#[cfg(test)]
mod tests {
    use super::{Spectrum, Stft};

    use ndarray::ArrayD;
    use ndarray_npy::NpzReader;

    fn reference() -> NpzReader<std::fs::File> {
        NpzReader::new(
            std::fs::File::open(crate::shared::fixtures::fetch(
                &crate::shared::fixtures::REFERENCE,
            ))
            .unwrap(),
        )
        .unwrap()
    }

    fn max_error(a: &[f32], b: &[f32]) -> f32 {
        a.iter()
            .zip(b)
            .map(|(x, y)| (x - y).abs())
            .fold(0.0, f32::max)
    }

    #[test]
    fn forward_matches_torch_stft() {
        let mut npz = reference();
        let audio: ArrayD<f32> = npz.by_name("input_audio").unwrap();
        let real: ArrayD<f32> = npz.by_name("spec_real").unwrap();
        let imag: ArrayD<f32> = npz.by_name("spec_imag").unwrap();
        let samples = audio.shape()[2];
        let stft = Stft::new(2048, 512);
        let per_channel = real.len() / 2;
        for channel in 0..2 {
            let signal = &audio.as_slice().unwrap()[channel * samples..(channel + 1) * samples];
            let spectrum = stft.forward(signal);
            let range = channel * per_channel..(channel + 1) * per_channel;
            let error = max_error(&spectrum.real, &real.as_slice().unwrap()[range.clone()])
                .max(max_error(&spectrum.imag, &imag.as_slice().unwrap()[range]));
            assert!(error < 1e-3, "channel {channel} error {error}");
        }
    }

    #[test]
    fn inverse_matches_torch_istft() {
        let mut npz = reference();
        let real: ArrayD<f32> = npz.by_name("out_spec_real").unwrap();
        let imag: ArrayD<f32> = npz.by_name("out_spec_imag").unwrap();
        let expected: ArrayD<f32> = npz.by_name("ref_audio").unwrap();
        let (freqs, frames) = (real.shape()[3], real.shape()[4]);
        let samples = expected.shape()[3];
        let stft = Stft::new(2048, 512);
        let block = freqs * frames;
        for track in 0..12 {
            let range = track * block..(track + 1) * block;
            let spectrum = Spectrum {
                freqs,
                frames,
                real: real.as_slice().unwrap()[range.clone()].to_vec(),
                imag: imag.as_slice().unwrap()[range].to_vec(),
            };
            let audio = stft.inverse(&spectrum, samples);
            let error = max_error(
                &audio,
                &expected.as_slice().unwrap()[track * samples..(track + 1) * samples],
            );
            assert!(error < 1e-4, "track {track} error {error}");
        }
    }
}
