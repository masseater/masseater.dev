use std::sync::{Arc, Mutex, PoisonError};

use media_notes::{fresh_id, now};

use crate::shared::protocol::{Job, JobKind, JobState};

const KEPT: usize = 200;

pub type Notify = Arc<dyn Fn() + Send + Sync>;

#[derive(Clone)]
pub struct Jobs {
    jobs: Arc<Mutex<Vec<Job>>>,
    notify: Notify,
}

impl Jobs {
    #[must_use]
    pub fn new(notify: Notify) -> Self {
        Self { jobs: Arc::new(Mutex::new(Vec::new())), notify }
    }

    fn change(&self, id: &str, edit: impl FnOnce(&mut Job)) {
        {
            let mut jobs = self.jobs.lock().unwrap_or_else(PoisonError::into_inner);
            if let Some(job) = jobs.iter_mut().find(|job| job.id == id) {
                edit(job);
            }
        }
        (self.notify)();
    }

    #[must_use]
    pub fn queue(&self, kind: JobKind, label: &str, song_id: Option<&str>) -> String {
        let job = Job {
            id: fresh_id(),
            kind,
            label: label.to_owned(),
            song_id: song_id.map(str::to_owned),
            state: JobState::Queued,
            progress: 0.0,
            message: String::new(),
            started_at: now(),
        };
        let id = job.id.clone();
        {
            let mut jobs = self.jobs.lock().unwrap_or_else(PoisonError::into_inner);
            jobs.insert(0, job);
            jobs.truncate(KEPT);
        }
        (self.notify)();
        id
    }

    pub fn progress(&self, id: &str, progress: f64, message: &str) {
        self.change(id, |job| {
            job.state = JobState::Running;
            job.progress = progress;
            message.clone_into(&mut job.message);
        });
    }

    pub fn finish(&self, id: &str, song_id: &str) {
        self.change(id, |job| {
            job.state = JobState::Done;
            job.progress = 1.0;
            job.song_id = Some(song_id.to_owned());
            job.message.clear();
        });
    }

    pub fn fail(&self, id: &str, message: &str) {
        self.change(id, |job| {
            job.state = JobState::Failed;
            message.clone_into(&mut job.message);
        });
    }

    pub fn touch(&self) {
        (self.notify)();
    }

    #[must_use]
    pub fn list(&self) -> Vec<Job> {
        self.jobs.lock().unwrap_or_else(PoisonError::into_inner).clone()
    }
}

#[cfg(test)]
mod tests {
    use std::sync::Arc;
    use std::sync::atomic::{AtomicUsize, Ordering};

    use super::Jobs;
    use crate::shared::protocol::{JobKind, JobState};

    #[test]
    fn jobs_move_through_their_states_and_notify() {
        let told = Arc::new(AtomicUsize::new(0));
        let counter = told.clone();
        let jobs = Jobs::new(Arc::new(move || {
            counter.fetch_add(1, Ordering::SeqCst);
        }));
        let id = jobs.queue(JobKind::Import, "url", None);
        jobs.progress(&id, 0.5, "separating");
        assert_eq!(jobs.list()[0].state, JobState::Running);
        jobs.finish(&id, "song");
        let job = &jobs.list()[0];
        assert_eq!((job.state, job.song_id.as_deref()), (JobState::Done, Some("song")));
        let failed = jobs.queue(JobKind::Separate, "x", Some("song"));
        jobs.fail(&failed, "boom");
        assert_eq!(jobs.list()[0].message, "boom");
        assert_eq!(told.load(Ordering::SeqCst), 5);
    }
}
