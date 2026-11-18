use media_notes::{Failure, Outcome, now};
use num_traits::ToPrimitive;

use crate::entities::analyzer::{Analyzer, BEAT_MODEL, KEY_MODEL, KEYS, SAMPLE_RATE};
use crate::entities::song::Library;
use crate::shared::lib::{Stereo, decode, resample};
use crate::shared::protocol::{Analysis, Bar, KeySpan, Separation, Song};

const KEY_WINDOW_BARS: usize = 8;

const VOCALS: &str = "vocals";

fn failure(error: &dyn std::fmt::Display) -> Failure {
    Failure::new(error.to_string())
}

fn count(value: usize) -> i64 {
    i64::try_from(value).unwrap_or(i64::MAX)
}

fn nearest(beats: &[f32], time: f32) -> usize {
    beats
        .iter()
        .enumerate()
        .min_by(|left, right| (left.1 - time).abs().total_cmp(&(right.1 - time).abs()))
        .map_or(0, |(index, _)| index)
}

#[must_use]
pub fn bars_of(beats: &[f32], downbeats: &[f32]) -> Vec<Bar> {
    let mut starts: Vec<usize> = downbeats.iter().map(|time| nearest(beats, *time)).collect();
    starts.dedup();
    if starts.first().is_some_and(|first| *first > 0) {
        starts.insert(0, 0);
    }
    if starts.is_empty() && !beats.is_empty() {
        starts.push(0);
    }
    starts
        .iter()
        .enumerate()
        .map(|(index, start)| {
            let end = starts.get(index + 1).copied().unwrap_or(beats.len());
            Bar {
                beat: count(*start),
                beats: count(end - start),
            }
        })
        .collect()
}

#[must_use]
pub fn smoothed(keys: &[usize]) -> Vec<usize> {
    let mut smoothed = keys.to_vec();
    for index in 1..keys.len().saturating_sub(1) {
        if keys[index - 1] == keys[index + 1] {
            smoothed[index] = keys[index - 1];
        }
    }
    smoothed
}

#[must_use]
pub fn key_spans(keys: &[usize], window: usize, bars: usize) -> Vec<KeySpan> {
    let mut spans: Vec<KeySpan> = Vec::new();
    for (index, key) in keys.iter().enumerate() {
        let start = index * window;
        let length = window.min(bars.saturating_sub(start));
        match spans.last_mut() {
            Some(last) if last.key == KEYS[*key] => last.bars += count(length),
            _ => spans.push(KeySpan {
                bar: count(start),
                bars: count(length),
                key: KEYS[*key].to_owned(),
            }),
        }
    }
    spans
}

fn mono(audio: &Stereo, rate: u32) -> Outcome<Vec<f32>> {
    let [left, right] = resample(audio, rate, SAMPLE_RATE).map_err(|error| failure(&error))?;
    Ok(left
        .iter()
        .zip(&right)
        .map(|(left, right)| (left + right) * 0.5)
        .collect())
}

fn instrumental(
    library: &Library,
    song: &Song,
    separation: &Separation,
) -> Outcome<Option<(Stereo, u32)>> {
    let mut sum: Option<(Stereo, u32)> = None;
    for stem in separation.stems.iter().filter(|stem| stem.stem != VOCALS) {
        let (audio, rate) =
            decode(&library.path(song, &stem.file)).map_err(|error| failure(&error))?;
        sum = Some(match sum {
            None => (audio, rate),
            Some((mut total, total_rate)) => {
                for (channel, added) in total.iter_mut().zip(&audio) {
                    for (sample, value) in channel.iter_mut().zip(added) {
                        *sample += value;
                    }
                }
                (total, total_rate)
            }
        });
    }
    Ok(sum)
}

fn seconds_to_sample(seconds: f32) -> usize {
    (f64::from(seconds) * f64::from(SAMPLE_RATE))
        .round()
        .to_usize()
        .unwrap_or(0)
}

fn window_keys(
    analyzer: &Analyzer,
    harmony: &[f32],
    beats: &[f32],
    bars: &[Bar],
) -> Outcome<Vec<usize>> {
    let start_of = |bar: &Bar| {
        usize::try_from(bar.beat)
            .ok()
            .and_then(|beat| beats.get(beat).copied())
    };
    bars.chunks(KEY_WINDOW_BARS)
        .enumerate()
        .map(|(index, window)| {
            let from = window
                .first()
                .and_then(start_of)
                .map_or(0, seconds_to_sample);
            let to = bars
                .get((index + 1) * KEY_WINDOW_BARS)
                .and_then(start_of)
                .map_or(harmony.len(), seconds_to_sample)
                .min(harmony.len());
            analyzer.key(&harmony[from.min(to)..to])
        })
        .collect()
}

#[tracing::instrument(skip(library, song, analyzer, progress), fields(song = %song.id))]
pub fn analyze_song(
    library: &Library,
    song: &Song,
    analyzer: &mut Analyzer,
    progress: &dyn Fn(f64, &str),
) -> Outcome<Song> {
    let source = song
        .sources
        .iter()
        .find(|source| source.id == song.primary)
        .ok_or_else(|| Failure::new("song has no primary source"))?;
    progress(0.0, "decoding");
    let (mix, rate) = decode(&library.path(song, &source.file)).map_err(|error| failure(&error))?;
    let mix = mono(&mix, rate)?;
    progress(0.2, "beats");
    let found = analyzer.beats(&mix)?;
    let bars = bars_of(&found.beats, &found.downbeats);
    progress(0.6, "key");
    let separation = song.separations.last();
    let harmony = match separation
        .map(|separation| instrumental(library, song, separation))
        .transpose()?
        .flatten()
    {
        Some((audio, rate)) => mono(&audio, rate)?,
        None => mix,
    };
    let keys = smoothed(&window_keys(analyzer, &harmony, &found.beats, &bars)?);
    let mut updated = song.clone();
    updated.analysis = Some(Analysis {
        source: source.id.clone(),
        separation: separation.map(|separation| separation.id.clone()),
        beat_model: BEAT_MODEL.to_owned(),
        key_model: KEY_MODEL.to_owned(),
        beats: found.beats.iter().map(|beat| f64::from(*beat)).collect(),
        keys: key_spans(&keys, KEY_WINDOW_BARS, bars.len()),
        bars,
        created_at: now(),
    });
    library.save(&updated)?;
    progress(1.0, "done");
    Ok(updated)
}

#[cfg(test)]
mod tests {
    use std::f64::consts::TAU;

    use num_traits::ToPrimitive;

    use super::{analyze_song, bars_of, key_spans, smoothed};
    use crate::entities::analyzer::Analyzer;
    use crate::entities::song::Library;
    use crate::shared::lib::write_flac;
    use crate::shared::protocol::{Origin, SongSource};

    const RATE: u32 = 44_100;

    fn groove(seconds: u32, bpm: f64) -> Vec<f32> {
        let beat = 60.0 / bpm;
        (0..seconds * RATE)
            .map(|index| {
                let time = f64::from(index) / f64::from(RATE);
                let count = (time / beat).floor();
                let phase = count.mul_add(-beat, time);
                let accent = if count % 4.0 == 0.0 { 1.0 } else { 0.5 };
                let click = accent * (-phase * 40.0).exp() * (TAU * 900.0 * phase).sin();
                let bass = 0.25 * (TAU * if count % 4.0 < 2.0 { 65.41 } else { 98.0 } * time).sin();
                let chord: f64 = [261.63, 329.63, 392.0]
                    .iter()
                    .map(|frequency| 0.08 * (TAU * frequency * time).sin())
                    .sum();
                ((click + bass + chord) * 0.5).to_f32().unwrap_or(0.0)
            })
            .collect()
    }

    #[test]
    fn a_groove_gets_its_tempo_and_key() {
        let directory = tempfile::tempdir().unwrap();
        let library = Library::open(directory.path()).unwrap();
        let mut song = library.create("Groove", "").unwrap();
        let wave = groove(24, 120.0);
        std::fs::create_dir_all(library.path(&song, "sources")).unwrap();
        write_flac(
            &library.path(&song, "sources/a.flac"),
            &[wave.clone(), wave],
            RATE,
        )
        .unwrap();
        song.sources.push(SongSource {
            id: "a".into(),
            origin: Origin::File {
                name: "a.flac".into(),
            },
            file: "sources/a.flac".into(),
            sha256: String::new(),
            sample_rate: i64::from(RATE),
            frames: i64::from(24 * RATE),
            added_at: 0,
        });
        song.primary = "a".into();
        library.save(&song).unwrap();
        let cache = tempfile::tempdir().unwrap();
        let runtime = tokio::runtime::Runtime::new().unwrap();
        let mut analyzer = runtime
            .block_on(Analyzer::load(&reqwest::Client::new(), cache.path()))
            .unwrap();
        let result = analyze_song(&library, &song, &mut analyzer, &|_, _| {}).unwrap();
        let analysis = result.analysis.unwrap();
        let mut gaps: Vec<f64> = analysis
            .beats
            .windows(2)
            .map(|pair| pair[1] - pair[0])
            .collect();
        gaps.sort_by(f64::total_cmp);
        let bpm = 60.0 / gaps[gaps.len() / 2];
        assert!((bpm - 120.0).abs() < 2.0, "{bpm}");
        assert_ne!(analysis.bars.len(), 0);
        assert!(
            analysis.keys.iter().all(|span| span.key == "C major"),
            "{:?}",
            analysis.keys
        );
        assert_eq!(
            library
                .get(&song.id)
                .unwrap()
                .unwrap()
                .analysis
                .unwrap()
                .beats,
            analysis.beats
        );
    }

    #[test]
    fn bars_start_at_downbeats_with_a_pickup() {
        let beats = [0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5];
        let bars = bars_of(&beats, &[1.01, 3.0]);
        let shape: Vec<(i64, i64)> = bars.iter().map(|bar| (bar.beat, bar.beats)).collect();
        assert_eq!(shape, [(0, 2), (2, 4), (6, 4)]);
    }

    #[test]
    fn a_lone_differing_window_follows_its_neighbours() {
        assert_eq!(smoothed(&[3, 3, 7, 3, 5, 5]), [3, 3, 3, 3, 5, 5]);
    }

    #[test]
    fn equal_windows_merge_into_one_span() {
        let spans = key_spans(&[3, 3, 12], 8, 20);
        let shape: Vec<(i64, i64, &str)> = spans
            .iter()
            .map(|span| (span.bar, span.bars, span.key.as_str()))
            .collect();
        assert_eq!(shape, [(0, 16, "C major"), (16, 4, "B minor")]);
    }
}
