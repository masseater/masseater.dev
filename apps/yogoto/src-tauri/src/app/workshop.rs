use std::path::PathBuf;
use std::sync::mpsc::{Receiver, Sender, channel};

use candle_core::Device;
use media_notes::{Failure, Outcome};
use roformer::features::separate_stems::Separator;

use crate::entities::job::Jobs;
use crate::entities::model::{DEFAULT_MODELS, Model, load_separator, model};
use crate::entities::song::Library;
use crate::features::import_song::import_song;
use crate::features::separate_song::separate_song;
use crate::shared::protocol::{JobKind, Song};

struct Work {
    job: String,
    song: String,
    model: &'static Model,
}

#[derive(Clone)]
pub struct Workshop {
    pub library: Library,
    pub jobs: Jobs,
    client: reqwest::Client,
    cache: PathBuf,
    queue: Sender<Work>,
}

fn device() -> Device {
    Device::cuda_if_available(0).unwrap_or(Device::Cpu)
}

fn separate_all(library: &Library, jobs: &Jobs, works: &Receiver<Work>) {
    let device = device();
    let mut loaded: Option<(&'static str, Separator)> = None;
    for work in works {
        let progress = |ratio: f64, stage: &str| jobs.progress(&work.job, ratio, stage);
        let outcome = (|| -> Outcome<Song> {
            let song = library
                .get(&work.song)?
                .ok_or_else(|| Failure::new("song was removed"))?;
            if loaded.as_ref().is_none_or(|(id, _)| *id != work.model.id) {
                progress(0.0, "loading model");
                loaded = None;
                loaded = Some((work.model.id, load_separator(work.model, &device)?));
            }
            let (_, separator) = loaded
                .as_ref()
                .ok_or_else(|| Failure::new("model not loaded"))?;
            separate_song(library, &song, work.model, separator, &progress)
        })();
        match outcome {
            Ok(song) => jobs.finish(&work.job, &song.id),
            Err(failure) => jobs.fail(&work.job, &failure.message),
        }
    }
}

fn models_of(ids: &[String]) -> Outcome<Vec<&'static Model>> {
    let wanted: Vec<&str> = if ids.is_empty() {
        DEFAULT_MODELS.to_vec()
    } else {
        ids.iter().map(String::as_str).collect()
    };
    wanted
        .into_iter()
        .map(|id| model(id).ok_or_else(|| Failure::new(format!("unknown model {id}"))))
        .collect()
}

impl Workshop {
    #[must_use]
    pub fn start(library: Library, client: reqwest::Client, cache: PathBuf, jobs: Jobs) -> Self {
        let (queue, works) = channel();
        let worker_library = library.clone();
        let worker_jobs = jobs.clone();
        std::thread::spawn(move || separate_all(&worker_library, &worker_jobs, &works));
        Self {
            library,
            jobs,
            client,
            cache,
            queue,
        }
    }

    pub fn separate(&self, song: &Song, model_id: &str) -> Outcome<String> {
        let model =
            model(model_id).ok_or_else(|| Failure::new(format!("unknown model {model_id}")))?;
        let job = self.jobs.queue(
            JobKind::Separate,
            &format!("{} / {}", song.title, model.label),
            Some(&song.id),
        );
        self.queue
            .send(Work {
                job: job.clone(),
                song: song.id.clone(),
                model,
            })
            .map_err(|_| Failure::new("separation worker stopped"))?;
        Ok(job)
    }

    pub fn import(&self, location: &str, model_ids: &[String]) -> Outcome<String> {
        let models = models_of(model_ids)?;
        let job = self.jobs.queue(JobKind::Import, location, None);
        let workshop = self.clone();
        let location = location.to_owned();
        let running = job.clone();
        std::thread::spawn(move || {
            workshop.jobs.progress(&running, 0.0, "downloading");
            let imported = tauri::async_runtime::block_on(import_song(
                &workshop.library,
                &workshop.client,
                &workshop.cache,
                &location,
            ));
            match imported {
                Ok(imported) => {
                    workshop.jobs.finish(&running, &imported.song.id);
                    for model in models {
                        let done = imported
                            .song
                            .separations
                            .iter()
                            .any(|separation| separation.model == model.id);
                        if !done && let Err(failure) = workshop.separate(&imported.song, model.id) {
                            workshop.jobs.fail(&running, &failure.message);
                        }
                    }
                }
                Err(failure) => workshop.jobs.fail(&running, &failure.message),
            }
        });
        Ok(job)
    }
}
