#[derive(Debug, thiserror::Error)]
pub enum FetchError {
    #[error("http: {0}")]
    Http(#[from] reqwest::Error),
    #[error("io: {0}")]
    Io(#[from] std::io::Error),
    #[error("{0}")]
    Site(String),
    #[error("yt-dlp: {0}")]
    YtDlp(String),
}

pub type Fetching<T> = Result<T, FetchError>;

pub fn site_failure(message: impl Into<String>) -> FetchError {
    FetchError::Site(message.into())
}
