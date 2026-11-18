use std::path::{Path, PathBuf};

use crate::entities::site::{Stream, extract};
use crate::entities::yt_dlp;
use crate::shared::error::{Fetching, site_failure};
use crate::shared::{hls, http, ranged};

const RANGE_CHUNK: u64 = 1 << 20;

pub struct Request<'a> {
    pub url: &'a str,
    pub directory: &'a Path,
    pub cache: &'a Path,
    pub concurrency: usize,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Route {
    Native,
    YtDlp,
}

impl Route {
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Native => "native",
            Self::YtDlp => "yt-dlp",
        }
    }
}

pub struct Fetched {
    pub path: PathBuf,
    pub title: String,
    pub artist: String,
    pub route: Route,
}

#[tracing::instrument(skip_all)]
async fn native(client: &reqwest::Client, request: &Request<'_>) -> Fetching<Fetched> {
    let found = extract(client, request.url, request.cache).await?;
    let bytes = match &found.stream {
        Stream::Ranged { url, length } => {
            ranged::download(client, url, *length, RANGE_CHUNK, request.concurrency).await?
        }
        Stream::Whole { url } => http::bytes(client, url).await?,
        Stream::Hls { playlist } => hls::download(client, playlist, request.concurrency).await?,
    };
    if bytes.is_empty() {
        return Err(site_failure("downloaded nothing"));
    }
    tokio::fs::create_dir_all(request.directory).await?;
    let path = request
        .directory
        .join(format!("source.{}", found.extension));
    tokio::fs::write(&path, &bytes).await?;
    Ok(Fetched {
        path,
        title: found.title,
        artist: found.artist,
        route: Route::Native,
    })
}

#[tracing::instrument(skip_all)]
async fn fallback(client: &reqwest::Client, request: &Request<'_>) -> Fetching<Fetched> {
    let program = yt_dlp::install(client, request.cache).await?;
    tokio::fs::create_dir_all(request.directory).await?;
    let downloaded = yt_dlp::download(&program, request.url, request.directory).await?;
    Ok(Fetched {
        path: downloaded.path,
        title: downloaded.title,
        artist: downloaded.artist,
        route: Route::YtDlp,
    })
}

#[tracing::instrument(skip_all, fields(url = request.url, route, native_failure))]
pub async fn fetch_audio(client: &reqwest::Client, request: &Request<'_>) -> Fetching<Fetched> {
    let span = tracing::Span::current();
    let fetched = match native(client, request).await {
        Ok(fetched) => fetched,
        Err(error) => {
            span.record("native_failure", tracing::field::display(&error));
            tracing::warn!(%error, "built-in download failed, falling back to yt-dlp");
            fallback(client, request).await?
        }
    };
    span.record("route", fetched.route.as_str());
    Ok(fetched)
}
