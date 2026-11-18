use std::path::PathBuf;
use std::sync::mpsc::{Receiver, Sender, channel};

use candle_core::Device;
use media_notes::{Failure, Outcome};
use roformer::features::separate_stems::Separator;

use crate::entities::analyzer::Analyzer;
use crate::entities::gpu_runtime::GpuRuntime;
use crate::entities::job::Jobs;
use crate::entities::model::{DEFAULT_MODELS, Model, load_separator, model};
use crate::entities::song::Library;
use crate::features::analyze_song::analyze_song;
use crate::features::import_song::import_song;
use crate::features::separate_song::separate_song;
use crate::shared::protocol::{JobKind, Song};

enum Task {
    Separate(&'static Model),
    Analyze,
}

struct Work {
    job: String,
    song: String,
    task: Task,
}

struct Worker {
    library: Library,
    jobs: Jobs,
    client: reqwest::Client,
    cache: PathBuf,
    gpu: GpuRuntime,
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

const DRIVER_TOO_OLD: &str = "driver too old";

fn explained(failure: Failure) -> Failure {
    if failure
        .message
        .contains("CUDA_ERROR_UNSUPPORTED_PTX_VERSION")
    {
        tracing::error!(
            message = failure.message,
            "nvidia driver is older than the cuda build"
        );
        Failure::new(DRIVER_TOO_OLD)
    } else {
        failure
    }
}

fn work_all(worker: &Worker, works: &Receiver<Work>) {
    let mut device: Option<Device> = None;
    let mut loaded: Option<(&'static str, Separator)> = None;
    let mut analyzer: Option<Analyzer> = None;
    for work in works {
        let progress = |ratio: f64, stage: &str| worker.jobs.progress(&work.job, ratio, stage);
        let outcome = (|| -> Outcome<Song> {
            let song = worker
                .library
                .get(&work.song)?
                .ok_or_else(|| Failure::new("song was removed"))?;
            match work.task {
                Task::Separate(model) => {
                    if device.is_none() {
                        worker.gpu.wait(&|ratio| progress(ratio, "preparing gpu"))?;
                        device = Some(self::device());
                    }
                    let device = device.as_ref().ok_or_else(|| Failure::new("no device"))?;
                    if loaded.as_ref().is_none_or(|(id, _)| *id != model.id) {
                        progress(0.0, "loading model");
                        loaded = None;
                        loaded = Some((model.id, load_separator(model, device)?));
                    }
                    let (_, separator) = loaded
                        .as_ref()
                        .ok_or_else(|| Failure::new("model not loaded"))?;
                    separate_song(&worker.library, &song, model, separator, &progress)
                }
                Task::Analyze => {
                    if analyzer.is_none() {
                        progress(0.0, "loading model");
                        analyzer = Some(tauri::async_runtime::block_on(Analyzer::load(
                            &worker.client,
                            &worker.cache,
                        ))?);
                    }
                    let analyzer = analyzer
                        .as_mut()
                        .ok_or_else(|| Failure::new("analyzer not loaded"))?;
                    analyze_song(&worker.library, &song, analyzer, &progress)
                }
            }
        })();
        match outcome.map_err(explained) {
            Ok(song) => worker.jobs.finish(&work.job, &song.id),
            Err(failure) => worker.jobs.fail(&work.job, &failure.message),
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
    pub fn start(
        library: Library,
        client: reqwest::Client,
        cache: PathBuf,
        jobs: Jobs,
        gpu: GpuRuntime,
    ) -> Self {
        let (queue, works) = channel();
        let worker = Worker {
            library: library.clone(),
            jobs: jobs.clone(),
            client: client.clone(),
            cache: cache.clone(),
            gpu,
        };
        std::thread::spawn(move || work_all(&worker, &works));
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
        self.send(Work {
            job: job.clone(),
            song: song.id.clone(),
            task: Task::Separate(model),
        })?;
        Ok(job)
    }

    pub fn analyze(&self, song: &Song) -> Outcome<String> {
        let job = self
            .jobs
            .queue(JobKind::Analyze, &song.title, Some(&song.id));
        self.send(Work {
            job: job.clone(),
            song: song.id.clone(),
            task: Task::Analyze,
        })?;
        Ok(job)
    }

    fn send(&self, work: Work) -> Outcome<()> {
        self.queue
            .send(work)
            .map_err(|_| Failure::new("worker stopped"))
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
                    if imported.song.analysis.is_none()
                        && let Err(failure) = workshop.analyze(&imported.song)
                    {
                        workshop.jobs.fail(&running, &failure.message);
                    }
                }
                Err(failure) => workshop.jobs.fail(&running, &failure.message),
            }
        });
        Ok(job)
    }
}
