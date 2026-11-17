use std::io;
use std::process::{Child, ExitStatus};
use std::sync::{Arc, Mutex};

use tokio::sync::watch;
use tokio::task::AbortHandle;

use super::model::Progress;
use super::server::Server;

pub const STOPPED: &str = "翻訳エンジンは停止しています";

#[derive(Clone)]
pub enum Phase {
    Idle,
    Downloading(Progress),
    Starting,
    Ready(Server),
    Failed(String),
}

impl Phase {
    pub const fn settled(&self) -> bool {
        matches!(self, Self::Ready(_) | Self::Failed(_))
    }

    pub fn begin(&mut self) -> bool {
        let begins = matches!(self, Self::Idle | Self::Failed(_));
        if begins {
            *self = Self::Starting;
        }
        begins
    }
}

pub enum Process {
    Idle,
    Running(Child),
    Stopped,
}

impl Process {
    pub fn stopped() -> io::Error {
        io::Error::other(STOPPED)
    }

    pub fn kill(&mut self) {
        if let Self::Running(child) = self {
            let _ = child.kill();
            let _ = child.wait();
        }
    }

    pub fn stop(&mut self) {
        self.kill();
        *self = Self::Stopped;
    }

    pub fn replace(&mut self, spawn: impl FnOnce() -> io::Result<Child>) -> io::Result<()> {
        if matches!(self, Self::Stopped) {
            return Err(Self::stopped());
        }
        self.kill();
        *self = Self::Running(spawn()?);
        Ok(())
    }

    pub fn exited(&mut self) -> io::Result<Option<ExitStatus>> {
        match self {
            Self::Running(child) => child.try_wait(),
            Self::Idle | Self::Stopped => Err(Self::stopped()),
        }
    }
}

pub struct Engine {
    pub phase: watch::Sender<Phase>,
    pub process: Arc<Mutex<Process>>,
    pub inflight: Mutex<Option<AbortHandle>>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn starts_no_process_once_the_app_has_stopped_it() {
        let mut process = Process::Idle;
        process.stop();
        assert!(
            process
                .replace(|| unreachable!("spawned after the stop"))
                .is_err()
        );
        assert!(process.exited().is_err());
    }

    #[test]
    fn begins_only_when_nothing_is_under_way() {
        let mut phase = Phase::Idle;
        assert!(phase.begin());
        assert!(!phase.begin());
        phase = Phase::Failed(STOPPED.to_owned());
        assert!(phase.begin());
        assert!(matches!(phase, Phase::Starting));
    }
}
