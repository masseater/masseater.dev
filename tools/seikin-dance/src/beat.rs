use crate::audio::{HOP, SAMPLE_RATE, decibels, mel, power_spectrogram};

const ONSET_BANDS: usize = 128;
const TOP_DB: f64 = 80.0;
const ONSET_PAD: usize = 2;
const TEMPO_WINDOW: usize = 240;
const START_BPM: f64 = 120.0;
const MAX_BPM: f64 = 320.0;
const TIGHTNESS: f64 = 100.0;
const TEMPO_BOOST: f64 = 1e6;
const SHARPNESS: f64 = 32.0;
const FIRST_BEAT: f64 = 0.01;
const TRIM: f64 = 0.5;

fn frame_rate() -> f64 {
    SAMPLE_RATE as f64 / HOP as f64
}

pub(crate) fn onset_strength(signal: &[f64]) -> Vec<f64> {
    let bands = mel(&power_spectrogram(signal), ONSET_BANDS);
    let db: Vec<Vec<f64>> = bands
        .iter()
        .map(|frame| frame.iter().map(|value| decibels(*value)).collect())
        .collect();
    let top = db.iter().flatten().copied().fold(f64::MIN, f64::max) - TOP_DB;
    let db: Vec<Vec<f64>> = db
        .into_iter()
        .map(|frame| frame.into_iter().map(|value| value.max(top)).collect())
        .collect();
    let rises = db.windows(2).map(|pair| {
        let sum: f64 = pair[1]
            .iter()
            .zip(&pair[0])
            .map(|(now, before)| (now - before).max(0.0))
            .sum();
        sum / ONSET_BANDS as f64
    });
    std::iter::repeat_n(0.0, ONSET_PAD)
        .chain(rises)
        .take(db.len())
        .collect()
}

fn autocorrelate(frame: &[f64]) -> Vec<f64> {
    (0..frame.len())
        .map(|lag| frame[lag..].iter().zip(frame).map(|(a, b)| a * b).sum())
        .collect()
}

fn ramped(onsets: &[f64]) -> Vec<f64> {
    let pad = TEMPO_WINDOW / 2;
    let ramp = |edge: f64| (0..pad).map(move |step| edge * step as f64 / pad as f64);
    let first = onsets.first().copied().unwrap_or(0.0);
    let last = onsets.last().copied().unwrap_or(0.0);
    let mut right: Vec<f64> = ramp(last).collect();
    right.reverse();
    ramp(first)
        .chain(onsets.iter().copied())
        .chain(right)
        .collect()
}

pub(crate) fn tempo(onsets: &[f64]) -> f64 {
    let padded = ramped(onsets);
    let window: Vec<f64> = (0..TEMPO_WINDOW)
        .map(|index| 0.5 - 0.5 * (std::f64::consts::TAU * index as f64 / TEMPO_WINDOW as f64).cos())
        .collect();
    let mut mean = vec![0.0; TEMPO_WINDOW];
    for start in 0..onsets.len() {
        let frame: Vec<f64> = padded[start..start + TEMPO_WINDOW]
            .iter()
            .zip(&window)
            .map(|(value, weight)| value * weight)
            .collect();
        let correlation = autocorrelate(&frame);
        let peak = correlation
            .iter()
            .copied()
            .map(f64::abs)
            .fold(0.0, f64::max);
        let scale = if peak > f64::MIN_POSITIVE { peak } else { 1.0 };
        for (sum, value) in mean.iter_mut().zip(correlation) {
            *sum += value / scale / onsets.len() as f64;
        }
    }
    let bpm = |lag: usize| 60.0 * frame_rate() / lag as f64;
    let score = |lag: usize| {
        let prior = -0.5 * (bpm(lag).log2() - START_BPM.log2()).powi(2);
        (TEMPO_BOOST * mean[lag]).ln_1p() + prior
    };
    let best = (1..TEMPO_WINDOW)
        .filter(|&lag| bpm(lag) < MAX_BPM)
        .max_by(|&a, &b| score(a).total_cmp(&score(b)))
        .unwrap_or(1);
    bpm(best)
}

fn deviation(values: &[f64]) -> f64 {
    let mean = values.iter().sum::<f64>() / values.len() as f64;
    let squares: f64 = values.iter().map(|value| (value - mean).powi(2)).sum();
    (squares / (values.len() as f64 - 1.0)).sqrt()
}

fn local_score(onsets: &[f64], period: f64) -> Vec<f64> {
    let reach = period as isize;
    let weights: Vec<f64> = (-reach..=reach)
        .map(|offset| (-0.5 * (offset as f64 * SHARPNESS / period).powi(2)).exp())
        .collect();
    let norm = deviation(onsets) + f64::MIN_POSITIVE;
    (0..onsets.len() as isize)
        .map(|index| {
            (-reach..=reach)
                .zip(&weights)
                .filter_map(|(offset, weight)| {
                    let at = usize::try_from(index + offset).ok()?;
                    onsets.get(at).map(|value| value / norm * weight)
                })
                .sum()
        })
        .collect()
}

fn track(score: &[f64], period: f64) -> (Vec<f64>, Vec<Option<usize>>) {
    let threshold = FIRST_BEAT * score.iter().copied().fold(f64::MIN, f64::max);
    let mut total = vec![0.0; score.len()];
    let mut links = vec![None; score.len()];
    let mut first = true;
    let near = (period / 2.0).round_ties_even() as isize;
    let far = (2.0 * period) as isize;
    for (index, &here) in score.iter().enumerate() {
        let i = index as isize;
        let best = (i - far..=i - near)
            .rev()
            .take_while(|&at| at >= 0)
            .map(|at| {
                let gap = ((i - at) as f64).ln() - period.ln();
                (total[at as usize] - TIGHTNESS * gap * gap, at as usize)
            })
            .fold(None, |best: Option<(f64, usize)>, next| match best {
                Some(kept) if kept.0 >= next.0 => Some(kept),
                _ => Some(next),
            });
        total[index] = here + best.map_or(0.0, |(value, _)| value);
        if !(first && here < threshold) {
            links[index] = best.map(|(_, at)| at);
            first = false;
        }
    }
    (total, links)
}

fn median(mut values: Vec<f64>) -> f64 {
    values.sort_by(f64::total_cmp);
    let half = values.len() / 2;
    if values.len() % 2 == 1 {
        values[half]
    } else {
        f64::midpoint(values[half - 1], values[half])
    }
}

fn last_beat(total: &[f64]) -> usize {
    let peak = |index: usize| {
        let before = total[index.saturating_sub(1)];
        let after = total.get(index + 1).copied().unwrap_or(total[index]);
        index > 0 && total[index] > before && total[index] >= after
    };
    let peaks: Vec<usize> = (0..total.len()).filter(|&index| peak(index)).collect();
    let middle = median(peaks.iter().map(|&index| total[index]).collect());
    peaks
        .into_iter()
        .rfind(|&index| total[index] * 2.0 > middle)
        .unwrap_or(total.len() - 1)
}

fn trim(score: &[f64], beats: &[usize]) -> Vec<usize> {
    let values: Vec<f64> = beats.iter().map(|&beat| score[beat]).collect();
    let hann = [0.0, 0.5, 1.0, 0.5, 0.0];
    let smooth: Vec<f64> = (0..values.len())
        .map(|index| {
            (0..hann.len())
                .filter_map(|k| {
                    let at = (index + k).checked_sub(2)?;
                    values.get(at).map(|value| value * hann[k])
                })
                .sum()
        })
        .collect();
    let power = smooth.iter().map(|value| value * value).sum::<f64>() / smooth.len() as f64;
    let threshold = TRIM * power.sqrt();
    let strong = |beat: &&usize| score[**beat] > threshold;
    let from = beats
        .iter()
        .position(|beat| strong(&beat))
        .unwrap_or(beats.len());
    let to = beats
        .iter()
        .rposition(|beat| strong(&beat))
        .map_or(from, |at| at + 1);
    beats[from..to.max(from)].to_vec()
}

pub(crate) fn beats(signal: &[f64]) -> Vec<usize> {
    let onsets = onset_strength(signal);
    if onsets.iter().all(|&value| value == 0.0) {
        return Vec::new();
    }
    let period = (frame_rate() * 60.0 / tempo(&onsets)).round();
    let score = local_score(&onsets, period);
    let (total, links) = track(&score, period);
    let mut beats = vec![last_beat(&total)];
    while let Some(previous) = links[beats[beats.len() - 1]] {
        beats.push(previous);
    }
    beats.reverse();
    trim(&score, &beats)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn clicks(bpm: f64, seconds: f64) -> Vec<f64> {
        let length = (seconds * SAMPLE_RATE as f64) as usize;
        let spacing = (60.0 / bpm * SAMPLE_RATE as f64) as usize;
        (0..length)
            .map(|index| {
                let phase = index % spacing;
                if phase < 200 {
                    (index as f64 * 0.7).sin() * (1.0 - phase as f64 / 200.0)
                } else {
                    0.0
                }
            })
            .collect()
    }

    #[test]
    fn tempo_finds_a_steady_click_track() {
        let found = tempo(&onset_strength(&clicks(120.0, 12.0)));
        assert!((found - 120.0).abs() < 3.0, "{found}");
    }

    #[test]
    fn beats_land_on_the_clicks() {
        let found = beats(&clicks(120.0, 12.0));
        assert!(found.len() >= 20, "{found:?}");
        for pair in found.windows(2) {
            let gap = (pair[1] - pair[0]) as f64 / frame_rate();
            assert!((gap - 0.5).abs() < 0.04, "{found:?}");
        }
        for beat in found {
            let seconds = (beat * HOP) as f64 / SAMPLE_RATE as f64;
            let off = (seconds / 0.5 - (seconds / 0.5).round()).abs() * 0.5;
            assert!(off < 0.05, "{seconds}");
        }
    }

    #[test]
    fn silence_has_no_beats() {
        assert_eq!(beats(&vec![0.0; SAMPLE_RATE * 3]), Vec::<usize>::new());
    }
}
