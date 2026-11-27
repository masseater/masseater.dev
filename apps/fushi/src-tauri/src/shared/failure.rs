use serde::Serialize;
use specta::Type;

#[derive(Debug, Serialize, Type)]
pub struct Failure {
    pub message: String,
}

impl<E: std::fmt::Display> From<E> for Failure {
    fn from(error: E) -> Self {
        Self {
            message: error.to_string(),
        }
    }
}

pub type Answer<T> = Result<T, Failure>;
