use std::path::Path;
use std::sync::Arc;

use anyhow::{Result, ensure};
use realfft::RealFftPlanner;
use realfft::num_complex::Complex;

use crate::beat::beats;
use crate::video::decode;
use crate::{FPS, START};

pub(crate) const SAMPLE_RATE: usize = 22050;
pub(crate) const HOP: usize = SAMPLE_RATE / FPS;
pub(crate) const N_FFT: usize = 2048;
const BANDS: usize = 8;
const FLOOR_DB: f64 = 60.0;
const AMIN: f64 = 1e-10;
const LEVEL_FLOOR: f64 = 1e-6;
const THOUSANDTHS: f64 = 1e3;

pub(crate) struct Sound {
    pub(crate) levels: Vec<Vec<f64>>,
    pub(crate) beats: Vec<f64>,
}

fn hz_to_mel(hz: f64) -> f64 {
    let (linear, min_log_hz, min_log_mel) = (200.0 / 3.0, 1000.0, 15.0);
    let step = 6.4_f64.ln() / 27.0;
    if hz >= min_log_hz {
        min_log_mel + (hz / min_log_hz).ln() / step
    } else {
        hz / linear
    }
}

fn mel_to_hz(mel: f64) -> f64 {
    let (linear, min_log_hz, min_log_mel) = (200.0 / 3.0, 1000.0, 15.0);
    let step = 6.4_f64.ln() / 27.0;
    if mel >= min_log_mel {
        min_log_hz * (step * (mel - min_log_mel)).exp()
    } else {
        mel * linear
    }
}

pub(crate) fn mel_filters(bands: usize) -> Vec<Vec<f64>> {
    let bins = N_FFT / 2 + 1;
    let top = hz_to_mel(SAMPLE_RATE as f64 / 2.0);
    let edges: Vec<f64> = (0..bands + 2)
        .map(|index| mel_to_hz(top * index as f64 / (bands + 1) as f64))
        .collect();
    let frequency = |bin: usize| bin as f64 * SAMPLE_RATE as f64 / N_FFT as f64;
    (0..bands)
        .map(|band| {
            let (low, middle, high) = (edges[band], edges[band + 1], edges[band + 2]);
            let norm = 2.0 / (high - low);
            (0..bins)
                .map(|bin| {
                    let lower = (frequency(bin) - low) / (middle - low);
                    let upper = (high - frequency(bin)) / (high - middle);
                    lower.min(upper).max(0.0) * norm
                })
                .collect()
        })
        .collect()
}

pub(crate) fn power_spectrogram(signal: &[f64]) -> Vec<Vec<f64>> {
    let half = N_FFT / 2;
    let mut padded = vec![0.0; half];
    padded.extend_from_slice(signal);
    padded.extend(std::iter::repeat_n(0.0, half));
    let window: Vec<f64> = (0..N_FFT)
        .map(|index| 0.5 - 0.5 * (std::f64::consts::TAU * index as f64 / N_FFT as f64).cos())
        .collect();
    let fft: Arc<dyn realfft::RealToComplex<f64>> = RealFftPlanner::new().plan_fft_forward(N_FFT);
    let mut spectrum = vec![Complex::default(); half + 1];
    (0..=signal.len() / HOP)
        .map(|frame| {
            let mut chunk: Vec<f64> = padded[frame * HOP..frame * HOP + N_FFT]
                .iter()
                .zip(&window)
                .map(|(sample, weight)| sample * weight)
                .collect();
            fft.process(&mut chunk, &mut spectrum).expect("長さは固定");
            spectrum.iter().map(Complex::norm_sqr).collect()
        })
        .collect()
}

pub(crate) fn mel(power: &[Vec<f64>], bands: usize) -> Vec<Vec<f64>> {
    let filters = mel_filters(bands);
    power
        .iter()
        .map(|frame| {
            filters
                .iter()
                .map(|filter| filter.iter().zip(frame).map(|(w, p)| w * p).sum())
                .collect()
        })
        .collect()
}

pub(crate) fn decibels(value: f64) -> f64 {
    10.0 * value.max(AMIN).log10()
}

fn thousandths(value: f64) -> f64 {
    (value * THOUSANDTHS).round() / THOUSANDTHS
}

fn rms(signal: &[f64]) -> Vec<f64> {
    let half = N_FFT / 2;
    (0..=signal.len() / HOP)
        .map(|frame| {
            let center = frame * HOP;
            let from = center.saturating_sub(half);
            let to = (center + half).min(signal.len());
            let energy: f64 = signal[from..to].iter().map(|sample| sample * sample).sum();
            (energy / N_FFT as f64).sqrt()
        })
        .collect()
}

pub(crate) fn levels(signal: &[f64], count: usize) -> Vec<Vec<f64>> {
    let bands = mel(&power_spectrogram(signal), BANDS);
    let loudest = bands.iter().flatten().copied().fold(AMIN, f64::max);
    let level = rms(signal);
    let peak = level.iter().copied().fold(LEVEL_FLOOR, f64::max);
    level
        .iter()
        .zip(&bands)
        .take(count)
        .map(|(level, frame)| {
            let shades = frame.iter().map(|value| {
                let db = decibels(*value) - decibels(loudest);
                thousandths(((db + FLOOR_DB) / FLOOR_DB).clamp(0.0, 1.0))
            });
            std::iter::once(thousandths(level / peak))
                .chain(shades)
                .collect()
        })
        .collect()
}

pub(crate) fn analyze(source: &Path, count: usize) -> Result<Sound> {
    let rate = SAMPLE_RATE.to_string();
    let raw = decode(source, &["-ac", "1", "-ar", &rate, "-f", "f32le"])?;
    ensure!(!raw.is_empty(), "{} に音が無い", source.display());
    let signal: Vec<f64> = raw
        .as_chunks::<4>()
        .0
        .iter()
        .map(|bytes| f64::from(f32::from_le_bytes(*bytes)))
        .collect();
    let beats = beats(&signal)
        .into_iter()
        .map(|frame| thousandths(START + (frame * HOP) as f64 / SAMPLE_RATE as f64))
        .collect();
    Ok(Sound {
        levels: levels(&signal, count),
        beats,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tone(hz: f64, seconds: f64) -> Vec<f64> {
        let length = (seconds * SAMPLE_RATE as f64) as usize;
        (0..length)
            .map(|index| (std::f64::consts::TAU * hz * index as f64 / SAMPLE_RATE as f64).sin())
            .collect()
    }

    #[test]
    fn slaney_mel_scale_round_trips() {
        for hz in [0.0, 440.0, 1000.0, 8000.0] {
            assert!((mel_to_hz(hz_to_mel(hz)) - hz).abs() < 1e-6);
        }
        assert!((hz_to_mel(1000.0) - 15.0).abs() < 1e-12);
    }

    #[test]
    fn a_low_tone_lights_the_lowest_band_only() {
        let rows = levels(&tone(200.0, 1.0), 30);
        let middle = &rows[15];
        assert!((middle[0] - 1.0).abs() < 0.01, "{middle:?}");
        assert!(middle[1] > 0.99, "{middle:?}");
        assert!(middle[8] < 0.01, "{middle:?}");
    }

    #[test]
    fn frames_follow_the_hop_with_centered_padding() {
        let signal = tone(440.0, 2.0);
        assert_eq!(power_spectrogram(&signal).len(), signal.len() / HOP + 1);
        assert_eq!(rms(&signal).len(), signal.len() / HOP + 1);
    }
}
