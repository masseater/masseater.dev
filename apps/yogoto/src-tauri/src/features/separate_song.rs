use media_notes::{Failure, Outcome, fresh_id, now};
use roformer::features::separate_stems::Separator;

use crate::entities::model::Model;
use crate::entities::song::Library;
use crate::shared::lib::{Stereo, decode, resample, write_flac};
use crate::shared::protocol::{Separation, Song, StemFile};

const STEMS: &str = "stems";

fn failure(error: &dyn std::fmt::Display) -> Failure {
    Failure::new(error.to_string())
}

fn fit(mut audio: Stereo, frames: usize) -> Stereo {
    for channel in &mut audio {
        channel.resize(frames, 0.0);
    }
    audio
}

#[tracing::instrument(skip(library, song, model, separator, progress), fields(song = %song.id, model = model.id))]
pub fn separate_song(
    library: &Library,
    song: &Song,
    model: &Model,
    separator: &Separator,
    progress: &dyn Fn(f64, &str),
) -> Outcome<Song> {
    let source = song
        .sources
        .iter()
        .find(|source| source.id == song.primary)
        .ok_or_else(|| Failure::new("song has no primary source"))?;
    progress(0.0, "decoding");
    let (mix, rate) =
        decode(&library.path(song, &source.file)?).map_err(|error| failure(&error))?;
    let frames = mix[0].len();
    let model_rate = separator.sample_rate();
    let input = resample(&mix, rate, model_rate).map_err(|error| failure(&error))?;
    let stems = separator
        .separate(&input, |done, total| {
            let ratio = if total == 0 {
                1.0
            } else {
                f64::from(u32::try_from(done).unwrap_or(u32::MAX))
                    / f64::from(u32::try_from(total).unwrap_or(u32::MAX))
            };
            progress(ratio * 0.95, "separating");
        })
        .map_err(|error| failure(&error))?;
    let id = fresh_id();
    let folder = format!("{STEMS}/{id}");
    std::fs::create_dir_all(library.path(song, &folder)?)?;
    let mut files = Vec::new();
    for (name, audio) in separator.stems().into_iter().zip(stems) {
        progress(0.95, "writing stems");
        let back = fit(
            resample(&audio, model_rate, rate).map_err(|error| failure(&error))?,
            frames,
        );
        let file = format!("{folder}/{name}.flac");
        write_flac(&library.path(song, &file)?, &back, rate).map_err(|error| failure(&error))?;
        files.push(StemFile { stem: name, file });
    }
    let mut updated = library.get(&song.id)?.unwrap_or_else(|| song.clone());
    updated.separations.push(Separation {
        id,
        source: source.id.clone(),
        model: model.id.to_owned(),
        revision: model.checkpoint.revision.to_owned(),
        stems: files,
        sample_rate: source.sample_rate,
        frames: source.frames,
        created_at: now(),
    });
    library.save(&updated)?;
    progress(1.0, "done");
    Ok(updated)
}

#[cfg(test)]
mod tests {
    use candle_core::Device;

    use super::separate_song;
    use crate::entities::model::{MODELS, load_separator};
    use crate::entities::song::Library;
    use crate::shared::lib::{decode, write_flac};
    use crate::shared::protocol::{Origin, SongSource};

    #[test]
    fn stems_keep_the_source_rate_and_length() {
        let directory = tempfile::tempdir().unwrap();
        let library = Library::open(directory.path()).unwrap();
        let mut song = library.create("Tone", "").unwrap();
        let frames: usize = 48_017;
        let wave: Vec<f32> = (0..48_017u32)
            .map(|index| (f32::from(u16::try_from(index % 109).unwrap()) / 109.0 - 0.5) * 0.4)
            .collect();
        std::fs::create_dir_all(library.path(&song, "sources").unwrap()).unwrap();
        write_flac(
            &library.path(&song, "sources/a.flac").unwrap(),
            &[wave.clone(), wave],
            48_000,
        )
        .unwrap();
        song.sources.push(SongSource {
            id: "a".into(),
            origin: Origin::File {
                name: "a.flac".into(),
            },
            file: "sources/a.flac".into(),
            sha256: String::new(),
            sample_rate: 48_000,
            frames: i64::try_from(frames).unwrap(),
            added_at: 0,
        });
        song.primary = "a".into();
        library.save(&song).unwrap();
        let mut separator = load_separator(&MODELS[0], &Device::Cpu).unwrap();
        separator.set_chunk(44_100, 1);
        let separated = separate_song(&library, &song, &MODELS[0], &separator, &|_, _| {}).unwrap();
        let separation = &separated.separations[0];
        assert_eq!(separation.stems.len(), MODELS[0].stems.len());
        for stem in &separation.stems {
            let (audio, rate) = decode(&library.path(&separated, &stem.file).unwrap()).unwrap();
            assert_eq!((rate, audio[0].len()), (48_000, frames), "{}", stem.stem);
        }
        let names: Vec<&str> = separation
            .stems
            .iter()
            .map(|stem| stem.stem.as_str())
            .collect();
        assert_eq!(names, MODELS[0].stems);
    }
}
